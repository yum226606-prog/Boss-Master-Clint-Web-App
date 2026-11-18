import {
  callSupabaseProxy,
  DEFAULT_PUBLISHABLE_KEY,
  DEFAULT_SMS_GATEWAY_CONFIG,
  DEFAULT_SUPABASE_URL,
  getEffectiveServerNowMs,
  isLocalClockRolledBack,
  SmsOtpGatewayConfig,
} from './supabaseClientConfig';

export const ADMIN_SERVER_PRIMARY =
  'https://ais-pre-72tiaznwblmandwk4bf3zz-734807725133.asia-southeast1.run.app';
export const ADMIN_SERVER_DEV =
  'https://ais-dev-72tiaznwblmandwk4bf3zz-734807725133.asia-southeast1.run.app';

export const AUTH_SESSION_STORAGE_KEY = 'boss_client_auth_session_v1';
export const DEVICE_ID_STORAGE_KEY = 'boss_client_device_id';
export const MASTER_ENGINE_CACHE_KEY = 'boss_cached_master_engine_config_v1';
export const PRIMARY_OWNER_EMAIL = 'ssaboor2t@gmail.com';
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
  companyName?: string;
  selfieUrl?: string;
  shopPhotoUrl?: string;
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
    if (!parsed || parsed.verified !== true || !parsed.deviceId || (!parsed.phone && !parsed.email)) {
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
 * Client App must NEVER write to app_configs (Admin-only config).
 * Retained as a safe no-op export so existing call sites stay harmless and bandwidth-free.
 */
export async function syncRegisteredUserToAdminUac(_entry: {
  device_id: string;
  name: string;
  phone: string;
  email: string;
  cnic: string;
  shop_address: string;
  trial_start_time: number;
  subscription_expiry: number;
}): Promise<void> {
  return;
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

export function loadCachedMasterEngineConfig(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MASTER_ENGINE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCachedMasterEngineConfig(cfg: Record<string, any>): void {
  if (typeof window === 'undefined' || !cfg || typeof cfg !== 'object') return;
  try {
    localStorage.setItem(MASTER_ENGINE_CACHE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore storage quota errors
  }
}

export function extractOwnerCredentialsFromMaster(masterCfg: Record<string, any> = {}): {
  emails: string[];
  phones: string[];
  cnics: string[];
} {
  const emailSet = new Set<string>([PRIMARY_OWNER_EMAIL]);
  const phoneSet = new Set<string>();
  const cnicSet = new Set<string>();

  const addEmail = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(addEmail);
      return;
    }
    const clean = String(val).trim().toLowerCase();
    if (clean && clean.includes('@')) emailSet.add(clean);
  };

  const addPhone = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(addPhone);
      return;
    }
    const digits = normalizePhoneDigits(String(val));
    if (digits.length >= 10) phoneSet.add(digits);
  };

  const addCnic = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(addCnic);
      return;
    }
    const digits = normalizeCnicDigits(String(val));
    if (digits.length >= 13) cnicSet.add(digits);
  };

  if (masterCfg && typeof masterCfg === 'object') {
    addEmail(masterCfg.ownerEmail);
    addEmail(masterCfg.ownerEmails);
    addEmail(masterCfg.masterOwnerEmail);
    addEmail(masterCfg.adminEmail);
    addEmail(masterCfg.adminEmails);
    addEmail(masterCfg.vipOwnerEmail);
    addEmail(masterCfg.vipEmails);
    addEmail(masterCfg.owner?.email);
    addEmail(masterCfg.ownerProfile?.email);
    addEmail(masterCfg.security?.ownerEmail);
    addEmail(masterCfg.security?.adminEmail);
    addEmail(masterCfg.security?.adminEmails);
    addEmail(masterCfg.security?.vipEmails);

    addPhone(masterCfg.ownerPhone);
    addPhone(masterCfg.ownerPhones);
    addPhone(masterCfg.masterOwnerPhone);
    addPhone(masterCfg.adminPhone);
    addPhone(masterCfg.adminPhones);
    addPhone(masterCfg.vipOwnerPhone);
    addPhone(masterCfg.owner?.phone);
    addPhone(masterCfg.ownerProfile?.phone);
    addPhone(masterCfg.security?.ownerPhone);
    addPhone(masterCfg.security?.adminPhone);
    addPhone(masterCfg.security?.adminPhones);

    addCnic(masterCfg.ownerCnic);
    addCnic(masterCfg.ownerCnics);
    addCnic(masterCfg.masterOwnerCnic);
    addCnic(masterCfg.adminCnic);
    addCnic(masterCfg.adminCnics);
    addCnic(masterCfg.vipOwnerCnic);
    addCnic(masterCfg.owner?.cnic);
    addCnic(masterCfg.ownerProfile?.cnic);
    addCnic(masterCfg.security?.ownerCnic);
    addCnic(masterCfg.security?.adminCnic);

    const adminArraySources = [
      masterCfg.admins,
      masterCfg.adminUsers,
      masterCfg.adminAccounts,
      masterCfg.ownerList,
      masterCfg.security?.admins,
    ];
    adminArraySources.forEach((src) => {
      if (!src) return;
      const items = Array.isArray(src) ? src : typeof src === 'object' ? Object.values(src) : [];
      items.forEach((item: any) => {
        if (typeof item === 'string') {
          if (item.includes('@')) addEmail(item);
          else if (normalizeCnicDigits(item).length >= 13) addCnic(item);
          else if (normalizePhoneDigits(item).length >= 10) addPhone(item);
        } else if (item && typeof item === 'object') {
          addEmail(item.email);
          addPhone(item.phone);
          addCnic(item.cnic);
        }
      });
    });

    const uacList = Array.isArray(masterCfg.userAccessControl)
      ? masterCfg.userAccessControl
      : Object.values(masterCfg.userAccessControl || {});
    uacList.forEach((u: any) => {
      if (!u || typeof u !== 'object') return;
      const uEmail = String(u.email || '').trim().toLowerCase();
      const roleUp = String(u.role || u.accountType || u.tier || u.subscription_tier || u.packagePlan || '')
        .trim()
        .toUpperCase();
      const isMarkedOwnerOrAdmin =
        Boolean(
          u.isOwner ||
            u.is_owner ||
            u.isAdmin ||
            u.is_admin ||
            u.isLifetimeFree ||
            u.is_lifetime ||
            ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN', 'LIFETIME_VIP'].includes(roleUp)
        ) || (uEmail && emailSet.has(uEmail));
      if (isMarkedOwnerOrAdmin) {
        addEmail(u.email);
        addPhone(u.phone);
        addCnic(u.cnic);
      }
    });
  }

  return {
    emails: Array.from(emailSet),
    phones: Array.from(phoneSet),
    cnics: Array.from(cnicSet),
  };
}

