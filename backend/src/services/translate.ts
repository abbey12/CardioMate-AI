/**
 * Translation service using Gemini API
 * Translates ECG report content to the target language
 */

export async function translateEcgReport(
  content: {
    clinicalImpression: string;
    abnormalities: string[];
    recommendations?: string[];
    rhythm?: string | null;
  },
  targetLanguage: "en" | "fr"
): Promise<{
  clinicalImpression: string;
  abnormalities: string[];
  recommendations?: string[];
  rhythm?: string | null;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found - skipping translation");
    // If no API key, return original content
    return content;
  }

  // If target language is English, return as-is (assuming original is English)
  if (targetLanguage === "en") {
    console.log("Target language is English - skipping translation");
    return content;
  }

  console.log(`Translating ECG report to ${targetLanguage}...`);
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-pro";
  const endpoint =
    process.env.GEMINI_ENDPOINT ??
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const languageName = targetLanguage === "fr" ? "French" : "English";
  
  const promptText = `You are a medical translator specializing in ECG reports. Translate the following ECG report content from English to ${languageName}. 

IMPORTANT RULES:
1. Use proper medical terminology in ${languageName}
2. Preserve all medical terms, measurements, and technical accuracy
3. Maintain the same structure and formatting
4. Keep numbers, units (bpm, ms, etc.), and medical abbreviations unchanged
5. Translate clinical impressions, abnormalities, and recommendations accurately
6. For rhythm names, use standard ${languageName} medical terminology

ECG REPORT CONTENT TO TRANSLATE:

Clinical Impression:
${content.clinicalImpression}

Abnormalities:
${content.abnormalities.map((a, i) => `${i + 1}. ${a}`).join("\n")}

${content.recommendations && content.recommendations.length > 0 ? `Recommendations:\n${content.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : ""}

${content.rhythm ? `Rhythm: ${content.rhythm}` : ""}

Return ONLY a valid JSON object with this exact structure:
{
  "clinicalImpression": "translated clinical impression text",
  "abnormalities": ["translated abnormality 1", "translated abnormality 2", ...],
  "recommendations": ["translated recommendation 1", "translated recommendation 2", ...],
  "rhythm": "translated rhythm name or null"
}`;

  const prompt = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  };

  try {
    console.log("Calling Gemini API for translation...");
    console.log("Endpoint:", endpoint);
    console.log("API Key present:", !!apiKey);
    console.log("Model:", model);
    
    const res = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt)
    });

    console.log("Translation API response status:", res.status);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Translation failed (${res.status}): ${body}`);
      // Return original content if translation fails
      return content;
    }

    const data = (await res.json()) as any;
    console.log("Translation API response structure:", JSON.stringify(data).substring(0, 500));
    
    // When responseMimeType is "application/json", the response might be structured differently
    let translated: {
      clinicalImpression: string;
      abnormalities: string[];
      recommendations?: string[];
      rhythm?: string | null;
    } | null = null;

    // Try to get JSON directly from candidates (if responseMimeType worked)
    if (data?.candidates?.[0]?.content?.parts) {
      const parts = data.candidates[0].content.parts;
      for (const part of parts) {
        // If responseMimeType is "application/json", the text might already be JSON
        if (part.text) {
          try {
            const parsed = JSON.parse(part.text);
            if (parsed.clinicalImpression || parsed.abnormalities) {
              translated = parsed;
              break;
            }
          } catch {
            // Not JSON, continue
          }
        }
      }
    }

    // If not found, try extracting from text
    if (!translated) {
      const rawText: string =
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ?? "";

      console.log("Translation response received, length:", rawText.length);

      // Try to extract JSON
      const first = rawText.indexOf("{");
      const last = rawText.lastIndexOf("}");
      if (first === -1 || last === -1) {
        console.error("Failed to extract JSON from translation response. Raw text:", rawText.substring(0, 200));
        return content;
      }

      const candidate = rawText.slice(first, last + 1);
      try {
        translated = JSON.parse(candidate);
      } catch (parseError) {
        console.error("Failed to parse translation JSON:", parseError);
        console.error("JSON candidate:", candidate.substring(0, 500));
        return content;
      }
    }

    if (translated) {
      console.log("Translation successful!");
      return {
        clinicalImpression: translated.clinicalImpression || content.clinicalImpression,
        abnormalities: translated.abnormalities || content.abnormalities,
        recommendations: translated.recommendations || content.recommendations,
        rhythm: translated.rhythm !== undefined ? translated.rhythm : content.rhythm,
      };
    }

    console.error("Failed to extract translation from response");
    return content;
  } catch (error: any) {
    console.error("Translation error:", error);
    console.error("Error stack:", error?.stack);
    // Return original content if translation fails
    return content;
  }
}

