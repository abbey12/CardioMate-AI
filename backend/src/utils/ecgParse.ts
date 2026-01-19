import { z } from "zod";
import type { EcgSignal } from "../types/ecg.js";

const JsonEcgSchema = z.object({
  sampleRateHz: z.number().positive(),
  samples: z.array(
    z.union([
      z.number(),
      z.object({
        t: z.number().optional(),
        v: z.number()
      })
    ])
  ),
  lead: z.string().optional()
});

function parseCsvNumbers(csvText: string): number[] {
  // Accept formats like:
  // - one value per line: "0.12\n0.13\n..."
  // - two columns time,value: "0.000,0.12\n0.004,0.13\n..."
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const values: number[] = [];
  for (const line of lines) {
    const parts = line.split(/[,\t;]/).map((p) => p.trim());
    const last = parts[parts.length - 1];
    const v = Number(last);
    if (Number.isFinite(v)) values.push(v);
  }
  return values;
}

export function detectFormat(
  filename?: string,
  contentType?: string
): "csv" | "json" | "image" | undefined {
  const name = filename?.toLowerCase() ?? "";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg"))
    return "image";
  if (contentType?.includes("application/json")) return "json";
  if (contentType?.includes("text/csv")) return "csv";
  if (
    contentType?.includes("image/png") ||
    contentType?.includes("image/jpeg") ||
    contentType?.includes("image/jpg")
  )
    return "image";
  return undefined;
}

export function parseEcgFromCsv(
  csvText: string,
  sampleRateHz: number
): EcgSignal {
  const vals = parseCsvNumbers(csvText);
  if (vals.length < 10) {
    throw new Error("CSV does not contain enough numeric samples.");
  }
  return {
    sampleRateHz,
    samples: vals.map((v) => ({ v }))
  };
}

export function parseEcgFromJson(jsonText: string): EcgSignal {
  const parsed = JSON.parse(jsonText) as unknown;
  const data = JsonEcgSchema.parse(parsed);
  return {
    lead: data.lead,
    sampleRateHz: data.sampleRateHz,
    samples: data.samples.map((s) =>
      typeof s === "number" ? { v: s } : { t: s.t, v: s.v }
    )
  };
}


