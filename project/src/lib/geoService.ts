export interface GeoData {
  ip: string;
  city: string;
  state_prov: string;
  country_name: string;
  country_code2: string;
  latitude: number;
  longitude: number;
  isp: string;
  organization: string;
  asn: string;
  time_zone: { name: string };
  message?: string;
}

export async function fetchGeoData(ip: string): Promise<GeoData | null> {
  if (!ip || ip === "Unknown") return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ipgeo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ ip }),
    });

    if (!response.ok) {
      console.error("Geo lookup failed:", response.status);
      return null;
    }

    const raw = await response.json();

    const data: GeoData = {
      ip: String(raw.ip || ip),
      city: String(raw.city || "Not available"),
      state_prov: String(raw.state_prov || "N/A"),
      country_name: String(raw.country_name || "N/A"),
      country_code2: String(raw.country_code2 || "N/A"),
      latitude: parseFloat(raw.latitude) || 0,
      longitude: parseFloat(raw.longitude) || 0,
      isp: String(raw.isp || "N/A"),
      organization: String(raw.organization || "N/A"),
      asn: String(raw.asn || "N/A"),
      time_zone: { name: raw.time_zone?.name || "N/A" },
      message: raw.message,
    };

    return data;
  } catch (err) {
    console.error("Geo lookup error:", err);
    return null;
  }
}