export function isOwnerIdentity(params: {
  email?: string;
  phone?: string;
  cnic?: string;
  masterCfg?: Record<string, any>;
}): boolean {
  const effectiveCfg =
    params.masterCfg && Object.keys(params.masterCfg).length > 0
      ? params.masterCfg
      : loadCachedMasterEngineConfig();
  const ownerCreds = extractOwnerCredentialsFromMaster(effectiveCfg);

  const email = String(params.email || '').trim().toLowerCase();
  if (email && ownerCreds.emails.includes(email)) return true;

  const phoneDigits = normalizePhoneDigits(String(params.phone || ''));
  if (phoneDigits.length >= 10 && ownerCreds.phones.includes(phoneDigits)) return true;

  const cnicDigits = normalizeCnicDigits(String(params.cnic || ''));
  if (cnicDigits.length >= 13 && ownerCreds.cnics.includes(cnicDigits)) return true;

  return false;
}

export async function fetchMasterEngineConfigFromSupabase(): Promise<Record<string, any>> {
  const res = await callSupabaseProxy({
    table: 'app_configs',
    method: 'GET',
    query: 'id=in.(master_engine_config,global_config)&select=id,value',
    timeoutMs: 8000,
  });
  if (!res.ok || !Array.isArray(res.data)) {
    return loadCachedMasterEngineConfig();
  }
  const map: Record<string, any> = {};
  res.data.forEach((row: any) => {
    if (row?.id && row?.value) map[row.id] = row.value;
  });
  const merged = { ...(map.global_config || {}), ...(map.master_engine_config || {}) };
  if (Object.keys(merged).length > 0) {
    saveCachedMasterEngineConfig(merged);
  }
  return merged;
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

export function parseTimestampMs(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val <= 0) return 0;
    return val < 1e12 ? val * 1000 : val;
  }
  const str = String(val).trim();
  if (!str) return 0;
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return num < 1e12 ? num * 1000 : num;
  }
  const parsed = Date.parse(str);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export interface ExistingComboMatchResult {
  matchedUser: any | null;
  matchedSub: any | null;
  matchedUac: any | null;
  matchedFields: string[];
  existingDeviceId: string;
}

/**
 * Strict 6-Field Anti-Fake ID & One-Trial-Per-User Combo Check:
 * Matches ANY existing row in users, subscriptions, or userAccessControl on:
 * CNIC, Email, Phone Number, Device ID, Public IP Address, or MAC/Device Fingerprint.
 */
