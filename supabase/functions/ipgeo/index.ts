const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    if (ip === "Unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
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
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = "79e02a76b26846a9851b3609ecf0245a";

    if (!apiKey) {
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
          message: "No API key configured — set IPGEO_API_KEY as an edge function secret",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}&fields=city,state_prov,country_name,country_code2,latitude,longitude,isp,organization,asn,time_zone.name`
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ip,
          city: "Lookup failed",
          state_prov: "N/A",
          country_name: "N/A",
          country_code2: "N/A",
          latitude: 0,
          longitude: 0,
          isp: "N/A",
          organization: "N/A",
          asn: "N/A",
          time_zone: { name: "N/A" },
          message: `Geolocation API returned ${response.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
