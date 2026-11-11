# ProtonVPN Web Client (Android App Dissection & Clone)

A single-page web application that faithfully recreates the redesigned **ProtonVPN Android app** (`ProtonVPN/android-app`) using structural and state-machine evidence modeled after **REA (`morluto/rea`)** analysis—complete with an interactive VPN connection simulator, real-time client IP/ISP detection and endpoint latency checks, interactive World Map, Country & Server browser, Secure Core multi-hop routing, NetShield ad/tracker blocking controls, Custom Profiles, and Split Tunneling configuration.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices have been confirmed from your answers and will guide the implementation.

- **Confirmed Connectivity Mode**: **Interactive VPN Simulator with Live IP & Latency Checks** — Performs real client IP/geolocation lookup and browser-side HTTP/fetch RTT latency measurements against regional endpoints, combined with an authentic ProtonVPN state machine (`Disconnected`, `Connecting`, `Connected`, `Disconnecting`) and simulated encrypted WireGuard/ProTUN traffic telemetry.
- **Confirmed Feature Scope**:
  - **Interactive World Map & Country Server Browser**: Vector world map with animated connection arcs, Secure Core entry-to-exit triangular multi-hop paths, server load indicators, city-level server nodes, and instant Quick Connect.
  - **Secure Core Multi-Hop Routing & NetShield Controls**: Toggleable double-hop routing through hardened privacy jurisdictions (Switzerland, Iceland, Sweden) and 3-state NetShield DNS filtering (`Off`, `Block Malware Only`, `Block Ads, Trackers & Malware`) with live blocked-request counters.
  - **Custom Connection Profiles & Split Tunneling Settings**: Create, edit, and launch saved connection presets (protocol, country, server, NetShield level, Secure Core state) and configure Split Tunneling (exclude/include apps and IPv4/IPv6 CIDR subnets).
- **Confirmed Layout Paradigm**: **Mobile-First Responsive Layout Faithfully Mirroring the Android App Screens** — Designed around the ProtonVPN Android app's bottom navigation tabs (`Home`, `Countries`, `Profiles`, `Settings`) and touch-first bottom sheets (`44×44px` minimum hit targets), while expanding cleanly on wide desktop viewports into a coordinated multi-panel Android workspace so the map, active screen, and REA Dissection & Telemetry drawer are simultaneously accessible without viewport waste.

---

## 1. Overview & Core Concept

- **What It Does**: Translates the Kotlin/Jetpack Compose architecture of `ProtonVPN/android-app` (`VpnStateMonitor`, `RedesignHomeViewModel`, `ServerManager2`, `NetShieldViewState`, and `ProfileManager`) into a reactive single-page web application. Users can inspect their real unprotected IP, tap **Quick Connect** to establish a simulated ProTUN/WireGuard tunnel, watch the interactive map animate the hop path (including Secure Core entry nodes in `CH`, `IS`, or `SE`), browse 30+ countries and 90+ realistic logical servers (`CH#14`, `US-NY#108`, `SE-DE#1`), manage custom Profiles, and adjust Split Tunneling and Protocol settings.
- **Target Audience / Persona**: Privacy-conscious users, security researchers, and mobile/web engineers exploring ProtonVPN's client architecture, UX flows, and protocol behavior in the browser.
- **Key Value**: Delivers a zero-install, tactile recreation of the ProtonVPN Android experience backed by real network latency probes and transparent architectural fidelity to the upstream open-source Android client.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Home Screen, Map & Quick Connect Flow**:
   - On launch, the app detects the user's real public IP, ISP, and approximate coordinates, centering the dark vector map on their current location with an `Unprotected` status banner.
   - Tapping **Quick Connect** (or selecting a recent connection card) transitions the state machine through `Checking availability` $\rightarrow$ `Initializing WireGuard (ProTUN)` $\rightarrow$ `Authenticating certificate` $\rightarrow$ `Connected`.
   - Once connected, the map draws an animated geodesic curve from the user's origin to the exit server (or a 2-hop relay via Switzerland/Iceland/Sweden when **Secure Core** is enabled), updates the masked virtual IP, and streams live throughput (`↓ Down` / `↑ Up`), session duration, and **NetShield** privacy statistics (Ads, Trackers, and Malware blocked).
2. **Countries & Server Selection Flow**:
   - Navigating to the **Countries** tab displays a real-time searchable list of countries grouped by `All Countries`, `Secure Core`, `P2P`, and `Tor` filter tabs.
   - Tapping a country expands its city and logical server tiers (`Free`, `Plus`), displaying individual server load percentages (`18%`–`89%`), real measured/estimated latency (`ms`), feature capabilities (`P2P`, `Tor`, `IPv6`, `Smart Routing`), and a one-tap **Connect** button.
3. **Custom Profiles Flow**:
   - Navigating to the **Profiles** tab displays pre-configured presets (*Fastest Connection*, *Random Country*, *Swiss Banking Secure Core*, *Low-Latency P2P*, *Tor over VPN*) alongside a **Create Profile** bottom sheet drawer.
   - Users can define custom profiles with a custom name, color accent, target country/server, VPN protocol (`Smart`, `WireGuard`, `WireGuard TCP`, `Stealth`, `OpenVPN UDP/TCP`), NetShield mode, and LAN access toggle, persisted automatically in local storage.