export function findExistingAccountComboMatch(params: {
  email?: string;
  phone?: string;
  cnic?: string;
  deviceId?: string;
  ipAddress?: string;
  macAddress?: string;
  usersList: any[];
  subsList: any[];
  uacList?: any[];
  identityOnly?: boolean;
}): ExistingComboMatchResult {
  const emailTarget = String(params.email || '').trim().toLowerCase();
  const phoneDigits = normalizePhoneDigits(String(params.phone || ''));
  const cnicDigits = normalizeCnicDigits(String(params.cnic || ''));
  const devTarget = String(params.deviceId || '').trim();
  const ipTarget = String(params.ipAddress || '').trim();
  const macTarget = String(params.macAddress || '').trim().toLowerCase();
  const identityOnly = Boolean(params.identityOnly);

  const getRowMatchReasons = (r: any): string[] => {
    if (!r || typeof r !== 'object') return [];
    const reasons: string[] = [];
    const rCnic = normalizeCnicDigits(String(r.cnic || ''));
    if (cnicDigits.length >= 13 && rCnic && rCnic === cnicDigits) reasons.push('CNIC');

    const rEmail = String(r.email || '').trim().toLowerCase();
    if (emailTarget && emailTarget.includes('@') && rEmail && rEmail === emailTarget) {
      reasons.push('EMAIL');
    }

    const rPhone = normalizePhoneDigits(String(r.phone || ''));
    if (phoneDigits.length >= 10 && rPhone && rPhone === phoneDigits) reasons.push('PHONE');

    if (!identityOnly) {
      const rDev = String(r.device_id || r.deviceId || '').trim();
      if (
        devTarget &&
        devTarget !== 'DEV-CLIENT-DEFAULT' &&
        !devTarget.startsWith('RESET_') &&
        rDev &&
        !rDev.startsWith('RESET_') &&
        rDev === devTarget
      ) {
        reasons.push('DEVICE_ID');
      }

      const rIp = String(r.ip_address || r.ipAddress || '').trim();
      if (ipTarget.length >= 7 && rIp && rIp === ipTarget) reasons.push('IP_ADDRESS');

      const rMac = String(r.mac_address || r.macAddress || '').trim().toLowerCase();
      if (macTarget.length >= 11 && rMac && rMac === macTarget) reasons.push('MAC_FINGERPRINT');
    }

    return reasons;
  };

  const matchedReasons = new Set<string>();
  let matchedUser: any | null = null;
  let matchedSub: any | null = null;
  let matchedUac: any | null = null;

  for (const u of params.usersList || []) {
    const reasons = getRowMatchReasons(u);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      if (!matchedUser) matchedUser = u;
    }
  }

  for (const s of params.subsList || []) {
    const reasons = getRowMatchReasons(s);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      if (!matchedSub) matchedSub = s;
    }
  }

  for (const a of params.uacList || []) {
    const reasons = getRowMatchReasons(a);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      if (!matchedUac) matchedUac = a;
    }
  }

  // Link companion user/sub row by existing matched record's identity or device_id
  const anchorDev = String(
    matchedUser?.device_id || matchedSub?.device_id || matchedUac?.device_id || ''
  ).trim();
  if (!matchedSub && anchorDev && !anchorDev.startsWith('RESET_')) {
    matchedSub =
      (params.subsList || []).find((s) => String(s?.device_id || '').trim() === anchorDev) || null;
  }
  if (!matchedUser && anchorDev && !anchorDev.startsWith('RESET_')) {
    matchedUser =
      (params.usersList || []).find((u) => String(u?.device_id || '').trim() === anchorDev) || null;
  }

  const existingDeviceId = String(
    matchedUser?.device_id || matchedSub?.device_id || matchedUac?.device_id || matchedUac?.deviceId || ''
  ).trim();

  return {
    matchedUser,
    matchedSub,
    matchedUac,
    matchedFields: Array.from(matchedReasons),
    existingDeviceId,
  };
}

export interface EvaluatedCloudAccess {
  status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
  tier: string;
  expiresAt: number | null;
  serverNowMs: number;
  reason: string;
  isExpired: boolean;
  forceResetLogout: boolean;
  forceLogoutReason: string;
  cloudDeviceId: string;
  matchedUser: any | null;
  matchedSub: any | null;
  matchedUac: any | null;
}

