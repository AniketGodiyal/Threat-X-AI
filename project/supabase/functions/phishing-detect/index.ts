const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MLResult {
  label: string;
  score: number;
  phishingProbability: number;
  modelUsed: string;
  modelSource: string;
  errorDetail?: string;
}

const PHISHING_MODEL = "dima806/phishing-email-detection";

async function tryTextClassification(
  url: string,
  text: string,
  hfToken: string
): Promise<MLResult | null> {
  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (res.ok) {
        const raw = await res.json();
        const results = Array.isArray(raw)
          ? Array.isArray(raw[0]) ? raw[0] : raw
          : [];
        const sorted = results.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
        const top = sorted[0];

        if (top) {
          const labelLower = top.label.toLowerCase();
          const isPhishingPred = labelLower.includes("phish") && !labelLower.includes("not");
          return {
            label: top.label,
            score: top.score,
            phishingProbability: isPhishingPred ? top.score : 1 - top.score,
            modelUsed: PHISHING_MODEL,
            modelSource: "huggingface-inference-api",
          };
        }
        return null;
      }

      if (res.status === 503 || res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 5000) : 2500;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      const errBody = await res.text().catch(() => "");
      console.error(`TextClassification ${url} -> ${res.status}: ${errBody.slice(0, 200)}`);
      return null;
    } catch (err) {
      console.error(`TextClassification ${url} fetch error:`, err.message);
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  return null;
}

async function tryChatCompletion(
  text: string,
  hfToken: string
): Promise<MLResult | null> {
  // Use a well-supported model through the new Inference Providers router.
  // These models are hosted by multiple providers (DeepInfra, Together, etc.)
  // and are far more reliable than small community models.
  const chatModels = [
    "Qwen/Qwen2.5-7B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
  ];

  const systemPrompt = `You are a phishing email detection system. Analyze the given email and determine if it is a phishing attempt or a legitimate email. Respond with ONLY a JSON object, no other text:
{"is_phishing": true/false, "confidence": 0.0-1.0}
Consider: urgency language, sender impersonation, suspicious links, credential harvesting, too-good-to-be-true offers, and social engineering tactics.`;

  for (const model of chatModels) {
    const url = `https://router.huggingface.co/hf-inference/models/${model}/v1/chat/completions`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Classify this email:\n\n${text.slice(0, 1500)}` },
          ],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          // Parse the JSON from the model's response
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const isPhishing = Boolean(parsed.is_phishing);
            const confidence = Math.min(Math.max(Number(parsed.confidence) || 0.5, 0), 1);
            return {
              label: isPhishing ? "phishing" : "legit",
              score: confidence,
              phishingProbability: isPhishing ? confidence : 1 - confidence,
              modelUsed: model,
              modelSource: "huggingface-inference-api",
            };
          }
        }
      } else if (res.status !== 404 && res.status !== 503) {
        const errBody = await res.text().catch(() => "");
        console.error(`ChatCompletion ${model} -> ${res.status}: ${errBody.slice(0, 200)}`);
      }
    } catch (err) {
      console.error(`ChatCompletion ${model} error:`, err.message);
    }
  }

  return null;
}

function heuristicPrediction(text: string, errorDetail?: string): MLResult {
  const phishingKeywords = [
    "urgent", "immediate", "suspended", "verify", "account", "verify your",
    "click here", "confirm your", "update your", "security alert", "warning",
    "limited", "restricted", "unauthorized", "deadline", "expire",
    "password", "login", "bank", "paypal", "amazon", "microsoft", "apple",
    "invoice", "payment", "refund", "wire", "transfer", "gift card",
    "bitcoin", "crypto", "prize", "winner", "lottery", "claim",
    "ssn", "social security", "tax", "irs",
  ];

  const lowerText = text.toLowerCase();
  const matches = phishingKeywords.filter((kw) => lowerText.includes(kw));
  const baseScore = Math.min(matches.length * 0.08, 0.85);
  const hasIpUrl = /\bhttps?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lowerText);
  const hasShortUrl = /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly/.test(lowerText);
  const hasAtRedirect = /@.*https?:\/\//.test(lowerText);
  const urlBonus = (hasIpUrl ? 0.1 : 0) + (hasShortUrl ? 0.05 : 0) + (hasAtRedirect ? 0.05 : 0);
  const phishingProbability = Math.min(baseScore + urlBonus, 0.99);

  return {
    label: phishingProbability > 0.5 ? "phishing" : "legit",
    score: phishingProbability > 0.5 ? phishingProbability : 1 - phishingProbability,
    phishingProbability,
    modelUsed: "heuristic-keyword-analysis",
    modelSource: "heuristic-fallback",
    errorDetail,
  };
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

    const combinedText = `${subject || ""} ${sender || ""} ${text}`.slice(0, 2000);
    const hfToken = Deno.env.get("HF_TOKEN");

    let mlResult: MLResult | null = null;
    const errors: string[] = [];

    if (hfToken) {
      // Strategy 1: Try the dedicated phishing model on both endpoints
      const newUrl = `https://router.huggingface.co/hf-inference/models/${PHISHING_MODEL}`;
      const legacyUrl = `https://api-inference.huggingface.co/models/${PHISHING_MODEL}`;

      mlResult = await tryTextClassification(newUrl, combinedText, hfToken);
      if (!mlResult) errors.push("router text-classification failed");

      if (!mlResult) {
        mlResult = await tryTextClassification(legacyUrl, combinedText, hfToken);
        if (!mlResult) errors.push("legacy text-classification failed");
      }

      // Strategy 2: Use a general LLM via chat completion to classify the email
      if (!mlResult) {
        mlResult = await tryChatCompletion(combinedText, hfToken);
        if (!mlResult) errors.push("chat completion models failed");
      }
    } else {
      errors.push("no HF_TOKEN set");
    }

    if (!mlResult) {
      mlResult = heuristicPrediction(combinedText, errors.join("; "));
    }

    return new Response(
      JSON.stringify(mlResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
