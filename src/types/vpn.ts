export enum VpnConnectionState {
  Disconnected = 'DISCONNECTED',
  Connecting = 'CONNECTING',
  Connected = 'CONNECTED',
  Disconnecting = 'DISCONNECTING',
}

export enum HandshakeStage {
  Idle = 'Idle',
  CheckingAvailability = 'Checking server availability',
  InitializingProTun = 'Initializing WireGuard (ProTUN)',
  ExchangingKeys = 'Exchanging Curve25519 ephemeral keys',
  ApplyingNetShield = 'Applying NetShield DNS filter',
  TunnelEstablished = 'Tunnel established',
}

export enum NetShieldLevel {
  Off = 'OFF',
  MalwareOnly = 'MALWARE_ONLY',
  AdsTrackersMalware = 'ADS_TRACKERS_MALWARE',
}

export enum VpnProtocol {
  Smart = 'Smart (Recommended)',
  WireGuard = 'WireGuard (UDP)',
  WireGuardTcp = 'WireGuard (TCP)',
  Stealth = 'Stealth (TLS Obfuscation)',
  OpenVpnUdp = 'OpenVPN (UDP)',
  OpenVpnTcp = 'OpenVPN (TCP)',
}

export enum ServerFeature {
  SecureCore = 'SECURE_CORE',
  P2P = 'P2P',
  Tor = 'TOR',
  IPv6 = 'IPV6',
  Streaming = 'STREAMING',
  SmartRouting = 'SMART_ROUTING',
}

export enum SplitTunnelMode {
  Exclude = 'EXCLUDE',
  Include = 'INCLUDE',
}

export enum ActiveMobileTab {
  Home = 'HOME',
  Countries = 'COUNTRIES',
  Profiles = 'PROFILES',
  Settings = 'SETTINGS',
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface LogicalServer {
  id: string;
  name: string; // e.g., "CH#14", "US-NY#108", "CH-US#1"
  entryCountryCode: string; // ISO-2 e.g. "CH"
  entryCountryName: string;
  exitCountryCode: string; // ISO-2 e.g. "US"
  exitCountryName: string;
  city: string;
  tier: 0 | 1 | 2; // 0 = Free, 2 = Plus
  load: number; // 1-100%
  score: number;
  entryIp: string;
  exitIp: string;
  entryCoords: GeoCoordinates;
  exitCoords: GeoCoordinates;
  features: ServerFeature[];
  baseLatencyMs: number;
  measuredLatencyMs?: number;
  gatewayPublicKey: string;
}

export interface CountryGroup {
  countryCode: string;
  countryName: string;
  flag: string;
  coordinates: GeoCoordinates;
  cities: string[];
  servers: LogicalServer[];
  secureCoreServers: LogicalServer[];
  hasFreeServers: boolean;
  hasP2P: boolean;
  hasTor: boolean;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  color: string;
  countryCode: string; // 'FASTEST' | 'RANDOM' | ISO-2
  serverId?: string;
  isSecureCore: boolean;
  protocol: VpnProtocol;
  netShieldLevel: NetShieldLevel;
  customDnsEnabled: boolean;
  isPreset?: boolean;
  lastUsedAt?: number;
}

export interface SplitTunnelApp {
  packageName: string;
  appName: string;
  category: string;
  selected: boolean;
}

export interface SplitTunnelConfig {
  enabled: boolean;
  mode: SplitTunnelMode;
  apps: SplitTunnelApp[];
  ipSubnets: string[];
}

export interface VpnSettings {
  protocol: VpnProtocol;
  netShieldLevel: NetShieldLevel;
  secureCore: boolean;
  killSwitch: 'OFF' | 'STANDARD' | 'ADVANCED_ALWAYS_ON';
  vpnAccelerator: boolean;
  moderateNat: boolean;
  allowLanConnections: boolean;
  ipv6Support: boolean;
  customDnsEnabled: boolean;
  customDnsServers: string[];
  splitTunneling: SplitTunnelConfig;
}

export interface ClientIpInfo {
  ip: string;
  isp: string;
  city: string;
  countryName: string;
  countryCode: string;
  lat: number;
  lng: number;
  isRealDetected: boolean;
}

export interface TelemetryPoint {
  timestamp: number;
  downKBps: number;
  upKBps: number;
}

export interface NetShieldStats {
  adsBlocked: number;
  trackersBlocked: number;
  malwareBlocked: number;
  dataSavedBytes: number;
}

export interface ReaDissectionEvent {
  id: string;
  timestamp: string;
  kotlinClass: string;
  methodSignature: string;
  stateEmission: string;
  layer: 'UI / Compose' | 'ViewModel / StateFlow' | 'Domain / ServerManager2' | 'Core / ProTUN WireGuard';
}

export interface SiteProbeReport {
  url: string;
  hostname: string;
  reachableViaVpn: boolean;
  directBrowserReachable?: 'REACHABLE' | 'BLOCKED_OR_CORS' | 'PROBING';
  httpStatus: number;
  statusText: string;
  latencyMs: number;
  finalUrl: string;
  resolvedIps: string[];
  dnsResolver: string;
  pageTitle: string;
  pageDescription: string;
  serverHeader: string;
  contentType: string;
  contentBytes: number;
  netShieldBlockedTrackers: string[];
  netShieldMalwareBlocked: boolean;
  tunnelRoute: string;
  error?: string;
}

export interface BackendEgressInfo {
  status: string;
  backendEgressIp: string;
  backendCountry: string;
  backendCountryCode: string;
  backendCity: string;
  backendIsp: string;
  timestamp: string;
}

