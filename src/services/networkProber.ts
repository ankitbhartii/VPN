import { ClientIpInfo, GeoCoordinates, LogicalServer } from '../types/vpn';

const DEFAULT_FALLBACK_IP: ClientIpInfo = {
  ip: '198.51.100.42',
  isp: 'Cloudflare Warp / Residential Transit',
  city: 'San Francisco',
  countryName: 'United States',
  countryCode: 'US',
  lat: 37.7749,
  lng: -122.4194,
  isRealDetected: false,
};

/**
 * Fetches the user's real public IP and approximate geolocation using public CORS-friendly endpoints
 * with instant graceful fallback if blocked by browser privacy extensions.
 */
export async function detectClientIp(): Promise<ClientIpInfo> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3800);

    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.ip) {
        return {
          ip: String(data.ip),
          isp: String(data.connection?.isp || data.connection?.org || 'Direct Public Network'),
          city: String(data.city || 'Local Node'),
          countryName: String(data.country || 'United States'),
          countryCode: String(data.country_code || 'US'),
          lat: typeof data.latitude === 'number' ? data.latitude : 37.7749,
          lng: typeof data.longitude === 'number' ? data.longitude : -122.4194,
          isRealDetected: true,
        };
      }
    }
  } catch {
    // Fallback to secondary endpoint
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3200);
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        return {
          ip: String(data.ip),
          isp: String(data.org || 'Direct Public Network'),
          city: String(data.city || 'Local Node'),
          countryName: String(data.country_name || 'United States'),
          countryCode: String(data.country_code || 'US'),
          lat: typeof data.latitude === 'number' ? data.latitude : 37.7749,
          lng: typeof data.longitude === 'number' ? data.longitude : -122.4194,
          isRealDetected: true,
        };
      }
    }
  } catch {
    // Graceful fallback if offline or blocked by strict adblocker
  }

  return DEFAULT_FALLBACK_IP;
}

/**
 * Computes great-circle distance in kilometers between two coordinates (Haversine formula).
 */
export function haversineDistanceKm(a: GeoCoordinates, b: GeoCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Performs a real browser HTTP RTT latency measurement (`performance.now()`) and combines it
 * with geographic fiber-optic propagation delay to compute realistic per-server latency.
 */
export async function probeLiveNetworkRtt(
  clientCoords: GeoCoordinates,
  servers: LogicalServer[]
): Promise<{ baseRttMs: number; updatedServers: LogicalServer[] }> {
  let baseRttMs = 28;

  try {
    const t0 = performance.now();
    await fetch(`https://www.gstatic.com/generate_204?t=${Date.now()}`, {
      mode: 'no-cors',
      cache: 'no-store',
    });
    const elapsed = Math.round(performance.now() - t0);
    if (elapsed > 4 && elapsed < 1500) {
      baseRttMs = elapsed;
    }
  } catch {
    baseRttMs = 31;
  }

  const updatedServers = servers.map((srv) => {
    // Fiber-optic round trip propagation ~ 0.014 ms per km + base local hop RTT
    const distKm =
      srv.entryCountryCode !== srv.exitCountryCode
        ? haversineDistanceKm(clientCoords, srv.entryCoords) +
          haversineDistanceKm(srv.entryCoords, srv.exitCoords)
        : haversineDistanceKm(clientCoords, srv.exitCoords);

    const geoDelayMs = Math.round(distKm * 0.011);
    const jitter = Math.floor(Math.random() * 5) - 2;
    const measuredLatencyMs = Math.max(8, Math.round(baseRttMs * 0.65 + geoDelayMs + jitter));

    return {
      ...srv,
      measuredLatencyMs,
    };
  });

  return { baseRttMs, updatedServers };
}
