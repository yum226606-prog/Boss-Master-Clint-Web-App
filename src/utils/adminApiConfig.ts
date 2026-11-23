import {
  callSupabaseProxy,
  DEFAULT_SMS_GATEWAY_CONFIG,
  getEffectiveServerNowMs,
  isLocalClockRolledBack,
  SmsOtpGatewayConfig,
  supabase,
} from './supabaseClientConfig';

export const ADMIN_SERVER_PRIMARY =
  'https://ais-pre-72tiaznwblmandwk4bf3zz-734807725133.asia-southeast1.run.app';
export const ADMIN_SERVER_DEV =
  'https://ais-dev-72tiaznwblmandwk4bf3zz-734807725133.asia-southeast1.run.app';

export const AUTH_SESSION_STORAGE_KEY = 'boss_client_auth_session_v1';
export const DEVICE_ID_STORAGE_KEY = 'boss_client_device_id';
export const MASTER_ENGINE_CACHE_KEY = 'boss_cached_master_engine_config_v1';
export const ACTIVE_SESSION_TOKEN_KEY = 'boss_active_session_token_v1';
export const LAST_ACTIVE_AT_KEY = 'boss_last_active_at_v1';
export const PRIMARY_OWNER_EMAIL = 'ssaboor2t@gmail.com';
export const DEFAULT_OWNER_EMAILS = ['ssaboor2t@gmail.com', 'yum226606@gmail.com'];
export const DEFAULT_OWNER_PHONES = ['3105524225'];
export const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
export const INACTIVITY_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

export type BossUserRole = 'OWNER' | 'ADMIN' | 'CLIENT';

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
  isLifetimeFree?: boolean;
  isActivated?: boolean;
  packagePlan?: string;
  isBlocked?: boolean;
  activeSessionToken?: string;
  userRole?: BossUserRole;
}

/**
 * Mobile/Capacitor WebView safe UUID v4 generator (never breaks if crypto.randomUUID is unavailable).
 */
export function generateSafeUUID(): string {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Set RFC 4122 version 4 and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function loadLastActiveAtMs(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = Number(localStorage.getItem(LAST_ACTIVE_AT_KEY) || 0);
    return Number.isFinite(val) && val > 0 ? val : 0;
  } catch {
    return 0;
  }
}

export function saveLastActiveAtMs(ms = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    if (Number.isFinite(ms) && ms > 0) {
      localStorage.setItem(LAST_ACTIVE_AT_KEY, String(Math.round(ms)));
    }
  } catch {
    // ignore storage errors
  }
}

export function clearLastActiveAtMs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LAST_ACTIVE_AT_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isSessionInactiveExpired(
  session?: ClientAuthSession | null,
  nowMs = Date.now()
): boolean {
  const lastActive = loadLastActiveAtMs();
  const effectiveLast = lastActive > 0 ? lastActive : Number(session?.loggedInAt || 0);
  if (!effectiveLast || effectiveLast <= 0) return false;
  return nowMs - effectiveLast > INACTIVITY_LIMIT_MS;
}

export function generateActiveSessionToken(): string {
  return `SESS-${Date.now().toString(36)}-${generateSafeUUID().slice(0, 18)}`;
}

export function loadActiveSessionToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return String(localStorage.getItem(ACTIVE_SESSION_TOKEN_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveActiveSessionToken(token: string): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    localStorage.setItem(ACTIVE_SESSION_TOKEN_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function clearActiveSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_SESSION_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
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
    if (session.activeSessionToken) {
      localStorage.setItem(ACTIVE_SESSION_TOKEN_KEY, session.activeSessionToken);
    }
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_TOKEN_KEY);
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
  const cleanEmail = email.trim().toLowerCase();

  try {
    // Do NOT pass emailRedirectTo so Supabase sends a 6-digit numeric OTP ({{ .Token }}) instead of a Magic Link
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        data: meta || {},
      },
    });
    if (!error) {
      return { ok: true, status: 200 };
    }
    return {
      ok: false,
      status: error.status || 400,
      error: error.message || `Email OTP error (${error.status || 400})`,
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
  const cleanEmail = email.trim().toLowerCase();
  const rawInput = tokenOrUrl.trim();

  let extractedAccessToken = '';
  let extractedTokenHash = '';
  let extractedType = '';
  let cleanToken = rawInput.replace(/\s+/g, '');

  if (
    rawInput.includes('access_token=') ||
    rawInput.includes('token_hash=') ||
    rawInput.includes('token=')
  ) {
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

  // 1) Confirmation link access_token verification via official Supabase Auth SDK
  if (extractedAccessToken) {
    try {
      const { data, error } = await supabase.auth.getUser(extractedAccessToken);
      if (!error && data?.user) {
        const verifiedEmail = String(data.user.email || '').trim().toLowerCase();
        if (!verifiedEmail || verifiedEmail === cleanEmail) {
          return { ok: true };
        }
      }
    } catch {
      // fall through
    }
  }

  // 2) token_hash verification via official supabase.auth.verifyOtp
  const hashTypesToTry = extractedType
    ? ([extractedType, 'email', 'signup', 'magiclink'] as const)
    : (['email', 'signup', 'magiclink'] as const);

  if (extractedTokenHash || cleanToken.startsWith('pkce_') || cleanToken.length > 16) {
    const hashCandidate = extractedTokenHash || cleanToken;
    for (const verifyType of hashTypesToTry) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: hashCandidate,
          type: verifyType as any,
        });
        if (!error && (data?.session || data?.user)) {
          return { ok: true };
        }
      } catch {
        // try next type
      }
    }
  }

  // 3) Strict 6-digit Email OTP verification via official supabase.auth.verifyOtp
  let lastVerifyError = '';
  for (const verifyType of ['email', 'signup', 'magiclink'] as const) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: verifyType,
      });
      if (!error && (data?.session || data?.user)) {
        return { ok: true };
      }
      if (error?.message && !lastVerifyError) {
        lastVerifyError = error.message;
      }
    } catch (err: any) {
      if (err?.message && !lastVerifyError) {
        lastVerifyError = err.message;
      }
    }
  }

  return { ok: false, error: lastVerifyError || 'Email OTP code ghalat ya expire ho chuka hai.' };
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
 * Compress CNIC/ID images on canvas (max 800px width, 0.6 JPEG quality, strictly under 80KB) so Supabase writes never time out.
 */
