import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock,
  Download,
  Lock,
  Power,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Zap,
} from 'lucide-react';
import {
  ClientIpInfo,
  ConnectionProfile,
  CountryGroup,
  HandshakeStage,
  LogicalServer,
  NetShieldLevel,
  NetShieldStats,
  ServerFeature,
  TelemetryPoint,
  VpnConnectionState,
  VpnSettings,
} from '../types/vpn';
import { COUNTRY_FLAGS } from '../data/protonServers';
import { ProtonWorldMap } from './ProtonWorldMap';

interface HomeScreenViewProps {
  connectionState: VpnConnectionState;
  handshakeStage: HandshakeStage;
  activeServer: LogicalServer | null;
  clientIp: ClientIpInfo;
  isProbingIp: boolean;
  onRefreshIpAndLatency: () => void;
  onQuickConnectToggle: () => void;
  onConnectServer: (server: LogicalServer) => void;
  onConnectProfile: (profile: ConnectionProfile) => void;
  onSelectCountryConnect: (countryCode: string) => void;
  countryGroups: CountryGroup[];
  recentServers: LogicalServer[];
  profiles: ConnectionProfile[];
  settings: VpnSettings;
  netShieldStats: NetShieldStats;
  telemetryHistory: TelemetryPoint[];
  sessionSeconds: number;
  totalBytesDown: number;
  totalBytesUp: number;
  onOpenNetShieldSheet: () => void;
  onOpenSecureCoreSheet: () => void;
  onOpenProtocolSheet: () => void;
  onOpenWireGuardConfig: () => void;
  onLaunchTunnelSite: (url: string) => void;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export const HomeScreenView: React.FC<HomeScreenViewProps> = ({
  connectionState,
  handshakeStage,
  activeServer,
  clientIp,
  isProbingIp,
  onRefreshIpAndLatency,
  onQuickConnectToggle,
  onConnectServer,
  onConnectProfile,
  onSelectCountryConnect,
  countryGroups,
  recentServers,
  profiles,
  settings,
  netShieldStats,
  telemetryHistory,
  sessionSeconds,
  totalBytesDown,
  totalBytesUp,
  onOpenNetShieldSheet,
  onOpenSecureCoreSheet,
  onOpenProtocolSheet,
  onOpenWireGuardConfig,
  onLaunchTunnelSite,
}) => {
  const isConnected = connectionState === VpnConnectionState.Connected;
  const isConnecting = connectionState === VpnConnectionState.Connecting;
  const latestTelemetry = telemetryHistory[telemetryHistory.length - 1] || {
    downKBps: 0,
    upKBps: 0,
  };

  // Build SVG polyline points for live throughput sparkline
  const sparklineDownPoints = telemetryHistory
    .map((pt, idx) => {
      const x = (idx / Math.max(1, telemetryHistory.length - 1)) * 280;
      const y = 44 - Math.min(40, (pt.downKBps / 4500) * 40);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const sparklineUpPoints = telemetryHistory
    .map((pt, idx) => {
      const x = (idx / Math.max(1, telemetryHistory.length - 1)) * 280;
      const y = 44 - Math.min(40, (pt.upKBps / 2500) * 40);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const netShieldLabel =
    settings.netShieldLevel === NetShieldLevel.AdsTrackersMalware
      ? 'Block ads, trackers & malware'
      : settings.netShieldLevel === NetShieldLevel.MalwareOnly
      ? 'Block malware only'
      : 'Off';

  return (
    <div className="space-y-4 pb-6">
      {/* Mobile/Tablet Map Viewport Header (Hidden on lg: where full interactive map is pinned beside the mobile viewport) */}
      <div className="lg:hidden rounded-2xl overflow-hidden border border-white/10">
        <ProtonWorldMap
          connectionState={connectionState}
          activeServer={activeServer}
          clientIp={clientIp}
          countryGroups={countryGroups}
          secureCoreEnabled={settings.secureCore}
          onSelectCountryConnect={onSelectCountryConnect}
          compact
        />
      </div>

      {/* Primary Connection Status & Action Card (ProtonVPN Redesign Home Card) */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isConnected ? (
                <ShieldCheck className="w-5 h-5 text-[#1EA885] shrink-0" />
              ) : isConnecting ? (
                <RefreshCw className="w-5 h-5 text-[#F59E0B] animate-spin shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
              )}
              <span
                className={`text-xs font-semibold tracking-wide ${
                  isConnected
                    ? 'text-[#1EA885]'
                    : isConnecting
                    ? 'text-[#F59E0B]'
                    : 'text-[#EF4444]'
                }`}
              >
                {isConnected
                  ? '🔑 Protected · Android VpnService (tun0) Active'
                  : isConnecting
                  ? 'Connecting to Proton VPN...'
                  : 'You are unprotected'}
              </span>
            </div>

            {isConnected && activeServer ? (
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                  <span>{COUNTRY_FLAGS[activeServer.exitCountryCode] || '🌐'}</span>
                  <span className="truncate">{activeServer.exitCountryName}</span>
                </h2>
                <p className="text-xs text-[#A7A4B5] mt-0.5">
                  {activeServer.features.includes(ServerFeature.SecureCore)
                    ? `via ${activeServer.entryCountryName} · ${activeServer.name}`
                    : `${activeServer.city} · ${activeServer.name}`}{' '}
                  · {settings.protocol.split(' ')[0]} ·{' '}
                  <span className="text-[#34D399] font-mono">
                    Local IP ({clientIp.ip}) Masked
                  </span>
                </p>
              </div>
            ) : isConnecting && activeServer ? (
              <div>
                <h2 className="text-lg font-bold text-white truncate">
                  {COUNTRY_FLAGS[activeServer.exitCountryCode]} {activeServer.exitCountryName} (
                  {activeServer.name})
                </h2>
                <p className="text-xs text-[#F59E0B] font-mono mt-0.5">{handshakeStage}</p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-bold text-white">Not connected</h2>
                <p className="text-xs text-[#A7A4B5] mt-0.5">
                  Real IP: <span className="font-mono text-[#F5F4F8]">{clientIp.ip}</span> ·{' '}
                  {clientIp.city}, {clientIp.countryCode}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRefreshIpAndLatency}
            disabled={isProbingIp}
            title="Re-probe real IP and server latencies"
            className="min-h-[44px] px-3 rounded-xl bg-[#262235] hover:bg-white/10 text-xs font-medium text-[#A7A4B5] hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbingIp ? 'animate-spin text-[#8A6EFF]' : ''}`} />
            <span>Probe RTT</span>
          </button>
        </div>

        {/* IP & Protocol Details Strip */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
          <div>
            <span className="text-[#A7A4B5] block text-[11px]">
              {isConnected ? 'Visible VPN IP' : 'Visible Local IP'}
            </span>
            <span
              className={`font-mono font-semibold ${
                isConnected ? 'text-[#34D399]' : 'text-white'
              }`}
            >
              {isConnected && activeServer ? activeServer.exitIp : clientIp.ip}
            </span>
          </div>
          <div>
            <span className="text-[#A7A4B5] block text-[11px]">Server Load & Ping</span>
            <span className="font-mono font-semibold text-white">
              {activeServer
                ? `${activeServer.load}% · ${activeServer.measuredLatencyMs ?? activeServer.baseLatencyMs} ms`
                : 'Standby'}
            </span>
          </div>
          <div>
            <span className="text-[#A7A4B5] block text-[11px]">Session Uptime</span>
            <span className="font-mono font-semibold text-white flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#8A6EFF]" />
              {isConnected ? formatDuration(sessionSeconds) : '00:00:00'}
            </span>
          </div>
        </div>

        {/* Primary Quick Connect / Disconnect Button (48px height in natural thumb reach) */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onQuickConnectToggle}
            className={`w-full min-h-[48px] px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
              isConnected
                ? 'bg-[#262235] hover:bg-[#EF4444]/20 text-white hover:text-[#FCA5A5] border border-white/10 hover:border-[#EF4444]/40'
                : isConnecting
                ? 'bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/40'
                : 'bg-[#6D4AFF] hover:bg-[#7C5CFF] text-white shadow-lg shadow-[#6D4AFF]/25'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>
              {isConnected
                ? 'Disconnect VPN'
                : isConnecting
                ? 'Cancel Connection'
                : 'Quick Connect'}
            </span>
          </button>

          {isConnected && activeServer && (
            <button
              type="button"
              onClick={onOpenWireGuardConfig}
              title="Inspect WireGuard .conf"
              className="min-h-[48px] px-3.5 rounded-xl bg-[#262235] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#E2E0EC] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#8A6EFF]" />
              <span>WG Config</span>
            </button>
          )}
        </div>

        {/* Direct In-App Tunnel Browser Quick Launch Strip (Unblocks TikTok via Australia AU#31 or Switzerland CH#14) */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#E2E0EC] font-semibold">
              Unblock Geo-Restricted Sites in Proton Tunnel Browser:
            </span>
            <span className="text-[11px] font-mono text-[#34D399]">
              {activeServer ? `Via ${activeServer.name} (${activeServer.exitIp})` : 'Auto-Connects VPN'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSelectCountryConnect('AU');
                onLaunchTunnelSite('https://www.tiktok.com');
              }}
              className="min-h-[38px] px-3 rounded-xl bg-[#1EA885] hover:bg-[#179373] text-xs font-bold text-[#0C0A12] transition-colors whitespace-nowrap cursor-pointer"
            >
              🇦🇺 TikTok (Australia VPN)
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectCountryConnect('CH');
                onLaunchTunnelSite('https://www.tiktok.com');
              }}
              className="min-h-[38px] px-3 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-bold text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              🇨🇭 TikTok (Switzerland VPN)
            </button>
            <button
              type="button"
              onClick={() => onLaunchTunnelSite('https://ipleak.net')}
              className="min-h-[38px] px-3 rounded-xl bg-[#262235] hover:bg-white/10 border border-[#34D399]/40 text-xs font-semibold text-[#34D399] transition-colors whitespace-nowrap cursor-pointer"
            >
              🔑 Verify VPN IP
            </button>
          </div>
        </div>
      </div>

      {/* Live Session Traffic & Sparkline Card */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Activity className="w-4 h-4 text-[#1EA885]" />
            <span>Session Traffic (ProTUN WireGuard)</span>
          </div>
          <span className="text-[11px] font-mono text-[#A7A4B5]">
            Total: ↓ {formatBytes(totalBytesDown)} · ↑ {formatBytes(totalBytesUp)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1EA885]/15 flex items-center justify-center text-[#1EA885] shrink-0">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-[#A7A4B5]">Download Speed</div>
              <div className="text-sm font-mono font-bold text-white tabular-nums">
                {isConnected ? `${latestTelemetry.downKBps.toFixed(0)} KB/s` : '0 KB/s'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6D4AFF]/20 flex items-center justify-center text-[#8A6EFF] shrink-0">
              <ArrowUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-[#A7A4B5]">Upload Speed</div>
              <div className="text-sm font-mono font-bold text-white tabular-nums">
                {isConnected ? `${latestTelemetry.upKBps.toFixed(0)} KB/s` : '0 KB/s'}
              </div>
            </div>
          </div>
        </div>

        {/* SVG Real-Time Throughput Sparkline */}
        <div className="h-12 w-full rounded-xl bg-[#13111C] border border-white/5 px-2 py-1 overflow-hidden">
          <svg viewBox="0 0 280 46" className="w-full h-full overflow-visible">
            <polyline
              fill="none"
              stroke="#6D4AFF"
              strokeWidth="1.6"
              strokeOpacity="0.7"
              points={sparklineUpPoints}
            />
            <polyline
              fill="none"
              stroke="#1EA885"
              strokeWidth="2"
              points={sparklineDownPoints}
            />
          </svg>
        </div>
      </div>

      {/* Quick Feature Controls: NetShield & Secure Core & Protocol (Mirrors Android Home Feature Tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* NetShield Tile */}
        <button
          type="button"
          onClick={onOpenNetShieldSheet}
          className="min-h-[68px] text-left rounded-2xl bg-[#1C1927] hover:bg-[#262235] border border-white/10 p-4 transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Shield
                className={`w-4 h-4 ${
                  settings.netShieldLevel !== NetShieldLevel.Off
                    ? 'text-[#1EA885]'
                    : 'text-[#A7A4B5]'
                }`}
              />
              <span className="text-sm font-semibold text-white">NetShield</span>
            </div>
            <span className="text-xs font-mono text-[#8A6EFF]">Configure</span>
          </div>
          <p className="text-xs text-[#A7A4B5] mt-1.5 truncate">{netShieldLabel}</p>
          {settings.netShieldLevel !== NetShieldLevel.Off && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#E2E0EC] mt-2 pt-2 border-t border-white/5">
              <span>{netShieldStats.adsBlocked} ads</span>
              <span aria-hidden="true">·</span>
              <span>{netShieldStats.trackersBlocked} trackers</span>
              <span aria-hidden="true">·</span>
              <span>{formatBytes(netShieldStats.dataSavedBytes)} saved</span>
            </div>
          )}
        </button>

        {/* Secure Core + Protocol Tile */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onOpenSecureCoreSheet}
            className="min-h-[60px] text-left rounded-2xl bg-[#1C1927] hover:bg-[#262235] border border-white/10 px-4 py-3 transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <Lock
                  className={`w-4 h-4 ${
                    settings.secureCore ? 'text-[#8A6EFF]' : 'text-[#A7A4B5]'
                  }`}
                />
                <span className="text-sm font-semibold text-white">Secure Core</span>
              </div>
              <p className="text-xs text-[#A7A4B5] mt-0.5 truncate">
                {settings.secureCore
                  ? 'Active · Multi-hop via CH, IS, SE'
                  : 'Standard single-hop routing'}
              </p>
            </div>
            <span
              className={`text-xs font-mono font-semibold shrink-0 ${
                settings.secureCore ? 'text-[#1EA885]' : 'text-[#A7A4B5]'
              }`}
            >
              {settings.secureCore ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenProtocolSheet}
            className="min-h-[54px] text-left rounded-2xl bg-[#1C1927] hover:bg-[#262235] border border-white/10 px-4 py-2.5 transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sliders className="w-4 h-4 text-[#8A6EFF] shrink-0" />
              <span className="text-xs font-medium text-[#A7A4B5]">Protocol:</span>
              <span className="text-xs font-semibold text-white truncate">
                {settings.protocol}
              </span>
            </div>
            <span className="text-xs font-mono text-[#8A6EFF] shrink-0">Change</span>
          </button>
        </div>
      </div>

      {/* Recents & Quick Profiles Section (Mirrors Redesign RecentsManager) */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#A7A4B5]">Recents & Pinned Connections</h3>
          <span className="text-[11px] text-[#A7A4B5] font-mono">
            {recentServers.length} recent nodes
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {recentServers.slice(0, 3).map((srv) => {
            const isActive = isConnected && activeServer?.id === srv.id;
            return (
              <div
                key={srv.id}
                className="min-h-[56px] py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">
                    {COUNTRY_FLAGS[srv.exitCountryCode] || '🌐'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {srv.exitCountryName}{' '}
                      <span className="font-mono text-xs text-[#A7A4B5]">({srv.name})</span>
                    </div>
                    <div className="text-xs text-[#A7A4B5] truncate">
                      {srv.city} · <span className="font-mono">{srv.load}% load</span> ·{' '}
                      <span className="font-mono">
                        {srv.measuredLatencyMs ?? srv.baseLatencyMs} ms
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onConnectServer(srv)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#1EA885]/20 text-[#34D399] border border-[#1EA885]/30'
                      : 'bg-[#262235] hover:bg-[#6D4AFF] text-white'
                  }`}
                >
                  {isActive ? 'Connected' : 'Connect'}
                </button>
              </div>
            );
          })}

          {profiles.slice(2, 4).map((prof) => (
            <div
              key={prof.id}
              className="min-h-[56px] py-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${prof.color}25`, color: prof.color }}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{prof.name}</div>
                  <div className="text-xs text-[#A7A4B5] truncate">
                    Profile · {prof.protocol.split(' ')[0]} ·{' '}
                    {prof.isSecureCore ? 'Secure Core' : prof.countryCode}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onConnectProfile(prof)}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Launch
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
