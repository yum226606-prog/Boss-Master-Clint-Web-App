import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://sumeemoqtnveiftzjhsl.supabase.co'
).trim();
export const DEFAULT_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_rEQFsCRG9_kjgPvauNvocg_hhxDPjOd'
).trim();

export function normalizeSupabaseUrl(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
}

export function getActiveSupabaseCredentials(): { url: string; key: string } {
  const customUrl =
    typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_url') : null;
  const customKey =
    typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_key') : null;
  return {
    url: normalizeSupabaseUrl(customUrl || DEFAULT_SUPABASE_URL),
    key: (customKey || DEFAULT_PUBLISHABLE_KEY).trim(),
  };
}

function buildSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

const initialCreds = getActiveSupabaseCredentials();
export let supabase: SupabaseClient = buildSupabaseClient(initialCreds.url, initialCreds.key);

export function reinitializeSupabaseClient(newUrl: string, newKey: string): boolean {
  const cleanUrl = normalizeSupabaseUrl(newUrl);
  const cleanKey = String(newKey || '').trim();
  if (!cleanUrl.startsWith('http') || !cleanKey) return false;
  const current = getActiveSupabaseCredentials();
  if (current.url === cleanUrl && current.key === cleanKey) return false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('boss_custom_supabase_url', cleanUrl);
      localStorage.setItem('boss_custom_supabase_key', cleanKey);
    } catch {
      // ignore storage errors
    }
  }
  supabase = buildSupabaseClient(cleanUrl, cleanKey);
  return true;
}


export interface SmsOtpGatewayConfig {
  sendpkEnabled: boolean;
  requireSmsOtp: boolean;
  sendpkApiKey: string;
  sendpkUsername: string;
  sendpkPassword: string;
  sendpkSenderMask: string;
  smsComPkApiKey: string;
  smsComPkSenderMask: string;
  resendApiKey: string;
  otpFromEmail: string;
  otpMessageTemplate: string;
  allowFallbackOtpWhenUnconfigured: boolean;
}

export const DEFAULT_SMS_GATEWAY_CONFIG: SmsOtpGatewayConfig = {
  sendpkEnabled: false,
  requireSmsOtp: false,
  sendpkApiKey: '',
  sendpkUsername: '',
  sendpkPassword: '',
  sendpkSenderMask: 'BOSS ALUM',
  smsComPkApiKey: '',
  smsComPkSenderMask: 'BOSS ALUM',
  resendApiKey: '',
  otpFromEmail: 'onboarding@resend.dev',
  otpMessageTemplate:
    'BOSS Aluminium & Glass Verification Code: {OTP}. Valid for 10 minutes. Do not share this code.',
  allowFallbackOtpWhenUnconfigured: true,
};

export const SERVER_TIME_CACHE_KEY = 'boss_server_clock_hwm_v1';

let lastObservedServerMs = 0;
let lastObservedPerfMs = 0;

export function parseServerEpochMs(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val <= 0) return 0;
    return val < 1e12 ? Math.round(val * 1000) : Math.round(val);
  }
  if (typeof val === 'object') {
    const candidate =
      val.server_time_ms ??
      val.get_server_time_ms ??
      val.time_ms ??
      val.serverTimeMs ??
      val.now ??
      val.timestamp;
    if (candidate !== undefined) return parseServerEpochMs(candidate);
  }
  const str = String(val).trim();
  if (!str) return 0;
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return num < 1e12 ? Math.round(num * 1000) : Math.round(num);
  }
  const parsed = Date.parse(str);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getStoredServerTimeHwmMs(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(SERVER_TIME_CACHE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const val = Number(parsed?.serverMs || 0);
    return Number.isFinite(val) && val > 1_600_000_000_000 ? val : 0;
  } catch {
    return 0;
  }
}

