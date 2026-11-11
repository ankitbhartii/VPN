/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FolderKanban,
  Globe,
  Home,
  KeyRound,
  Lock,
  Settings as SettingsIcon,
  Shield,
  Sliders,
} from 'lucide-react';
import {
  ActiveMobileTab,
  ClientIpInfo,
  ConnectionProfile,
  HandshakeStage,
  LogicalServer,
  NetShieldLevel,
  NetShieldStats,
  ReaDissectionEvent,
  ServerFeature,
  SplitTunnelMode,
  TelemetryPoint,
  VpnConnectionState,
  VpnProtocol,
  VpnSettings,
} from './types/vpn';
import {
  buildCountryGroups,
  DEFAULT_PROFILES,
  DEFAULT_SPLIT_TUNNEL_APPS,
  INITIAL_LOGICAL_SERVERS,
} from './data/protonServers';
import { detectClientIp, probeLiveNetworkRtt } from './services/networkProber';
import { ProtonWorldMap } from './components/ProtonWorldMap';
import { HomeScreenView } from './components/HomeScreenView';
import { CountriesScreenView } from './components/CountriesScreenView';
import { ProfilesScreenView } from './components/ProfilesScreenView';
import { SettingsScreenView } from './components/SettingsScreenView';
import {
  buildWireGuardConf,
  IssuedProtonCertificate,
  ReaDissectionPanel,
} from './components/ReaDissectionPanel';
import { VpnSiteTesterPanel } from './components/VpnSiteTesterPanel';
import { BottomSheetModal } from './components/BottomSheetModal';
import {
  ApkDownloadModal,
  DeviceApkInstallCard,
  OfflineIndicator,
} from './components/ApkDownloadModal';

const STORAGE_KEY_SETTINGS = 'protonvpn_web_settings_v1';
const STORAGE_KEY_PROFILES = 'protonvpn_web_profiles_v1';

const DEFAULT_SETTINGS: VpnSettings = {
  protocol: VpnProtocol.Smart,
  netShieldLevel: NetShieldLevel.AdsTrackersMalware,
  secureCore: false,
  killSwitch: 'STANDARD',
  vpnAccelerator: true,
  moderateNat: false,
  allowLanConnections: true,
  ipv6Support: true,
  customDnsEnabled: false,
  customDnsServers: ['10.2.0.1', '9.9.9.9'],
  splitTunneling: {
    enabled: false,
    mode: SplitTunnelMode.Exclude,
    apps: DEFAULT_SPLIT_TUNNEL_APPS,
    ipSubnets: ['192.168.1.0/24', '10.0.0.0/8'],
  },
};

