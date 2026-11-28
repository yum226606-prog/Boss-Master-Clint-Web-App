import { GoogleGenAI } from '@google/genai';
import {
  normalizeGauge,
  normalizeOfficialColor,
  normalizeSectionCode,
  stripTrailingGaugeFromSectionCode,
} from './bossDefaultRates';
import { compressFileToJpegDataUrl } from './supabaseClientConfig';

export interface ScannedRateRow {
  sectionTitle: string;
  sectionCode: string;
  gauge: string;
  color: string;
  rate: number;
}

export interface RateScanResult {
  ok: boolean;
  effectiveDate?: string;
  rows: ScannedRateRow[];
  error?: string;
}

export const ITTEHAD_SCANNER_NOTICE =
  'Note: Sirf ITTEHAD ALUMINIUM ki Rate List (Mobile Photo / Screenshot / JPG / PDF) hi update aur scan ki ja sakti hai.';

export const ITTEHAD_VISION_PROMPT = `
You are an expert Pakistani Aluminium extrusion rate list parser specialized in ITTEHAD ALUMINIUM official rate sheets.
Analyze the provided Mobile Photo, Screenshot, Image, or PDF of an ITTEHAD ALUMINIUM rate sheet (or pasted table text).

CRITICAL RULES:
1. EFFECTIVE DATE:
   - Look at the top header / title area for the Effective Date (e.g. "03-APRIL-2026", "Effected from 03-April", "W.E.F 03-04-2026").
   - Return it cleanly in "effectiveDate" (for example "03-APRIL-2026"). If not visible, return "".

2. 2-COLUMN SPLIT TABLE READING (LEFT + RIGHT):
   - Ittehad Aluminium sheets often have a 2-column split layout: a complete Left Table side and a complete Right Table side on the same page.
   - Read BOTH the Left side and Right side row-by-row like a human. Never skip or mix columns between Left and Right halves.

3. SECTION CODE & GAUGE EXTRACTION:
   - In the first column of each row, the Section Code is at the start (e.g., "M-23", "DC-26B", "D.10", "DG.26F 1.6M", "CW-01 2MM").
   - If thickness/gauge with "mm" or "m" appears anywhere in that section cell (usually at the end, like "1.6M", "1.6MM", "2MM", "1.2MM", "3MM", "6MM"), extract that thickness as the row's gauge and remove the thickness suffix from "sectionCode".
   - If the row's own section cell does NOT specify "mm", use the current section block header's default gauge:
     * "NORMAL" or "EC.NORMAL" block -> "1.2mm"
     * "1.6MM" block -> "1.6mm"
     * "2MM" block -> "2mm" (unless the individual section itself writes another mm like 1.6mm, in which case use the section's own mm)
     * "3MM" block -> "3mm"
     * "6MM" block -> "6mm"
     * Any other block where "mm" is not mentioned -> default "1.2mm"
   - Standardize "gauge" strictly to one of: "1.2mm", "1.6mm", "2mm", "3mm", "6mm".
   - Normalize "sectionCode" cleanly uppercase without dots, hyphens, or spaces (e.g. "M-23" -> "M23", "DC-26B" -> "DC26B", "D.10" -> "D10").

4. OFFICIAL 5 COLORS MAPPING:
   Map every price column header strictly to ONLY these 5 official color names:
   - "DULL" (from DULL, NATURAL, ANODIZED, MILL)
   - "H-23 / RAL/PC" (from H.23, H23, H-23, PC-RAL, RAL P.C, H23/PC-RAL, CHAMPAGNE)
   - "SAHARA / BROWN" (from SAHARA, SHARA, BROWN, BRO, BRN, SAHARA/BROWN)
   - "BLACK" (from BLACK, BLK, BLAK, MULTI)
   - "ALU WOOD" (from ALU WOOD, WOOD COAT, WOOD, WOODEN)
   Do NOT invent any other color names. Only output positive numeric rates (> 0).

Return strictly valid JSON matching this schema:
{
  "effectiveDate": "03-APRIL-2026",
  "rows": [
    {
      "sectionTitle": "DC30C",
      "sectionCode": "DC30C",
      "gauge": "1.6mm",
      "color": "DULL",
      "rate": 815
    }
  ]
}
`.trim();

export function safeParseJsonText<T = any>(rawText: string): T | null {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const tryParse = (candidate: string): T | null => {
    const clean = candidate.trim();
    if (!clean.startsWith('{') && !clean.startsWith('[')) return null;
    try {
      return JSON.parse(clean) as T;
    } catch {
      return null;
    }
  };

  const direct = tryParse(withoutFence);
  if (direct !== null) return direct;

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const extracted = tryParse(withoutFence.slice(firstBrace, lastBrace + 1));
    if (extracted !== null) return extracted;
  }

  const firstBracket = withoutFence.indexOf('[');
  const lastBracket = withoutFence.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const extractedArr = tryParse(withoutFence.slice(firstBracket, lastBracket + 1));
    if (extractedArr !== null) return extractedArr;
  }

  return null;
}

