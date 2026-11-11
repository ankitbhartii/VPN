import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  KeyRound,
  Lock,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  BackendEgressInfo,
  LogicalServer,
  SiteProbeReport,
  VpnConnectionState,
  VpnSettings,
} from '../types/vpn';
import {
  browseUrlThroughVpnTunnel,
  fetchBackendEgressStatus,
  probeMultipleSitesThroughVpn,
} from '../services/tunnelEngine';
import { BottomSheetModal } from './BottomSheetModal';

interface VpnSiteTesterPanelProps {
  connectionState: VpnConnectionState;
  activeServer: LogicalServer | null;
  realClientIp?: string;
  settings: VpnSettings;
  onQuickConnectRequest: () => void;
  onSelectCountryConnect?: (countryCode: string) => void;
  onNetShieldIncrement: (adsCount: number, trackersCount: number, bytesSaved: number) => void;
  externalTriggerUrl?: string | null;
  onClearExternalTrigger?: () => void;
}

const DEFAULT_TEST_SITES = [
  'https://www.tiktok.com',
  'https://ipleak.net',
  'https://www.capcut.com',
  'https://www.wechat.com',
  'https://telegram.org',
  'https://duckduckgo.com',
];

export const VpnSiteTesterPanel: React.FC<VpnSiteTesterPanelProps> = ({
  connectionState,
  activeServer,
  realClientIp = '103.226.200.70',
  settings,
  onQuickConnectRequest,
  onSelectCountryConnect,
  onNetShieldIncrement,
  externalTriggerUrl,
  onClearExternalTrigger,
}) => {
  const [egressInfo, setEgressInfo] = useState<BackendEgressInfo | null>(null);
  const [reports, setReports] = useState<SiteProbeReport[]>([]);
  const [isProbingBatch, setIsProbingBatch] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>('https://www.tiktok.com');
  const [isBrowsingUrl, setIsBrowsingUrl] = useState<boolean>(false);
  const [browseModalOpen, setBrowseModalOpen] = useState<boolean>(false);
  const [browseResult, setBrowseResult] = useState<{
    report: SiteProbeReport;
    sanitizedHtml: string;
    textExcerpt: string;
  } | null>(null);
  const [previewMode, setPreviewMode] = useState<'LIVE_SANDBOX' | 'SUMMARY'>('LIVE_SANDBOX');

  const isConnected = connectionState === VpnConnectionState.Connected;

  // Fetch backend / active gateway egress IP details
  useEffect(() => {
    let mounted = true;
    fetchBackendEgressStatus(activeServer).then((data) => {
      if (mounted && data) setEgressInfo(data);
    });
    return () => {
      mounted = false;
    };
  }, [activeServer]);

  // Listen for postMessage from inside the proxied iframe when the user clicks links inside the tunnel
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'PROTON_TUNNEL_URL' && typeof e.data.url === 'string') {
        setCustomUrl(e.data.url);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const runBatchSiteVerification = useCallback(
    async (targetUrls: string[] = DEFAULT_TEST_SITES) => {
      setIsProbingBatch(true);
      try {
        const enriched = await probeMultipleSitesThroughVpn({
          urls: targetUrls,
          activeServer,
          realClientIp,
          netShieldLevel: settings.netShieldLevel,
          protocol: settings.protocol,
        });

        setReports(enriched);

        const totalTrackers = enriched.reduce(
          (acc, r) => acc + (r.netShieldBlockedTrackers?.length || 0),
          0
        );
        if (totalTrackers > 0) {
          onNetShieldIncrement(
            Math.ceil(totalTrackers * 0.5),
            totalTrackers,
            totalTrackers * 34_500
          );
        }
      } catch {
        // Ignore network error
      } finally {
        setIsProbingBatch(false);
      }
    },
    [activeServer, onNetShieldIncrement, realClientIp, settings.netShieldLevel, settings.protocol]
  );

  useEffect(() => {
    runBatchSiteVerification(DEFAULT_TEST_SITES);
  }, [runBatchSiteVerification]);

  // Browse / Unblock a specific URL through the hybrid VPN tunnel
  const handleTunnelBrowse = useCallback(
    async (targetToBrowse: string, forceCountryCode?: string) => {
      if (forceCountryCode && onSelectCountryConnect) {
        onSelectCountryConnect(forceCountryCode);
      } else if (!isConnected) {
        onQuickConnectRequest();
      }

      const cleanUrl = targetToBrowse.trim() || 'https://www.tiktok.com';
      setCustomUrl(cleanUrl);
      setIsBrowsingUrl(true);

      try {
        const data = await browseUrlThroughVpnTunnel({
          url: cleanUrl,
          activeServer,
          realClientIp,
          netShieldLevel: settings.netShieldLevel,
          protocol: settings.protocol,
        });

        setBrowseResult(data);
        setPreviewMode('LIVE_SANDBOX');
        setBrowseModalOpen(true);

        if (data.report) {
          setReports((prev) => {
            const exists = prev.some((r) => r.hostname === data.report.hostname);
            if (exists) {
              return prev.map((r) =>
                r.hostname === data.report.hostname ? data.report : r
              );
            }
            return [data.report, ...prev];
          });
        }
      } catch {
        // Ignore error
      } finally {
        setIsBrowsingUrl(false);
      }
    },
    [
      activeServer,
      isConnected,
      onQuickConnectRequest,
      onSelectCountryConnect,
      realClientIp,
      settings.netShieldLevel,
      settings.protocol,
    ]
  );

  // Trigger tunnel browser when launched from the Home Connection Card or Top Status Bar
  useEffect(() => {
    if (externalTriggerUrl) {
      handleTunnelBrowse(externalTriggerUrl);
      if (onClearExternalTrigger) onClearExternalTrigger();
    }
  }, [externalTriggerUrl, handleTunnelBrowse, onClearExternalTrigger]);

  const currentExitLabel = activeServer
    ? `${activeServer.exitCountryName} · ${activeServer.name} (${activeServer.exitIp})`
    : 'Australia · AU#31 (103.107.198.31)';

  return (
    <div
      id="proton-tunnel-browser"
      className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-4"
    >
      {/* Header & Egress Node Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#1EA885]" />
            <h3 className="text-sm font-bold text-white">
              In-App Proton Tunnel Browser & Geo-Unblock Verifier
            </h3>
          </div>
          <p className="text-xs text-[#A7A4B5] mt-0.5">
            Access TikTok, CapCut & IP Leak Check directly through {currentExitLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected && (
            <button
              type="button"
              onClick={onQuickConnectRequest}
              className="min-h-[38px] px-3 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Activate Tunnel</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => runBatchSiteVerification(reports.map((r) => r.url))}
            disabled={isProbingBatch}
            className="min-h-[38px] px-3 rounded-xl bg-[#262235] hover:bg-white/10 text-xs font-semibold text-[#E2E0EC] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isProbingBatch ? 'animate-spin text-[#8A6EFF]' : ''}`}
            />
            <span>{isProbingBatch ? 'Testing...' : 'Re-Test All'}</span>
          </button>
        </div>
      </div>

      {/* Active VPN IP Masking Verification Banner */}
      <div className="rounded-xl bg-[#13111C] border border-[#1EA885]/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#34D399] shrink-0" />
          <span className="text-[#A7A4B5]">Visible Tunnel IP:</span>
          <span className="font-mono font-bold text-[#34D399]">
            {activeServer ? `${activeServer.exitIp} (${activeServer.exitCountryName})` : '103.107.198.31 (Australia)'}
          </span>
          <span className="text-[#A7A4B5]">·</span>
          <span className="text-[#A7A4B5]">
            Local ISP (<span className="font-mono line-through text-[#EF4444]">{realClientIp}</span>):{' '}
            <strong className="text-white">MASKED</strong>
          </span>
        </div>
        <div className="text-[#C4B5FD] font-mono text-[11px]">
          tun0: 10.2.0.2/32 · DoH: 1.1.1.1 / 10.2.0.1
        </div>
      </div>

      {/* Interactive Custom URL / Restricted Site Tunnel Browser Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleTunnelBrowse(customUrl);
        }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A7A4B5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Enter URL (e.g. https://www.tiktok.com or https://ipleak.net)"
            aria-label="Enter URL to open in Proton Tunnel Browser"
            className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-xs font-mono text-white"
          />
        </div>
        <button
          type="submit"
          disabled={isBrowsingUrl}
          className="min-h-[44px] px-4 rounded-xl bg-[#1EA885] hover:bg-[#179373] text-xs font-bold text-[#0C0A12] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isBrowsingUrl ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Opening Tunnel...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Open in Tunnel Browser</span>
            </>
          )}
        </button>
      </form>

      {/* One-Tap Quick Launch Buttons for Australia TikTok, Switzerland TikTok & IP Verification */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => handleTunnelBrowse('https://www.tiktok.com', 'AU')}
          className="min-h-[38px] px-3 rounded-xl bg-[#1EA885] hover:bg-[#179373] text-xs font-bold text-[#0C0A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          🇦🇺 TikTok via Australia (AU#31)
        </button>
        <button
          type="button"
          onClick={() => handleTunnelBrowse('https://www.tiktok.com', 'CH')}
          className="min-h-[38px] px-3 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          🇨🇭 TikTok via Switzerland (CH#14)
        </button>
        <button
          type="button"
          onClick={() => handleTunnelBrowse('https://ipleak.net')}
          className="min-h-[38px] px-3 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] border border-[#34D399]/40 text-xs font-semibold text-[#34D399] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          🔑 Verify My VPN IP (ipleak.net)
        </button>
        <button
          type="button"
          onClick={() => handleTunnelBrowse('https://www.capcut.com')}
          className="min-h-[38px] px-3 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Launch CapCut
        </button>
        <button
          type="button"
          onClick={() => handleTunnelBrowse('https://www.wechat.com')}
          className="min-h-[38px] px-3 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Launch WeChat
        </button>
      </div>

      {/* Multi-Site Reachability Results Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[#A7A4B5]">
          <span>
            Live Tunnel Verification ({reports.filter((r) => r.reachableViaVpn).length}/
            {reports.length} reachable via {activeServer?.exitCountryName || 'Australia / Switzerland'})
          </span>
          <span className="font-mono">
            {egressInfo ? `Gateway: ${egressInfo.backendEgressIp}` : 'NetShield +f2 Active'}
          </span>
        </div>

        <div className="divide-y divide-white/5 rounded-xl bg-[#13111C] border border-white/10 overflow-hidden">
          {reports.map((rep) => (
            <div
              key={rep.url}
              className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {rep.reachableViaVpn ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1EA885] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                  )}
                  <span className="font-mono text-xs font-bold text-white">{rep.hostname}</span>
                  <span className="text-xs text-[#A7A4B5]">·</span>
                  <span
                    className={`font-mono text-xs font-semibold ${
                      rep.reachableViaVpn ? 'text-[#1EA885]' : 'text-[#EF4444]'
                    }`}
                  >
                    VPN HTTP {rep.httpStatus || 200} ({rep.latencyMs} ms)
                  </span>
                  <span className="text-xs text-[#A7A4B5]">·</span>
                  <span className="text-[11px] font-mono text-[#A7A4B5]">
                    Visible Exit IP:{' '}
                    <span className="text-[#34D399]">
                      {activeServer?.exitIp || '103.107.198.31'}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-[#E2E0EC] truncate">{rep.pageTitle}</div>

                <div className="text-[11px] font-mono text-[#A7A4B5] flex flex-wrap items-center gap-1.5">
                  <span>DoH IP: {rep.resolvedIps[0] || '23.49.104.56'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{(rep.contentBytes / 1024).toFixed(1)} KB payload</span>
                  {rep.netShieldBlockedTrackers.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#8A6EFF]">
                        NetShield stripped {rep.netShieldBlockedTrackers.length} tracker(s)
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTunnelBrowse(rep.url)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Tunneled Site</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal to Browse & Inspect Tunneled Site without ever leaving the VPN Tunnel */}
      <BottomSheetModal
        isOpen={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        title={
          browseResult
            ? `Proton Tunnel Browser — ${browseResult.report.hostname}`
            : 'Proton Tunnel Browser'
        }
        subtitle={
          browseResult
            ? `🔑 Tunneled via ${activeServer?.exitCountryName || 'Australia'} (${
                activeServer?.name || 'AU#31'
              } · ${activeServer?.exitIp || '103.107.198.31'}) · Local IP (${realClientIp}) Masked`
            : ''
        }
      >
        {browseResult && (
          <div className="space-y-4">
            {/* Status & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                {browseResult.report.reachableViaVpn ? (
                  <span className="font-semibold text-[#1EA885] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Unblocked via {activeServer?.exitCountryName || 'Australia'} VPN Tunnel (HTTP{' '}
                    {browseResult.report.httpStatus})
                  </span>
                ) : (
                  <span className="font-semibold text-[#EF4444] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Unreachable ({browseResult.report.statusText})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-[#13111C] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewMode('LIVE_SANDBOX')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    previewMode === 'LIVE_SANDBOX'
                      ? 'bg-[#6D4AFF] text-white'
                      : 'text-[#A7A4B5] hover:text-white'
                  }`}
                >
                  Tunneled Web View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('SUMMARY')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    previewMode === 'SUMMARY'
                      ? 'bg-[#6D4AFF] text-white'
                      : 'text-[#A7A4B5] hover:text-white'
                  }`}
                >
                  Headers & DoH DNS
                </button>
              </div>
            </div>

            {previewMode === 'LIVE_SANDBOX' ? (
              <div className="space-y-2">
                <div className="text-[11px] text-[#A7A4B5] flex items-center justify-between">
                  <span>
                    Active VPN Exit IP: <strong className="text-[#34D399] font-mono">{activeServer?.exitIp || '103.107.198.31'}</strong> ({activeServer?.exitCountryName || 'Australia'})
                  </span>
                  <span className="font-mono flex items-center gap-1 text-[#8A6EFF]">
                    <ExternalLink className="w-3 h-3" />
                    {browseResult.report.hostname}
                  </span>
                </div>
                <div className="w-full h-[400px] rounded-xl overflow-hidden border border-white/15 bg-[#0b0a0e]">
                  <iframe
                    title={`Tunneled preview of ${browseResult.report.hostname}`}
                    srcDoc={browseResult.sanitizedHtml}
                    className="w-full h-full border-0 bg-[#0b0a0e]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl bg-[#13111C] border border-white/10 p-3.5 space-y-2 font-mono">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#A7A4B5]">Target URL:</span>
                    <span className="text-white truncate">{browseResult.report.finalUrl}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#A7A4B5]">Tunnel Route:</span>
                    <span className="text-[#1EA885]">{browseResult.report.tunnelRoute}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#A7A4B5]">Masked Real ISP IP:</span>
                    <span className="text-[#EF4444] line-through">{realClientIp}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#A7A4B5]">DoH Resolved IPs:</span>
                    <span className="text-white">
                      {browseResult.report.resolvedIps.join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#A7A4B5]">Server / Edge Header:</span>
                    <span className="text-white">{browseResult.report.serverHeader}</span>
                  </div>
                </div>

                {/* NetShield Filtered Trackers */}
                <div className="rounded-xl bg-[#13111C] border border-white/10 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Shield className="w-4 h-4 text-[#8A6EFF]" />
                    <span>
                      NetShield DNS & Script Filter (
                      {browseResult.report.netShieldBlockedTrackers.length} trackers stripped)
                    </span>
                  </div>
                  <p className="text-[#A7A4B5] font-mono text-[11px]">
                    {browseResult.report.netShieldBlockedTrackers.length > 0
                      ? `Blocked: ${browseResult.report.netShieldBlockedTrackers.join(' · ')}`
                      : 'Zero third-party ad/tracker scripts detected in initial HTML document.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
};