export function evaluateClientAccessState(params: {
  session: ClientAuthSession | null;
  clientDeviceId: string;
  clientIpAddress?: string;
  clientMacAddress?: string;
  usersList: any[];
  clientUsersList?: any[];
  subsList: any[];
  masterCfg: Record<string, any>;
  serverNowMs?: number;
}): EvaluatedCloudAccess {
  const {
    session,
    clientDeviceId,
    clientIpAddress = '',
    clientMacAddress = '',
    usersList,
    clientUsersList = [],
    subsList,
    masterCfg,
  } = params;

  const targetPhoneDigits = normalizePhoneDigits(session?.phone || '');
  const targetCnicDigits = normalizeCnicDigits(session?.cnic || '');
  const targetEmail = (session?.email || '').trim().toLowerCase();
  const targetIp = clientIpAddress.trim();
  const targetMac = clientMacAddress.trim().toLowerCase();

  const matchesRecord = (r: any) => {
    if (!r || typeof r !== 'object') return false;
    const dev = String(r.device_id || r.deviceId || '').trim();
    if (dev && clientDeviceId && dev === clientDeviceId) return true;
    const p = normalizePhoneDigits(r.phone || '');
    if (targetPhoneDigits && p && p === targetPhoneDigits) return true;
    const c = normalizeCnicDigits(r.cnic || '');
    if (targetCnicDigits && c && c === targetCnicDigits) return true;
    const em = String(r.email || '').trim().toLowerCase();
    if (targetEmail && em && em === targetEmail) return true;
    return false;
  };

  const matchesHardwareOrNetwork = (r: any) => {
    if (!r || typeof r !== 'object') return false;
    if (matchesRecord(r)) return true;
    const ip = String(r.ip_address || r.ipAddress || '').trim();
    if (targetIp && ip && ip === targetIp) return true;
    const mac = String(r.mac_address || r.macAddress || '').trim().toLowerCase();
    if (targetMac && mac && mac === targetMac) return true;
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

  // Check if Admin triggered RESET_ OR force_logout_at is newer than session.loggedInAt
  const forceLogoutTs = Math.max(
    parseTimestampMs(matchedUser?.force_logout_at),
    parseTimestampMs(matchedSub?.force_logout_at),
    parseTimestampMs(matchedUac?.force_logout_at),
    parseTimestampMs(matchedUac?.forceLogoutAt)
  );
  const isRemoteForceLogout = Boolean(
    session && forceLogoutTs > 0 && forceLogoutTs > Number(session.loggedInAt || 0)
  );
  const forceResetLogout = Boolean((session && resetDeviceId) || isRemoteForceLogout);
  const forceLogoutReason = isRemoteForceLogout
    ? 'Admin ne aapka session remotely logout kiya hai — dobara Login karein.'
    : resetDeviceId
    ? 'Admin ne aapka Device Reset kiya hai — dobara Login karein.'
    : '';

  let status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE' = 'TRIAL';
  let tier = 'TRIAL';
  let expiresAt: number | null = null;
  let reason = '';

  const isRowBlocked = (r: any) =>
    Boolean(
      r &&
        (r.is_blocked ||
          r.isBlocked ||
          String(r.account_status || '').toUpperCase() === 'BLOCKED' ||
          String(r.status || '').toUpperCase() === 'BLOCKED')
    );

  // Check if any matching record (Account, Device ID, IP, MAC, CNIC, or Email) is blocked
  const blockedAnyRecord =
    [matchedUser, matchedSub, matchedUac].find(isRowBlocked) ||
    usersList.find((r) => matchesHardwareOrNetwork(r) && isRowBlocked(r)) ||
    subsList.find((r) => matchesHardwareOrNetwork(r) && isRowBlocked(r)) ||
    uacList.find((r: any) => matchesHardwareOrNetwork(r) && isRowBlocked(r)) ||
    null;

  // Check optional blocklists inside master_engine_config
  const inList = (arr: any, val: string) =>
    Boolean(
      val &&
        Array.isArray(arr) &&
        arr.some((x) => String(x || '').trim().toLowerCase() === val.toLowerCase())
    );
  const isMasterBlocklisted =
    inList(masterCfg?.blockedIps, targetIp) ||
    inList(masterCfg?.blockedMacs, targetMac) ||
    inList(masterCfg?.blockedDevices, clientDeviceId) ||
    inList(masterCfg?.blockedEmails, targetEmail) ||
    (targetCnicDigits &&
      Array.isArray(masterCfg?.blockedCnics) &&
      masterCfg.blockedCnics.some((x: any) => normalizeCnicDigits(String(x || '')) === targetCnicDigits));

  const isBlockedFlag = Boolean(blockedAnyRecord || isMasterBlocklisted);

  const isOwnerUser =
    isOwnerIdentity({
      email: targetEmail || matchedUser?.email || matchedSub?.email || matchedUac?.email,
      phone: targetPhoneDigits || matchedUser?.phone || matchedSub?.phone || matchedUac?.phone,
      cnic: targetCnicDigits || matchedUser?.cnic || matchedSub?.cnic || matchedUac?.cnic,
      masterCfg,
    }) ||
    Boolean(
      matchedUser?.is_owner ||
        matchedUser?.is_admin ||
        matchedUac?.isOwner ||
        matchedUac?.is_owner ||
        matchedUac?.isAdmin ||
        matchedUac?.is_admin ||
        ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(
          String(matchedUser?.role || matchedUac?.role || '').toUpperCase()
        )
    );

  const isLifetimeFlag = Boolean(
    isOwnerUser ||
      matchedUser?.is_lifetime ||
      matchedSub?.is_lifetime ||
      matchedUac?.is_lifetime ||
      matchedUac?.isLifetimeFree ||
      String(matchedUser?.subscription_tier || '').toUpperCase() === 'LIFETIME_VIP' ||
      String(matchedSub?.subscription_tier || '').toUpperCase() === 'LIFETIME_VIP' ||
      String(matchedUac?.subscription_tier || '').toUpperCase() === 'LIFETIME_VIP' ||
      String(matchedUac?.packagePlan || '').toUpperCase() === 'LIFETIME_VIP'
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
      matchedUser?.trial_end,
      matchedUac?.subscription_expiry,
      matchedUac?.subscriptionExpiresAt,
      matchedUac?.activatedUntil,
      matchedUac?.activated_until,
      matchedUac?.activated_until_ms,
      matchedUac?.trialExpiresAt,
    ].map(parseTimestampMs)
  );

  const rawTrialStart =
    [
      matchedSub?.trial_start_ms,
      matchedSub?.trial_start_time,
      matchedUser?.trial_start,
      matchedUser?.trial_start_time,
      matchedUser?.registered_at_epoch_ms,
      matchedUac?.trial_start_time,
      matchedUac?.trialStartTime,
      session?.trialStartTime,
      session?.loggedInAt,
    ]
      .map(parseTimestampMs)
      .find((t) => t > 0) || 0;

  const isPaidActivated = Boolean(
    isOwnerUser ||
      matchedSub?.is_activated ||
      matchedUser?.is_activated ||
      String(matchedUser?.account_status || '').toUpperCase() === 'ACTIVE' ||
      String(matchedUser?.account_status || '').toUpperCase() === 'APPROVED' ||
      String(matchedUser?.status || '').toUpperCase() === 'ACTIVE' ||
      String(matchedSub?.status || '').toUpperCase() === 'ACTIVE' ||
      matchedUac?.is_activated ||
      matchedUac?.isPaidActive
  );

  if (isOwnerUser) {
    status = 'FREE';
    tier = 'LIFETIME_VIP';
    expiresAt = null;
    reason = '';
  } else if (isBlockedFlag) {
    status = 'BLOCKED';
    tier = 'BLOCKED';
    reason =
      blockedAnyRecord?.block_reason ||
      blockedAnyRecord?.blockReason ||
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
        matchedSub?.package_name ||
        matchedUser?.subscription_tier ||
        matchedUser?.package_name ||
        matchedUac?.subscription_tier ||
        matchedUac?.packagePlan ||
        matchedUac?.planName ||
        'PRO'
    );
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

  // Strictly compare against authentic Server Time (never phone's local clock)
  const effectiveServerNowMs =
    params.serverNowMs && params.serverNowMs > 1_600_000_000_000
      ? params.serverNowMs
      : getEffectiveServerNowMs();

  const clockTampered = Boolean(
    !isOwnerUser &&
      (isLocalClockRolledBack() ||
        (effectiveServerNowMs > 0 && rawTrialStart > 0 && effectiveServerNowMs + 60_000 < rawTrialStart))
  );

  const isExpired = Boolean(
    !isOwnerUser &&
      autoLockEnabled &&
      status !== 'FREE' &&
      status !== 'BLOCKED' &&
      (clockTampered ||
        (expiresAt !== null &&
          expiresAt > 0 &&
          effectiveServerNowMs > 0 &&
          effectiveServerNowMs > expiresAt))
  );

  return {
    status,
    tier,
    expiresAt,
    serverNowMs: effectiveServerNowMs,
    reason,
    isExpired,
    forceResetLogout: isOwnerUser ? false : forceResetLogout,
    forceLogoutReason: isOwnerUser ? '' : forceLogoutReason,
    cloudDeviceId,
    matchedUser,
    matchedSub,
    matchedUac,
  };
}

