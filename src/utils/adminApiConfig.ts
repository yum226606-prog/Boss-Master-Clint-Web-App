import {
  callSupabaseProxy,
  DEFAULT_PUBLISHABLE_KEY,
  DEFAULT_SMS_GATEWAY_CONFIG,
  DEFAULT_SUPABASE_URL,
  SmsOtpGatewayConfig,
} from './supabaseClientConfig';

export const ADMIN_SERVER_PRIMARY =
  'https://ais-pre-72tiaznwblmandwk4bf3zz-734807725133.asia-southeast1.run.app';
export const ADMIN_SERVER_DEV =
  'https://ais-dev-72tiaznwblmandwk4bf3zz-734807725133.asia-southeast1.run.app';

export const AUTH_SESSION_STORAGE_KEY = 'boss_client_auth_session_v1';
export const DEVICE_ID_STORAGE_KEY = 'boss_client_device_id';
export const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export interface ClientAuthSession {
  verified: boolean;
  deviceId: string;
  userId?: string;
  name: string;
  phone: string;
  email: string;
  cnic: string;
  shopAddress: string;
  loggedInAt: number;
  trialStartTime?: number;
  trialExpiresAt?: number;
}

export function getOrCreateClientDeviceId(): string {
  if (typeof window === 'undefined') return 'DEV-CLIENT-DEFAULT';
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.trim() && !existing.startsWith('RESET_')) {
      return existing.trim();
    }
    const bytes = new Uint8Array(4);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    const gen = `DEV-${hex}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, gen);
    return gen;
  } catch {
    return 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

export function loadAuthSession(): ClientAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.verified !== true || !parsed.deviceId || !parsed.phone) {
      return null;
    }
    const storedDev = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (storedDev && parsed.deviceId !== storedDev) {
      return null;
    }
    if (parsed.deviceId.startsWith('RESET_')) {
      return null;
    }
    return parsed as ClientAuthSession;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: ClientAuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, session.deviceId);
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function normalizePhoneDigits(phone: string = ''): string {
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

export function formatPakPhone(phone: string = ''): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10 && digits.startsWith('3')) {
    return `0${digits}`;
  }
  return phone.trim();
}

export function normalizeCnicDigits(cnic: string = ''): string {
  return cnic.replace(/[^0-9]/g, '');
}

export function formatPakCnic(raw: string = ''): string {
  const d = normalizeCnicDigits(raw).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12, 13)}`;
}

/**
 * Call Admin Panel Server API (Primary -> Dev Backup -> Same-Origin /api fallback).
 */
export async function fetchAdminServer(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const bases = [ADMIN_SERVER_PRIMARY, ADMIN_SERVER_DEV, ''];
  const timeoutMs = options?.timeoutMs ?? 9000;
  let lastError: any = null;

  for (const base of bases) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(`${base}${cleanPath}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      // Treat 404/5xx or SPA HTML pages on remote preview URLs cleanly by trying next backup if this isn't same-origin
      if (
        base !== '' &&
        (resp.status === 404 || resp.status >= 502 || !ct.includes('application/json'))
      ) {
        lastError = new Error(`Remote server ${base} returned ${resp.status} (${ct})`);
        continue;
      }
      return resp;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  throw lastError || new Error('Admin Server unreachable');
}

export async function sendSupabaseEmailOtp(
  email: string,
  meta?: { name?: string; phone?: string; device_id?: string }
): Promise<{ ok: boolean; status: number; error?: string }> {
  const urlBase = (
    (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_url') : null) ||
    DEFAULT_SUPABASE_URL
  )
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
  const apiKey =
    (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_key') : null) ||
    DEFAULT_PUBLISHABLE_KEY;

  const redirectTo =
    typeof window !== 'undefined' && window.location?.origin
      ? `?redirect_to=${encodeURIComponent(window.location.origin)}`
      : '';

  try {
    const resp = await fetch(`${urlBase}/auth/v1/otp${redirectTo}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        create_user: true,
        data: meta || {},
      }),
    });
    if (resp.ok) {
      return { ok: true, status: resp.status };
    }
    const errJson = await resp.json().catch(() => ({}));
    return {
      ok: false,
      status: resp.status,
      error: errJson?.msg || errJson?.error_description || errJson?.message || `Email OTP error (${resp.status})`,
    };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error sending email OTP' };
  }
}