export function compressImageToDataUrl(
  file: File,
  maxWidth = 800,
  quality = 0.6,
  maxBytes = 80 * 1024
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
            if (currentQuality > 0.34) {
              currentQuality = Math.max(0.28, Number((currentQuality - 0.1).toFixed(2)));
            } else {
              currentMaxW = Math.max(420, Math.round(currentMaxW * 0.8));
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
  const emailSet = new Set<string>(DEFAULT_OWNER_EMAILS);
  const phoneSet = new Set<string>(DEFAULT_OWNER_PHONES);
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
    addEmail(masterCfg.ownerIdentity?.emails);
    addEmail(masterCfg.ownerIdentity?.email);
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

    addPhone(masterCfg.ownerIdentity?.phone);
    addPhone(masterCfg.ownerIdentity?.phones);
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

    addCnic(masterCfg.ownerIdentity?.cnic);
    addCnic(masterCfg.ownerIdentity?.cnics);
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

export function resolveUserRole(params: {
  email?: string;
  phone?: string;
  cnic?: string;
  matchedUser?: any | null;
  matchedClientUser?: any | null;
  matchedSub?: any | null;
  matchedUac?: any | null;
  masterCfg?: Record<string, any>;
}): BossUserRole {
  const effectiveCfg =
    params.masterCfg && Object.keys(params.masterCfg).length > 0
      ? params.masterCfg
      : loadCachedMasterEngineConfig();

  const email = String(
    params.email ||
      params.matchedUser?.email ||
      params.matchedClientUser?.email ||
      params.matchedSub?.email ||
      params.matchedUac?.email ||
      ''
  )
    .trim()
    .toLowerCase();
  const phoneDigits = normalizePhoneDigits(
    String(
      params.phone ||
        params.matchedUser?.phone ||
        params.matchedClientUser?.phone ||
        params.matchedSub?.phone ||
        params.matchedUac?.phone ||
        ''
    )
  );
  const cnicDigits = normalizeCnicDigits(
    String(
      params.cnic ||
        params.matchedUser?.cnic ||
        params.matchedClientUser?.cnic ||
        params.matchedSub?.cnic ||
        params.matchedUac?.cnic ||
        ''
    )
  );

  if (
    isOwnerIdentity({
      email,
      phone: phoneDigits,
      cnic: cnicDigits,
      masterCfg: effectiveCfg,
    })
  ) {
    return 'OWNER';
  }

  const rows = [
    params.matchedUser,
    params.matchedClientUser,
    params.matchedSub,
    params.matchedUac,
  ].filter(Boolean);

  for (const r of rows) {
    const roleVal = String(
      r.role || r.user_role || r.account_role || r.admin_role || r.accountType || ''
    )
      .trim()
      .toUpperCase();
    if (r.is_owner || r.isOwner || ['OWNER', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(roleVal)) {
      return 'OWNER';
    }
  }

  for (const r of rows) {
    const roleVal = String(
      r.role || r.user_role || r.account_role || r.admin_role || r.accountType || ''
    )
      .trim()
      .toUpperCase();
    if (
      r.is_admin ||
      r.isAdmin ||
      r.is_sub_admin ||
      r.isSubAdmin ||
      ['ADMIN', 'SUB_ADMIN', 'SUBADMIN', 'MODERATOR', 'STAFF', 'MANAGER'].includes(roleVal)
    ) {
      return 'ADMIN';
    }
  }

  const subAdminSources = [
    effectiveCfg?.subAdmins,
    effectiveCfg?.sub_admins,
    effectiveCfg?.admins,
    effectiveCfg?.adminUsers,
    effectiveCfg?.adminAccounts,
    effectiveCfg?.staff,
    effectiveCfg?.security?.admins,
    effectiveCfg?.security?.subAdmins,
  ];
  for (const src of subAdminSources) {
    if (!src) continue;
    const list = Array.isArray(src) ? src : typeof src === 'object' ? Object.values(src) : [];
    for (const item of list) {
      if (typeof item === 'string') {
        const s = item.trim().toLowerCase();
        if (s && email && s === email) return 'ADMIN';
        const p = normalizePhoneDigits(s);
        if (p.length >= 10 && phoneDigits && p === phoneDigits) return 'ADMIN';
        const c = normalizeCnicDigits(s);
        if (c.length >= 13 && cnicDigits && c === cnicDigits) return 'ADMIN';
      } else if (item && typeof item === 'object') {
        if (item.isActive === false || item.is_active === false || item.disabled === true) continue;
        const itemEmail = String(item.email || '').trim().toLowerCase();
        const itemPhone = normalizePhoneDigits(String(item.phone || ''));
        const itemCnic = normalizeCnicDigits(String(item.cnic || ''));
        if (
          (email && itemEmail && itemEmail === email) ||
          (phoneDigits.length >= 10 && itemPhone && itemPhone === phoneDigits) ||
          (cnicDigits.length >= 13 && itemCnic && itemCnic === cnicDigits)
        ) {
          return 'ADMIN';
        }
      }
    }
  }

  return 'CLIENT';
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
  matchedClientUser: any | null;
  matchedSub: any | null;
  matchedUac: any | null;
  matchedFields: string[];
  existingDeviceId: string;
  allowMultiAccount: boolean;
}

/**
 * Lightweight duplicate-check query fetching ONLY tiny identity/lock columns (no heavy base64 photos).
 * Falls back gracefully if a table lacks optional columns.
 */
export async function fetchDuplicateCheckRows(
  table: 'users' | 'client_users' | 'subscriptions',
  timeoutMs = 7000
): Promise<{ ok: boolean; rows: any[]; error?: string }> {
  const queries = [
    'select=id,email,phone,cnic,device_id,allow_multi_account,allow_multiple_accounts&limit=500',
    'select=id,email,phone,cnic,device_id,allow_multi_account&limit=500',
    'select=email,phone,cnic,device_id&limit=500',
  ];
  let lastRes: any = null;
  for (const q of queries) {
    const res = await callSupabaseProxy({
      table,
      method: 'GET',
      query: q,
      timeoutMs,
    });
    lastRes = res;
    if (res.ok && Array.isArray(res.data)) {
      return { ok: true, rows: res.data };
    }
    if (res.status !== 400) {
      break;
    }
  }
  return { ok: false, rows: [], error: lastRes?.error };
}

/**
 * Strict Anti-Fake ID & Duplicate Account Check across users, client_users, subscriptions & userAccessControl:
 * Matches CNIC, Email, Phone Number, Device ID, Public IP Address, or MAC/Device Fingerprint.
 */
export function findExistingAccountComboMatch(params: {
  email?: string;
  phone?: string;
  cnic?: string;
  deviceId?: string;
  ipAddress?: string;
  macAddress?: string;
  usersList: any[];
  clientUsersList?: any[];
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
  const matchedRows: any[] = [];
  let matchedUser: any | null = null;
  let matchedClientUser: any | null = null;
  let matchedSub: any | null = null;
  let matchedUac: any | null = null;

  for (const u of params.usersList || []) {
    const reasons = getRowMatchReasons(u);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      matchedRows.push(u);
      if (!matchedUser) matchedUser = u;
    }
  }

  for (const cu of params.clientUsersList || []) {
    const reasons = getRowMatchReasons(cu);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      matchedRows.push(cu);
      if (!matchedClientUser) matchedClientUser = cu;
    }
  }

  for (const s of params.subsList || []) {
    const reasons = getRowMatchReasons(s);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      matchedRows.push(s);
      if (!matchedSub) matchedSub = s;
    }
  }

  for (const a of params.uacList || []) {
    const reasons = getRowMatchReasons(a);
    if (reasons.length > 0) {
      reasons.forEach((x) => matchedReasons.add(x));
      matchedRows.push(a);
      if (!matchedUac) matchedUac = a;
    }
  }

  // Link companion user/client_user/sub row by existing matched record's identity or device_id
  const anchorDev = String(
    matchedUser?.device_id ||
      matchedClientUser?.device_id ||
      matchedSub?.device_id ||
      matchedUac?.device_id ||
      ''
  ).trim();
  if (!matchedSub && anchorDev && !anchorDev.startsWith('RESET_')) {
    matchedSub =
      (params.subsList || []).find((s) => String(s?.device_id || '').trim() === anchorDev) || null;
  }
  if (!matchedUser && anchorDev && !anchorDev.startsWith('RESET_')) {
    matchedUser =
      (params.usersList || []).find((u) => String(u?.device_id || '').trim() === anchorDev) || null;
  }
  if (!matchedClientUser && anchorDev && !anchorDev.startsWith('RESET_')) {
    matchedClientUser =
      (params.clientUsersList || []).find((u) => String(u?.device_id || '').trim() === anchorDev) ||
      null;
  }

  const existingDeviceId = String(
    matchedUser?.device_id ||
      matchedClientUser?.device_id ||
      matchedSub?.device_id ||
      matchedUac?.device_id ||
      matchedUac?.deviceId ||
      ''
  ).trim();

  const allowMultiAccount = Boolean(
    matchedRows.length > 0 &&
      matchedRows.some(
        (r) =>
          r?.allow_multi_account === true ||
          r?.allow_multiple_accounts === true ||
          r?.allowMultiAccount === true ||
          String(r?.allow_multi_account || '').toLowerCase() === 'true' ||
          String(r?.allow_multiple_accounts || '').toLowerCase() === 'true'
      )
  );

  return {
    matchedUser,
    matchedClientUser,
    matchedSub,
    matchedUac,
    matchedFields: Array.from(matchedReasons),
    existingDeviceId,
    allowMultiAccount,
  };
}

export interface EvaluatedCloudAccess {
  status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
  tier: string;
  userRole: BossUserRole;
  expiresAt: number | null;
  serverNowMs: number;
  reason: string;
  isExpired: boolean;
  forceResetLogout: boolean;
  forceLogoutReason: string;
  sessionConflict: boolean;
  cloudDeviceId: string;
  matchedUser: any | null;
  matchedClientUser: any | null;
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
    const em = String(r.email || '').trim().toLowerCase();
    if (targetEmail && em && em === targetEmail) return true;
    const p = normalizePhoneDigits(r.phone || '');
    if (targetPhoneDigits && p && p === targetPhoneDigits) return true;
    const c = normalizeCnicDigits(r.cnic || '');
    if (targetCnicDigits && c && c === targetCnicDigits) return true;
    const dev = String(r.device_id || r.deviceId || '').trim();
    if (dev && clientDeviceId && dev === clientDeviceId) return true;
    return false;
  };

  const findBestMatchedRecord = (list: any[]) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    if (targetEmail) {
      const byEmail = list.find(
        (r) => r && String(r.email || '').trim().toLowerCase() === targetEmail
      );
      if (byEmail) return byEmail;
    }
    if (targetPhoneDigits) {
      const byPhone = list.find(
        (r) => r && normalizePhoneDigits(r.phone || '') === targetPhoneDigits
      );
      if (byPhone) return byPhone;
    }
    if (targetCnicDigits) {
      const byCnic = list.find(
        (r) => r && normalizeCnicDigits(r.cnic || '') === targetCnicDigits
      );
      if (byCnic) return byCnic;
    }
    if (clientDeviceId) {
      const byDev = list.find(
        (r) => r && String(r.device_id || r.deviceId || '').trim() === clientDeviceId
      );
      if (byDev) return byDev;
    }
    return null;
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

  const matchedUser = findBestMatchedRecord(usersList);
  const matchedClientUser = findBestMatchedRecord(clientUsersList);
  const effectiveUser = matchedUser || matchedClientUser;
  const matchedSub = findBestMatchedRecord(subsList);
  const uacList = Array.isArray(masterCfg?.userAccessControl)
    ? masterCfg.userAccessControl
    : Object.values(masterCfg?.userAccessControl || {});
  const matchedUac: any = findBestMatchedRecord(uacList);

  const deviceCandidates = [
    matchedUser?.device_id,
    matchedClientUser?.device_id,
    matchedSub?.device_id,
    matchedUac?.device_id,
    matchedUac?.deviceId,
  ]
    .map((d) => String(d || '').trim())
    .filter(Boolean);

  const resetDeviceId = deviceCandidates.find((d) => d.startsWith('RESET_')) || '';
  const cloudDeviceId = resetDeviceId || deviceCandidates[0] || '';

  // Single-Device Active Session Check (active_session_token)
  const cloudSessionToken = String(
    matchedUser?.active_session_token || matchedClientUser?.active_session_token || ''
  ).trim();
  const localSessionToken = String(
    session?.activeSessionToken || loadActiveSessionToken() || ''
  ).trim();
  const sessionConflict = Boolean(
    session &&
      cloudSessionToken &&
      cloudSessionToken !== localSessionToken
  );

  // Check if Admin triggered RESET_ OR force_logout_at is newer than session.loggedInAt
  const forceLogoutTs = Math.max(
    parseTimestampMs(matchedUser?.force_logout_at),
    parseTimestampMs(matchedClientUser?.force_logout_at),
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
    [matchedUser, matchedClientUser, matchedSub, matchedUac].find(isRowBlocked) ||
    usersList.find((r) => matchesHardwareOrNetwork(r) && isRowBlocked(r)) ||
    clientUsersList.find((r) => matchesHardwareOrNetwork(r) && isRowBlocked(r)) ||
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

  const userRole = resolveUserRole({
    email:
      targetEmail ||
      matchedUser?.email ||
      matchedClientUser?.email ||
      matchedSub?.email ||
      matchedUac?.email,
    phone:
      targetPhoneDigits ||
      matchedUser?.phone ||
      matchedClientUser?.phone ||
      matchedSub?.phone ||
      matchedUac?.phone,
    cnic:
      targetCnicDigits ||
      matchedUser?.cnic ||
      matchedClientUser?.cnic ||
      matchedSub?.cnic ||
      matchedUac?.cnic,
    matchedUser,
    matchedClientUser,
    matchedSub,
    matchedUac,
    masterCfg,
  });

  const isOwnerUser = userRole === 'OWNER';

  const isLifetimeFlag = Boolean(
    isOwnerUser ||
      effectiveUser?.is_lifetime ||
      matchedClientUser?.is_lifetime ||
      matchedSub?.is_lifetime ||
      matchedUac?.is_lifetime ||
      matchedUac?.isLifetimeFree ||
      String(effectiveUser?.subscription_tier || '').toUpperCase() === 'LIFETIME_VIP' ||
      String(matchedClientUser?.subscription_tier || '').toUpperCase() === 'LIFETIME_VIP' ||
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
      matchedClientUser?.activated_until_ms,
      matchedClientUser?.activated_until,
      matchedClientUser?.subscription_expiry,
      matchedClientUser?.trial_end,
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
      matchedClientUser?.trial_start,
      matchedClientUser?.trial_start_time,
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
      matchedClientUser?.is_activated ||
      String(effectiveUser?.account_status || '').toUpperCase() === 'ACTIVE' ||
      String(effectiveUser?.account_status || '').toUpperCase() === 'APPROVED' ||
      String(effectiveUser?.status || '').toUpperCase() === 'ACTIVE' ||
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
      effectiveUser?.block_reason ||
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
        effectiveUser?.subscription_tier ||
        effectiveUser?.package_name ||
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
    userRole,
    expiresAt,
    serverNowMs: effectiveServerNowMs,
    reason,
    isExpired,
    forceResetLogout: isOwnerUser ? false : forceResetLogout,
    forceLogoutReason: isOwnerUser ? '' : forceLogoutReason,
    sessionConflict,
    cloudDeviceId,
    matchedUser: effectiveUser,
    matchedClientUser,
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
  city?: string;
  address?: string;
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

async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<{ city: string; address: string }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3200);
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        latitude
      )}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const d = await resp.json().catch(() => null);
      if (d && typeof d === 'object') {
        const city = String(d.city || d.locality || d.principalSubdivision || '').trim();
        const parts = [
          d.locality || d.city,
          d.principalSubdivision,
          d.countryName,
        ]
          .map((x) => String(x || '').trim())
          .filter(Boolean);
        const uniqueParts = Array.from(new Set(parts));
        const address = uniqueParts.join(', ');
        return { city, address };
      }
    }
  } catch {
    // non-fatal offline/timeout fallback
  }
  return { city: '', address: '' };
}