// ============================================================================
// PASSWORD HASHING (SHA-256)
// ============================================================================
export async function hashPasswordSha256(password: string): Promise<string> {
  const input = password;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback FNV-1a hex if crypto.subtle unavailable
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i * 31);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

// ============================================================================
// GPS LOCATION CAPTURE & SUPABASE SYNC
// ============================================================================
export const CLIENT_GPS_STORAGE_KEY = 'boss_client_gps_v1';

export interface StoredGpsLocation {
  latitude: number;
  longitude: number;
  locationUrl: string;
  updatedAt: number;
}

export function loadStoredGpsLocation(): StoredGpsLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLIENT_GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return parsed as StoredGpsLocation;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredGpsLocation(gps: StoredGpsLocation): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIENT_GPS_STORAGE_KEY, JSON.stringify(gps));
  } catch {
    // ignore storage quota errors
  }
}

export async function syncGpsToSupabaseUser(
  deviceId: string,
  gps: StoredGpsLocation
): Promise<void> {
  if (!deviceId || deviceId.startsWith('RESET_')) return;
  try {
    await callSupabaseProxy({
      table: 'users',
      method: 'PATCH',
      query: `device_id=eq.${encodeURIComponent(deviceId)}`,
      payload: {
        latitude: gps.latitude,
        longitude: gps.longitude,
        location_url: gps.locationUrl,
      },
      timeoutMs: 6000,
    });
  } catch {
    // best-effort non-fatal sync
  }
}