export function normalizeScannedRows(rawRows: any[]): ScannedRateRow[] {
  const dedup = new Map<string, ScannedRateRow>();
  for (const r of rawRows || []) {
    if (!r || typeof r !== 'object') continue;
    const rawRate =
      typeof r.rate === 'string'
        ? parseFloat(r.rate.replace(/,/g, '').replace(/[^0-9.]/g, ''))
        : Number(r.rate);
    if (!Number.isFinite(rawRate) || rawRate <= 0) continue;

    const rawCode = String(r.sectionCode || r.section || r.code || '').trim();
    const cleanTitle = stripTrailingGaugeFromSectionCode(
      String(r.sectionTitle || rawCode).trim()
    ).toUpperCase();
    const normCode = normalizeSectionCode(rawCode || cleanTitle);
    if (!normCode) continue;

    // Detect gauge embedded inside rawCode/title if Gemini returned e.g. "1.6M" in title and defaulted gauge
    const embeddedGaugeMatch = `${rawCode} ${r.sectionTitle || ''}`.match(
      /\b(1\.2|1\.6|2\.0|2|3\.0|3|6\.0|6)\s*(?:MM|M)\b/i
    );
    const chosenGauge = normalizeGauge(r.gauge || embeddedGaugeMatch?.[1] || '1.2mm');
    const chosenColor = normalizeOfficialColor(r.color || 'DULL');

    const row: ScannedRateRow = {
      sectionTitle: cleanTitle || normCode,
      sectionCode: normCode,
      gauge: chosenGauge,
      color: chosenColor,
      rate: Math.round(rawRate),
    };
    dedup.set(`${normCode}|${chosenGauge}|${chosenColor}`, row);
  }
  return Array.from(dedup.values());
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = dataUrl.indexOf(',');
      const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      if (!base64) {
        reject(new Error(`Empty file content for ${file.name}`));
        return;
      }
      resolve({
        base64,
        mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function prepareScanFilePayloads(
  fileList: File[]
): Promise<{ imageBase64: string; mimeType: string }[]> {
  const payloads: { imageBase64: string; mimeType: string }[] = [];
  for (const file of fileList) {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const { base64 } = await readFileAsBase64(file);
      payloads.push({ imageBase64: base64, mimeType: 'application/pdf' });
    } else {
      // High-resolution crisp JPEG so dense 2-column split tables remain readable
      const compressedDataUrl = await compressFileToJpegDataUrl(
        file,
        2000,
        0.85,
        950 * 1024
      );
      const commaIdx = compressedDataUrl.indexOf(',');
      const base64 =
        commaIdx >= 0 ? compressedDataUrl.slice(commaIdx + 1) : compressedDataUrl;
      payloads.push({ imageBase64: base64, mimeType: 'image/jpeg' });
    }
  }
  return payloads;
}

export function extractEffectiveDateFromText(rawText: string): string {
  const m = rawText.match(
    /(?:EFFECTIVE\s*(?:DATE|FROM)?|EFFECTED\s*FROM|W\.?E\.?F\.?|DATE)\s*[:\-]?\s*([0-9]{1,2}[\s\-/][A-Za-z0-9]{2,12}[\s\-/][0-9]{2,4})/i
  );
  if (m?.[1]) return m[1].trim().toUpperCase().replace(/\s+/g, '-');
  const m2 = rawText.match(/\b([0-9]{1,2}[\-/](?:JAN|FEB|MAR|APR|APRIL|MAY|JUN|JUNE|JUL|JULY|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*[\-/][0-9]{2,4})\b/i);
  return m2?.[1] ? m2[1].trim().toUpperCase() : '';
}

export function parseClientRateListTextSmart(
  raw: string,
  defaultGauge = '1.6mm',
  defaultColor = 'DULL'
): { effectiveDate: string; rows: ScannedRateRow[] } {
  const effectiveDate = extractEffectiveDateFromText(raw);
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: ScannedRateRow[] = [];
  const normDefGauge = normalizeGauge(defaultGauge || '1.6mm');
  const normDefColor = normalizeOfficialColor(defaultColor || 'DULL');
  let blockDefaultGauge = normDefGauge;
  let detectedHeaderCols: string[] = [];

  lines.forEach((line) => {
    const upper = line.toUpperCase();

    // Detect block gauge headers (NORMAL / EC.NORMAL -> 1.2mm, 1.6MM -> 1.6mm, 2MM -> 2mm)
    if (/^(?:NORMAL|EC\.?\s*NORMAL)\b/i.test(upper) && !/\d{3,}/.test(upper)) {
      blockDefaultGauge = '1.2mm';
      return;
    }
    if (/^(?:DELUX.*\b1\.6\s*MM|\b1\.6\s*MM\b)\s*$/i.test(upper)) {
      blockDefaultGauge = '1.6mm';
      return;
    }
    if (/^(?:DELUX.*\b2\s*MM|\b2(?:\.0)?\s*MM\b)\s*$/i.test(upper)) {
      blockDefaultGauge = '2mm';
      return;
    }

    // Detect color column header row
    if (
      upper.includes('DULL') &&
      (upper.includes('BROWN') ||
        upper.includes('SAHARA') ||
        upper.includes('BLACK') ||
        upper.includes('H23') ||
        upper.includes('H.23') ||
        upper.includes('H-23') ||
        upper.includes('WOOD'))
    ) {
      const cols = upper
        .split(/\t|\||,| {2,}/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 2) {
        detectedHeaderCols = cols;
        return;
      }
    }

    const parts = line
      .split(/\t|\||,|=/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (
      parts.length >= 4 &&
      !Number.isNaN(Number(parts[parts.length - 1].replace(/[^0-9.]/g, '')))
    ) {
      if (detectedHeaderCols.length >= 3 && parts.length >= detectedHeaderCols.length) {
        const secRaw = parts[0].toUpperCase();
        const gMatch = secRaw.match(/\b(1\.2|1\.6|2\.0|2|3\.0|3|6\.0|6)\s*(?:MM|M)\b/i);
        const gauge = gMatch ? normalizeGauge(gMatch[1]) : blockDefaultGauge;
        const cleanCode = normalizeSectionCode(secRaw);
        for (let i = 1; i < Math.min(parts.length, detectedHeaderCols.length); i++) {
          const num = parseFloat(parts[i].replace(/[^0-9.]/g, ''));
          const colHeader = detectedHeaderCols[i];
          const mappedCol = normalizeOfficialColor(colHeader);
          if (cleanCode && num > 0) {
            parsed.push({
              sectionTitle: stripTrailingGaugeFromSectionCode(secRaw) || cleanCode,
              sectionCode: cleanCode,
              gauge,
              color: mappedCol,
              rate: Math.round(num),
            });
          }
        }
        return;
      }

      const secRaw = parts.length >= 5 ? parts[1] : parts[0];
      const gaugeRaw = parts.length >= 5 ? parts[2] : parts[1];
      const colorRaw = parts.length >= 5 ? parts[3] : parts[2];
      const rateNum = parseFloat(parts[parts.length - 1].replace(/[^0-9.]/g, ''));
      const cleanCode = normalizeSectionCode(secRaw);
      if (cleanCode && rateNum > 0) {
        parsed.push({
          sectionTitle: stripTrailingGaugeFromSectionCode(secRaw).toUpperCase() || cleanCode,
          sectionCode: cleanCode,
          gauge: normalizeGauge(gaugeRaw || blockDefaultGauge),
          color: normalizeOfficialColor(colorRaw || normDefColor),
          rate: Math.round(rateNum),
        });
      }
      return;
    }

    if (parts.length === 2) {
      const num = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
      const cleanCode = normalizeSectionCode(parts[0]);
      if (cleanCode && num > 0) {
        const gMatch = parts[0].match(/\b(1\.2|1\.6|2\.0|2|3\.0|3|6\.0|6)\s*(?:MM|M)\b/i);
        parsed.push({
          sectionTitle: stripTrailingGaugeFromSectionCode(parts[0]).toUpperCase() || cleanCode,
          sectionCode: cleanCode,
          gauge: gMatch ? normalizeGauge(gMatch[1]) : blockDefaultGauge,
          color: normDefColor,
          rate: Math.round(num),
        });
        return;
      }
    }

    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length === 2) {
      const num = parseFloat(tokens[1].replace(/[^0-9.]/g, ''));
      const cleanCode = normalizeSectionCode(tokens[0]);
      if (cleanCode && num > 0) {
        parsed.push({
          sectionTitle: cleanCode,
          sectionCode: cleanCode,
          gauge: blockDefaultGauge,
          color: normDefColor,
          rate: Math.round(num),
        });
      }
    } else if (tokens.length >= 4) {
      const lastNum = parseFloat(tokens[tokens.length - 1].replace(/[^0-9.]/g, ''));
      const cleanCode = normalizeSectionCode(tokens[0]);
      if (cleanCode && lastNum > 0) {
        const maybeGauge = tokens[1].replace(/mm/i, '');
        if (/^(1\.2|1\.4|1\.5|1\.6|2|2\.0|3|6)$/.test(maybeGauge)) {
          parsed.push({
            sectionTitle: cleanCode,
            sectionCode: cleanCode,
            gauge: normalizeGauge(maybeGauge),
            color: normalizeOfficialColor(tokens.slice(2, -1).join(' ') || normDefColor),
            rate: Math.round(lastNum),
          });
        }
      }
    }
  });

  return {
    effectiveDate,
    rows: normalizeScannedRows(parsed),
  };
}

export async function scanIttehadRateList(params: {
  files: File[];
  rawTextInput?: string;
  apiKey?: string;
  fallbackGauge?: string;
  fallbackColor?: string;
}): Promise<RateScanResult> {
  const {
    files,
    rawTextInput = '',
    apiKey,
    fallbackGauge = '1.6mm',
    fallbackColor = 'DULL',
  } = params;

  const resolvedApiKey = String(
    apiKey ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
      ''
  ).trim();

  const filePayloads = files.length > 0 ? await prepareScanFilePayloads(files) : [];

  // 1. Direct Browser Vision via @google/genai (works natively on Vercel static builds & Capacitor APK without /api backend)
  if (
    resolvedApiKey &&
    resolvedApiKey !== 'MY_GEMINI_API_KEY' &&
    (filePayloads.length > 0 || rawTextInput.trim().length > 0)
  ) {
    try {
      const ai = new GoogleGenAI({ apiKey: resolvedApiKey });
      const parts: any[] = [];
      for (const f of filePayloads) {
        parts.push({
          inlineData: {
            data: f.imageBase64,
            mimeType: f.mimeType,
          },
        });
      }
      const promptWithText = rawTextInput.trim()
        ? `${ITTEHAD_VISION_PROMPT}\n\nAdditional Pasted Rate Text:\n${rawTextInput.trim()}`
        : ITTEHAD_VISION_PROMPT;
      parts.push({ text: promptWithText });

      const modelRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = safeParseJsonText<{ effectiveDate?: string; rows?: any[] }>(
        modelRes.text || ''
      );
      if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
        const normalizedRows = normalizeScannedRows(parsed.rows);
        if (normalizedRows.length > 0) {
          return {
            ok: true,
            effectiveDate: String(parsed.effectiveDate || '').trim().toUpperCase(),
            rows: normalizedRows,
          };
        }
      }
    } catch (geminiErr: any) {
      console.warn('Direct browser Gemini scan fallback triggered:', geminiErr?.message);
    }
  }

  // 2. Local / Server API fallback (strictly checks valid JSON before parsing — never throws "Unexpected token 'T'")
  if (filePayloads.length > 0) {
    try {
      const resp = await fetch('/api/scan-rate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filePayloads,
          rawTextInput,
        }),
      });
      const rawBody = await resp.text();
      const parsedBody = safeParseJsonText<{
        ok?: boolean;
        effectiveDate?: string;
        rows?: any[];
        error?: string;
      }>(rawBody);

      if (resp.ok && parsedBody && Array.isArray(parsedBody.rows) && parsedBody.rows.length > 0) {
        const normalizedRows = normalizeScannedRows(parsedBody.rows);
        if (normalizedRows.length > 0) {
          return {
            ok: true,
            effectiveDate: String(parsedBody.effectiveDate || '').trim().toUpperCase(),
            rows: normalizedRows,
          };
        }
      }

      if (!parsedBody) {
        return {
          ok: false,
          rows: [],
          error:
            resolvedApiKey
              ? 'Rate sheet se valid rows read nahi ho sakein. Clear photo, screenshot ya PDF upload karein.'
              : 'Direct AI Vision key configure nahi aur server scanner endpoint available nahi (static host). Rate text paste karein ya VITE_GEMINI_API_KEY set karein.',
        };
      }

      if (parsedBody.error) {
        return { ok: false, rows: [], error: parsedBody.error };
      }
    } catch (fetchErr: any) {
      return {
        ok: false,
        rows: [],
        error: fetchErr?.message || 'Scanner network error — clear photo ya paste text use karein.',
      };
    }
  }

  // 3. Pasted text local parser
  if (rawTextInput.trim()) {
    const localParsed = parseClientRateListTextSmart(
      rawTextInput,
      fallbackGauge,
      fallbackColor
    );
    if (localParsed.rows.length > 0) {
      return {
        ok: true,
        effectiveDate: localParsed.effectiveDate,
        rows: localParsed.rows,
      };
    }
  }

  return {
    ok: false,
    rows: [],
    error: 'ITTEHAD ALUMINIUM rate sheet se valid rates nahi mil sake. Clear photo, screenshot ya PDF try karein.',
  };
}