export async function syncGpsToSupabaseUser(
  deviceId: string,
  gps: StoredGpsLocation,
  identifiers?: { email?: string; phone?: string }
): Promise<void> {
  if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) return;
  const payload = {
    latitude: gps.latitude,
    longitude: gps.longitude,
    location_url: gps.locationUrl,
    ...(gps.city ? { gps_city: gps.city } : {}),
    ...(gps.address ? { gps_address: gps.address } : {}),
    last_cloud_sync: Date.now(),
  };

  const cleanDev = String(deviceId || '').trim();
  if (cleanDev && !cleanDev.startsWith('RESET_')) {
    await Promise.allSettled([
      callSupabaseProxy({
        table: 'users',
        method: 'PATCH',
        query: `device_id=eq.${encodeURIComponent(cleanDev)}`,
        payload,
        timeoutMs: 6000,
      }),
      callSupabaseProxy({
        table: 'client_users',
        method: 'PATCH',
        query: `device_id=eq.${encodeURIComponent(cleanDev)}`,
        payload,
        timeoutMs: 6000,
      }),
      callSupabaseProxy({
        table: 'subscriptions',
        method: 'PATCH',
        query: `device_id=eq.${encodeURIComponent(cleanDev)}`,
        payload,
        timeoutMs: 6000,
      }),
    ]);
    return;
  }

  const cleanEmail = String(identifiers?.email || '').trim().toLowerCase();
  if (cleanEmail) {
    await Promise.allSettled([
      callSupabaseProxy({
        table: 'users',
        method: 'PATCH',
        query: `email=eq.${encodeURIComponent(cleanEmail)}`,
        payload,
        timeoutMs: 6000,
      }),
      callSupabaseProxy({
        table: 'client_users',
        method: 'PATCH',
        query: `email=eq.${encodeURIComponent(cleanEmail)}`,
        payload,
        timeoutMs: 6000,
      }),
    ]);
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

function scheduleBackgroundHighAccuracyRefinement(
  deviceId?: string,
  identifiers?: { email?: string; phone?: string }
) {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
  try {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Number(pos.coords.latitude.toFixed(6));
        const longitude = Number(pos.coords.longitude.toFixed(6));
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const geo = await reverseGeocodeCoords(latitude, longitude);
        const refined: StoredGpsLocation = {
          latitude,
          longitude,
          locationUrl,
          ...(geo.city ? { city: geo.city } : {}),
          ...(geo.address ? { address: geo.address } : {}),
          updatedAt: Date.now(),
        };
        saveStoredGpsLocation(refined);
        await syncGpsToSupabaseUser(deviceId || '', refined, identifiers);
      },
      () => {
        // silent background refinement failure is non-fatal
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  } catch {
    // ignore background error
  }
}

export function requestMandatoryGpsLocation(deviceId?: string): Promise<MandatoryGpsResult> {
  return new Promise((resolve) => {
    const cached = loadStoredGpsLocation();
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve({
        ok: true,
        gps: cached || null,
        errorReason: '',
        message: cached ? 'GPS Location Ready' : 'Proceeding without GPS lock',
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
              ok: true,
              gps: cached || null,
              errorReason: '',
              message: 'Proceeding without GPS lock',
            });
            return;
          }
          const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
          const geo = await reverseGeocodeCoords(latitude, longitude);
          const gps: StoredGpsLocation = {
            latitude,
            longitude,
            locationUrl,
            ...(geo.city ? { city: geo.city } : {}),
            ...(geo.address ? { address: geo.address } : {}),
            updatedAt: Date.now(),
          };
          saveStoredGpsLocation(gps);
          if (deviceId) {
            await syncGpsToSupabaseUser(deviceId, gps);
          }
          scheduleBackgroundHighAccuracyRefinement(deviceId);
          const locLabel = geo.address || geo.city || `${latitude}, ${longitude}`;
          resolve({
            ok: true,
            gps,
            errorReason: '',
            message: `GPS Location Verified (${locLabel})`,
          });
        },
        () => {
          const fallbackGps = loadStoredGpsLocation();
          resolve({
            ok: true,
            gps: fallbackGps || null,
            errorReason: '',
            message: fallbackGps
              ? `GPS Location Ready (${fallbackGps.address || fallbackGps.city || 'Saved'})`
              : 'Proceeding without GPS lock',
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        }
      );
    } catch {
      resolve({
        ok: true,
        gps: cached || null,
        errorReason: '',
        message: 'Proceeding without GPS lock',
      });
    }
  });
}