export interface MandatoryGpsResult {
  ok: boolean;
  gps: StoredGpsLocation | null;
  errorReason:
    | 'UNSUPPORTED'
    | 'PERMISSION_DENIED'
    | 'POSITION_UNAVAILABLE'
    | 'TIMEOUT'
    | 'ERROR'
    | '';
  message: string;
}

export function requestMandatoryGpsLocation(deviceId?: string): Promise<MandatoryGpsResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve({
        ok: false,
        gps: null,
        errorReason: 'UNSUPPORTED',
        message: 'Aapke device ya browser mein GPS Location supported nahi hai.',
      });
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = Number(pos.coords.latitude.toFixed(6));
          const longitude = Number(pos.coords.longitude.toFixed(6));
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            resolve({
              ok: false,
              gps: null,
              errorReason: 'POSITION_UNAVAILABLE',
              message: 'Sahih GPS coordinates nahi mil sakay. Apni Mobile Location ON karein.',
            });
            return;
          }
          const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
          const gps: StoredGpsLocation = {
            latitude,
            longitude,
            locationUrl,
            updatedAt: Date.now(),
          };
          saveStoredGpsLocation(gps);
          if (deviceId) {
            await syncGpsToSupabaseUser(deviceId, gps);
          }
          resolve({
            ok: true,
            gps,
            errorReason: '',
            message: `GPS Location Verified (${latitude}, ${longitude})`,
          });
        },
        (err) => {
          if (err?.code === 1) {
            resolve({
              ok: false,
              gps: null,
              errorReason: 'PERMISSION_DENIED',
              message:
                'Account banane ke liye Location (GPS) ON karna aur Allow karna zaroori hai. Browser/Mobile Settings se Location Allow karke Retry karein.',
            });
          } else if (err?.code === 2) {
            resolve({
              ok: false,
              gps: null,
              errorReason: 'POSITION_UNAVAILABLE',
              message:
                'Mobile/Device ki GPS Location band hai. Baraye meharbani GPS Location ON karein aur Retry dabain.',
            });
          } else if (err?.code === 3) {
            // If GPS permission is granted and we have a recent (<15 min) stored fix, accept it; otherwise ask retry
            const cached = loadStoredGpsLocation();
            if (cached && Date.now() - cached.updatedAt < 15 * 60 * 1000) {
              resolve({
                ok: true,
                gps: cached,
                errorReason: '',
                message: `GPS Location Verified (${cached.latitude}, ${cached.longitude})`,
              });
              return;
            }
            resolve({
              ok: false,
              gps: null,
              errorReason: 'TIMEOUT',
              message:
                'GPS Location signal hasil karne mein waqt lag raha hai. Apne device ki Location ON karke Retry dabain.',
            });
          } else {
            resolve({
              ok: false,
              gps: null,
              errorReason: 'ERROR',
              message: 'Location ON karke permission Allow karein, phir account banayein.',
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000,
        }
      );
    } catch {
      resolve({
        ok: false,
        gps: null,
        errorReason: 'ERROR',
        message: 'Location permission check karne mein error aaya. GPS ON karke Retry karein.',
      });
    }
  });
}

