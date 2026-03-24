import { computeRiskScores } from "../utils/riskEngine";
import { analyzeWithKeywords } from "../utils/keywordAnalyzer";

export async function analyzeText(text, userProfile) {
  try {
    const res = await fetch("/api/scan/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        userProfile,
      }),
    });

    if (!res.ok) {
      throw new Error("Backend failed");
    }

    const data = await res.json();

    computeRiskScores(data, userProfile);

    return {
      ...data,
      source: "ai",
    };
  } catch (err) {
    console.warn("Fallback to keyword analysis");

    const fallback = analyzeWithKeywords(text, userProfile);
    computeRiskScores(fallback, userProfile);

    return {
      ...fallback,
      source: "fallback",
    };
  }
}

export async function analyzeImage(imageData, userProfile) {
  try {
    const res = await fetch("http://localhost:5000/api/scan/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageData,
        scanType: "ocr", // or "product"
        userProfile,
      }),
    });

    if (!res.ok) {
      throw new Error("Image scan failed");
    }

    const data = await res.json();

    return {
      ...data,
      source: "ai",
    };
  } catch (err) {
    console.error("Image scan error:", err);

    return {
      summary: "Image analysis failed",
      allergens: [],
    };
  }
}