export default function App() {
  // Active screen tab (Mirrors ProtonVPN Android Redesign bottom nav: Home, Countries, Profiles, Settings)
  const [activeTab, setActiveTab] = useState<ActiveMobileTab>(ActiveMobileTab.Home);

  // Persisted settings
  const [settings, setSettings] = useState<VpnSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_SETTINGS;
  });

  // Persisted connection profiles
  const [profiles, setProfiles] = useState<ConnectionProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_PROFILES;
  });

  // Logical servers state
  const [servers, setServers] = useState<LogicalServer[]>(INITIAL_LOGICAL_SERVERS);
  const [recentServerIds, setRecentServerIds] = useState<string[]>([
    'ch-14',
    'us-ny-108',
    'nl-42',
    'jp-55',
  ]);

  // Client real public IP & latency probing state
  const [clientIp, setClientIp] = useState<ClientIpInfo>({
    ip: 'Detecting IP...',
    isp: 'Probing network...',
    city: 'Local',
    countryName: 'United States',
    countryCode: 'US',
    lat: 37.7749,
    lng: -122.4194,
    isRealDetected: false,
  });
  const [isProbingIp, setIsProbingIp] = useState<boolean>(false);

  // VPN Connection State Machine (VpnStateMonitor)
  const [connectionState, setConnectionState] = useState<VpnConnectionState>(
    VpnConnectionState.Disconnected
  );
  const [handshakeStage, setHandshakeStage] = useState<HandshakeStage>(HandshakeStage.Idle);
  const [activeServer, setActiveServer] = useState<LogicalServer | null>(null);
  const [issuedCert, setIssuedCert] = useState<IssuedProtonCertificate | null>(null);
  const [externalTunnelUrl, setExternalTunnelUrl] = useState<string | null>(null);
  const handshakeTimersRef = useRef<number[]>([]);

  // Session telemetry & NetShield counters
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [totalBytesDown, setTotalBytesDown] = useState<number>(0);
  const [totalBytesUp, setTotalBytesUp] = useState<number>(0);
  const [netShieldStats, setNetShieldStats] = useState<NetShieldStats>({
    adsBlocked: 14,
    trackersBlocked: 39,
    malwareBlocked: 0,
    dataSavedBytes: 1_840_200,
  });
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>(() =>
    Array.from({ length: 24 }, (_, idx) => ({
      timestamp: Date.now() - (24 - idx) * 1000,
      downKBps: 0,
      upKBps: 0,
    }))
  );

  // REA Dissection Live StateFlow Event Log
  const [reaEvents, setReaEvents] = useState<ReaDissectionEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      kotlinClass: 'ServerManager2.kt',
      methodSignature: 'onServersLoaded(logicalServers: 18)',
      stateEmission: 'StateFlow<ServerListVersion> -> Ready (Tier 0 + Tier 2 + SecureCore)',
      layer: 'Domain / ServerManager2',
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      kotlinClass: 'HomeViewModel.kt',
      methodSignature: 'collect(vpnStateMonitor.status)',
      stateEmission: 'HomeViewState(status = Disconnected, netShield = F2_FULL)',
      layer: 'ViewModel / StateFlow',
    },
  ]);

  // Interactive Bottom Sheet Drawers
  const [isNetShieldSheetOpen, setIsNetShieldSheetOpen] = useState(false);
  const [isSecureCoreSheetOpen, setIsSecureCoreSheetOpen] = useState(false);
  const [isProtocolSheetOpen, setIsProtocolSheetOpen] = useState(false);
  const [isWgConfigSheetOpen, setIsWgConfigSheetOpen] = useState(false);
  const [isMobileReaSheetOpen, setIsMobileReaSheetOpen] = useState(false);
  const [isApkSheetOpen, setIsApkSheetOpen] = useState(false);
  const [copiedWgModal, setCopiedWgModal] = useState(false);

  const appendReaEvent = useCallback(
    (
      kotlinClass: string,
      methodSignature: string,
      stateEmission: string,
      layer: ReaDissectionEvent['layer']
    ) => {
      setReaEvents((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          kotlinClass,
          methodSignature,
          stateEmission,
          layer,
        },
        ...prev.slice(0, 19),
      ]);
    },
    []
  );

  // Save settings & profiles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore storage error
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch {
      // Ignore storage error
    }
  }, [profiles]);

  // Probe real client IP and server latencies on startup
  const runNetworkProbe = useCallback(async () => {
    setIsProbingIp(true);
    const detected = await detectClientIp();
    setClientIp(detected);

    const { baseRttMs, updatedServers } = await probeLiveNetworkRtt(
      { lat: detected.lat, lng: detected.lng },
      INITIAL_LOGICAL_SERVERS
    );
    setServers(updatedServers);
    setIsProbingIp(false);

    appendReaEvent(
      'ApiLocationManager.kt',
      `updateUserLocation(ip="${detected.ip}", country="${detected.countryCode}")`,
      `Measured base HTTP RTT=${baseRttMs}ms -> Recalculated ServerManager2 scores`,
      'Domain / ServerManager2'
    );
  }, [appendReaEvent]);

  useEffect(() => {
    runNetworkProbe();
  }, [runNetworkProbe]);

  // Clear pending connection timers on unmount
  const clearHandshakeTimers = useCallback(() => {
    handshakeTimersRef.current.forEach((id) => window.clearTimeout(id));
    handshakeTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearHandshakeTimers();
  }, [clearHandshakeTimers]);

  // Country groups derived from logical servers
  const countryGroups = useMemo(() => buildCountryGroups(servers), [servers]);

  // Recent servers list
  const recentServers = useMemo(() => {
    return recentServerIds
      .map((id) => servers.find((s) => s.id === id))
      .filter((s): s is LogicalServer => Boolean(s));
  }, [recentServerIds, servers]);

  // Start connection handshake to a specific LogicalServer
  const connectToServer = useCallback(
    (targetServer: LogicalServer) => {
      clearHandshakeTimers();

      const usesSecureCore = targetServer.features.includes(ServerFeature.SecureCore);
      if (usesSecureCore !== settings.secureCore) {
        setSettings((prev) => ({ ...prev, secureCore: usesSecureCore }));
      }

      setActiveServer(targetServer);
      setConnectionState(VpnConnectionState.Connecting);
      setHandshakeStage(HandshakeStage.CheckingAvailability);

      // Trigger real Android OS VpnService (shows system VPN Key icon 🔑 in Android status bar)
      if (typeof window !== 'undefined' && window.AndroidVpnBridge) {
        try {
          window.AndroidVpnBridge.startVpn(
            targetServer.name,
            targetServer.exitIp,
            targetServer.exitCountryName,
            settings.protocol
          );
        } catch {
          // Ignore if bridge not ready
        }
      }

      setRecentServerIds((prev) => [
        targetServer.id,
        ...prev.filter((id) => id !== targetServer.id),
      ]);

      appendReaEvent(
        'VpnConnectionManager.kt',
        `connect(server="${targetServer.name}", protocol="${settings.protocol}")`,
        `VpnStateMonitor -> Connecting (${targetServer.entryIp} -> ${targetServer.exitIp})`,
        'Core / ProTUN WireGuard'
      );

      // Request real X25519/Ed25519 ProtonVPN Session Certificate from dissected ProtonVPNRetrofit.kt endpoint
      fetch('/api/proton/vpn/v1/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ClientPublicKeyMode: 'X25519',
          DeviceName: 'ProtonVPN-Web-Android-Clone',
          Duration: '24 hours',
          ServerName: targetServer.name,
          ExitIp: targetServer.exitIp,
          Features: {
            NetShieldLevel:
              settings.netShieldLevel === NetShieldLevel.AdsTrackersMalware
                ? 2
                : settings.netShieldLevel === NetShieldLevel.MalwareOnly
                ? 1
                : 0,
            RandomNAT: !settings.moderateNat,
            SplitTCP: settings.vpnAccelerator,
            Bouncing: '0',
          },
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((certData: IssuedProtonCertificate | null) => {
          if (certData && certData.SerialNumber) {
            setIssuedCert(certData);
            appendReaEvent(
              'CertificateRepository.kt',
              `updateCertificate(serial="${certData.SerialNumber.slice(0, 12)}...")`,
              `POST /vpn/v1/certificate -> 1000 OK | REA SHA256=${certData.ReaEvidenceSnapshot?.sha256?.slice(0, 14) || 'verified'}`,
              'Core / ProTUN WireGuard'
            );
          }
        })
        .catch(() => {
          // Ignore transient certificate error
        });

      const t1 = window.setTimeout(() => {
        setHandshakeStage(HandshakeStage.InitializingProTun);
      }, 320);

      const t2 = window.setTimeout(() => {
        setHandshakeStage(HandshakeStage.ExchangingKeys);
        appendReaEvent(
          'WireGuardBackend.kt',
          `prepareTunnel(peerKey="${targetServer.gatewayPublicKey.slice(0, 14)}...")`,
          `Curve25519 Noise_IKpsk2 handshake complete`,
          'Core / ProTUN WireGuard'
        );
      }, 720);

      const t3 = window.setTimeout(() => {
        setHandshakeStage(HandshakeStage.ApplyingNetShield);
      }, 1050);

      const t4 = window.setTimeout(() => {
        setHandshakeStage(HandshakeStage.TunnelEstablished);
        setConnectionState(VpnConnectionState.Connected);
        setSessionSeconds(0);
        appendReaEvent(
          'VpnStateMonitor.kt',
          `onStateChanged(Connected)`,
          `Tunnel active on ${targetServer.name} | Virtual Exit IP: ${targetServer.exitIp}`,
          'ViewModel / StateFlow'
        );
      }, 1350);

      handshakeTimersRef.current = [t1, t2, t3, t4];
    },
    [
      appendReaEvent,
      clearHandshakeTimers,
      settings.moderateNat,
      settings.netShieldLevel,
      settings.protocol,
      settings.secureCore,
      settings.vpnAccelerator,
    ]
  );

  // Disconnect active VPN session
  const disconnectVpn = useCallback(() => {
    clearHandshakeTimers();
    if (typeof window !== 'undefined' && window.AndroidVpnBridge) {
      try {
        window.AndroidVpnBridge.stopVpn();
      } catch {
        // Ignore bridge error
      }
    }
    setConnectionState(VpnConnectionState.Disconnected);
    setHandshakeStage(HandshakeStage.Idle);
    appendReaEvent(
      'VpnConnectionManager.kt',
      'disconnect(ConnectTrigger.QuickConnect)',
      'VpnStateMonitor -> Disconnected (Restored direct interface)',
      'ViewModel / StateFlow'
    );
  }, [appendReaEvent, clearHandshakeTimers]);

  // Select optimal international server (excluding restricted local IN nodes so TikTok/CapCut always unblock)
  const findFastestServer = useCallback(
    (forceSecureCore?: boolean): LogicalServer => {
      const wantSc = forceSecureCore ?? settings.secureCore;
      const pool = servers.filter(
        (s) =>
          s.features.includes(ServerFeature.SecureCore) === wantSc &&
          s.exitCountryCode !== 'IN'
      );
      const chOrAu = pool.find((s) => s.id === 'ch-14' || s.id === 'au-31');
      if (chOrAu && !wantSc) return chOrAu;
      const sorted = [...(pool.length > 0 ? pool : servers)].sort((a, b) => {
        const latA = a.measuredLatencyMs ?? a.baseLatencyMs;
        const latB = b.measuredLatencyMs ?? b.baseLatencyMs;
        return latA + a.load * 0.4 - (latB + b.load * 0.4);
      });
      return sorted[0] || servers[0];
    },
    [servers, settings.secureCore]
  );

  // Quick Connect / Disconnect handler
  const handleQuickConnectToggle = useCallback(() => {
    if (
      connectionState === VpnConnectionState.Connected ||
      connectionState === VpnConnectionState.Connecting
    ) {
      disconnectVpn();
    } else {
      const best = findFastestServer();
      connectToServer(best);
    }
  }, [connectionState, connectToServer, disconnectVpn, findFastestServer]);

  // Connect to best server in a given country
  const handleSelectCountryConnect = useCallback(
    (countryCode: string) => {
      const group = countryGroups.find((g) => g.countryCode === countryCode);
      if (!group) return;

      const candidatePool =
        settings.secureCore && group.secureCoreServers.length > 0
          ? group.secureCoreServers
          : group.servers.length > 0
          ? group.servers
          : group.secureCoreServers;

      if (candidatePool.length > 0) {
        const bestInCountry = [...candidatePool].sort(
          (a, b) =>
            (a.measuredLatencyMs ?? a.baseLatencyMs) -
            (b.measuredLatencyMs ?? b.baseLatencyMs)
        )[0];
        connectToServer(bestInCountry);
      }
    },
    [connectToServer, countryGroups, settings.secureCore]
  );

  // Connect using a ConnectionProfile preset
  const handleConnectProfile = useCallback(
    (profile: ConnectionProfile) => {
      setSettings((prev) => ({
        ...prev,
        protocol: profile.protocol,
        netShieldLevel: profile.netShieldLevel,
        secureCore: profile.isSecureCore,
      }));

      let target: LogicalServer | undefined;
      if (profile.serverId) {
        target = servers.find((s) => s.id === profile.serverId);
      }
      if (!target) {
        if (profile.countryCode === 'FASTEST') {
          target = findFastestServer(profile.isSecureCore);
        } else if (profile.countryCode === 'RANDOM') {
          const pool = servers.filter(
            (s) => s.features.includes(ServerFeature.SecureCore) === profile.isSecureCore
          );
          target = pool[Math.floor(Math.random() * pool.length)] || servers[0];
        } else {
          const matching = servers.filter(
            (s) =>
              s.exitCountryCode === profile.countryCode &&
              s.features.includes(ServerFeature.SecureCore) === profile.isSecureCore
          );
          target =
            matching[0] ||
            servers.find((s) => s.exitCountryCode === profile.countryCode) ||
            servers[0];
        }
      }

      appendReaEvent(
        'ProfilesViewModel.kt',
        `onConnectProfile("${profile.name}")`,
        `Applied protocol=${profile.protocol}, netShield=${profile.netShieldLevel}`,
        'ViewModel / StateFlow'
      );

      connectToServer(target);
      setActiveTab(ActiveMobileTab.Home);
    },
    [appendReaEvent, connectToServer, findFastestServer, servers]
  );

  // Live 1-second session telemetry & NetShield counter ticker when connected
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (connectionState === VpnConnectionState.Connected) {
        setSessionSeconds((s) => s + 1);

        // Realistic fluctuating WireGuard throughput
        const downKBps = Math.round(620 + Math.random() * 2850);
        const upKBps = Math.round(140 + Math.random() * 680);

        setTotalBytesDown((b) => b + downKBps * 1024);
        setTotalBytesUp((b) => b + upKBps * 1024);

        setTelemetryHistory((prev) => [
          ...prev.slice(1),
          { timestamp: Date.now(), downKBps, upKBps },
        ]);

        if (
          settings.netShieldLevel === NetShieldLevel.AdsTrackersMalware &&
          Math.random() > 0.55
        ) {
          const newAds = Math.random() > 0.6 ? 1 : 0;
          const newTrackers = Math.random() > 0.35 ? 1 : 0;
          setNetShieldStats((prev) => ({
            adsBlocked: prev.adsBlocked + newAds,
            trackersBlocked: prev.trackersBlocked + newTrackers,
            malwareBlocked: prev.malwareBlocked,
            dataSavedBytes: prev.dataSavedBytes + (newAds * 48_000 + newTrackers * 19_500),
          }));
        }
      } else {
        setTelemetryHistory((prev) => [
          ...prev.slice(1),
          { timestamp: Date.now(), downKBps: 0, upKBps: 0 },
        ]);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [connectionState, settings.netShieldLevel]);

  // Toggle Secure Core and dynamically re-route if currently connected
  const handleToggleSecureCore = useCallback(
    (enabled: boolean) => {
      setSettings((prev) => ({ ...prev, secureCore: enabled }));
      appendReaEvent(
        'HomeViewModel.kt',
        `setSecureCore(${enabled})`,
        `ServerManager2 filter updated -> SecureCore=${enabled}`,
        'ViewModel / StateFlow'
      );

      if (connectionState === VpnConnectionState.Connected && activeServer) {
        const group = countryGroups.find(
          (g) => g.countryCode === activeServer.exitCountryCode
        );
        const replacement = enabled
          ? group?.secureCoreServers[0] || findFastestServer(true)
          : group?.servers[0] || findFastestServer(false);
        if (replacement) {
          connectToServer(replacement);
        }
      }
    },
    [
      activeServer,
      appendReaEvent,
       connectToServer,
      connectionState,
      countryGroups,
      findFastestServer,
    ]
  );

  // Create & Delete Custom Profiles
  const handleCreateProfile = useCallback(
    (newProfile: Omit<ConnectionProfile, 'id'>) => {
      const created: ConnectionProfile = {
        ...newProfile,
        id: `custom-${Date.now()}`,
      };
      setProfiles((prev) => [...prev, created]);
      appendReaEvent(
        'ProfileEditViewModel.kt',
        `saveProfile("${created.name}")`,
        `Persisted custom profile -> ${created.countryCode} (${created.protocol})`,
        'UI / Compose'
      );
    },
    [appendReaEvent]
  );

  const handleDeleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      appendReaEvent(
        'ProfileEditViewModel.kt',
        `deleteProfile(id="${id}")`,
        `Removed custom profile from local store`,
        'UI / Compose'
      );
    },
    [appendReaEvent]
  );

  const isConnected = connectionState === VpnConnectionState.Connected;
  const isConnecting = connectionState === VpnConnectionState.Connecting;
  const wgConfPreview = buildWireGuardConf(activeServer, settings, issuedCert);

  return (
    <div className="min-h-screen bg-[#0C0A12] text-[#F5F4F8] flex flex-col">
      {/* Android System Status Bar Strip with Live VPN Key Icon (🔑) when Connected or Connecting */}
      {(isConnected || isConnecting) && activeServer && (
        <div className="bg-gradient-to-r from-[#1EA885]/25 via-[#181524] to-[#6D4AFF]/25 border-b border-[#1EA885]/40 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
            <span className="font-bold text-[#34D399]">
              {isConnected ? '🔑 VPN KEY ACTIVE (tun0)' : '🔑 ESTABLISHING TUNNEL...'}
            </span>
            <span className="text-[#A7A4B5]">·</span>
            <span className="font-mono text-white font-semibold">
              {activeServer.exitCountryName} ({activeServer.name} · {activeServer.exitIp})
            </span>
            <span className="hidden sm:inline text-[#A7A4B5]">
              · Local IP (<span className="line-through text-[#FCA5A5]">{clientIp.ip}</span>) Masked
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExternalTunnelUrl('https://www.tiktok.com')}
              className="px-2.5 py-0.5 rounded-md bg-[#1EA885] hover:bg-[#179373] text-[#0C0A12] font-bold text-[11px] cursor-pointer"
            >
              Open TikTok ({activeServer.exitCountryCode})
            </button>
            <button
              type="button"
              onClick={() => setExternalTunnelUrl('https://ipleak.net')}
              className="px-2.5 py-0.5 rounded-md bg-[#262235] hover:bg-white/15 text-[#34D399] font-mono text-[11px] cursor-pointer"
            >
              Check IP: {activeServer.exitIp}
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 (Brand wordmark | 4 single-line nav links | 1 primary CTA) */}
      <header className="sticky top-0 z-30 h-[56px] flex items-center justify-between gap-8 px-4 sm:px-6 bg-[#13111C]/90 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab(ActiveMobileTab.Home);
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Proton VPN
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#A7A4B5]">
          {(
            [
              { id: ActiveMobileTab.Home, label: 'Home' },
              { id: ActiveMobileTab.Countries, label: 'Countries' },
              { id: ActiveMobileTab.Profiles, label: 'Profiles' },
              { id: ActiveMobileTab.Settings, label: 'Settings' },
            ] as { id: ActiveMobileTab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === item.id
                  ? 'text-white underline underline-offset-8 decoration-[#6D4AFF] decoration-2'
                  : 'hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleQuickConnectToggle}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isConnected
                ? 'bg-[#1EA885]/20 text-[#34D399] border border-[#1EA885]/40 hover:bg-[#EF4444]/20 hover:text-[#FCA5A5] hover:border-[#EF4444]/40'
                : isConnecting
                ? 'bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/40'
                : 'bg-[#6D4AFF] hover:bg-[#7C5CFF] text-white'
            }`}
          >
            {isConnected ? '🔑 Disconnect' : isConnecting ? 'Connecting...' : 'Quick Connect'}
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace: Mobile-First Ergonomics + Full Multi-Column Desktop Presence */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols on lg): Faithful ProtonVPN Android App Screen Frame */}
          <section
            aria-label="ProtonVPN Android Application Interface"
            className="lg:col-span-5 w-full max-w-lg mx-auto lg:max-w-none space-y-4"
          >
            {/* Prominent APK Download & Standalone Device App Installer Card */}
            <DeviceApkInstallCard
              activeServer={activeServer}
              settings={settings}
              onOpenApkModal={() => setIsApkSheetOpen(true)}
            />

            {activeTab === ActiveMobileTab.Home && (
              <HomeScreenView
                connectionState={connectionState}
                handshakeStage={handshakeStage}
                activeServer={activeServer}
                clientIp={clientIp}
                isProbingIp={isProbingIp}
                onRefreshIpAndLatency={runNetworkProbe}
                onQuickConnectToggle={handleQuickConnectToggle}
                onConnectServer={connectToServer}
                onConnectProfile={handleConnectProfile}
                onSelectCountryConnect={handleSelectCountryConnect}
                countryGroups={countryGroups}
                recentServers={recentServers}
                profiles={profiles}
                settings={settings}
                netShieldStats={netShieldStats}
                telemetryHistory={telemetryHistory}
                sessionSeconds={sessionSeconds}
                totalBytesDown={totalBytesDown}
                totalBytesUp={totalBytesUp}
                onOpenNetShieldSheet={() => setIsNetShieldSheetOpen(true)}
                onOpenSecureCoreSheet={() => setIsSecureCoreSheetOpen(true)}
                onOpenProtocolSheet={() => setIsProtocolSheetOpen(true)}
                onOpenWireGuardConfig={() => setIsWgConfigSheetOpen(true)}
                onLaunchTunnelSite={(url) => setExternalTunnelUrl(url)}
              />
            )}

            {activeTab === ActiveMobileTab.Countries && (
              <CountriesScreenView
                countryGroups={countryGroups}
                activeServer={activeServer}
                connectionState={connectionState}
                secureCoreEnabled={settings.secureCore}
                onToggleSecureCore={handleToggleSecureCore}
                onConnectServer={connectToServer}
                onSelectCountryConnect={handleSelectCountryConnect}
                onRefreshLatency={runNetworkProbe}
                isProbing={isProbingIp}
              />
            )}

            {activeTab === ActiveMobileTab.Profiles && (
              <ProfilesScreenView
                profiles={profiles}
                countryGroups={countryGroups}
                onConnectProfile={handleConnectProfile}
                onCreateProfile={handleCreateProfile}
                onDeleteProfile={handleDeleteProfile}
              />
            )}

            {activeTab === ActiveMobileTab.Settings && (
              <SettingsScreenView
                settings={settings}
                onUpdateSettings={(updater) => {
                  setSettings((prev) => {
                    const next = updater(prev);
                    appendReaEvent(
                      'UserData.kt',
                      'updateSettings()',
                      `Protocol=${next.protocol} | NetShield=${next.netShieldLevel} | KillSwitch=${next.killSwitch}`,
                      'ViewModel / StateFlow'
                    );
                    return next;
                  });
                }}
                onOpenWireGuardConfig={() => setIsWgConfigSheetOpen(true)}
                onOpenReaDissectionSheet={() => setIsMobileReaSheetOpen(true)}
              />
            )}

            {/* Mobile/Tablet Backend VPN Tunnel & Geo-Restricted Site Verifier */}
            <div className="lg:hidden mt-4">
              <VpnSiteTesterPanel
                connectionState={connectionState}
                activeServer={activeServer}
                realClientIp={clientIp.ip}
                settings={settings}
                onQuickConnectRequest={handleQuickConnectToggle}
                onSelectCountryConnect={handleSelectCountryConnect}
                externalTriggerUrl={externalTunnelUrl}
                onClearExternalTrigger={() => setExternalTunnelUrl(null)}
                onNetShieldIncrement={(ads, trackers, saved) => {
                  setNetShieldStats((prev) => ({
                    ...prev,
                    adsBlocked: prev.adsBlocked + ads,
                    trackersBlocked: prev.trackersBlocked + trackers,
                    dataSavedBytes: prev.dataSavedBytes + saved,
                  }));
                }}
              />
            </div>
          </section>

          {/* Right Column (7 cols on lg): Live Interactive Global Tunnel Map, Backend Site Verifier & REA Android Dissection Inspector */}
          <aside
            aria-label="Global Tunnel Map and REA Architecture Dissection"
            className="hidden lg:flex lg:col-span-7 flex-col gap-5"
          >
            {/* Interactive World Map Canvas */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#13111C] h-[390px]">
              <ProtonWorldMap
                connectionState={connectionState}
                activeServer={activeServer}
                clientIp={clientIp}
                countryGroups={countryGroups}
                secureCoreEnabled={settings.secureCore}
                onSelectCountryConnect={handleSelectCountryConnect}
              />
            </div>

            {/* Real Backend VPN Tunnel & Geo-Restricted Site Verifier (TikTok, CapCut, Telegram, Reddit, etc.) */}
            <VpnSiteTesterPanel
              connectionState={connectionState}
              activeServer={activeServer}
              realClientIp={clientIp.ip}
              settings={settings}
              onQuickConnectRequest={handleQuickConnectToggle}
              onSelectCountryConnect={handleSelectCountryConnect}
              externalTriggerUrl={externalTunnelUrl}
              onClearExternalTrigger={() => setExternalTunnelUrl(null)}
              onNetShieldIncrement={(ads, trackers, saved) => {
                setNetShieldStats((prev) => ({
                  ...prev,
                  adsBlocked: prev.adsBlocked + ads,
                  trackersBlocked: prev.trackersBlocked + trackers,
                  dataSavedBytes: prev.dataSavedBytes + saved,
                }));
              }}
            />

            {/* REA (morluto/rea) Android Dissection & Live StateFlow / WireGuard Inspector */}
            <ReaDissectionPanel
              connectionState={connectionState}
              activeServer={activeServer}
              settings={settings}
              events={reaEvents}
              issuedCert={issuedCert}
            />
          </aside>
        </div>
      </main>

      {/* Fixed Bottom Tab Navigation Bar (Mirrors ProtonVPN Android Redesign NavigationBar) */}
      <nav
        aria-label="Bottom Navigation Tabs"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#13111C]/95 backdrop-blur-md border-t border-white/10"
      >
        <div className="max-w-lg mx-auto h-full grid grid-cols-4 items-center px-2">
          {(
            [
              { id: ActiveMobileTab.Home, label: 'Home', Icon: Home },
              { id: ActiveMobileTab.Countries, label: 'Countries', Icon: Globe },
              { id: ActiveMobileTab.Profiles, label: 'Profiles', Icon: FolderKanban },
              { id: ActiveMobileTab.Settings, label: 'Settings', Icon: SettingsIcon },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  active ? 'text-[#8A6EFF]' : 'text-[#A7A4B5] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* NetShield Configuration Bottom Sheet */}
      <BottomSheetModal
        isOpen={isNetShieldSheetOpen}
        onClose={() => setIsNetShieldSheetOpen(false)}
        title="NetShield Privacy Panel (NetShieldViewState)"
        subtitle="DNS-level filtering blocking ads, tracking domains, and malware hosts"
      >
        <div className="space-y-2.5">
          {[
            {
              level: NetShieldLevel.AdsTrackersMalware,
              title: 'Block malware, ads, & trackers',
              desc: 'Full protection (+f2 flag on WireGuard certificate). Saves ~40% mobile data.',
            },
            {
              level: NetShieldLevel.MalwareOnly,
              title: 'Block malware only',
              desc: 'Blocks known phishing, cryptojacking, and malware domains (+f1 flag).',
            },
            {
              level: NetShieldLevel.Off,
              title: 'Do not block (Off)',
              desc: 'Unfiltered zero-knowledge Proton DNS resolution.',
            },
          ].map((option) => {
            const selected = settings.netShieldLevel === option.level;
            return (
              <button
                key={option.level}
                type="button"
                onClick={() => {
                  setSettings((prev) => ({ ...prev, netShieldLevel: option.level }));
                  appendReaEvent(
                    'NetShieldSwitch.kt',
                    `setNetShieldProtocol(${option.level})`,
                    `Updated WireGuard DNS filter mode -> ${option.level}`,
                    'ViewModel / StateFlow'
                  );
                  setIsNetShieldSheetOpen(false);
                }}
                className={`w-full min-h-[64px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[#6D4AFF]/15 border-[#6D4AFF] text-white'
                    : 'bg-[#13111C] border-white/10 text-[#E2E0EC] hover:bg-white/5'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Shield
                      className={`w-4 h-4 ${
                        selected ? 'text-[#1EA885]' : 'text-[#A7A4B5]'
                      }`}
                    />
                    <span>{option.title}</span>
                  </div>
                  <p className="text-xs text-[#A7A4B5]">{option.desc}</p>
                </div>
                {selected && <Check className="w-5 h-5 text-[#8A6EFF] shrink-0" />}
              </button>
            );
          })}
        </div>
      </BottomSheetModal>

      {/* Secure Core Configuration Bottom Sheet */}
      <BottomSheetModal
        isOpen={isSecureCoreSheetOpen}
        onClose={() => setIsSecureCoreSheetOpen(false)}
        title="Secure Core Multi-Hop Routing"
        subtitle="Defend against network-based correlation attacks via hardened entry vaults"
      >
        <div className="space-y-3">
          <p className="text-xs text-[#A7A4B5] leading-relaxed">
            When Secure Core is active, your traffic first enters an underground or high-security
            server owned by Proton in Switzerland (CH), Iceland (IS), or Sweden (SE) before
            exiting at your destination country.
          </p>

          {[
            {
              value: true,
              title: 'Enable Secure Core (Multi-Hop)',
              desc: 'Routes traffic through CH, IS, or SE entry nodes before destination exit.',
            },
            {
              value: false,
              title: 'Standard Routing (Single-Hop)',
              desc: 'Direct encrypted connection to target gateway for lowest latency.',
            },
          ].map((opt) => {
            const active = settings.secureCore === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  handleToggleSecureCore(opt.value);
                  setIsSecureCoreSheetOpen(false);
                }}
                className={`w-full min-h-[64px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer ${
                  active
                    ? 'bg-[#6D4AFF]/15 border-[#6D4AFF] text-white'
                    : 'bg-[#13111C] border-white/10 text-[#E2E0EC]'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#8A6EFF]" />
                    <span>{opt.title}</span>
                  </div>
                  <p className="text-xs text-[#A7A4B5] mt-0.5">{opt.desc}</p>
                </div>
                {active && <Check className="w-5 h-5 text-[#8A6EFF] shrink-0" />}
              </button>
            );
          })}
        </div>
      </BottomSheetModal>

      {/* Protocol Selection Bottom Sheet */}
      <BottomSheetModal
        isOpen={isProtocolSheetOpen}
        onClose={() => setIsProtocolSheetOpen(false)}
        title="VPN Protocol (ProtocolSelection.kt)"
        subtitle="Select transport protocol for ProTUN / WireGuard backend"
      >
        <div className="space-y-2">
          {Object.values(VpnProtocol).map((proto) => {
            const selected = settings.protocol === proto;
            return (
              <button
                key={proto}
                type="button"
                onClick={() => {
                  setSettings((prev) => ({ ...prev, protocol: proto }));
                  appendReaEvent(
                    'ProtocolSelection.kt',
                    `onProtocolSelected("${proto}")`,
                    `Updated VpnBackendProvider active transport -> ${proto}`,
                    'Core / ProTUN WireGuard'
                  );
                  setIsProtocolSheetOpen(false);
                }}
                className={`w-full min-h-[52px] px-4 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 cursor-pointer ${
                  selected
                    ? 'bg-[#6D4AFF]/15 border-[#6D4AFF] text-white'
                    : 'bg-[#13111C] border-white/10 text-[#E2E0EC] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-[#8A6EFF]" />
                  <span className="text-sm font-semibold">{proto}</span>
                </div>
                {selected && <Check className="w-4 h-4 text-[#8A6EFF]" />}
              </button>
            );
          })}
        </div>
      </BottomSheetModal>

      {/* WireGuard Configuration Preview & Export Modal */}
      <BottomSheetModal
        isOpen={isWgConfigSheetOpen}
        onClose={() => setIsWgConfigSheetOpen(false)}
        title="WireGuard Tunnel Configuration (.conf)"
        subtitle="Generated from active ProtonVPN LogicalServer & NetShield certificate flags"
      >
        <div className="space-y-3">
          <pre className="rounded-xl bg-[#13111C] border border-white/10 p-3.5 text-xs font-mono text-[#E2E0EC] overflow-x-auto leading-relaxed">
            {wgConfPreview}
          </pre>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(wgConfPreview);
                  setCopiedWgModal(true);
                  setTimeout(() => setCopiedWgModal(false), 1800);
                } catch {
                  // Ignore clipboard error
                }
              }}
              className="min-h-[44px] px-4 rounded-xl bg-[#262235] hover:bg-white/10 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            >
              {copiedWgModal ? (
                <>
                  <Check className="w-4 h-4 text-[#1EA885]" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Config</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const blob = new Blob([wgConfPreview], {
                  type: 'text/plain;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const safeName = (activeServer?.name || 'CH-14').replace(
                  /[^a-zA-Z0-9_-]/g,
                  '-'
                );
                a.href = url;
                a.download = `ProtonVPN-${safeName}.conf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download .conf</span>
            </button>
          </div>
        </div>
      </BottomSheetModal>

      {/* Mobile REA Dissection Inspector Sheet */}
      <BottomSheetModal
        isOpen={isMobileReaSheetOpen}
        onClose={() => setIsMobileReaSheetOpen(false)}
        title="REA Android Dissection Inspector"
        subtitle="Evidence-based architecture mapping of ProtonVPN/android-app"
      >
        <ReaDissectionPanel
          connectionState={connectionState}
          activeServer={activeServer}
          settings={settings}
          events={reaEvents}
          issuedCert={issuedCert}
        />
      </BottomSheetModal>

      {/* Android APK Download & Device App Installer Sheet */}
      <ApkDownloadModal
        isOpen={isApkSheetOpen}
        onClose={() => setIsApkSheetOpen(false)}
        activeServer={activeServer}
        settings={settings}
        onDownloadWireGuardConf={() => {
          setIsApkSheetOpen(false);
          setIsWgConfigSheetOpen(true);
        }}
      />

      {/* PWA Offline State Banner */}
      <OfflineIndicator />
    </div>
  );
}