export function requestAndSaveGpsLocation(deviceId?: string): Promise<StoredGpsLocation | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve(loadStoredGpsLocation());
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = Number(pos.coords.latitude.toFixed(6));
          const longitude = Number(pos.coords.longitude.toFixed(6));
          const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
          const gps: StoredGpsLocation = {
            latitude,
            longitude,
            locationUrl,
            updatedAt: Date.now(),
          };
          saveStoredGpsLocation(gps);
          if (deviceId) {
            await syncGpsToSupabaseUser(deviceId, gps);
          }
          resolve(gps);
        },
        () => {
          resolve(loadStoredGpsLocation());
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 180000,
        }
      );
    } catch {
      resolve(loadStoredGpsLocation());
    }
  });
}

// ============================================================================
// BIOMETRIC / FINGERPRINT BINDING & WEBAUTHN PASSKEY HELPERS
// ============================================================================
export const BIOMETRIC_BINDING_KEY = 'boss_biometric_binding_v1';

export interface BiometricBinding {
  deviceId: string;
  identifier: string;
  userName: string;
  email: string;
  phone: string;
  cnic: string;
  credentialId?: string;
  enrolledAt: number;
}

export function loadBiometricBinding(): BiometricBinding | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BIOMETRIC_BINDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.deviceId || !parsed.identifier) return null;
    return parsed as BiometricBinding;
  } catch {
    return null;
  }
}

export function saveBiometricBinding(binding: BiometricBinding): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BIOMETRIC_BINDING_KEY, JSON.stringify(binding));
  } catch {
    // ignore storage errors
  }
}

export function clearBiometricBinding(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BIOMETRIC_BINDING_KEY);
  } catch {
    // ignore storage errors
  }
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const raw = atob(base64 + pad);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export async function enrollBiometricPasskey(params: {
  deviceId: string;
  identifier: string;
  userName: string;
}): Promise<{ ok: boolean; credentialId?: string; mode: 'WEBAUTHN' | 'DEVICE_PASSKEY' }> {
  try {
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      navigator.credentials?.create &&
      window.isSecureContext
    ) {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userIdBytes = new TextEncoder().encode(params.deviceId);
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Boss Aluminium & Glass',
            id: window.location.hostname,
          },
          user: {
            id: userIdBytes,
            name: params.identifier,
            displayName: params.userName || params.identifier,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
          },
          timeout: 45000,
        },
      })) as PublicKeyCredential | null;
      if (cred?.rawId) {
        return {
          ok: true,
          credentialId: bufferToBase64Url(cred.rawId),
          mode: 'WEBAUTHN',
        };
      }
    }
  } catch {
    // Cross-origin iframe or hardware without biometric sensor — gracefully fall back to device binding
  }
  return { ok: true, mode: 'DEVICE_PASSKEY' };
}

export async function verifyBiometricPasskey(
  credentialId?: string
): Promise<{ ok: boolean; cancelled?: boolean; mode: 'WEBAUTHN' | 'DEVICE_PASSKEY' }> {
  if (
    credentialId &&
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials?.get &&
    window.isSecureContext
  ) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const allowId = base64UrlToUint8Array(credentialId);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: allowId.buffer as ArrayBuffer,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'preferred',
          timeout: 45000,
        },
      });
      if (assertion) {
        return { ok: true, mode: 'WEBAUTHN' };
      }
    } catch (err: any) {
      // If user explicitly cancelled the biometric prompt (AbortError / NotAllowedError outside iframe), handle carefully:
      // In cross-origin iframes (like AI Studio preview), browsers throw SecurityError or NotAllowedError immediately without showing UI.
      if (err?.name === 'NotAllowedError' && window.self === window.top) {
        return { ok: false, cancelled: true, mode: 'WEBAUTHN' };
      }
    }
  }
  return { ok: true, mode: 'DEVICE_PASSKEY' };
}

// ============================================================================
// DEVICE TELEMETRY: PUBLIC IP (ipify), MAC/DEVICE FINGERPRINT, MODEL & ONLINE SYNC
// ============================================================================
export const CLIENT_IP_STORAGE_KEY = 'boss_client_public_ip_v1';
export const CLIENT_MAC_STORAGE_KEY = 'boss_client_mac_fingerprint_v1';

export function getDeviceModelName(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  let os = 'Desktop';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return `${browser} (${os})`;
}

