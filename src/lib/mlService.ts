import type { MLPrediction } from './analyzer';

export async function fetchMLPrediction(
  text: string,
  subject: string,
  sender: string
): Promise<MLPrediction | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/phishing-detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ text, subject, sender }),
    });

    if (!response.ok) {
      console.error("ML prediction failed:", response.status);
      return null;
    }

    const raw = await response.json();

    if (!raw || typeof raw.phishingProbability !== "number") return null;

    return {
      label: String(raw.label || "unknown"),
      score: Number(raw.score) || 0,
      phishingProbability: Number(raw.phishingProbability),
      modelUsed: String(raw.modelUsed || "unknown"),
      modelSource: String(raw.modelSource || "unknown"),
    };
  } catch (err) {
    console.error("ML prediction error:", err);
    return null;
  }
}