export function requestAndSaveGpsLocation(
  deviceId?: string,
  identifiers?: { email?: string; phone?: string }
): Promise<StoredGpsLocation | null> {
  return new Promise((resolve) => {
    const cached = loadStoredGpsLocation();
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve(cached);
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = Number(pos.coords.latitude.toFixed(6));
          const longitude = Number(pos.coords.longitude.toFixed(6));
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            resolve(loadStoredGpsLocation());
            return;
          }
          const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
          const geo = await reverseGeocodeCoords(latitude, longitude);
          const gps: StoredGpsLocation = {
            latitude,
            longitude,
            locationUrl,
            ...(geo.city ? { city: geo.city } : {}),
            ...(geo.address ? { address: geo.address } : {}),
            updatedAt: Date.now(),
          };
          saveStoredGpsLocation(gps);
          await syncGpsToSupabaseUser(deviceId || '', gps, identifiers);
          scheduleBackgroundHighAccuracyRefinement(deviceId, identifiers);
          resolve(gps);
        },
        () => {
          resolve(loadStoredGpsLocation());
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        }
      );
    } catch {
      resolve(cached);
    }
  });
}

// ============================================================================
// BIOMETRIC / FINGERPRINT BINDING & STRICT WEBAUTHN PASSKEY HELPERS
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
}): Promise<{ ok: boolean; credentialId?: string; mode: 'WEBAUTHN'; error?: string }> {
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
            userVerification: 'required',
          },
          timeout: 60000,
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
    return { ok: false, mode: 'WEBAUTHN', error: 'Biometric passkey could not be created.' };
  } catch (err: any) {
    return {
      ok: false,
      mode: 'WEBAUTHN',
      error: err?.message || 'Biometric enrollment failed.',
    };
  }
}

