import React, { useState } from 'react';
import {
  Check,
  Lock,
  Plus,
  Shield,
  Shuffle,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  ConnectionProfile,
  CountryGroup,
  NetShieldLevel,
  VpnProtocol,
} from '../types/vpn';
import { COUNTRY_FLAGS } from '../data/protonServers';
import { BottomSheetModal } from './BottomSheetModal';

interface ProfilesScreenViewProps {
  profiles: ConnectionProfile[];
  countryGroups: CountryGroup[];
  onConnectProfile: (profile: ConnectionProfile) => void;
  onCreateProfile: (profile: Omit<ConnectionProfile, 'id'>) => void;
  onDeleteProfile: (id: string) => void;
}

const PROFILE_COLORS = [
  '#6D4AFF',
  '#1EA885',
  '#EF4444',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
];

export const ProfilesScreenView: React.FC<ProfilesScreenViewProps> = ({
  profiles,
  countryGroups,
  onConnectProfile,
  onCreateProfile,
  onDeleteProfile,
}) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROFILE_COLORS[0]);
  const [countryCode, setCountryCode] = useState('CH');
  const [isSecureCore, setIsSecureCore] = useState(false);
  const [protocol, setProtocol] = useState<VpnProtocol>(VpnProtocol.WireGuard);
  const [netShieldLevel, setNetShieldLevel] = useState<NetShieldLevel>(
    NetShieldLevel.AdsTrackersMalware
  );
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a profile name.');
      return;
    }

    const group = countryGroups.find((g) => g.countryCode === countryCode);
    const chosenServer = isSecureCore
      ? group?.secureCoreServers[0]?.id || group?.servers[0]?.id
      : group?.servers[0]?.id;

    onCreateProfile({
      name: trimmed,
      color,
      countryCode,
      serverId: chosenServer,
      isSecureCore,
      protocol,
      netShieldLevel,
      customDnsEnabled: false,
      lastUsedAt: Date.now(),
    });

    setName('');
    setErrorMsg('');
    setIsBuilderOpen(false);
  };

  const presetProfiles = profiles.filter((p) => p.isPreset);
  const customProfiles = profiles.filter((p) => !p.isPreset);

  return (
    <div className="space-y-4 pb-6">
      {/* Header & Create Profile Action */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Connection Profiles</h2>
          <p className="text-xs text-[#A7A4B5]">
            One-tap connection presets with custom protocol, NetShield & Secure Core rules
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setIsBuilderOpen(true);
          }}
          className="min-h-[44px] px-4 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Default Presets */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-[#A7A4B5]">Default Presets</h3>
        <div className="divide-y divide-white/5">
          {presetProfiles.map((prof) => (
            <div
              key={prof.id}
              className="min-h-[60px] py-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${prof.color}20`, color: prof.color }}
                >
                  {prof.countryCode === 'RANDOM' ? (
                    <Shuffle className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{prof.name}</div>
                  <div className="text-xs text-[#A7A4B5] truncate">
                    {prof.protocol} · NetShield{' '}
                    {prof.netShieldLevel === NetShieldLevel.AdsTrackersMalware ? 'Full' : 'On'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onConnectProfile(prof)}
                className="min-h-[40px] px-4 rounded-xl bg-[#262235] hover:bg-[#6D4AFF] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Profiles */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#A7A4B5]">Custom Profiles</h3>
          <span className="text-[11px] font-mono text-[#A7A4B5]">
            {customProfiles.length} saved
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {customProfiles.map((prof) => (
            <div
              key={prof.id}
              className="min-h-[64px] py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                  style={{ backgroundColor: `${prof.color}22`, color: prof.color }}
                >
                  {COUNTRY_FLAGS[prof.countryCode] || <Shield className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">{prof.name}</span>
                    {prof.isSecureCore && <Lock className="w-3.5 h-3.5 text-[#8A6EFF] shrink-0" />}
                  </div>
                  <div className="text-xs text-[#A7A4B5] truncate">
                    {prof.countryCode} · {prof.protocol.split(' ')[0]} ·{' '}
                    {prof.isSecureCore ? 'Secure Core' : 'Standard'} · NetShield{' '}
                    {prof.netShieldLevel === NetShieldLevel.Off ? 'Off' : 'Active'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onDeleteProfile(prof.id)}
                  title={`Delete ${prof.name}`}
                  aria-label={`Delete ${prof.name}`}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#A7A4B5] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onConnectProfile(prof)}
                  className="min-h-[40px] px-4 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Profile Bottom Sheet Modal */}
      <BottomSheetModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        title="Create Connection Profile"
        subtitle="Configure target country, protocol, and privacy layer"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#E2E0EC]">Profile Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g., Zurich Financial Vault"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
            />
            {errorMsg && <p className="text-xs text-[#EF4444]">{errorMsg}</p>}
          </div>

          {/* Color Swatch Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#E2E0EC]">Profile Accent</label>
            <div className="flex items-center gap-2.5">
              {PROFILE_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Select color ${swatch}`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/15 cursor-pointer"
                  style={{ backgroundColor: swatch }}
                >
                  {color === swatch && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Target Country Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#E2E0EC]">Target Country</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
            >
              <option value="FASTEST">⚡ Fastest Available Country</option>
              <option value="RANDOM">🎲 Random Country</option>
              {countryGroups.map((g) => (
                <option key={g.countryCode} value={g.countryCode}>
                  {g.flag} {g.countryName} ({g.countryCode})
                </option>
              ))}
            </select>
          </div>

          {/* Protocol Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#E2E0EC]">VPN Protocol</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as VpnProtocol)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
            >
              {Object.values(VpnProtocol).map((proto) => (
                <option key={proto} value={proto}>
                  {proto}
                </option>
              ))}
            </select>
          </div>

          {/* NetShield Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#E2E0EC]">
              NetShield DNS Filtering
            </label>
            <select
              value={netShieldLevel}
              onChange={(e) => setNetShieldLevel(e.target.value as NetShieldLevel)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white"
            >
              <option value={NetShieldLevel.AdsTrackersMalware}>
                Block ads, trackers & malware (+f2)
              </option>
              <option value={NetShieldLevel.MalwareOnly}>Block malware only (+f1)</option>
              <option value={NetShieldLevel.Off}>Off</option>
            </select>
          </div>

          {/* Secure Core Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-[#13111C] border border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Secure Core Routing</div>
              <div className="text-xs text-[#A7A4B5]">Multi-hop entry via CH, IS, or SE</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSecureCore}
              onClick={() => setIsSecureCore((v) => !v)}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isSecureCore
                  ? 'bg-[#1EA885] text-[#0C0A12]'
                  : 'bg-[#262235] text-[#A7A4B5]'
              }`}
            >
              {isSecureCore ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsBuilderOpen(false)}
              className="min-h-[44px] px-4 rounded-xl bg-[#262235] text-xs font-semibold text-[#E2E0EC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-[#6D4AFF] hover:bg-[#7C5CFF] text-xs font-semibold text-white cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </BottomSheetModal>
    </div>
  );
};
