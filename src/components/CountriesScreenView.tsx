import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  CountryGroup,
  LogicalServer,
  ServerFeature,
  VpnConnectionState,
} from '../types/vpn';
import { COUNTRY_FLAGS } from '../data/protonServers';

interface CountriesScreenViewProps {
  countryGroups: CountryGroup[];
  activeServer: LogicalServer | null;
  connectionState: VpnConnectionState;
  secureCoreEnabled: boolean;
  onToggleSecureCore: (enabled: boolean) => void;
  onConnectServer: (server: LogicalServer) => void;
  onSelectCountryConnect: (countryCode: string) => void;
  onRefreshLatency: () => void;
  isProbing: boolean;
}

type CategoryFilter = 'ALL' | 'SECURE_CORE' | 'P2P' | 'TOR' | 'FREE';

export const CountriesScreenView: React.FC<CountriesScreenViewProps> = ({
  countryGroups,
  activeServer,
  connectionState,
  secureCoreEnabled,
  onToggleSecureCore,
  onConnectServer,
  onSelectCountryConnect,
  onRefreshLatency,
  isProbing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>(
    secureCoreEnabled ? 'SECURE_CORE' : 'ALL'
  );
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({
    CH: true,
    US: true,
  });

  const isConnected = connectionState === VpnConnectionState.Connected;

  const toggleExpand = (code: string) => {
    setExpandedCountries((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleCategoryChange = (next: CategoryFilter) => {
    setCategory(next);
    if (next === 'SECURE_CORE' && !secureCoreEnabled) {
      onToggleSecureCore(true);
    } else if (next !== 'SECURE_CORE' && secureCoreEnabled) {
      onToggleSecureCore(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return countryGroups
      .map((group) => {
        const candidateServers =
          category === 'SECURE_CORE'
            ? group.secureCoreServers
            : [...group.servers, ...group.secureCoreServers];

        const matchingServers = candidateServers.filter((srv) => {
          if (category === 'P2P' && !srv.features.includes(ServerFeature.P2P)) return false;
          if (category === 'TOR' && !srv.features.includes(ServerFeature.Tor)) return false;
          if (category === 'FREE' && srv.tier !== 0) return false;
          if (
            category === 'ALL' &&
            !secureCoreEnabled &&
            srv.features.includes(ServerFeature.SecureCore)
          ) {
            return false;
          }

          if (!q) return true;
          return (
            group.countryName.toLowerCase().includes(q) ||
            group.countryCode.toLowerCase().includes(q) ||
            srv.city.toLowerCase().includes(q) ||
            srv.name.toLowerCase().includes(q)
          );
        });

        return {
          ...group,
          matchingServers,
        };
      })
      .filter((g) => g.matchingServers.length > 0);
  }, [countryGroups, category, searchQuery, secureCoreEnabled]);

  const formatFeaturesText = (features: ServerFeature[], tier: number): string => {
    const items: string[] = [];
    if (tier === 0) items.push('Free Tier');
    else items.push('Plus');
    if (features.includes(ServerFeature.SecureCore)) items.push('Secure Core');
    if (features.includes(ServerFeature.P2P)) items.push('P2P');
    if (features.includes(ServerFeature.Tor)) items.push('Tor');
    if (features.includes(ServerFeature.Streaming)) items.push('Streaming');
    if (features.includes(ServerFeature.SmartRouting)) items.push('Smart Routing');
    return items.join(' · ');
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Search & Live RTT Refresh Bar */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Countries & Gateways</h2>
            <p className="text-xs text-[#A7A4B5]">
              ServerManager2 · {countryGroups.length} countries · Live RTT sorting
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshLatency}
            disabled={isProbing}
            className="min-h-[44px] px-3 rounded-xl bg-[#262235] hover:bg-white/10 text-xs font-medium text-[#E2E0EC] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin text-[#8A6EFF]' : ''}`} />
            <span>Ping All</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#A7A4B5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search country, city (Zurich, Tokyo), or node (CH#14)..."
            aria-label="Search countries, cities, or servers"
            className="w-full min-h-[44px] pl-10 pr-10 rounded-xl bg-[#13111C] border border-white/10 focus:border-[#6D4AFF] focus:outline-none text-sm text-white placeholder-[#A7A4B5]/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="min-h-[44px] min-w-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#A7A4B5] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Interactive Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'ALL', label: 'All Countries' },
              { id: 'SECURE_CORE', label: 'Secure Core' },
              { id: 'P2P', label: 'P2P / BitTorrent' },
              { id: 'TOR', label: 'Tor over VPN' },
              { id: 'FREE', label: 'Free Servers' },
            ] as { id: CategoryFilter; label: string }[]
          ).map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#6D4AFF] text-white'
                    : 'bg-[#13111C] text-[#A7A4B5] hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secure Core Banner Toggle */}
      <div className="rounded-2xl bg-[#1C1927] border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#6D4AFF]/15 flex items-center justify-center text-[#8A6EFF] shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Secure Core Multi-Hop</div>
            <div className="text-xs text-[#A7A4B5] truncate">
              Route through hardened servers in Switzerland, Iceland & Sweden
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={secureCoreEnabled}
          onClick={() => {
            const next = !secureCoreEnabled;
            onToggleSecureCore(next);
            setCategory(next ? 'SECURE_CORE' : 'ALL');
          }}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            secureCoreEnabled
              ? 'bg-[#1EA885]/20 text-[#34D399] border border-[#1EA885]/40'
              : 'bg-[#262235] text-[#A7A4B5] hover:text-white'
          }`}
        >
          {secureCoreEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Country Accordion List */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl bg-[#1C1927] border border-white/10 p-8 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-[#A7A4B5] mx-auto" />
          <div className="text-sm font-semibold text-white">No matching servers found</div>
          <p className="text-xs text-[#A7A4B5] max-w-xs mx-auto">
            Try clearing your search query or switching from the {category} filter to All Countries.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              handleCategoryChange('ALL');
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#6D4AFF] text-xs font-semibold text-white cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredGroups.map((group) => {
            const isExpanded = Boolean(expandedCountries[group.countryCode] || searchQuery.trim());
            const isCountryActive =
              isConnected && activeServer?.exitCountryCode === group.countryCode;
            const bestLatency = Math.min(
              ...group.matchingServers.map((s) => s.measuredLatencyMs ?? s.baseLatencyMs)
            );

            return (
              <div
                key={group.countryCode}
                className="rounded-2xl bg-[#1C1927] border border-white/10 overflow-hidden"
              >
                {/* Country Row Header */}
                <div className="min-h-[60px] px-4 py-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(group.countryCode)}
                    className="flex-1 min-h-[44px] flex items-center gap-3 text-left min-w-0 cursor-pointer"
                  >
                    <span className="text-2xl shrink-0">{group.flag}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                        <span>{group.countryName}</span>
                        {isCountryActive && (
                          <span className="text-xs font-mono text-[#1EA885]">· Connected</span>
                        )}
                      </div>
                      <div className="text-xs text-[#A7A4B5] truncate">
                        {group.matchingServers.length}{' '}
                        {group.matchingServers.length === 1 ? 'server' : 'servers'} ·{' '}
                        <span className="font-mono">{bestLatency} ms</span>
                        {group.hasP2P ? ' · P2P' : ''}
                        {group.hasTor ? ' · Tor' : ''}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectCountryConnect(group.countryCode)}
                      className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isCountryActive
                          ? 'bg-[#1EA885]/20 text-[#34D399] border border-[#1EA885]/30'
                          : 'bg-[#262235] hover:bg-[#6D4AFF] text-white'
                      }`}
                    >
                      {isCountryActive ? 'Active' : 'Fastest'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(group.countryCode)}
                      aria-label={`Toggle ${group.countryName} servers`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#A7A4B5] hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Individual Logical Servers */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-[#13111C]/70 divide-y divide-white/5 px-4">
                    {group.matchingServers.map((srv) => {
                      const isSrvConnected = isConnected && activeServer?.id === srv.id;
                      const loadColor =
                        srv.load < 45
                          ? 'text-[#1EA885]'
                          : srv.load < 75
                          ? 'text-[#F59E0B]'
                          : 'text-[#EF4444]';

                      return (
                        <div
                          key={srv.id}
                          className="min-h-[58px] py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-white">
                                {srv.name}
                              </span>
                              <span className="text-xs text-[#A7A4B5]">·</span>
                              <span className="text-xs text-[#E2E0EC] truncate">{srv.city}</span>
                            </div>

                            {/* Unboxed inline metadata adhering to Zero-Pill discipline */}
                            <div className="text-[11px] text-[#A7A4B5] flex flex-wrap items-center gap-1.5">
                              <span className={`font-mono font-semibold ${loadColor}`}>
                                {srv.load}% load
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">
                                {srv.measuredLatencyMs ?? srv.baseLatencyMs} ms
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{formatFeaturesText(srv.features, srv.tier)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onConnectServer(srv)}
                            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isSrvConnected
                                ? 'bg-[#1EA885] text-[#0C0A12]'
                                : 'bg-[#262235] hover:bg-[#6D4AFF] text-white'
                            }`}
                          >
                            {isSrvConnected ? 'Connected' : 'Connect'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
