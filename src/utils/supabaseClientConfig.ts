import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://sumeemoqtnveiftzjhsl.supabase.co'
).trim();
export const DEFAULT_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_rEQFsCRG9_kjgPvauNvocg_hhxDPjOd'
).trim();

const resolvedSupabaseUrl = (
  (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_url') : null) ||
  DEFAULT_SUPABASE_URL
)
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/$/, '');

const resolvedSupabaseKey =
  (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_key') : null) ||
  DEFAULT_PUBLISHABLE_KEY;

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});


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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? 10000);

  try {
    let activePayload = params.payload ? { ...params.payload } : undefined;
    let resp = await fetch(targetUrl, {
      method,
      headers,
      signal: controller.signal,
      ...(activePayload && method !== 'GET' ? { body: JSON.stringify(activePayload) } : {}),
    });

    // If PostgREST reports PGRST204 ("Could not find the '<col>' column"), strip that column and retry cleanly
    let stripRetries = 0;
    while (!resp.ok && resp.status === 400 && activePayload && method !== 'GET' && stripRetries < 25) {
      const clonedText = await resp.clone().text().catch(() => '');
      const colMatch = clonedText.match(/Could not find the '([^']+)' column/i);
      if (!colMatch || !(colMatch[1] in activePayload)) {
        break;
      }
      delete activePayload[colMatch[1]];
      stripRetries++;
      resp = await fetch(targetUrl, {
        method,
        headers,
        signal: controller.signal,
        body: JSON.stringify(activePayload),
      });
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
          const patchResp = await fetch(patchUrl, {
            method: 'PATCH',
            headers: patchHeaders,
            body: JSON.stringify(activePayload),
            signal: controller.signal,
          });
          if (patchResp.ok) {
            resp = patchResp;
          }
        } catch {
          // ignore fallback error
        }
      }
    }

    clearTimeout(timeoutId);
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
    clearTimeout(timeoutId);
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