4. **Settings, Split Tunneling & REA Dissection Flow**:
   - The **Settings** tab mirrors ProtonVPN Android's configuration hierarchy: **Protocol Selection**, **Kill Switch & Always-On VPN**, **Split Tunneling** (interactive manager to add/remove excluded/included Android package names and IP subnets), **VPN Accelerator**, **Custom DNS**, and an expandable **REA Architecture Inspector** drawer showing the mapped `ProtonVPN/android-app` ViewModels, repositories, and state transitions active in real time.

### Visual Identity & Theme

- **Aesthetic Direction**: Authentic **Proton Carbon Dark** aesthetic—tactile, high-contrast Swiss privacy utility engineered for thumb-zone ergonomics, crisp legibility, and zero visual clutter.
- **Color Palette & Mood**:
  - **60% Dominant Neutral Canvas**: Deep Proton Carbon night slate (`#13111C` primary background, `#0C0A12` map abyss canvas).
  - **30% Structural Surfaces**: Elevated slate cards and bottom sheets (`#1C1927` and `#262235`), subtle hairline borders (`rgba(255, 255, 255, 0.08)`), muted lavender-gray secondary text (`#A7A4B5`).
  - **10% Accent Budget**: Signature Proton Purple (`#6D4AFF` primary CTA, `#8A6EFF` active focus/hover) paired with semantic connection states:
    - *Protected / Nominal*: Proton Emerald (`#1EA885`)
    - *Server Load Warning / Connecting*: Warm Amber (`#F59E0B`)
    - *Unprotected / Disconnect / Kill Switch Alert*: Coral Crimson (`#EF4444`)
- **Typography & Hierarchy**:
  - *Display & UI Headings*: `Plus Jakarta Sans` (SemiBold 600 / Bold 700, tight tracking `-0.02em`) for status headers, country titles, and navigation.
  - *Body Prose*: `Plus Jakarta Sans` (Regular 400 / Medium 500) for clean scannability at `14px`–`15px`.
  - *Telemetry & Tabular Data*: `JetBrains Mono` with `font-variant-numeric: tabular-nums` strictly enforced on all IP addresses, server load percentages, latency pings (`ms`), transfer speeds (`KB/s`, `MB/s`), and session timers.
- **Component Styling & Spatial Math**:
  - **Touch Targets & Thumb Zone**: Every interactive row, country expander, quick-connect button, and bottom nav tab enforces a minimum `44×44px` hitbox (`min-h-[44px]`). Primary connection actions and navigation tabs reside in the bottom 40% natural thumb zone.
  - **15% Sticky Surface Cap**: Compact top status header (`52px`) and fixed bottom tab bar (`64px`) stay within the sticky height budget, leaving generous vertical space for map exploration and scrollable lists.
  - **Responsive Mobile-First Viewport**: On mobile (`375px`–`430px`), renders as a full-bleed native Android screen with bottom-sheet drawers and bottom tab navigation. On desktop (`lg:` `1024px`–`1440px`), expands into a balanced multi-column layout (`max-w-7xl`) combining the primary interactive mobile screen frame with the live full-bleed interactive World Map, real-time throughput graphs, and REA Android Dissection state monitor so the desktop viewport is rich and purposeful.
  - **Anti-Slop & Zero-Pill Discipline**: Server metadata (city, protocol, tier, load percentage) uses clean unboxed inline typography separated by `·` bullets rather than cluttered pill badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side VPN State Machine + Real Network Probing**
  - *Chosen Approach*: Combine real public IP/ISP detection (`ipapi.co` / `ipwho.is` with graceful fallback) and real browser `fetch` RTT latency measurements with an authentic client-side simulation of Proton's `VpnConnectionManager` and WireGuard/Stealth handshake stages.
  - *Why*: Web browsers sandbox raw Layer-3 TUN/TAP kernel interfaces (`android.net.VpnService`), so simulating the kernel tunnel while running real IP discovery and live latency measurements delivers an authentic, responsive experience without requiring root privileges or native OS daemons.
  - *Alternatives Considered*: Static mock numbers (rejected because real IP detection and real RTT latency timing make the connection flow genuinely informative).
- **Decision 2: Faithful `ProtonVPN/android-app` MVVM State Architecture**
  - *Chosen Approach*: Structure the application state around the exact domain models dissected from `ProtonVPN/android-app`: `VpnStateMonitor` (connection lifecycle), `ServerManager2` (logical servers, Secure Core entry/exit pairs, load scores), `NetShieldStats` (ads, trackers, data saved), and `UserData` (protocol, split tunneling, kill switch, custom profiles).
  - *Why*: Ensures every toggle (such as switching from `WireGuard` to `Stealth`, enabling `Secure Core`, or changing `NetShield` level) dynamically recalculates the active tunnel route, handshake log, virtual exit IP, and map arc in real time.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ProtonVPN Web App (Single-Page Client)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │        ProtonVpnStateStore (MVVM Reactive Context + LocalStorage)     │  │
