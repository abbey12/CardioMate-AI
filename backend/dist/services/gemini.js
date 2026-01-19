function safeJsonExtract(text) {
    // Try to extract a JSON object from free-form text.
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first)
        return undefined;
    const candidate = text.slice(first, last + 1);
    try {
        return JSON.parse(candidate);
    }
    catch {
        return undefined;
    }
}
export async function interpretWithGemini(opts) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-pro";
    // Minimal prototype: if key missing, return deterministic mock.
    if (!apiKey) {
        const hr = opts.preprocess.estimatedHeartRateBpm;
        return {
            model: "mock",
            rawText: "MOCK_INTERPRETATION: Normal sinus rhythm. No acute ischemic changes.",
            structured: {
                measurements: {
                    heartRateBpm: hr,
                    rhythm: "Normal sinus rhythm",
                    prMs: 160,
                    qrsMs: 90,
                    qtMs: 380,
                    qtcMs: 410
                },
                abnormalities: [],
                clinicalImpression: "Normal ECG (mock). Correlate clinically and compare with prior tracings."
            }
        };
    }
    // Real call using Google Generative Language REST API (kept lightweight; no SDK).
    // NOTE: Exact endpoint may vary by Google API version; adjust if needed.
    const endpoint = process.env.GEMINI_ENDPOINT ??
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: "You are a cardiology assistant. Interpret this ECG signal summary and return ONLY valid JSON.\n" +
                            "JSON schema:\n" +
                            "{\n" +
                            '  "measurements": {"heartRateBpm": number|null, "rhythm": string|null, "prMs": number|null, "qrsMs": number|null, "qtMs": number|null, "qtcMs": number|null},\n' +
                            '  "abnormalities": string[],\n' +
                            '  "clinicalImpression": string,\n' +
                            '  "recommendations": string[],\n' +
                            '  "decisionExplanations": [{"finding": string, "evidence": string, "confidence": string, "normalRange": string, "deviation": string}]\n' +
                            "}\n\n" +
                            "For each abnormality or significant finding, provide a decisionExplanation explaining:\n" +
                            "- What was found (finding)\n" +
                            "- What evidence in the signal supports this (evidence)\n" +
                            "- Confidence level (confidence: High/Medium/Low)\n" +
                            "- Normal range for comparison (normalRange)\n" +
                            "- How much it deviates (deviation)\n\n" +
                            "Context:\n" +
                            (opts.patient ?
                                `- Patient: ${opts.patient.name}, Age: ${opts.patient.age ?? "unknown"} years, Sex: ${opts.patient.sex}\n` +
                                    (opts.patient.clinicalIndication ? `- Clinical Indication: ${opts.patient.clinicalIndication}\n` : "") +
                                    (opts.patient.medications && opts.patient.medications.length > 0 ? `- Medications: ${opts.patient.medications.join(", ")}\n` : "") +
                                    "" : "") +
                            `- SampleRateHz: ${opts.preprocess.sampleRateHz}\n` +
                            `- SampleCount: ${opts.preprocess.sampleCount}\n` +
                            `- DurationSec: ${opts.preprocess.durationSec}\n` +
                            `- EstimatedHeartRateBpm (heuristic): ${opts.preprocess.estimatedHeartRateBpm ?? "null"}\n` +
                            `- RPeakCount: ${opts.preprocess.rPeakIndices.length}\n\n` +
                            "Signal snippet (first 200 normalized samples):\n" +
                            JSON.stringify(opts.signal.samples.slice(0, 200).map((s) => s.v), null, 0)
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
    };
    const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt)
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Gemini call failed (${res.status}): ${body}`);
    }
    const data = (await res.json());
    const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).join("") ??
        JSON.stringify(data);
    const extracted = safeJsonExtract(rawText);
    const structured = (extracted ?? {});
    return {
        model,
        rawText,
        structured: {
            measurements: structured.measurements ?? {},
            abnormalities: structured.abnormalities ?? [],
            clinicalImpression: structured.clinicalImpression ??
                "No clinical impression returned (unparsed model output).",
            recommendations: structured.recommendations ?? [],
            decisionExplanations: structured.decisionExplanations ?? []
        }
    };
}
export async function interpretEcgImageWithGemini(opts) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-pro";
    if (!apiKey) {
        return {
            model: "mock",
            rawText: "MOCK_INTERPRETATION: Image-based ECG interpretation (mock).",
            structured: {
                measurements: {
                    rhythm: "Normal sinus rhythm"
                },
                abnormalities: [],
                clinicalImpression: "Normal ECG (mock, image). Correlate clinically and compare with prior tracings."
            }
        };
    }
    const endpoint = process.env.GEMINI_ENDPOINT ??
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: "You are a cardiology assistant. Interpret the attached ECG image.\n" +
                            (opts.patient ?
                                `Patient Context: ${opts.patient.name}, Age: ${opts.patient.age ?? "unknown"} years, Sex: ${opts.patient.sex}\n` +
                                    (opts.patient.clinicalIndication ? `Clinical Indication: ${opts.patient.clinicalIndication}\n` : "") +
                                    (opts.patient.medications && opts.patient.medications.length > 0 ? `Medications: ${opts.patient.medications.join(", ")}\n` : "") +
                                    "\n" : "") +
                            "Return ONLY valid JSON with schema:\n" +
                            "{\n" +
                            '  "measurements": {"heartRateBpm": number|null, "rhythm": string|null, "prMs": number|null, "qrsMs": number|null, "qtMs": number|null, "qtcMs": number|null},\n' +
                            '  "abnormalities": string[],\n' +
                            '  "clinicalImpression": string,\n' +
                            '  "recommendations": string[],\n' +
                            '  "decisionExplanations": [{"finding": string, "evidence": string, "confidence": string, "normalRange": string, "deviation": string}]\n' +
                            "}\n" +
                            "For each abnormality, provide decisionExplanation with evidence, confidence, normal range, and deviation.\n"
                    },
                    {
                        inlineData: {
                            mimeType: opts.mimeType,
                            data: opts.imageBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
    };
    const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt)
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Gemini call failed (${res.status}): ${body}`);
    }
    const data = (await res.json());
    const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).join("") ??
        JSON.stringify(data);
    const extracted = safeJsonExtract(rawText);
    const structured = (extracted ?? {});
    return {
        model,
        rawText,
        structured: {
            measurements: structured.measurements ?? {},
            abnormalities: structured.abnormalities ?? [],
            clinicalImpression: structured.clinicalImpression ??
                "No clinical impression returned (unparsed model output).",
            recommendations: structured.recommendations ?? [],
            decisionExplanations: structured.decisionExplanations ?? []
        }
    };
}