export function recordObservedServerTimeMs(serverMs: number): number {
  if (!Number.isFinite(serverMs) || serverMs < 1_600_000_000_000) return 0;
  const rounded = Math.round(serverMs);
  const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
  if (rounded >= lastObservedServerMs) {
    lastObservedServerMs = rounded;
    lastObservedPerfMs = perfNow;
  }
  if (typeof window !== 'undefined') {
    try {
      const prev = getStoredServerTimeHwmMs();
      const next = Math.max(prev, rounded);
      localStorage.setItem(SERVER_TIME_CACHE_KEY, JSON.stringify({ serverMs: next }));
    } catch {
      // ignore storage errors
    }
  }
  return rounded;
}

export function getEffectiveServerNowMs(): number {
  if (lastObservedServerMs > 0) {
    const perfElapsed =
      typeof performance !== 'undefined' ? Math.max(0, performance.now() - lastObservedPerfMs) : 0;
    return Math.round(lastObservedServerMs + perfElapsed);
  }
  return getStoredServerTimeHwmMs();
}

export function isLocalClockRolledBack(): boolean {
  const hwm = Math.max(lastObservedServerMs, getStoredServerTimeHwmMs());
  if (hwm <= 0) return false;
  return Date.now() + 60_000 < hwm;
}

function captureDateHeaderFromResponse(resp: Response): number {
  try {
    const dateHdr = resp.headers?.get('date');
    if (dateHdr) {
      const parsed = Date.parse(dateHdr);
      if (Number.isFinite(parsed) && parsed > 1_600_000_000_000) {
        return recordObservedServerTimeMs(parsed);
      }
    }
  } catch {
    // ignore header access issues
  }
  return 0;
}

/**
 * Fetch authentic server timestamp (epoch ms) from Supabase RPC 'get_server_time_ms'
 * with automatic fallback to Supabase HTTP response 'Date' header.
 * Never trusts mobile/desktop local clock for Trial or Subscription verification.
 */
export async function fetchSupabaseServerTimeMs(): Promise<number> {
  const { url: urlBase, key: apiKey } = getActiveSupabaseCredentials();
  let headerServerMs = 0;

  // 1. Primary: Supabase RPC get_server_time_ms
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const rpcResp = await fetch(`${urlBase}/rest/v1/rpc/get_server_time_ms`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: '{}',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    headerServerMs = captureDateHeaderFromResponse(rpcResp);
    if (rpcResp.ok) {
      const txt = await rpcResp.text().catch(() => '');
      let parsedBody: any = txt;
      try {
        parsedBody = txt ? JSON.parse(txt) : null;
      } catch {
        // raw string/number
      }
      const rpcMs = parseServerEpochMs(parsedBody);
      if (rpcMs > 1_600_000_000_000) {
        return recordObservedServerTimeMs(rpcMs);
      }
    }
  } catch {
    // fallback below
  }

  if (headerServerMs > 1_600_000_000_000) {
    return headerServerMs;
  }

  // 2. Fallback: Lightweight Supabase REST GET HTTP 'Date' header
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const restResp = await fetch(`${urlBase}/rest/v1/app_configs?select=id&limit=1`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const restDateMs = captureDateHeaderFromResponse(restResp);
    if (restDateMs > 1_600_000_000_000) {
      return restDateMs;
    }
  } catch {
    // fallback below
  }

  return getEffectiveServerNowMs();
}

const TRANSIENT_SUPABASE_STATUSES = new Set([521, 522, 525, 502, 503, 504]);
const KNOWN_MISSING_COLUMNS: Record<string, Set<string>> = {};

function stripKnownMissingColumns(table: string, payload: Record<string, any> | undefined) {
  if (!payload || typeof payload !== 'object') return payload;
  const known = KNOWN_MISSING_COLUMNS[table];
  if (!known || known.size === 0) return payload;
  for (const col of known) {
    if (col in payload) {
      delete payload[col];
    }
  }
  return payload;
}

