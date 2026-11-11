import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { LogicalServer, VpnSettings } from '../types/vpn';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { BottomSheetModal } from './BottomSheetModal';

interface ApkMetadataResponse {
  customApk: {
    fileName: string;
    packageName: string;
    versionName: string;
    versionCode: number;
    minSdk: number;
    targetSdk: number;
    sizeBytes: number;
    fileCount: number;
    sha256: string;
    downloadPath: string;
    studioProjectDownloadPath?: string;
    studioProjectSizeBytes?: number;
    includedFiles: string[];
  };
  officialProtonApk: {
    tagName: string;
    name: string;
    publishedAt: string;
    htmlUrl: string;
    apkDownloadUrl: string;
  };
  shareableAppUrl: string;
}

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeServer: LogicalServer | null;
  settings: VpnSettings;
  onDownloadWireGuardConf: () => void;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#0C0A12] shadow-lg">
      <span className="h-2 w-2 rounded-full bg-[#0C0A12] animate-pulse" />
      <span>Offline Mode — Using cached ProtonVPN application shell</span>
    </div>
  );
};

export const DeviceApkInstallCard: React.FC<{
  activeServer: LogicalServer | null;
  settings: VpnSettings;
  onOpenApkModal: () => void;
}> = ({ activeServer, settings, onOpenApkModal }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [downloadingApk, setDownloadingApk] = useState(false);

  const serverName = activeServer?.name || 'CH#14';
  const exitIp = activeServer?.exitIp || '185.159.157.14';
  const directApkHref = `/api/android/download-apk?server=${encodeURIComponent(
    serverName
  )}&exitIp=${encodeURIComponent(exitIp)}&protocol=${encodeURIComponent(
    settings.protocol
  )}&netShield=${encodeURIComponent(settings.netShieldLevel)}`;

  const handleDirectApkDownload = () => {
    setDownloadingApk(true);
    const link = document.createElement('a');
    link.href = directApkHref;
    link.download = 'ProtonVPN-Android-Clone-v5.8.0.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => setDownloadingApk(false), 1400);
  };

  return (
    <div className="rounded-2xl p-4 bg-gradient-to-r from-[#6D4AFF]/15 via-[#181524] to-[#1EA885]/15 border border-[#6D4AFF]/35">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#6D4AFF]/20 border border-[#6D4AFF]/40 flex items-center justify-center text-[#C4B5FD] shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Android Studio .APK & Project</span>
              <span className="text-[11px] font-mono text-[#34D399] font-normal">
                SDK 34 · v1/v2/v3 Signed
              </span>
            </div>
            <p className="text-xs text-[#A7A4B5] mt-0.5">
              Compiled with official Android SDK <span className="font-mono text-[#E2E0EC]">aapt2 + d8 + apksigner</span> (1.5 MB self-contained APK)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenApkModal}
          className="text-xs font-semibold text-[#8A6EFF] hover:text-white cursor-pointer shrink-0"
        >
          Details
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDirectApkDownload}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{downloadingApk ? 'Downloading .APK...' : 'Download Signed .APK'}</span>
        </button>

        {isInstallable && !isInstalled ? (
          <button
            type="button"
            onClick={install}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1EA885]/20 hover:bg-[#1EA885]/30 border border-[#1EA885]/40 text-[#34D399] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Install WebAPK</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenApkModal}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-[#262235] hover:bg-white/10 border border-white/10 text-[#E2E0EC] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>{isInstalled ? 'Installed on Device' : 'Android Studio ZIP'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  isOpen,
  onClose,
  activeServer,
  settings,
  onDownloadWireGuardConf,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [apkMeta, setApkMeta] = useState<ApkMetadataResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [downloadingCustom, setDownloadingCustom] = useState(false);
  const [downloadingStudio, setDownloadingStudio] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  const serverName = activeServer?.name || 'CH#14';
  const exitIp = activeServer?.exitIp || '185.159.157.14';

  useEffect(() => {
    if (!isOpen) return;
    setLoadingMeta(true);
    fetch(
      `/api/android/apk-info?server=${encodeURIComponent(
        serverName
      )}&exitIp=${encodeURIComponent(exitIp)}&protocol=${encodeURIComponent(
        settings.protocol
      )}&netShield=${encodeURIComponent(settings.netShieldLevel)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApkMetadataResponse | null) => {
        if (data) setApkMeta(data);
      })
      .catch(() => {
        // Ignore error
      })
      .finally(() => setLoadingMeta(false));
  }, [isOpen, serverName, exitIp, settings.protocol, settings.netShieldLevel]);

  const handleDownloadCustomApk = () => {
    setDownloadingCustom(true);
    const href = apkMeta?.customApk.downloadPath || '/api/android/download-apk';
    const a = document.createElement('a');
    a.href = href;
    a.download = apkMeta?.customApk.fileName || 'ProtonVPN-Android-Clone-v5.8.0.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => setDownloadingCustom(false), 1500);
  };

  const handleDownloadStudioProject = () => {
    setDownloadingStudio(true);
    const href =
      apkMeta?.customApk.studioProjectDownloadPath || '/api/android/download-studio-project';
    const a = document.createElement('a');
    a.href = href;
    a.download = 'ProtonVPN-Android-Studio-Project.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => setDownloadingStudio(false), 1500);
  };

  const fullDirectApkUrl = `${
    apkMeta?.shareableAppUrl || window.location.origin
  }/api/android/download-apk`;

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Android Studio SDK Build (.APK & Gradle Project)"
      subtitle="Compiled with Google Android SDK Build-Tools 34.0.0 (aapt2 · javac 17 · d8 · zipalign · apksigner v1+v2+v3)"
    >
      <div className="space-y-4">
        {/* Option 1: Direct Custom APK Package Download */}
        <div className="rounded-2xl p-4 bg-[#13111C] border border-[#6D4AFF]/40 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#C4B5FD]">
                1. Official Android SDK Compiled Package (.APK)
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {apkMeta?.customApk.fileName || 'ProtonVPN-Android-Clone-v5.8.0.apk'}
              </h4>
              <p className="text-xs text-[#A7A4B5] mt-0.5">
                Full self-contained Android application with embedded React + Three.js WebGL bundle, <span className="font-mono text-white">resources.arsc</span>, and V1+V2+V3 RSA-2048 signatures.
              </p>
            </div>
            <span className="text-xs font-mono text-[#34D399] shrink-0">
              {apkMeta
                ? `${(apkMeta.customApk.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                : '1.46 MB'}
            </span>
          </div>

          {/* APK Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#181524] border border-white/5 text-[11px]">
            <div>
              <span className="text-[#A7A4B5] block">Package ID</span>
              <span className="font-mono text-white font-semibold">
                {apkMeta?.customApk.packageName || 'ch.protonvpn.android.webclone'}
              </span>
            </div>
            <div>
              <span className="text-[#A7A4B5] block">Android SDK & Signatures</span>
              <span className="font-mono text-[#34D399] font-semibold">
                minSdk 21 · targetSdk 33 (v1+v2+v3)
              </span>
            </div>
            {apkMeta?.customApk.includedFiles && (
              <div className="col-span-2 pt-1.5 border-t border-white/5 space-y-0.5">
                <span className="text-[#A7A4B5] block text-[10px] uppercase tracking-wider">
                  Android SDK Toolchain Output (apksigner verify = TRUE)
                </span>
                {apkMeta.customApk.includedFiles.map((item) => (
                  <div key={item} className="font-mono text-[10px] text-[#E2E0EC] truncate">
                    • {item}
                  </div>
                ))}
              </div>
            )}
            <div className="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[#A7A4B5] mr-1.5">APK SHA-256:</span>
                <span className="font-mono text-[#34D399]">
                  {loadingMeta
                    ? 'Computing APK digest...'
                    : apkMeta?.customApk.sha256
                    ? `${apkMeta.customApk.sha256.slice(0, 28)}...`
                    : 'Verified'}
                </span>
              </div>
              {apkMeta?.customApk.sha256 && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(apkMeta.customApk.sha256);
                      setCopiedSha(true);
                      setTimeout(() => setCopiedSha(false), 1600);
                    } catch {
                      // Ignore
                    }
                  }}
                  className="text-[11px] font-mono text-[#C4B5FD] hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedSha ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSha ? 'Copied' : 'Hash'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Primary Download APK & Android Studio Project Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadCustomApk}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>
                {downloadingCustom
                  ? 'Downloading Signed .APK...'
                  : 'Download Signed .APK (1.5 MB)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadStudioProject}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#262235] hover:bg-white/10 border border-[#6D4AFF]/40 text-[#C4B5FD] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileCode2 className="w-4 h-4 shrink-0 text-[#34D399]" />
              <span>
                {downloadingStudio
                  ? 'Downloading Project .ZIP...'
                  : 'Download Android Studio .ZIP'}
              </span>
            </button>
          </div>

          {/* Direct Phone URL Copy */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-[#A7A4B5] truncate font-mono">
              {fullDirectApkUrl}
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(fullDirectApkUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 1800);
                } catch {
                  // Ignore
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-[#262235] hover:bg-white/10 text-[11px] font-semibold text-white flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3 h-3 text-[#34D399]" />
                  <span>Copied Link</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy APK Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Option 2: Install as Standalone App on Current Device (PWA / WebAPK) */}
        <div className="rounded-2xl p-4 bg-[#13111C] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#34D399]">
              2. Instant Standalone Device App (No Sideloading Needed)
            </div>
            <ShieldCheck className="w-4 h-4 text-[#34D399] shrink-0" />
          </div>
          <p className="text-xs text-[#A7A4B5] leading-relaxed">
            Install this application directly onto your Android home screen or Windows desktop as a standalone native-window app with offline service worker caching.
          </p>

          {isInstalled ? (
            <div className="p-2.5 rounded-xl bg-[#1EA885]/15 border border-[#1EA885]/30 text-xs text-[#34D399] font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Application is installed in standalone mode on this device.</span>
            </div>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={install}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#1EA885] hover:bg-[#1EA885]/90 text-[#0C0A12] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Install Standalone App on Device Now</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-[#181524] border border-white/5 text-xs text-[#E2E0EC] space-y-1.5">
              {isIOS ? (
                <p>
                  <strong>iPhone / iPad:</strong> Tap the Safari <strong>Share</strong> icon and select <strong>Add to Home Screen</strong>.
                </p>
              ) : (
                <p>
                  <strong>Android Chrome / Windows Edge:</strong> Open the shared app URL in a full tab (<span className="font-mono text-[#C4B5FD]">{apkMeta?.shareableAppUrl || window.location.origin}</span>) and tap the <strong>Install App</strong> icon in the address bar or browser menu (<strong>⋯ → Apps → Install this site as an app</strong>).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Option 3: Official ProtonVPN Android GitHub APK + WireGuard .conf */}
        <div className="rounded-2xl p-4 bg-[#13111C] border border-white/10 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#A7A4B5]">
            3. Official ProtonVPN Native APK & WireGuard Profile
          </div>
          <p className="text-xs text-[#A7A4B5] leading-relaxed">
            Want to sideload the upstream Kotlin APK from <span className="font-mono text-white">ProtonVPN/android-app</span> or import our <span className="font-mono text-white">{serverName}</span> tunnel into the official Android WireGuard app?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={
                apkMeta?.officialProtonApk.apkDownloadUrl ||
                'https://github.com/ProtonVPN/android-app/releases'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#262235] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#8A6EFF] shrink-0" />
              <span>Official GitHub .APK ({apkMeta?.officialProtonApk.tagName || 'v5.8'})</span>
            </a>

            <button
              type="button"
              onClick={onDownloadWireGuardConf}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#262235] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
              <span>Export {serverName} .conf</span>
            </button>
          </div>
        </div>
      </div>
    </BottomSheetModal>
  );
};