export function extractAuthCallbackFromUrl(): {
  accessToken: string;
  tokenHash: string;
  type: string;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search || '');
    const rawHash = (window.location.hash || '').replace(/^#/, '');
    const hashParams = new URLSearchParams(rawHash);
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || '';
    const tokenHash = hashParams.get('token_hash') || searchParams.get('token_hash') || '';
    const type = hashParams.get('type') || searchParams.get('type') || 'signup';
    if (!accessToken && !tokenHash) return null;
    return { accessToken, tokenHash, type };
  } catch {
    return null;
  }
}

export async function verifySupabaseEmailOtp(
  email: string,
  tokenOrUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const urlBase = (
    (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_url') : null) ||
    DEFAULT_SUPABASE_URL
  )
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
  const apiKey =
    (typeof window !== 'undefined' ? localStorage.getItem('boss_custom_supabase_key') : null) ||
    DEFAULT_PUBLISHABLE_KEY;

  const cleanEmail = email.trim().toLowerCase();
  const rawInput = tokenOrUrl.trim();

  // Support pasted confirmation URL or localhost redirect URL containing access_token / token_hash / token
  let extractedAccessToken = '';
  let extractedTokenHash = '';
  let extractedType = '';
  let cleanToken = rawInput.replace(/\s+/g, '');

  if (rawInput.includes('access_token=') || rawInput.includes('token_hash=') || rawInput.includes('token=')) {
    try {
      const normalized = rawInput.replace('#', '?');
      const queryPart = normalized.includes('?') ? normalized.split('?').slice(1).join('&') : normalized;
      const params = new URLSearchParams(queryPart);
      extractedAccessToken = params.get('access_token') || '';
      extractedTokenHash = params.get('token_hash') || '';
      extractedType = params.get('type') || '';
      const qToken = params.get('token');
      if (qToken) cleanToken = qToken.trim();
    } catch {
      // fall through
    }
  }

  // 1) If an access_token was received via confirmation link redirect, verify via /auth/v1/user
  if (extractedAccessToken) {
    try {
      const uResp = await fetch(`${urlBase}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${extractedAccessToken}`,
        },
      });
      if (uResp.ok) {
        const userData = await uResp.json().catch(() => ({}));
        const verifiedEmail = String(userData?.email || '').trim().toLowerCase();
        if (!verifiedEmail || verifiedEmail === cleanEmail) {
          return { ok: true };
        }
      }
    } catch {
      // fall through
    }
  }

  // 2) If token_hash was present, verify via /auth/v1/verify with token_hash
  const typesToTry = extractedType
    ? ([extractedType, 'email', 'signup', 'magiclink'] as const)
    : (['email', 'signup', 'magiclink'] as const);

  if (extractedTokenHash || cleanToken.startsWith('pkce_') || cleanToken.length > 16) {
    const hashCandidate = extractedTokenHash || cleanToken;
    for (const verifyType of typesToTry) {
      try {
        const resp = await fetch(`${urlBase}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token_hash: hashCandidate,
            type: verifyType,
          }),
        });
        if (resp.ok) {
          return { ok: true };
        }
      } catch {
        // try next type
      }
    }
  }

  // 3) Standard 6/8-digit Email OTP verification
  for (const verifyType of ['email', 'signup', 'magiclink'] as const) {
    try {
      const resp = await fetch(`${urlBase}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          token: cleanToken,
          type: verifyType,
        }),
      });
      if (resp.ok) {
        return { ok: true };
      }
    } catch {
      // try next verification type
    }
  }
  return { ok: false, error: 'Email OTP code ghalat ya expire ho chuka hai.' };
}

