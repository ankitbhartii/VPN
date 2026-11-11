import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  Lock,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Shield,
  Sun,
  Zap,
} from 'lucide-react';
import {
  ClientIpInfo,
  CountryGroup,
  GeoCoordinates,
  LogicalServer,
  ServerFeature,
  VpnConnectionState,
} from '../types/vpn';
import { COUNTRY_FLAGS, SECURE_CORE_HUBS } from '../data/protonServers';
import { createProceduralGlobeTextures } from '../utils/worldGlobeTexture';

interface ProtonWorldMapProps {
  connectionState: VpnConnectionState;
  activeServer: LogicalServer | null;
  clientIp: ClientIpInfo;
  countryGroups: CountryGroup[];
  secureCoreEnabled: boolean;
  onSelectCountryConnect: (countryCode: string) => void;
  compact?: boolean;
}

const GLOBE_RADIUS = 10;

// Module-scope pre-allocated math objects to guarantee zero GC allocations in the render loop
const _tempVecA = new THREE.Vector3();
const _tempNormal = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _tempQuat = new THREE.Quaternion();

/**
 * Exact mathematical match to THREE.SphereGeometry equirectangular UV mapping
 */
function latLngToSphereVector3(
  lat: number,
  lng: number,
  radius: number = GLOBE_RADIUS,
  target: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return target.set(x, y, z);
}

/**
 * Builds an elevated 3D great-circle CatmullRomCurve3 between two geographic coordinates on the sphere
 */
function createSphericalArcCurve(
  start: GeoCoordinates,
  end: GeoCoordinates,
  altitudeBoost: number = 1.9
): THREE.CatmullRomCurve3 {
  const vStart = latLngToSphereVector3(start.lat, start.lng, GLOBE_RADIUS + 0.18);
  const vEnd = latLngToSphereVector3(end.lat, end.lng, GLOBE_RADIUS + 0.18);

  const chordDist = vStart.distanceTo(vEnd);
  const maxPeak =
    GLOBE_RADIUS + Math.min(3.6, Math.max(0.65, chordDist * 0.18) * (altitudeBoost / 1.9));

  const points: THREE.Vector3[] = [];
  const segments = 44;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(vStart, vEnd, t).normalize();
    const elevation = Math.sin(t * Math.PI);
    const r = THREE.MathUtils.lerp(GLOBE_RADIUS + 0.18, maxPeak, elevation);
    p.multiplyScalar(r);
    points.push(p);
  }

  return new THREE.CatmullRomCurve3(points);
}

interface PacketTraveler {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
}