export async function verifyBiometricPasskey(
  credentialId?: string
): Promise<{ ok: boolean; cancelled?: boolean; mode: 'WEBAUTHN'; error?: string }> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !navigator.credentials?.get ||
    !window.isSecureContext
  ) {
    return {
      ok: false,
      mode: 'WEBAUTHN',
      error: 'Is device/browser par Biometric (Fingerprint/FaceID) available nahi hai. Password ya Google se Login karein.',
    };
  }

  if (!credentialId) {
    return {
      ok: false,
      mode: 'WEBAUTHN',
      error: 'Biometric passkey registered nahi hai. Pehle Password ya Google se Login karein.',
    };
  }

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
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (assertion) {
      return { ok: true, mode: 'WEBAUTHN' };
    }
    return {
      ok: false,
      mode: 'WEBAUTHN',
      error: 'Fingerprint / FaceID verify nahi ho saka.',
    };
  } catch (err: any) {
    const cancelled = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
    return {
      ok: false,
      cancelled,
      mode: 'WEBAUTHN',
      error: cancelled
        ? 'Fingerprint / Biometric verification cancel ho gayi ya device verify nahi hui.'
        : err?.message || 'Biometric sensor verify nahi ho saka. Password ya Google se Login karein.',
    };
  }
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

    const isOwner = isOwnerIdentity({
      email: params.session?.email,
      phone: params.session?.phone,
      cnic: params.session?.cnic,
    });

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
      ...(isOwner
        ? {
            is_activated: true,
            is_lifetime: true,
            is_blocked: false,
            block_reason: '',
            account_status: 'ACTIVE',
            status: 'ACTIVE',
            subscription_tier: 'LIFETIME_VIP',
            package_name: 'Lifetime Free VIP Package',
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

/**
 * Build a scoped PostgREST query for ONLY the current logged-in user (prevents full-table 250/400-row downloads).
 */
export function buildScopedUserQuery(params: {
  deviceId?: string;
  email?: string;
  phone?: string;
  cnic?: string;
  select?: string;
  limit?: number;
}): string | null {
  const filters: string[] = [];
  const dev = String(params.deviceId || '').trim();
  if (dev && dev !== 'DEV-CLIENT-DEFAULT' && !dev.startsWith('RESET_')) {
    filters.push(`device_id.eq.${encodeURIComponent(dev)}`);
  }
  const email = String(params.email || '').trim().toLowerCase();
  if (email && email.includes('@')) {
    filters.push(`email.ilike.${encodeURIComponent(email)}`);
  }
  const rawPhone = String(params.phone || '').trim();
  const phoneDigits = normalizePhoneDigits(rawPhone);
  if (rawPhone) {
    filters.push(`phone.eq.${encodeURIComponent(rawPhone)}`);
  }
  if (phoneDigits.length >= 10) {
    filters.push(`phone.eq.${encodeURIComponent(`0${phoneDigits}`)}`);
    filters.push(`phone.eq.${encodeURIComponent(`+92${phoneDigits}`)}`);
    filters.push(`phone.eq.${encodeURIComponent(phoneDigits)}`);
  }
  const rawCnic = String(params.cnic || '').trim();
  const cnicDigits = normalizeCnicDigits(rawCnic);
  if (rawCnic) {
    filters.push(`cnic.eq.${encodeURIComponent(rawCnic)}`);
  }
  if (cnicDigits.length === 13) {
    const formattedCnic = formatPakCnic(cnicDigits);
    if (formattedCnic !== rawCnic) {
      filters.push(`cnic.eq.${encodeURIComponent(formattedCnic)}`);
    }
    if (cnicDigits !== rawCnic) {
      filters.push(`cnic.eq.${encodeURIComponent(cnicDigits)}`);
    }
  }
  const uniqueFilters = Array.from(new Set(filters));
  if (uniqueFilters.length === 0) return null;
  const selectPart = params.select ? `select=${params.select}` : 'select=*';
  const limitPart = `limit=${params.limit ?? 5}`;
  return `or=(${uniqueFilters.join(',')})&${selectPart}&${limitPart}`;
}

/**
 * Targeted PostgREST query specifically for 'subscriptions' using ONLY device_id.eq and phone.eq
 * (avoids unquoted phone.ilike.* wildcards and unsupported columns that cause 400 Bad Request).
 */
export function buildScopedSubscriptionQuery(params: {
  deviceId?: string;
  phone?: string;
  select?: string;
  limit?: number;
}): string | null {
  const filters: string[] = [];
  const dev = String(params.deviceId || '').trim();
  if (dev && dev !== 'DEV-CLIENT-DEFAULT' && !dev.startsWith('RESET_')) {
    filters.push(`device_id.eq.${encodeURIComponent(dev)}`);
  }
  const rawPhone = String(params.phone || '').trim();
  const phoneDigits = normalizePhoneDigits(rawPhone);
  if (rawPhone) {
    filters.push(`phone.eq.${encodeURIComponent(rawPhone)}`);
  }
  if (phoneDigits.length >= 10) {
    filters.push(`phone.eq.${encodeURIComponent(`0${phoneDigits}`)}`);
    filters.push(`phone.eq.${encodeURIComponent(`+92${phoneDigits}`)}`);
  }
  const uniqueFilters = Array.from(new Set(filters));
  if (uniqueFilters.length === 0) return null;
  const selectPart = params.select ? `select=${params.select}` : 'select=*';
  const limitPart = `limit=${params.limit ?? 5}`;
  return `or=(${uniqueFilters.join(',')})&${selectPart}&${limitPart}`;
}

/**
 * Save a package purchase / payment TID directly to Supabase 'subscriptions' table.
 * Checks by device_id or phone first (using exact .eq filters only) and uses PATCH if a row exists, otherwise POSTs a new row (avoids 409 Conflict & 400 errors).
 */
export async function upsertClientSubscriptionOrder(params: {
  deviceId: string;
  userName: string;
  phone: string;
  email: string;
  cnic: string;
  packageName: string;
  subscriptionTier: string;
  amount: number;
  paymentMethod: string;
  lastPaymentTid: string;
  receiptUrl?: string;
  receiptBase64?: string;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const cleanDev = String(params.deviceId || '').trim();
  const cleanPhone = String(params.phone || '').trim();
  const phoneDigits = normalizePhoneDigits(cleanPhone);

  const lookupFilters: string[] = [];
  if (cleanDev) {
    lookupFilters.push(`device_id.eq.${encodeURIComponent(cleanDev)}`);
  }
  if (cleanPhone) {
    lookupFilters.push(`phone.eq.${encodeURIComponent(cleanPhone)}`);
  }
  if (phoneDigits.length >= 10) {
    lookupFilters.push(`phone.eq.${encodeURIComponent(`0${phoneDigits}`)}`);
  }

  let existingRow: any = null;
  let schemaSampleRow: any = null;
  if (lookupFilters.length > 0) {
    const orFilter = `or=(${Array.from(new Set(lookupFilters)).join(',')})`;
    const lookupRes = await callSupabaseProxy({
      table: 'subscriptions',
      method: 'GET',
      query: `${orFilter}&select=*&limit=5`,
      timeoutMs: 8000,
    });
    if (lookupRes.ok && Array.isArray(lookupRes.data) && lookupRes.data.length > 0) {
      schemaSampleRow = lookupRes.data[0];
      existingRow =
        lookupRes.data.find((r: any) => String(r?.device_id || '').trim() === cleanDev) ||
        lookupRes.data[0];
    }
  }

  if (!schemaSampleRow && params.receiptBase64) {
    const probeRes = await callSupabaseProxy({
      table: 'subscriptions',
      method: 'GET',
      query: 'select=*&limit=1',
      timeoutMs: 6000,
    });
    if (probeRes.ok && Array.isArray(probeRes.data) && probeRes.data.length > 0) {
      schemaSampleRow = probeRes.data[0];
    }
  }

  const supportsReceiptBase64 = Boolean(
    schemaSampleRow && Object.prototype.hasOwnProperty.call(schemaSampleRow, 'receipt_base64')
  );
  const resolvedReceiptUrl = params.receiptUrl || params.receiptBase64 || '';

  const basePayload: Record<string, any> = {
    device_id: cleanDev,
    user_name: params.userName || 'Client',
    phone: cleanPhone,
    email: params.email || '',
    cnic: params.cnic || '',
    package_name: params.packageName,
    subscription_tier: params.subscriptionTier || 'MONTHLY',
    amount: params.amount,
    payment_method: params.paymentMethod,
    last_payment_tid: params.lastPaymentTid,
    ...(resolvedReceiptUrl ? { receipt_url: resolvedReceiptUrl } : {}),
    ...(supportsReceiptBase64 && params.receiptBase64 ? { receipt_base64: params.receiptBase64 } : {}),
    status: 'PENDING',
    last_updated: now,
    updated_at: nowIso,
  };

  let subWriteRes: { ok: boolean; error?: string; status?: number };
  if (existingRow) {
    const patchQuery = existingRow.id
      ? `id=eq.${encodeURIComponent(String(existingRow.id))}`
      : existingRow.device_id
      ? `device_id=eq.${encodeURIComponent(String(existingRow.device_id))}`
      : `phone=eq.${encodeURIComponent(String(existingRow.phone))}`;

    subWriteRes = await callSupabaseProxy({
      table: 'subscriptions',
      method: 'PATCH',
      query: patchQuery,
      upsert: false,
      payload: basePayload,
      timeoutMs: 12000,
    });
  } else {
    subWriteRes = await callSupabaseProxy({
      table: 'subscriptions',
      method: 'POST',
      upsert: false,
      payload: {
        ...basePayload,
        created_at: nowIso,
      },
      timeoutMs: 12000,
    });
  }

  if (cleanDev && !cleanDev.startsWith('RESET_')) {
    await callSupabaseProxy({
      table: 'users',
      method: 'PATCH',
      query: `device_id=eq.${encodeURIComponent(cleanDev)}`,
      payload: {
        last_payment_tid: params.lastPaymentTid,
        package_name: params.packageName,
        last_cloud_sync: now,
      },
      timeoutMs: 8000,
    }).catch(() => {});
  }

  return subWriteRes;
}

/**
 * Sync password hashes / plain credentials & OTP fields across users, client_users, and subscriptions
 * so Admin Panel always sees up-to-date customer password & OTP status.
 */
export async function syncUserPasswordAndOtpToCloud(params: {
  deviceId?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  plainPassword?: string;
  otpCode?: string;
  emailOtp?: string;
  smsOtp?: string;
}): Promise<void> {
  const payload: Record<string, any> = {
    last_cloud_sync: Date.now(),
  };
  if (params.passwordHash) {
    payload.password_hash = params.passwordHash;
  }
  if (params.plainPassword) {
    payload.password = params.plainPassword;
    payload.plain_password = params.plainPassword;
  }
  if (params.otpCode) {
    payload.otp_code = params.otpCode;
    payload.active_session_token = params.otpCode;
  }
  if (params.emailOtp) {
    payload.email_otp = params.emailOtp;
  }
  if (params.smsOtp) {
    payload.sms_otp = params.smsOtp;
  }

  if (Object.keys(payload).length <= 1) return;

  const queries: string[] = [];
  const cleanDev = String(params.deviceId || '').trim();
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const cleanPhone = String(params.phone || '').trim();
  if (cleanDev && !cleanDev.startsWith('RESET_')) {
    queries.push(`device_id=eq.${encodeURIComponent(cleanDev)}`);
  }
  if (cleanEmail) {
    queries.push(`email=eq.${encodeURIComponent(cleanEmail)}`);
  }
  if (cleanPhone && cleanPhone.length >= 7) {
    queries.push(`phone=eq.${encodeURIComponent(cleanPhone)}`);
  }

  if (queries.length === 0) return;
  const primaryQuery = queries[0];

  await Promise.allSettled([
    callSupabaseProxy({
      table: 'users',
      method: 'PATCH',
      query: primaryQuery,
      payload,
      timeoutMs: 7000,
    }),
    callSupabaseProxy({
      table: 'client_users',
      method: 'PATCH',
      query: primaryQuery,
      payload,
      timeoutMs: 7000,
    }),
    callSupabaseProxy({
      table: 'subscriptions',
      method: 'PATCH',
      query: primaryQuery,
      payload,
      timeoutMs: 7000,
    }),
  ]);
}

/**
 * Permanently delete client account rows from Supabase ('users', 'client_users', 'subscriptions'),
 * sign out Supabase Auth, and wipe local session/biometric/auth storage.
 */
export async function deleteClientAccountInSupabase(params: {
  deviceId: string;
  email?: string;
  phone?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cleanDev = String(params.deviceId || '').trim();
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const cleanPhone = String(params.phone || '').trim();

  const filters: string[] = [];
  if (cleanDev && !cleanDev.startsWith('RESET_')) {
    filters.push(`device_id=eq.${encodeURIComponent(cleanDev)}`);
  }
  if (cleanEmail) {
    filters.push(`email=eq.${encodeURIComponent(cleanEmail)}`);
  }
  if (cleanPhone) {
    filters.push(`phone=eq.${encodeURIComponent(cleanPhone)}`);
  }

  if (filters.length === 0) {
    return { ok: false, error: 'Account identifier missing for deletion.' };
  }

  try {
    const tables = ['users', 'client_users', 'subscriptions'];
    const ops: Promise<any>[] = [];
    for (const table of tables) {
      for (const q of filters) {
        ops.push(
          callSupabaseProxy({
            table,
            method: 'DELETE',
            query: q,
            timeoutMs: 8000,
          }).catch(() => null)
        );
      }
    }
    await Promise.allSettled(ops);

    try {
      await supabase.auth.signOut();
    } catch {
      // ignore auth signout failure
    }

    if (typeof window !== 'undefined') {
      try {
        clearBiometricBinding();
        clearAuthSession();
        localStorage.removeItem(CLIENT_GPS_STORAGE_KEY);
        localStorage.removeItem('boss_client_auth_session_v1');
        localStorage.removeItem('boss_client_device_id_v1');
      } catch {
        // ignore storage errors
      }
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Account delete karte waqt error aaya.' };
  }
}


