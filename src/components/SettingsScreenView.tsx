import React, { useState } from 'react';
import {
  Check,
  Code2,
  Cpu,
  Download,
  Globe,
  Lock,
  Network,
  Plus,
  Shield,
  Sliders,
  Split,
  Trash2,
} from 'lucide-react';
import {
  NetShieldLevel,
  SplitTunnelMode,
  VpnProtocol,
  VpnSettings,
} from '../types/vpn';
import { BottomSheetModal } from './BottomSheetModal';

interface SettingsScreenViewProps {
  settings: VpnSettings;
  onUpdateSettings: (updater: (prev: VpnSettings) => VpnSettings) => void;
  onOpenWireGuardConfig: () => void;
  onOpenReaDissectionSheet: () => void;
}

export const SettingsScreenView: React.FC<SettingsScreenViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenWireGuardConfig,
  onOpenReaDissectionSheet,
}) => {
  const [isSplitTunnelOpen, setIsSplitTunnelOpen] = useState(false);
  const [isCustomDnsOpen, setIsCustomDnsOpen] = useState(false);
  const [newSubnet, setNewSubnet] = useState('');
  const [subnetError, setSubnetError] = useState('');
  const [newDnsInput, setNewDnsInput] = useState('');
  const [dnsError, setDnsError] = useState('');

  const handleToggleApp = (packageName: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      splitTunneling: {
        ...prev.splitTunneling,
        apps: prev.splitTunneling.apps.map((app) =>
          app.packageName === packageName ? { ...app, selected: !app.selected } : app
        ),
      },
    }));
  };

  const handleAddSubnet = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newSubnet.trim();
    const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipv4CidrRegex.test(cleaned)) {
      setSubnetError('Enter a valid IPv4 address or CIDR block (e.g. 192.168.1.0/24)');
      return;
    }
    if (settings.splitTunneling.ipSubnets.includes(cleaned)) {
      setSubnetError('This IP or subnet is already in the list.');
      return;
    }

    onUpdateSettings((prev) => ({
      ...prev,
      splitTunneling: {
        ...prev.splitTunneling,
        ipSubnets: [...prev.splitTunneling.ipSubnets, cleaned],
      },
    }));
    setNewSubnet('');
    setSubnetError('');
  };

  const handleRemoveSubnet = (subnet: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      splitTunneling: {
        ...prev.splitTunneling,
        ipSubnets: prev.splitTunneling.ipSubnets.filter((s) => s !== subnet),
      },
    }));
  };

  const handleAddDns = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newDnsInput.trim();
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(cleaned)) {
      setDnsError('Enter a valid IPv4 DNS address (e.g. 9.9.9.9 or 1.1.1.1)');
      return;
    }
    onUpdateSettings((prev) => ({
      ...prev,
      customDnsEnabled: true,
      customDnsServers: prev.customDnsServers.includes(cleaned)
        ? prev.customDnsServers
        : [...prev.customDnsServers, cleaned],
    }));
    setNewDnsInput('');
    setDnsError('');
  };

  const selectedAppsCount = settings.splitTunneling.apps.filter((a) => a.selected).length;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">VPN Settings & Tunneling</h2>
          <p className="text-xs text-[#A7A4B5]">
            UserData · Protocol, Split Tunneling, Kill Switch & ProTUN Config
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenWireGuardConfig}
          className="min-h-[44px] px-3.5 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export .conf</span>
        </button>
      </div>

      {/* Protocol & NetShield Configuration */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-4">
        <h3 className="text-xs font-semibold text-[#A7A4B5]">Connection & Security</h3>

        {/* Protocol Picker */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-white">
            <Sliders className="w-4 h-4 text-[#8A6EFF]" />
            <span>Protocol Selection</span>
          </label>
          <select
            value={settings.protocol}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                protocol: e.target.value as VpnProtocol,
              }))
            }
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
          >
            {Object.values(VpnProtocol).map((proto) => (
              <option key={proto} value={proto}>
                {proto}
              </option>
            ))}
          </select>
        </div>

        {/* NetShield Level */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-white">
            <Shield className="w-4 h-4 text-[#1EA885]" />
            <span>NetShield DNS Privacy Filter</span>
          </label>
          <select
            value={settings.netShieldLevel}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                netShieldLevel: e.target.value as NetShieldLevel,
              }))
            }
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
          >
            <option value={NetShieldLevel.AdsTrackersMalware}>
              Block ads, trackers & malware (F2)
            </option>
            <option value={NetShieldLevel.MalwareOnly}>Block malware only (F1)</option>
            <option value={NetShieldLevel.Off}>Off</option>
          </select>
        </div>

        {/* Kill Switch Mode */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-white">
            <Lock className="w-4 h-4 text-[#F59E0B]" />
            <span>Kill Switch & Always-On VPN</span>
          </label>
          <select
            value={settings.killSwitch}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                killSwitch: e.target.value as VpnSettings['killSwitch'],
              }))
            }
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
          >
            <option value="OFF">Off</option>
            <option value="STANDARD">Standard Kill Switch (Auto-reconnect)</option>
            <option value="ADVANCED_ALWAYS_ON">
              Advanced Kill Switch (Block all traffic without VPN)
            </option>
          </select>
        </div>
      </div>

      {/* Split Tunneling & Custom DNS Interactive Triggers */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 divide-y divide-white/5 overflow-hidden">
        {/* Split Tunneling Row */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#6D4AFF]/15 flex items-center justify-center text-[#8A6EFF] shrink-0">
              <Split className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Split Tunneling</div>
              <div className="text-xs text-[#A7A4B5] truncate">
                {settings.splitTunneling.enabled
                  ? `${
                      settings.splitTunneling.mode === SplitTunnelMode.Exclude
                        ? 'Excluding'
                        : 'Including'
                    } ${selectedAppsCount} apps · ${settings.splitTunneling.ipSubnets.length} IPs`
                  : 'Disabled · All device traffic routed through VPN'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSplitTunnelOpen(true)}
            className="min-h-[44px] px-4 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Configure
          </button>
        </div>

        {/* Custom DNS Row */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1EA885]/15 flex items-center justify-center text-[#1EA885] shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Custom DNS Servers</div>
              <div className="text-xs text-[#A7A4B5] truncate">
                {settings.customDnsEnabled
                  ? `Active: ${settings.customDnsServers.join(', ')}`
                  : 'Default Proton zero-knowledge internal DNS (10.2.0.1)'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomDnsOpen(true)}
            className="min-h-[44px] px-4 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Edit DNS
          </button>
        </div>
      </div>

      {/* Advanced Proton Engine Toggles */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-[#A7A4B5]">Advanced Tunnel Features</h3>

        {[
          {
            key: 'vpnAccelerator' as const,
            title: 'VPN Accelerator',
            desc: 'TCP BBR congestion control & multi-queue socket parallelization (+400% speed)',
          },
          {
            key: 'allowLanConnections' as const,
            title: 'Allow LAN Connections',
            desc: 'Permit local subnet devices (printers, Chromecast, NAS) while connected',
          },
          {
            key: 'moderateNat' as const,
            title: 'Moderate NAT (Type 2)',
            desc: 'Disable strict port randomization for direct P2P gaming matchmaking',
          },
          {
            key: 'ipv6Support' as const,
            title: 'IPv6 Tunnel Routing',
            desc: 'Route IPv6 traffic inside the WireGuard tunnel to prevent dual-stack leaks',
          },
        ].map((item) => {
          const checked = settings[item.key];
          return (
            <div
              key={item.key}
              className="min-h-[56px] py-2 flex items-center justify-between gap-3 border-b border-white/5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-xs text-[#A7A4B5]">{item.desc}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  checked
                    ? 'bg-[#1EA885]/20 text-[#34D399] border border-[#1EA885]/40'
                    : 'bg-[#262235] text-[#A7A4B5]'
                }`}
              >
                {checked ? 'ON' : 'OFF'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile REA Dissection Trigger Card */}
      <div className="lg:hidden rounded-2xl bg-[#1C1927] border border-[#6D4AFF]/30 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#6D4AFF]/20 flex items-center justify-center text-[#8A6EFF] shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">
              REA Android Architecture Inspector
            </div>
            <div className="text-xs text-[#A7A4B5] truncate">
              Inspect dissected ProtonVPN/android-app ViewModels & live StateFlow
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenReaDissectionSheet}
          className="min-h-[44px] px-3.5 rounded-xl bg-[#6D4AFF] text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          Inspect
        </button>
      </div>

      {/* Split Tunneling Bottom Sheet Modal */}
      <BottomSheetModal
        isOpen={isSplitTunnelOpen}
        onClose={() => setIsSplitTunnelOpen(false)}
        title="Split Tunneling (SplitTunnelingActivity)"
        subtitle="Select which Android apps and IPv4/CIDR subnets bypass or use the VPN"
      >
        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-[#13111C] border border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Enable Split Tunneling</div>
              <div className="text-xs text-[#A7A4B5]">
                Applies per-socket routing via VpnService.Builder.addDisallowedApplication
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  splitTunneling: {
                    ...prev.splitTunneling,
                    enabled: !prev.splitTunneling.enabled,
                  },
                }))
              }
              className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold cursor-pointer ${
                settings.splitTunneling.enabled
                  ? 'bg-[#1EA885] text-[#0C0A12]'
                  : 'bg-[#262235] text-[#A7A4B5]'
              }`}
            >
              {settings.splitTunneling.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Mode Selector (Exclude vs Include) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  splitTunneling: {
                    ...prev.splitTunneling,
                    mode: SplitTunnelMode.Exclude,
                  },
                }))
              }
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                settings.splitTunneling.mode === SplitTunnelMode.Exclude
                  ? 'bg-[#6D4AFF] border-[#6D4AFF] text-white'
                  : 'bg-[#13111C] border-white/10 text-[#A7A4B5]'
              }`}
            >
              Exclude Selected Apps
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  splitTunneling: {
                    ...prev.splitTunneling,
                    mode: SplitTunnelMode.Include,
                  },
                }))
              }
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                settings.splitTunneling.mode === SplitTunnelMode.Include
                  ? 'bg-[#6D4AFF] border-[#6D4AFF] text-white'
                  : 'bg-[#13111C] border-white/10 text-[#A7A4B5]'
              }`}
            >
              Include Only Selected
            </button>
          </div>

          {/* Android Packages List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#A7A4B5]">
              Android Installed Packages ({selectedAppsCount} selected)
            </div>
            <div className="divide-y divide-white/5 rounded-xl bg-[#13111C] border border-white/10 px-3">
              {settings.splitTunneling.apps.map((app) => (
                <button
                  key={app.packageName}
                  type="button"
                  onClick={() => handleToggleApp(app.packageName)}
                  className="w-full min-h-[52px] py-2 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{app.appName}</div>
                    <div className="text-[11px] font-mono text-[#A7A4B5] truncate">
                      {app.packageName} · {app.category}
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      app.selected
                        ? 'bg-[#6D4AFF] text-white'
                        : 'bg-[#262235] text-transparent border border-white/10'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* IP / CIDR Subnets */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#A7A4B5]">
              IPv4 / CIDR Subnets ({settings.splitTunneling.ipSubnets.length})
            </div>
            <form onSubmit={handleAddSubnet} className="flex items-center gap-2">
              <input
                type="text"
                value={newSubnet}
                onChange={(e) => {
                  setNewSubnet(e.target.value);
                  if (subnetError) setSubnetError('');
                }}
                placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-xs font-mono text-white"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#6D4AFF] text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add IP</span>
              </button>
            </form>
            {subnetError && <p className="text-xs text-[#EF4444]">{subnetError}</p>}

            <div className="space-y-1.5">
              {settings.splitTunneling.ipSubnets.map((subnet) => (
                <div
                  key={subnet}
                  className="min-h-[40px] px-3 rounded-xl bg-[#13111C] border border-white/10 flex items-center justify-between text-xs font-mono text-white"
                >
                  <span className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 text-[#8A6EFF]" />
                    {subnet}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubnet(subnet)}
                    aria-label={`Remove ${subnet}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#A7A4B5] hover:text-[#EF4444] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BottomSheetModal>

      {/* Custom DNS Bottom Sheet Modal */}
      <BottomSheetModal
        isOpen={isCustomDnsOpen}
        onClose={() => setIsCustomDnsOpen(false)}
        title="Custom DNS Servers"
        subtitle="Override Proton internal DNS (10.2.0.1) with custom resolvers"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-[#13111C] border border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Enable Custom DNS</div>
              <div className="text-xs text-[#A7A4B5]">
                Applies custom resolvers inside WireGuard Interface [DNS] block
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  customDnsEnabled: !prev.customDnsEnabled,
                }))
              }
              className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold cursor-pointer ${
                settings.customDnsEnabled
                  ? 'bg-[#1EA885] text-[#0C0A12]'
                  : 'bg-[#262235] text-[#A7A4B5]'
              }`}
            >
              {settings.customDnsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <form onSubmit={handleAddDns} className="flex items-center gap-2">
            <input
              type="text"
              value={newDnsInput}
              onChange={(e) => {
                setNewDnsInput(e.target.value);
                if (dnsError) setDnsError('');
              }}
              placeholder="e.g., 9.9.9.9 (Quad9) or 1.1.1.1"
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-xs font-mono text-white"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-[#6D4AFF] text-xs font-semibold text-white cursor-pointer"
            >
              Add DNS
            </button>
          </form>
          {dnsError && <p className="text-xs text-[#EF4444]">{dnsError}</p>}

          <div className="space-y-1.5">
            {settings.customDnsServers.map((dns) => (
              <div
                key={dns}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 flex items-center justify-between text-xs font-mono text-white"
              >
                <span className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#1EA885]" />
                  {dns}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      customDnsServers: prev.customDnsServers.filter((d) => d !== dns),
                    }))
                  }
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#A7A4B5] hover:text-[#EF4444] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
};