│  │  • VpnStateMonitor (Disconnected | Connecting | Connected | Error)    │  │
│  │  • ServerManager2 (30+ Countries, 95+ Logical Servers, Secure Core)   │  │
│  │  • NetShieldEngine (Off | Malware | Ads+Trackers+Malware + Counters)  │  │
│  │  • ProfileManager (Default Presets + User Custom Connection Profiles) │  │
│  │  • SettingsStore (Protocol, Split Tunneling Apps/IPs, Kill Switch)    │  │
│  └──────────────────┬────────────────────────────────┬───────────────────┘  │
│                     │                                │                      │
│                     ▼                                ▼                      │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │    Network & Telemetry Services     │  │   Interactive World Map SVG  │  │
│  │  • Real Public IP & Geo Lookup      │  │  • Pan/Zoom Geo Projection   │  │
│  │  • Live HTTP RTT Latency Prober     │  │  • Country Node Markers      │  │
│  │  • WireGuard/ProTUN Traffic Engine  │  │  • Single & Secure Core Arcs │  │
│  └──────────────────┬──────────────────┘  └──────────────┬───────────────┘  │
│                     │                                    │                  │
│                     └─────────────────┬──────────────────┘                  │
│                                       ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │         Mobile-First Android Viewport & Responsive Workspace          │  │
│  ├─────────────────┬─────────────────┬─────────────────┬─────────────────┤  │
│  │   Home Screen   │ Countries Tab   │  Profiles Tab   │  Settings Tab   │  │
│  │ • Status Card   │ • Search & Tabs │ • Saved Presets │ • Protocol Pick │  │
│  │ • Quick Connect │ • Secure Core   │ • One-Tap Launch│ • Split Tunnel  │  │
│  │ • NetShield Box │ • City/Server   │ • Profile Modal │ • Kill Switch   │  │
│  │ • Recents Strip │   Load & Ping   │   Builder       │ • REA Inspector │  │
│  └─────────────────┴─────────────────┴─────────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`LogicalServer`**: Represents an individual ProtonVPN server (`id`, `name` e.g. `CH#14` or `SE-US#1`, `entryCountry`, `exitCountry`, `city`, `tier`, `load` 1–100%, `score`, `entryIp`, `exitIp`, `coordinates`, `features` bitmask: `SECURE_CORE`, `P2P`, `TOR`, `IPV6`, `PARTNER`).
- **`ConnectionProfile`**: Represents a saved connection preset (`id`, `name`, `color`, `countryCode`, `serverId`, `isSecureCore`, `protocol`, `netShieldLevel`, `customDns`).
- **`SplitTunnelConfig`**: Holds `enabled`, `mode` (`EXCLUDE` or `INCLUDE`), `excludedApps` (list of Android package identifiers like `com.netflix.mediaclient`, `com.google.android.apps.nbu.paisa.user`, `com.spotify.music`), and `excludedIps` (valid IPv4/IPv6 CIDR blocks).
- **`TelemetrySnapshot`**: Live stream of `downloadSpeedBps`, `uploadSpeedBps`, `sessionBytesDown`, `sessionBytesUp`, `connectedSince`, `adsBlocked`, `trackersBlocked`, `dataSavedBytes`, and a 60-second ring buffer for the live throughput sparkline.

### Interactive Component & State Mapping

- **Connection Button & Handshake Lifecycle**: Tapping `Quick Connect`, `Disconnect`, or any specific Server/Profile triggers the state machine (`Connecting` $\rightarrow$ `Connected`), cancels any in-flight connection if interrupted, selects the optimal server based on active `Secure Core` and `Protocol` settings, and animates the map viewport to frame the active tunnel route.
- **Secure Core & NetShield Bottom Sheets**: Tapping the **Secure Core** or **NetShield** quick-action cards on the Home screen opens an interactive bottom sheet (`rounded-t-3xl`) where changing the mode immediately updates the active tunnel configuration (re-routing through `CH`/`IS`/`SE` if Secure Core is toggled while connected, or resetting/enabling real-time DNS block counters when NetShield mode changes).
- **Countries Filter & Search**: Typing in the country search bar or switching between `All`, `Secure Core`, `P2P`, and `Tor` filters immediately filters the grouped country accordion list; expanding a country reveals city sub-groups and individual logical servers with live load bars and aserver details modal.
- **Profile Creation & Editing**: Submitting the **Create / Edit Profile** sheet validates required fields, persists the profile to `localStorage`, and adds it to the **Profiles** tab and **Home Recents** list for one-tap connection.
- **Split Tunneling Manager**: Users can switch between *Do not use VPN for selected apps/IPs* (`Exclude`) and *Only use VPN for selected apps/IPs* (`Include`), toggle Android apps from a searchable package list, and add/validate custom IPv4/CIDR addresses with immediate validation feedback.