/**
 * Sync newly registered or re-bound client user into Admin Panel's master_engine_config.userAccessControl
 * (in addition to Supabase users, client_users & subscriptions tables) so Admin Panel sees every client instantly.
 */
export async function syncRegisteredUserToAdminUac(entry: {
  device_id: string;
  name: string;
  phone: string;
  email: string;
  cnic: string;
  shop_address: string;
  trial_start_time: number;
  subscription_expiry: number;
}): Promise<void> {
  try {
    const res = await callSupabaseProxy({
      table: 'app_configs',
      method: 'GET',
      query: 'id=in.(master_engine_config,global_config)&select=id,value',
      timeoutMs: 8000,
    });
    if (!res.ok || !Array.isArray(res.data)) return;

    const uacItem = {
      device_id: entry.device_id,
      name: entry.name,
      phone: entry.phone,
      email: entry.email,
      cnic: entry.cnic,
      shop_address: entry.shop_address,
      is_blocked: false,
      is_lifetime: false,
      block_reason: '',
      is_activated: false,
      trial_start_time: entry.trial_start_time,
      subscription_tier: 'TRIAL',
      subscription_expiry: entry.subscription_expiry,
    };

    for (const row of res.data) {
      if (!row?.id || !row?.value || typeof row.value !== 'object') continue;
      const curVal = { ...row.value };
      const existingUac: any[] = Array.isArray(curVal.userAccessControl)
        ? [...curVal.userAccessControl]
        : Object.values(curVal.userAccessControl || {});

      const pDigits = normalizePhoneDigits(entry.phone);
      const cDigits = normalizeCnicDigits(entry.cnic);

      const idx = existingUac.findIndex(
        (u: any) =>
          (u?.device_id && u.device_id === entry.device_id) ||
          (pDigits && normalizePhoneDigits(u?.phone || '') === pDigits) ||
          (cDigits && normalizeCnicDigits(u?.cnic || '') === cDigits)
      );

      if (idx >= 0) {
        const prev = existingUac[idx] || {};
        existingUac[idx] = {
          ...uacItem,
          ...prev,
          device_id: entry.device_id,
          name: entry.name || prev.name,
          phone: entry.phone || prev.phone,
          email: entry.email || prev.email,
          cnic: entry.cnic || prev.cnic,
          shop_address: entry.shop_address || prev.shop_address,
        };
      } else {
        existingUac.push(uacItem);
      }

      curVal.userAccessControl = existingUac;
      await callSupabaseProxy({
        table: 'app_configs',
        method: 'PATCH',
        query: `id=eq.${encodeURIComponent(row.id)}`,
        payload: { value: curVal },
        timeoutMs: 8000,
      });
    }

    if (!res.data.some((r: any) => r?.id === 'master_engine_config')) {
      await callSupabaseProxy({
        table: 'app_configs',
        method: 'POST',
        upsert: true,
        payload: {
          id: 'master_engine_config',
          value: { userAccessControl: [uacItem] },
        },
        timeoutMs: 8000,
      });
    }
  } catch {
    // non-fatal best-effort sync
  }
}

/**
 * Compress CNIC/ID images into clean compact JPEG Data URLs (~60-120KB) so Supabase writes stay fast and reliable.
 */
export function compressImageToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Invalid image file'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
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
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const jpeg = canvas.toDataURL('image/jpeg', quality);
          resolve(jpeg.length < src.length ? jpeg : src);
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export async function fetchMasterEngineConfigFromSupabase(): Promise<Record<string, any>> {
  const res = await callSupabaseProxy({
    table: 'app_configs',
    method: 'GET',
    query: 'id=in.(master_engine_config,global_config)&select=id,value',
    timeoutMs: 8000,
  });
  if (!res.ok || !Array.isArray(res.data)) return {};
  const map: Record<string, any> = {};
  res.data.forEach((row: any) => {
    if (row?.id && row?.value) map[row.id] = row.value;
  });
  return { ...(map.global_config || {}), ...(map.master_engine_config || {}) };
}