export function getOrCreateDeviceMacFingerprint(): string {
  if (typeof window === 'undefined') return 'BC:00:00:00:00:01';
  try {
    const existing = localStorage.getItem(CLIENT_MAC_STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();

    const seed = [
      navigator.userAgent || '',
      navigator.language || '',
      String(navigator.hardwareConcurrency || 4),
      String(window.screen?.width || 0),
      String(window.screen?.height || 0),
      String(window.screen?.colorDepth || 24),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    ].join('|');

    // Deterministic 48-bit hash formatted as XX:XX:XX:XX:XX:XX + short suffix
    let h1 = 0x811c9dc5;
    let h2 = 0x12345678;
    for (let i = 0; i < seed.length; i++) {
      const ch = seed.charCodeAt(i);
      h1 ^= ch;
      h1 = Math.imul(h1, 0x01000193);
      h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
    }
    const bytes = [
      ((h1 >>> 24) & 0xfc) | 0x02,
      (h1 >>> 16) & 0xff,
      (h1 >>> 8) & 0xff,
      h1 & 0xff,
      (h2 >>> 16) & 0xff,
      h2 & 0xff,
    ];
    const mac = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
    localStorage.setItem(CLIENT_MAC_STORAGE_KEY, mac);
    return mac;
  } catch {
    return 'BC:DE:FA:01:02:03';
  }
}

export function getCachedPublicIpAddress(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(CLIENT_IP_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.ip === 'string' ? parsed.ip : '';
  } catch {
    return '';
  }
}

export async function getClientPublicIpAddress(): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(CLIENT_IP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.ip && Date.now() - Number(parsed.fetchedAt || 0) < 10 * 60 * 1000) {
        return String(parsed.ip);
      }
    }
  } catch {
    // ignore cache error
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      if (data?.ip) {
        const ip = String(data.ip).trim();
        try {
          localStorage.setItem(
            CLIENT_IP_STORAGE_KEY,
            JSON.stringify({ ip, fetchedAt: Date.now() })
          );
        } catch {
          // ignore storage error
        }
        return ip;
      }
    }
  } catch {
    // non-fatal network fallback
  }
  return getCachedPublicIpAddress();
}

export async function collectAndSyncUserTelemetryToSupabase(params: {
  deviceId: string;
  session?: ClientAuthSession | null;
  companyName?: string;
  selfieUrl?: string;
  shopPhotoUrl?: string;
  isOnline?: boolean;
  extraFields?: Record<string, any>;
}): Promise<void> {
  if (!params.deviceId || params.deviceId.startsWith('RESET_')) return;
  try {
    const [ip, gps] = await Promise.all([
      getClientPublicIpAddress(),
      Promise.resolve(loadStoredGpsLocation()),
    ]);
    const mac = getOrCreateDeviceMacFingerprint();
    const model = getDeviceModelName();
    const bio = loadBiometricBinding();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const payload: Record<string, any> = {
      ip_address: ip || undefined,
      mac_address: mac,
      device_model: model,
      fingerprint_enabled: Boolean(bio),
      is_online: params.isOnline !== undefined ? params.isOnline : true,
      last_seen: nowIso,
      last_cloud_sync: now,
      ...(params.companyName ? { company_name: params.companyName } : {}),
      ...(params.session?.name ? { name: params.session.name } : {}),
      ...(params.session?.email ? { email: params.session.email } : {}),
      ...(params.session?.phone ? { phone: params.session.phone } : {}),
      ...(params.session?.cnic ? { cnic: params.session.cnic } : {}),
      ...(params.session?.shopAddress ? { shop_address: params.session.shopAddress } : {}),
      ...(params.selfieUrl || params.session?.selfieUrl
        ? { selfie_url: params.selfieUrl || params.session?.selfieUrl }
        : {}),
      ...(params.shopPhotoUrl || params.session?.shopPhotoUrl
        ? { shop_photo_url: params.shopPhotoUrl || params.session?.shopPhotoUrl }
        : {}),
      ...(gps
        ? {
            latitude: gps.latitude,
            longitude: gps.longitude,
            location_url: gps.locationUrl,
          }
        : {}),
      ...(params.extraFields || {}),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    await callSupabaseProxy({
      table: 'users',
      method: 'PATCH',
      query: `device_id=eq.${encodeURIComponent(params.deviceId)}`,
      payload,
      timeoutMs: 7000,
    });
  } catch {
    // non-fatal background telemetry
  }
}

export async function markUserOfflineInSupabase(deviceId: string): Promise<void> {
  if (!deviceId || deviceId.startsWith('RESET_')) return;
  try {
    await callSupabaseProxy({
      table: 'users',
      method: 'PATCH',
      query: `device_id=eq.${encodeURIComponent(deviceId)}`,
      payload: {
        is_online: false,
        last_seen: new Date().toISOString(),
      },
      timeoutMs: 4000,
    });
  } catch {
    // non-fatal
  }
}
