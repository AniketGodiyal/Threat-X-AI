const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HFClassificationResult {
  label: string;
  score: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, subject, sender } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Email text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine subject + sender + body into a single text for the model
    const combinedText = `${subject || ""} ${sender || ""} ${text}`.slice(0, 2000);

    // Try Hugging Face Inference API
    const hfToken = Deno.env.get("HF_TOKEN");
    const modelId = "dima806/phishing-email-detection";

    let mlResult: { label: string; score: number; phishingProbability: number } | null = null;

    if (hfToken) {
      const hfResponse = await fetch(
        `https://api-inference.huggingface.co/models/${modelId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: combinedText }),
        }
      );

      if (hfResponse.ok) {
        const raw = await hfResponse.json();
        // HF returns [[{label, score}, {label, score}]] for text-classification
        const results: HFClassificationResult[] = Array.isArray(raw)
          ? Array.isArray(raw[0])
            ? raw[0]
            : raw
          : [];
        const sorted = results.sort((a, b) => b.score - a.score);
        const top = sorted[0];

        if (top) {
          // The model's labels are typically "phishing" / "legit" (or "not phishing")
          const labelLower = top.label.toLowerCase();
          const isPhishingPred = labelLower.includes("phish") && !labelLower.includes("not");
          mlResult = {
            label: top.label,
            score: top.score,
            phishingProbability: isPhishingPred ? top.score : 1 - top.score,
          };
        }
      }
    }

    // Fallback: heuristic keyword-based ML approximation when no HF token or API fails
    if (!mlResult) {
      const phishingKeywords = [
        "urgent", "immediate", "suspended", "verify", "account", "verify your",
        "click here", "confirm your", "update your", "security alert", "warning",
        "limited", "restricted", "unauthorized", "suspended", "deadline", "expire",
        "password", "login", "bank", "paypal", "amazon", "microsoft", "apple",
        "invoice", "payment", "refund", "wire", "transfer", "gift card",
        "bitcoin", "crypto", "prize", "winner", "lottery", "claim",
        "ssn", "social security", "tax", "irs", "refund",
      ];

      const lowerText = combinedText.toLowerCase();
      const matches = phishingKeywords.filter((kw) => lowerText.includes(kw));
      const baseScore = Math.min(matches.length * 0.08, 0.85);
      // Check for suspicious URL patterns
      const hasIpUrl = /\bhttps?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lowerText);
      const hasShortUrl = /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly/.test(lowerText);
      const hasAtRedirect = /@.*https?:\/\//.test(lowerText);
      const urlBonus = (hasIpUrl ? 0.1 : 0) + (hasShortUrl ? 0.05 : 0) + (hasAtRedirect ? 0.05 : 0);
      const phishingProbability = Math.min(baseScore + urlBonus, 0.99);

      mlResult = {
        label: phishingProbability > 0.5 ? "phishing" : "legit",
        score: phishingProbability > 0.5 ? phishingProbability : 1 - phishingProbability,
        phishingProbability,
      };
    }

    return new Response(
      JSON.stringify({
        modelUsed: "dima806/phishing-email-detection-distilbert",
        modelSource: hfToken ? "huggingface-inference-api" : "heuristic-fallback",
        ...mlResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