export function extractSmsGatewayConfig(masterCfg: Record<string, any>): SmsOtpGatewayConfig {
  const raw = masterCfg?.smsGatewayConfig;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_SMS_GATEWAY_CONFIG;
  }
  return {
    ...DEFAULT_SMS_GATEWAY_CONFIG,
    ...raw,
    sendpkEnabled: Boolean(raw.sendpkEnabled),
    requireSmsOtp: Boolean(raw.requireSmsOtp),
    allowFallbackOtpWhenUnconfigured:
      raw.allowFallbackOtpWhenUnconfigured !== undefined
        ? Boolean(raw.allowFallbackOtpWhenUnconfigured)
        : true,
  };
}

export interface EvaluatedCloudAccess {
  status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
  tier: string;
  expiresAt: number | null;
  reason: string;
  isExpired: boolean;
  forceResetLogout: boolean;
  cloudDeviceId: string;
  matchedUser: any | null;
  matchedSub: any | null;
  matchedUac: any | null;
}

export function evaluateClientAccessState(params: {
  session: ClientAuthSession | null;
  clientDeviceId: string;
  usersList: any[];
  clientUsersList?: any[];
  subsList: any[];
  masterCfg: Record<string, any>;
}): EvaluatedCloudAccess {
  const {
    session,
    clientDeviceId,
    usersList,
    clientUsersList = [],
    subsList,
    masterCfg,
  } = params;

  const targetPhoneDigits = normalizePhoneDigits(session?.phone || '');
  const targetCnicDigits = normalizeCnicDigits(session?.cnic || '');
  const targetEmail = (session?.email || '').trim().toLowerCase();

  const matchesRecord = (r: any) => {
    if (!r || typeof r !== 'object') return false;
    const dev = r.device_id || r.deviceId || '';
    if (dev && dev === clientDeviceId) return true;
    const p = normalizePhoneDigits(r.phone || '');
    if (targetPhoneDigits && p && p === targetPhoneDigits) return true;
    const c = normalizeCnicDigits(r.cnic || '');
    if (targetCnicDigits && c && c === targetCnicDigits) return true;
    const em = (r.email || '').trim().toLowerCase();
    if (targetEmail && em && em === targetEmail) return true;
    return false;
  };

  const matchedUser =
    usersList.find(matchesRecord) || clientUsersList.find(matchesRecord) || null;
  const matchedSub = subsList.find(matchesRecord) || null;
  const uacList = Array.isArray(masterCfg?.userAccessControl)
    ? masterCfg.userAccessControl
    : Object.values(masterCfg?.userAccessControl || {});
  const matchedUac: any = uacList.find(matchesRecord) || null;

  const deviceCandidates = [
    matchedUser?.device_id,
    matchedSub?.device_id,
    matchedUac?.device_id,
    matchedUac?.deviceId,
  ]
    .map((d) => String(d || '').trim())
    .filter(Boolean);

  const resetDeviceId = deviceCandidates.find((d) => d.startsWith('RESET_')) || '';
  const cloudDeviceId = resetDeviceId || deviceCandidates[0] || '';

  // Check if Admin triggered RESET_ on this user's device_id while logged in
  const forceResetLogout = Boolean(session && resetDeviceId);

  let status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE' = 'TRIAL';
  let tier = 'TRIAL';
  let expiresAt: number | null = null;
  let reason = '';

  const isBlockedFlag = Boolean(
    matchedUser?.is_blocked ||
      matchedUser?.isBlocked ||
      matchedUser?.account_status === 'BLOCKED' ||
      matchedSub?.is_blocked ||
      matchedUac?.is_blocked ||
      matchedUac?.isBlocked
  );

  const isLifetimeFlag = Boolean(
    matchedUser?.is_lifetime ||
      matchedSub?.is_lifetime ||
      matchedUac?.is_lifetime ||
      matchedUac?.isLifetimeFree ||
      matchedSub?.subscription_tier === 'LIFETIME_VIP' ||
      matchedUac?.subscription_tier === 'LIFETIME_VIP' ||
      matchedUac?.packagePlan === 'LIFETIME_VIP'
  );

  const rawCloudExpiry = Math.max(
    0,
    ...[
      matchedSub?.activated_until_ms,
      matchedSub?.activated_until,
      matchedSub?.subscription_expiry,
      matchedSub?.trial_expires_at,
      matchedUser?.activated_until_ms,
      matchedUser?.activated_until,
      matchedUser?.subscription_expiry,
      matchedUac?.subscription_expiry,
      matchedUac?.subscriptionExpiresAt,
      matchedUac?.activatedUntil,
      matchedUac?.activated_until,
      matchedUac?.activated_until_ms,
      matchedUac?.trialExpiresAt,
    ].map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
  );

  const rawTrialStart =
    Number(
      matchedSub?.trial_start_ms ||
        matchedSub?.trial_start_time ||
        matchedUser?.trial_start_time ||
        matchedUser?.registered_at_epoch_ms ||
        matchedUac?.trial_start_time ||
        matchedUac?.trialStartTime ||
        session?.trialStartTime ||
        session?.loggedInAt ||
        0
    ) || 0;

  const isPaidActivated = Boolean(
    matchedSub?.is_activated ||
      matchedUser?.is_activated ||
      matchedUser?.account_status === 'ACTIVE' ||
      matchedUser?.account_status === 'APPROVED' ||
      matchedUac?.is_activated ||
      matchedUac?.isPaidActive
  );

  if (isBlockedFlag) {
    status = 'BLOCKED';
    tier = 'BLOCKED';
    reason =
      matchedUser?.block_reason ||
      matchedUac?.block_reason ||
      matchedUac?.blockReason ||
      'Suspended by Master Admin';
  } else if (isLifetimeFlag) {
    status = 'FREE';
    tier = 'LIFETIME_VIP';
    expiresAt = null;
  } else if (isPaidActivated) {
    const cloudTier = String(
      matchedSub?.subscription_tier ||
        matchedUac?.subscription_tier ||
        matchedUac?.packagePlan ||
        matchedUac?.planName ||
        'PRO'
    );
    // Notice: Tariq Mehmood in UAC has is_activated: true with subscription_tier: 'TRIAL'
    if (cloudTier.toUpperCase() === 'TRIAL') {
      status = 'TRIAL';
      tier = 'TRIAL';
      expiresAt =
        rawCloudExpiry > 0
          ? rawCloudExpiry
          : rawTrialStart > 0
          ? rawTrialStart + TWO_DAYS_MS
          : session?.trialExpiresAt || null;
    } else {
      status = 'ACTIVE';
      tier = cloudTier;
      expiresAt = rawCloudExpiry > 0 ? rawCloudExpiry : null;
    }
  } else {
    status = 'TRIAL';
    tier = 'TRIAL';
    if (rawCloudExpiry > 0) {
      expiresAt = rawCloudExpiry;
    } else if (rawTrialStart > 0) {
      expiresAt = rawTrialStart + TWO_DAYS_MS;
    } else if (session?.trialExpiresAt) {
      expiresAt = session.trialExpiresAt;
    } else {
      expiresAt = null;
    }
  }

  const autoLockEnabled =
    masterCfg?.layoutConfig?.autoLockOnSubscriptionExpiry !== undefined
      ? Boolean(masterCfg.layoutConfig.autoLockOnSubscriptionExpiry)
      : true;

  const isExpired = Boolean(
    autoLockEnabled &&
      status !== 'FREE' &&
      status !== 'BLOCKED' &&
      expiresAt !== null &&
      expiresAt > 0 &&
      Date.now() > expiresAt
  );

  return {
    status,
    tier,
    expiresAt,
    reason,
    isExpired,
    forceResetLogout,
    cloudDeviceId,
    matchedUser,
    matchedSub,
    matchedUac,
  };
}
