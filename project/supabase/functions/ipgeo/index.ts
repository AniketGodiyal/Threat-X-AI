const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeoResult {
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

function isIPv4(ip: string): boolean {
  const parts = ip.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function isPublicIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { ip } = await req.json();

    if (!ip || typeof ip !== "string") {
      return new Response(
        JSON.stringify({ error: "IP address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isIPv4(ip)) {
      return new Response(
        JSON.stringify({ error: "Invalid IPv4 address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isPublicIPv4(ip)) {
      return new Response(
        JSON.stringify({
          ip,
          city: "Private/Local Network",
          state_prov: "N/A",
          country_name: "N/A",
          country_code2: "N/A",
          latitude: 0,
          longitude: 0,
          isp: "Local Network",
          organization: "N/A",
          asn: "N/A",
          time_zone: { name: "N/A" },
          message: "Private or local IP — no geolocation available",
        } satisfies GeoResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Primary: ipwho.is (free, no API key, HTTPS — works from Deno Deploy)
    try {
      const response = await fetch(`https://ipwho.is/${ip}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success !== false) {
          return new Response(
            JSON.stringify({
              ip,
              city: String(data.city || "Not available"),
              state_prov: String(data.region || "N/A"),
              country_name: String(data.country || "N/A"),
              country_code2: String(data.country_code || "N/A"),
              latitude: Number(data.latitude) || 0,
              longitude: Number(data.longitude) || 0,
              isp: String(data.connection?.isp || "N/A"),
              organization: String(data.connection?.org || "N/A"),
              asn: String(data.connection?.asn ? `AS${data.connection.asn}` : "N/A"),
              time_zone: { name: String(data.timezone?.id || "N/A") },
            } satisfies GeoResult),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("ipwho.is returned failure:", JSON.stringify(data).slice(0, 200));
      }
    } catch (err) {
      console.error("ipwho.is fetch error:", err.message);
    }

    // Backup: ip-api.com (free, no API key — HTTP only on free tier)
    try {
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as,timezone`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.status === "success") {
          return new Response(
            JSON.stringify({
              ip,
              city: String(data.city || "Not available"),
              state_prov: String(data.regionName || "N/A"),
              country_name: String(data.country || "N/A"),
              country_code2: String(data.countryCode || "N/A"),
              latitude: Number(data.lat) || 0,
              longitude: Number(data.lon) || 0,
              isp: String(data.isp || "N/A"),
              organization: String(data.org || "N/A"),
              asn: String(data.as || "N/A"),
              time_zone: { name: String(data.timezone || "N/A") },
            } satisfies GeoResult),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("ip-api.com returned failure:", JSON.stringify(data).slice(0, 200));
      }
    } catch (err) {
      console.error("ip-api.com fetch error:", err.message);
    }

    return new Response(
      JSON.stringify({
        ip,
        city: "Not available",
        state_prov: "Not available",
        country_name: "Not available",
        country_code2: "N/A",
        latitude: 0,
        longitude: 0,
        isp: "Not available",
        organization: "Not available",
        asn: "Not available",
        time_zone: { name: "Not available" },
        message: "All geolocation services failed to return data for this IP",
      } satisfies GeoResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