function recordKnownMissingColumn(table: string, col: string) {
  if (!table || !col) return;
  if (!KNOWN_MISSING_COLUMNS[table]) {
    KNOWN_MISSING_COLUMNS[table] = new Set<string>();
  }
  KNOWN_MISSING_COLUMNS[table].add(col);
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callSupabaseProxy(params: {
  table: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: string;
  payload?: any;
  upsert?: boolean;
  timeoutMs?: number;
}) {
  const urlBase = (
    (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_url') : null) ||
    DEFAULT_SUPABASE_URL
  )
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');

  const apiKey =
    (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_key') : null) ||
    DEFAULT_PUBLISHABLE_KEY;

  const method = params.method || 'GET';
  const queryStr = params.query ? `?${params.query}` : '';
  const targetUrl = `${urlBase}/rest/v1/${params.table}${queryStr}`;

  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (params.upsert && (method === 'POST' || method === 'PATCH')) {
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  }

  const startTime = Date.now();
  const perAttemptTimeoutMs = params.timeoutMs ?? 10000;
  const maxRetries = 2; // 1 initial try + 2 retries (1s gap) on 521/522/525/502/503/504

  const fetchWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      const r = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return r;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    let activePayload = params.payload
      ? stripKnownMissingColumns(params.table, { ...params.payload })
      : undefined;
    let resp: Response | null = null;
    let lastNetworkErr: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        resp = await fetchWithTimeout(targetUrl, {
          method,
          headers,
          ...(activePayload && method !== 'GET' ? { body: JSON.stringify(activePayload) } : {}),
        });
        captureDateHeaderFromResponse(resp);

        if (TRANSIENT_SUPABASE_STATUSES.has(resp.status) && attempt < maxRetries) {
          await sleepMs(1000);
          continue;
        }
        break;
      } catch (err: any) {
        lastNetworkErr = err;
        if (attempt < maxRetries) {
          await sleepMs(1000);
          continue;
        }
        throw err;
      }
    }

    if (!resp) {
      throw lastNetworkErr || new Error('Network error');
    }

    // If PostgREST reports PGRST204 ("Could not find the '<col>' column"), cache & strip that column and retry cleanly
    let stripRetries = 0;
    while (!resp.ok && resp.status === 400 && activePayload && method !== 'GET' && stripRetries < 25) {
      const clonedText = await resp.clone().text().catch(() => '');
      const colMatch = clonedText.match(/Could not find the '([^']+)' column/i);
      if (!colMatch || !(colMatch[1] in activePayload)) {
        break;
      }
      recordKnownMissingColumn(params.table, colMatch[1]);
      delete activePayload[colMatch[1]];
      stripRetries++;
      resp = await fetchWithTimeout(targetUrl, {
        method,
        headers,
        body: JSON.stringify(activePayload),
      });
      captureDateHeaderFromResponse(resp);
    }

    // If POST upsert times out (500 statement timeout on huge JSON) or conflicts (409), fallback to direct PATCH by primary key
    if (
      !resp.ok &&
      (resp.status === 500 || resp.status === 409 || resp.status === 400) &&
      activePayload &&
      method === 'POST'
    ) {
      const idVal = activePayload.id || activePayload.device_id || activePayload.key;
      const idKey = activePayload.device_id ? 'device_id' : activePayload.id ? 'id' : 'key';
      if (idVal) {
        try {
          const patchUrl = `${urlBase}/rest/v1/${params.table}?${idKey}=eq.${encodeURIComponent(idVal)}`;
          const patchHeaders = { ...headers };
          delete patchHeaders['Prefer'];
          const patchResp = await fetchWithTimeout(patchUrl, {
            method: 'PATCH',
            headers: patchHeaders,
            body: JSON.stringify(activePayload),
          });
          captureDateHeaderFromResponse(patchResp);
          if (patchResp.ok) {
            resp = patchResp;
          }
        } catch {
          // ignore fallback error
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    if (resp.status === 204) {
      return { ok: true, status: 204, data: null, mirrorData: null, source: 'supabase_cloud', latencyMs };
    }

    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: resp.ok,
      status: resp.status,
      data: data,
      mirrorData: data,
      latencyMs,
      source: 'supabase_cloud',
      error: !resp.ok ? data?.message || `Supabase Error (${resp.status})` : undefined,
    };
  } catch (e: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      status: 0,
      data: null,
      mirrorData: null,
      latencyMs,
      source: 'client_network_error',
      error: e?.name === 'AbortError' ? 'Supabase cloud timeout (10s)' : e?.message || 'Network error',
    };
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function compressFileToJpegDataUrl(
  file: File,
  maxWidth = 800,
  quality = 0.65,
  maxBytes = 120 * 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Empty image'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        try {
          let currentMaxW = maxWidth;
          let currentQuality = quality;
          let bestJpeg = '';

          for (let attempt = 0; attempt < 5; attempt++) {
            const scale = img.width > currentMaxW ? currentMaxW / img.width : 1;
            const targetW = Math.max(1, Math.round(img.width * scale));
            const targetH = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(src);
              return;
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const jpeg = canvas.toDataURL('image/jpeg', currentQuality);
            bestJpeg = !bestJpeg || jpeg.length < bestJpeg.length ? jpeg : bestJpeg;
            if (jpeg.length <= maxBytes) {
              resolve(jpeg);
              return;
            }
            const minQ = maxWidth >= 900 ? 0.45 : 0.28;
            const minW = maxWidth >= 900 ? 720 : 420;
            if (currentQuality > minQ + 0.06) {
              currentQuality = Math.max(minQ, Number((currentQuality - 0.08).toFixed(2)));
            } else {
              currentMaxW = Math.max(minW, Math.round(currentMaxW * 0.85));
            }
          }

          resolve(bestJpeg || src);
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image (File or compressed Data URL) to Supabase Storage.
 * - Payment receipts ('receipts') upload strictly to the existing 'receipts' bucket after 800px / 0.65 JPEG compression.
 * - Falls back cleanly to compact compressed JPEG Data URL if storage upload is unavailable.
 */
export async function uploadImageToUserUploadsBucket(params: {
  fileOrDataUrl: File | string;
  folder: 'cnic' | 'selfies' | 'shops' | 'receipts' | 'logos';
  deviceId: string;
  tag?: string;
}): Promise<{ url: string; base64DataUrl: string; storedInBucket: boolean }> {
  const isReceipt = params.folder === 'receipts';
  const isSelfieOrShop = params.folder === 'selfies' || params.folder === 'shops';
  const dataUrl =
    typeof params.fileOrDataUrl === 'string'
      ? params.fileOrDataUrl
      : isReceipt || isSelfieOrShop
      ? await compressFileToJpegDataUrl(params.fileOrDataUrl, 800, 0.65, 120 * 1024)
      : await compressFileToJpegDataUrl(params.fileOrDataUrl, 800, 0.6, 80 * 1024);

  try {
    const { url: urlBase, key: apiKey } = getActiveSupabaseCredentials();
    const safeDev = (params.deviceId || 'DEV-UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '_');
    const safeTag = (params.tag || 'img').replace(/[^A-Za-z0-9_-]/g, '_');
    const targetBucket = isReceipt ? 'receipts' : 'user_uploads';
    const filePath = isReceipt
      ? `${safeDev}/${safeTag}_${Date.now()}.jpg`
      : `${params.folder}/${safeDev}/${safeTag}_${Date.now()}.jpg`;
    const blob = await dataUrlToBlob(dataUrl);

    const uploadResp = await fetch(`${urlBase}/storage/v1/object/${targetBucket}/${filePath}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: blob,
    });

    if (uploadResp.ok) {
      const publicUrl = `${urlBase}/storage/v1/object/public/${targetBucket}/${filePath}`;
      return { url: publicUrl, base64DataUrl: dataUrl, storedInBucket: true };
    }
  } catch {
    // Non-fatal fallback to compact JPEG Data URL
  }

  return { url: dataUrl, base64DataUrl: dataUrl, storedInBucket: false };
}