export const ProtonWorldMap: React.FC<ProtonWorldMapProps> = ({
  connectionState,
  activeServer,
  clientIp,
  countryGroups,
  secureCoreEnabled,
  onSelectCountryConnect,
  compact = false,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryGroup | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [isDaylightMode, setIsDaylightMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [flatTextureDataUrl, setFlatTextureDataUrl] = useState<string>('');

  // Store latest callbacks & state in refs so WebGL scene never tears down on React state updates
  const onSelectCountryRef = useRef(onSelectCountryConnect);
  onSelectCountryRef.current = onSelectCountryConnect;

  const countryGroupsRef = useRef(countryGroups);
  countryGroupsRef.current = countryGroups;

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  // Scene object refs for dynamic updates when connection/server/settings change
  const sceneObjectsRef = useRef<{
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    earthMat: THREE.MeshPhysicalMaterial;
    dynamicRouteGroup: THREE.Group;
    nodeMarkersGroup: THREE.Group;
    secureCoreMeshGroup: THREE.Group;
    raycastTargets: THREE.Object3D[];
    packets: PacketTraveler[];
    targetCameraPos: THREE.Vector3 | null;
    maxAnisotropy: number;
    isSoftwareGl: boolean;
  } | null>(null);

  // Focus camera smoothly on a specific (lat, lng) coordinate
  const focusGlobeOnCoords = (lat: number, lng: number, distance: number = 22.5) => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    const targetPos = latLngToSphereVector3(lat, lng, distance, new THREE.Vector3());
    objs.targetCameraPos = targetPos;
  };

  // Initialize Three.js WebGL Globe Scene
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 680;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a12);
    scene.fog = new THREE.FogExp2(0x060a12, 0.011);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
    // Start facing the exact Americas / Atlantic / Europe angle shown in the reference image
    latLngToSphereVector3(-8, -52, compact ? 24.5 : 22.2, camera.position);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Studio Lighting Rig tuned to the Ice-Blue / Deep Navy reference aesthetic
    const hemiLight = new THREE.HemisphereLight(0x7ac5ff, 0x050914, 1.05);
    scene.add(hemiLight);

    // Left-side Ice-Blue Limb Key Light (creates the luminous blue ocean glow on the left curvature)
    const keyLight = new THREE.DirectionalLight(0x88ccff, 2.6);
    keyLight.position.set(-26, 8, 18);
    scene.add(keyLight);

    // Bottom-Right Cyan Rim Light
    const rimLight = new THREE.DirectionalLight(0x4ba3e8, 2.1);
    rimLight.position.set(22, -18, 14);
    scene.add(rimLight);

    // Warm Golden City-Light Specular Accent
    const warmLight = new THREE.PointLight(0xffe6a3, 1.3, 45);
    warmLight.position.set(8, 14, 22);
    scene.add(warmLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 14.2;
    controls.maxDistance = 34;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;

    const onControlStart = () => {
      if (sceneObjectsRef.current) {
        sceneObjectsRef.current.targetCameraPos = null;
      }
    };
    controls.addEventListener('start', onControlStart);

    // Deep-Space Pinpoint Starfield Backdrop (matching the stars around the globe in reference)
    const starCount = isSoftwareGl ? 180 : 420;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 42 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.22,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Master Composite Globe Assembly
    const globeAssembly = new THREE.Group();
    scene.add(globeAssembly);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const { colorMap, emissiveMap, bumpMap, roughnessMap } = createProceduralGlobeTextures(
      maxAnisotropy,
      isSoftwareGl,
      false
    );

    try {
      setFlatTextureDataUrl((colorMap.image as HTMLCanvasElement).toDataURL());
    } catch {
      // Ignore dataURL error
    }

    // Part 1: High-Segment 3D Relief Earth Sphere with Physical Continental Displacement & Fresnel Horizon Glow
    const segs = isSoftwareGl ? 72 : 144;
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, segs, segs);
    const earthMat = new THREE.MeshPhysicalMaterial({
      map: colorMap,
      emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.25,
      bumpMap,
      bumpScale: 0.22,
      displacementMap: bumpMap,
      displacementScale: 0.22,
      displacementBias: -0.04,
      roughnessMap,
      roughness: 0.78,
      metalness: 0.1,
      envMapIntensity: 0.15,
      clearcoat: 0.08,
      clearcoatRoughness: 0.65,
    });

    // Inject custom Fresnel cyan-blue atmospheric horizon scatter into the PBR shader
    earthMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        float fresnelFactor = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);
        vec3 horizonCyan = vec3(0.32, 0.72, 1.0) * fresnelFactor * 0.78;
        outgoingLight += horizonCyan;
        #include <output_fragment>
        `
      );
    };

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeAssembly.add(earthMesh);

    // Part 2: Outer Atmospheric Radial Halo Shell (Custom Fresnel Shader matching the blue aura around the globe)
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 1.15, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          float viewDot = dot(vNormal, normalize(vViewPosition));
          float intensity = pow(clamp(0.62 - viewDot, 0.0, 1.0), 2.8);
          vec3 glowColor = mix(vec3(0.12, 0.42, 0.78), vec3(0.48, 0.82, 1.0), intensity);
          gl_FragColor = vec4(glowColor, intensity * 0.68);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    globeAssembly.add(atmosMesh);

    // Part 3: Grounding Contact Shadow Disc beneath the Globe
    const shadowPlaneGeo = new THREE.RingGeometry(0.1, GLOBE_RADIUS * 1.12, 48);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x03060c,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -GLOBE_RADIUS - 2.4;
    scene.add(shadowPlane);

    // Dynamic Groups for Country Beacons, Secure Core Mesh, and Active Tunnel Arcs
    const nodeMarkersGroup = new THREE.Group();
    const secureCoreMeshGroup = new THREE.Group();
    const dynamicRouteGroup = new THREE.Group();
    globeAssembly.add(nodeMarkersGroup);
    globeAssembly.add(secureCoreMeshGroup);
    globeAssembly.add(dynamicRouteGroup);

    sceneObjectsRef.current = {
      camera,
      controls,
      earthMat,
      dynamicRouteGroup,
      nodeMarkersGroup,
      secureCoreMeshGroup,
      raycastTargets: [],
      packets: [],
      targetCameraPos: null,
      maxAnisotropy,
      isSoftwareGl,
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on Layer 1 for Country Gateway Selection & Hover
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const targets = sceneObjectsRef.current?.raycastTargets || [];
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(targets, false);

      if (hits.length > 0) {
        const code = hits[0].object.userData?.countryCode;
        const found = countryGroupsRef.current.find((g) => g.countryCode === code) || null;
        setHoveredCountry(found);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredCountry(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moveDist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const targets = sceneObjectsRef.current?.raycastTargets || [];
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(targets, false);

      if (hits.length > 0) {
        const code = hits[0].object.userData?.countryCode;
        if (code) {
          onSelectCountryRef.current(code);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerup', handlePointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Software-WebGL Compliant Animation Loop (afterDraw fenceSync when isSoftwareGl)
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);

      const objs = sceneObjectsRef.current;
      if (objs?.targetCameraPos) {
        const alpha = 1 - Math.exp(-4.5 * delta);
        camera.position.lerp(objs.targetCameraPos, alpha);
        if (camera.position.distanceTo(objs.targetCameraPos) < 0.15) {
          objs.targetCameraPos = null;
        }
      } else if (autoRotateRef.current && !isSoftwareGl) {
        const angle = delta * 0.085;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = camera.position.x;
        const z = camera.position.z;
        camera.position.x = x * cos - z * sin;
        camera.position.z = x * sin + z * cos;
      }

      // Advance luminous packets along the 3D trajectory arcs
      if (objs && objs.packets.length > 0) {
        for (const pkt of objs.packets) {
          pkt.progress = (pkt.progress + delta * pkt.speed) % 1;
          pkt.curve.getPointAt(pkt.progress, _tempVecA);
          pkt.mesh.position.copy(_tempVecA);
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      colorMap.dispose();
      emissiveMap.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [compact]);

  // Update Night vs Daylight texture mode when toggled via the [Moon | Sun] pill
  useEffect(() => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;

    const { colorMap, emissiveMap } = createProceduralGlobeTextures(
      objs.maxAnisotropy,
      objs.isSoftwareGl,
      isDaylightMode
    );
    const oldColor = objs.earthMat.map;
    const oldEmissive = objs.earthMat.emissiveMap;

    objs.earthMat.map = colorMap;
    objs.earthMat.emissiveMap = emissiveMap;
    objs.earthMat.emissiveIntensity = isDaylightMode ? 0.65 : 1.18;
    objs.earthMat.needsUpdate = true;

    try {
      setFlatTextureDataUrl((colorMap.image as HTMLCanvasElement).toDataURL());
    } catch {
      // Ignore
    }

    oldColor?.dispose();
    oldEmissive?.dispose();
  }, [isDaylightMode]);

  // Synchronize 3D Glowing White Orb + Concentric Target Ring Nodes & Delicate Cyan Trajectory Arcs
  useEffect(() => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;

    const { nodeMarkersGroup, secureCoreMeshGroup, dynamicRouteGroup } = objs;

    while (nodeMarkersGroup.children.length > 0) {
      nodeMarkersGroup.remove(nodeMarkersGroup.children[0]);
    }
    while (secureCoreMeshGroup.children.length > 0) {
      secureCoreMeshGroup.remove(secureCoreMeshGroup.children[0]);
    }
    while (dynamicRouteGroup.children.length > 0) {
      dynamicRouteGroup.remove(dynamicRouteGroup.children[0]);
    }
    objs.raycastTargets = [];
    objs.packets = [];

    const isConnected = connectionState === VpnConnectionState.Connected;
    const isConnecting = connectionState === VpnConnectionState.Connecting;

    // Reference Image Node Style: Pure Glowing White Core Sphere + Thin Concentric Outer Halo Ring + Subtle Translucent Disc
    const coreOrbGeo = new THREE.SphereGeometry(0.28, 24, 24);
    const peerOrbGeo = new THREE.SphereGeometry(0.16, 18, 18);
    const outerHaloRingGeo = new THREE.RingGeometry(0.68, 0.75, 48);
    const innerDiscGeo = new THREE.CircleGeometry(0.68, 48);
    const peerRingGeo = new THREE.RingGeometry(0.32, 0.37, 32);
    const proxyHitGeo = new THREE.SphereGeometry(0.75, 8, 8);
    const proxyHitMat = new THREE.MeshBasicMaterial({ visible: false });

    const whiteGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    const cyanHaloRingMat = new THREE.MeshBasicMaterial({
      color: 0x99d6ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    const translucentDiscMat = new THREE.MeshBasicMaterial({
      color: 0x58a8e6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });

    // Determine primary focal hub (either activeServer exit, or Brazil/South America default showcase when disconnected so it matches reference image, plus user's real IP)
    const focalCountryCode = activeServer?.exitCountryCode || 'BR';

    // 1. User Real Origin Node
    const originNode = new THREE.Group();
    latLngToSphereVector3(
      clientIp.lat,
      clientIp.lng,
      GLOBE_RADIUS + 0.22,
      originNode.position
    );
    _tempNormal.copy(originNode.position).normalize();
    _tempQuat.setFromUnitVectors(_upAxis, _tempNormal);
    originNode.quaternion.copy(_tempQuat);

    const originOrb = new THREE.Mesh(peerOrbGeo, whiteGlowMat);
    originOrb.position.y = 0.08;
    const originRing = new THREE.Mesh(peerRingGeo, cyanHaloRingMat);
    originRing.rotation.x = -Math.PI / 2;
    originRing.position.y = 0.03;
    originNode.add(originOrb, originRing);
    nodeMarkersGroup.add(originNode);

    // 2. Country Gateway Nodes (3-Part Composite: Glowing White Core + Concentric Ring + Translucent Aura Disc)
    for (const group of countryGroups) {
      const isPrimaryFocal = group.countryCode === focalCountryCode;
      const isCurrentEntry =
        activeServer?.entryCountryCode === group.countryCode &&
        activeServer?.entryCountryCode !== activeServer?.exitCountryCode &&
        (isConnected || isConnecting);

      const nodeGroup = new THREE.Group();
      latLngToSphereVector3(
        group.coordinates.lat,
        group.coordinates.lng,
        GLOBE_RADIUS + 0.22,
        nodeGroup.position
      );
      _tempNormal.copy(nodeGroup.position).normalize();
      _tempQuat.setFromUnitVectors(_upAxis, _tempNormal);
      nodeGroup.quaternion.copy(_tempQuat);

      if (isPrimaryFocal || isCurrentEntry) {
        // Large Hero White Orb + Concentric Halo Ring (100% match to the glowing hub in the reference image)
        const orb = new THREE.Mesh(coreOrbGeo, whiteGlowMat);
        orb.position.y = 0.14;

        const ring = new THREE.Mesh(outerHaloRingGeo, cyanHaloRingMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;

        const disc = new THREE.Mesh(innerDiscGeo, translucentDiscMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.03;

        nodeGroup.add(orb, ring, disc);
      } else {
        // Peer Gateway Node
        const peerMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x88ccff,
          emissiveIntensity: 1.5,
          roughness: 0.15,
        });
        const orb = new THREE.Mesh(peerOrbGeo, peerMat);
        orb.position.y = 0.08;

        const ring = new THREE.Mesh(peerRingGeo, cyanHaloRingMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;

        nodeGroup.add(orb, ring);
      }

      const hitProxy = new THREE.Mesh(proxyHitGeo, proxyHitMat);
      hitProxy.position.y = 0.2;
      hitProxy.layers.set(1);
      hitProxy.userData = { countryCode: group.countryCode };
      objs.raycastTargets.push(hitProxy);

      nodeGroup.add(hitProxy);
      nodeMarkersGroup.add(nodeGroup);
    }

    // 3. Delicate Glowing Ice-Blue Trajectory Arcs (Matching Reference Image Arcs)
    const arcTubeMat = new THREE.MeshBasicMaterial({
      color: 0x6ec3ff,
      transparent: true,
      opacity: 0.78,
    });
    const activeArcTubeMat = new THREE.MeshBasicMaterial({
      color: 0xa8e0ff,
      transparent: true,
      opacity: 0.95,
    });
    const packetGeo = new THREE.SphereGeometry(0.11, 12, 12);

    if (activeServer && (isConnected || isConnecting)) {
      const originCoords: GeoCoordinates = { lat: clientIp.lat, lng: clientIp.lng };
      const isMultiHop =
        activeServer.features.includes(ServerFeature.SecureCore) &&
        activeServer.entryCountryCode !== activeServer.exitCountryCode;

      if (isMultiHop) {
        const curve1 = createSphericalArcCurve(originCoords, activeServer.entryCoords, 2.1);
        const curve2 = createSphericalArcCurve(
          activeServer.entryCoords,
          activeServer.exitCoords,
          2.2
        );
        dynamicRouteGroup.add(
          new THREE.Mesh(new THREE.TubeGeometry(curve1, 52, 0.032, 8, false), activeArcTubeMat),
          new THREE.Mesh(new THREE.TubeGeometry(curve2, 52, 0.036, 8, false), activeArcTubeMat)
        );

        for (let i = 0; i < 3; i++) {
          const m1 = new THREE.Mesh(packetGeo, whiteGlowMat);
          const m2 = new THREE.Mesh(packetGeo, whiteGlowMat);
          dynamicRouteGroup.add(m1, m2);
          objs.packets.push({ mesh: m1, curve: curve1, progress: i / 3, speed: 0.36 });
          objs.packets.push({ mesh: m2, curve: curve2, progress: i / 3, speed: 0.36 });
        }
      } else {
        const curve = createSphericalArcCurve(originCoords, activeServer.exitCoords, 2.2);
        dynamicRouteGroup.add(
          new THREE.Mesh(new THREE.TubeGeometry(curve, 56, 0.036, 8, false), activeArcTubeMat)
        );
        for (let i = 0; i < 3; i++) {
          const m = new THREE.Mesh(packetGeo, whiteGlowMat);
          dynamicRouteGroup.add(m);
          objs.packets.push({ mesh: m, curve, progress: i / 3, speed: 0.34 });
        }
      }

      // Also render secondary ambient global backbone arcs from exit hub
      const secondaryTargets = ['US', 'CH', 'NL', 'JP'].filter(
        (c) => c !== activeServer.exitCountryCode
      );
      for (const code of secondaryTargets) {
        const grp = countryGroups.find((g) => g.countryCode === code);
        if (grp) {
          const subCurve = createSphericalArcCurve(
            activeServer.exitCoords,
            grp.coordinates,
            1.65
          );
          dynamicRouteGroup.add(
            new THREE.Mesh(new THREE.TubeGeometry(subCurve, 44, 0.02, 8, false), arcTubeMat)
          );
        }
      }

      focusGlobeOnCoords(
        activeServer.exitCoords.lat,
        activeServer.exitCoords.lng,
        compact ? 24.0 : 21.8
      );
    } else {
      // Standby Global Network Arcs radiating from South America (Brazil) to North America, Europe & Africa exactly as shown in the reference image!
      const brGroup = countryGroups.find((g) => g.countryCode === 'BR');
      const hubCoords = brGroup ? brGroup.coordinates : { lat: -14.2, lng: -51.9 };
      const standbyPeers: GeoCoordinates[] = [
        { lat: 37.33, lng: -121.88 }, // US West (top-left white node in reference!)
        { lat: 40.71, lng: -74.0 }, // US East
        { lat: 47.37, lng: 8.54 }, // Europe (CH)
        { lat: 51.5, lng: -0.12 }, // UK
        { lat: clientIp.lat, lng: clientIp.lng }, // User's real detected IP
      ];

      standbyPeers.forEach((peer, idx) => {
        const curve = createSphericalArcCurve(hubCoords, peer, 1.85);
        const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.024, 8, false);
        dynamicRouteGroup.add(new THREE.Mesh(tubeGeo, arcTubeMat));

        const pkt = new THREE.Mesh(packetGeo, whiteGlowMat);
        dynamicRouteGroup.add(pkt);
        objs.packets.push({
          mesh: pkt,
          curve,
          progress: (idx * 0.25) % 1,
          speed: 0.22,
        });
      });
    }

    // 4. Secure Core Triangle Mesh when Secure Core is toggled on
    if (secureCoreEnabled) {
      const pairs: Array<[GeoCoordinates, GeoCoordinates]> = [
        [SECURE_CORE_HUBS.CH, SECURE_CORE_HUBS.IS],
        [SECURE_CORE_HUBS.IS, SECURE_CORE_HUBS.SE],
        [SECURE_CORE_HUBS.SE, SECURE_CORE_HUBS.CH],
      ];
      for (const [a, b] of pairs) {
        const curve = createSphericalArcCurve(a, b, 1.3);
        const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.028, 8, false);
        secureCoreMeshGroup.add(new THREE.Mesh(tubeGeo, activeArcTubeMat));
      }
    }
  }, [
    activeServer,
    clientIp.lat,
    clientIp.lng,
    connectionState,
    countryGroups,
    secureCoreEnabled,
    compact,
  ]);

  const handleZoom = (deltaDist: number) => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    const currentDist = objs.camera.position.length();
    const nextDist = THREE.MathUtils.clamp(currentDist + deltaDist, 14.5, 32);
    objs.targetCameraPos = objs.camera.position.clone().normalize().multiplyScalar(nextDist);
  };

  const isConnected = connectionState === VpnConnectionState.Connected;
  const isConnecting = connectionState === VpnConnectionState.Connecting;
  const currentLoad = activeServer?.load ?? 25;
  const protectedRatio = isConnected ? 100 - Math.min(35, Math.round(currentLoad * 0.3)) : 75;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#060A12] select-none ${
        compact ? 'h-[280px] sm:h-[310px]' : 'h-full min-h-[410px]'
      }`}
    >
      {/* Dedicated Empty WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          viewMode === '2D' ? 'hidden' : 'block'
        }`}
        aria-label="Interactive 3D WebGL World Sphere Map"
      />

      {/* 2D Bathymetric Map Projection View when [2D] pill is selected */}
      {viewMode === '2D' && (
        <div className="w-full h-full bg-[#070F1E] flex items-center justify-center relative overflow-hidden">
          {flatTextureDataUrl && (
            <img
              src={flatTextureDataUrl}
              alt="2D Topographical World Map Projection"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-95"
            />
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#060A12] via-transparent to-[#060A12]/60" />
        </div>
      )}

      {/* Top-Left Status & Node Callout Overlay (Solid dark navy surface, zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        <div className="inline-flex items-center gap-2 rounded-xl bg-[#0D1626] border border-[#3888D8]/30 px-3 py-1.5 text-xs text-[#F5F4F8] shadow-lg">
          {isConnected ? (
            <>
              <Shield className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
              <span className="font-semibold text-white">
                {activeServer?.features.includes(ServerFeature.SecureCore)
                  ? `Secure Core: ${activeServer.entryCountryCode} → ${activeServer.exitCountryName}`
                  : `Protected: ${activeServer?.exitCountryName} (${activeServer?.name})`}
              </span>
            </>
          ) : isConnecting ? (
            <>
              <Zap className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="font-semibold text-[#F59E0B]">
                Routing Tunnel to {activeServer?.name}...
              </span>
            </>
          ) : (
            <>
              <Compass className="w-3.5 h-3.5 text-[#68B8F8] shrink-0" />
              <span className="text-[#94A3B8]">
                {clientIp.city}, {clientIp.countryCode} ·{' '}
                <span className="font-mono text-white">{clientIp.ip}</span>
              </span>
            </>
          )}
        </div>

        {/* Hovered 3D Gateway Node Callout */}
        {hoveredCountry && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#0F1B2E] border border-[#68B8F8]/50 px-3 py-1.5 text-xs text-[#E2E8F0] shadow-lg">
            <span>{COUNTRY_FLAGS[hoveredCountry.countryCode]}</span>
            <span className="font-bold text-white">{hoveredCountry.countryName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[#94A3B8]">
              {hoveredCountry.servers.length + hoveredCountry.secureCoreServers.length} nodes
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#68B8F8] font-semibold">Click orb to connect</span>
          </div>
        )}
      </div>

      {/* Top-Right Theme [Moon | Sun] & [3D | 2D] Controls (Exact match to reference image top-right pills) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Night / Day Illumination Toggle */}
        <div className="flex items-center rounded-xl bg-[#0D1626] border border-white/10 p-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => setIsDaylightMode(false)}
            title="Night City Lights Globe"
            aria-label="Night City Lights Globe"
            className={`min-h-[30px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
              !isDaylightMode
                ? 'bg-[#3B66F5] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsDaylightMode(true)}
            title="Daylight Blue Marble Globe"
            aria-label="Daylight Blue Marble Globe"
            className={`min-h-[30px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
              isDaylightMode
                ? 'bg-[#3B66F5] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D / 2D View Switcher */}
        <div className="flex items-center rounded-xl bg-[#0D1626] border border-white/10 p-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('3D')}
            className={`min-h-[30px] px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === '3D'
                ? 'bg-[#3B66F5] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('2D')}
            className={`min-h-[30px] px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === '2D'
                ? 'bg-[#3B66F5] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D</span>
          </button>
        </div>
      </div>

      {/* Bottom-Left Floating Telemetry Card (Matches "Parcels in the way 24 / 75" card in reference) */}
      {!compact && (
        <div className="pointer-events-none hidden sm:flex flex-col justify-between absolute bottom-14 left-3 z-10 w-44 rounded-2xl bg-[#0D1626] border border-white/10 p-3 shadow-xl">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span className="font-medium text-white">Active Gateways</span>
            <span className="font-mono text-[#68B8F8]">ProTUN</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
            {isConnected ? '18 / 18' : '14 / 18'}
          </div>
          <div className="text-[10px] text-[#4ADE80] mt-1 font-medium">
            ▲ +15% routing efficiency
          </div>
        </div>
      )}

      {/* Bottom-Right Dual Circular Ring Gauges (Matches the 75% / 25% rings in reference image) */}
      {!compact && (
        <div className="pointer-events-none hidden sm:flex items-center gap-2.5 absolute bottom-14 right-3 z-10">
          {/* Ring 1: Protected / Uptime Ratio */}
          <div className="relative w-14 h-14 rounded-full bg-[#0D1626] border border-white/10 flex flex-col items-center justify-center shadow-xl">
            <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="2.4"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.4"
                strokeDasharray={`${protectedRatio}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xs font-bold font-mono text-white leading-none tabular-nums">
              {protectedRatio}%
            </span>
            <span className="text-[8px] text-[#94A3B8] mt-0.5">Health</span>
          </div>

          {/* Ring 2: Server Load */}
          <div className="relative w-14 h-14 rounded-full bg-[#0D1626] border border-white/10 flex flex-col items-center justify-center shadow-xl">
            <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="2.4"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#4ADE80"
                strokeWidth="2.4"
                strokeDasharray={`${currentLoad}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xs font-bold font-mono text-white leading-none tabular-nums">
              {currentLoad}%
            </span>
            <span className="text-[8px] text-[#94A3B8] mt-0.5">Load</span>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Occlusion, No backdrop-filter over WebGL) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[96%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="px-2.5 py-0.5 rounded-t-lg bg-[#0D1626] border border-b-0 border-white/15 text-[10px] font-semibold text-[#94A3B8] hover:text-white flex items-center gap-1 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show Globe Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="flex items-center gap-1 rounded-xl bg-[#0D1626] border border-white/15 px-2 py-1 shadow-xl overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => focusGlobeOnCoords(-8, -52, 22.2)}
              className="min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold text-[#E2E8F0] hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Americas
            </button>

            <button
              type="button"
              onClick={() => focusGlobeOnCoords(47.37, 8.54, 21.5)}
              className="min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Europe (CH)
            </button>

            <button
              type="button"
              onClick={() => focusGlobeOnCoords(clientIp.lat, clientIp.lng, 22.0)}
              className="min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              My IP ({clientIp.countryCode})
            </button>

            <button
              type="button"
              onClick={() => focusGlobeOnCoords(25.0, 105.0, 22.5)}
              className="min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Asia
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={() => setAutoRotate((r) => !r)}
              title="Toggle globe auto-rotation"
              className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoRotate
                  ? 'bg-[#3B66F5] text-white'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/10'
              }`}
            >
              Orbit
            </button>

            <button
              type="button"
              onClick={() => handleZoom(-3.0)}
              title="Zoom in globe"
              aria-label="Zoom in globe"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleZoom(3.0)}
              title="Zoom out globe"
              aria-label="Zoom out globe"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoRotate(true);
                focusGlobeOnCoords(-8, -52, 22.2);
              }}
              title="Reset globe orientation"
              aria-label="Reset globe orientation"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {secureCoreEnabled && (
              <span className="inline-flex items-center gap-1 pl-1.5 pr-1 text-[11px] font-semibold text-[#93C5FD] whitespace-nowrap shrink-0">
                <Lock className="w-3 h-3 text-[#68B8F8]" />
                <span>CH·IS·SE</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
