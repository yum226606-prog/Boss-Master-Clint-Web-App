import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserPlus,
} from 'lucide-react';
import bossLionLogoImg from '../assets/images/boss_lion_logo_1791741005749.jpg';
import {
  callSupabaseProxy,
  fetchSupabaseServerTimeMs,
  getEffectiveServerNowMs,
  supabase,
  uploadImageToUserUploadsBucket,
} from '../utils/supabaseClientConfig';
import {
  BiometricBinding,
  BossUserRole,
  ClientAuthSession,
  compressImageToDataUrl,
  enrollBiometricPasskey,
  evaluateClientAccessState,
  extractAuthCallbackFromUrl,
  fetchDuplicateCheckRows,
  fetchMasterEngineConfigFromSupabase,
  findExistingAccountComboMatch,
  formatPakCnic,
  formatPakPhone,
  generateActiveSessionToken,
  generateSafeUUID,
  getClientPublicIpAddress,
  getDeviceModelName,
  getOrCreateClientDeviceId,
  getOrCreateDeviceMacFingerprint,
  hashPasswordSha256,
  isOwnerIdentity,
  loadBiometricBinding,
  loadCachedMasterEngineConfig,
  loadStoredGpsLocation,
  normalizeCnicDigits,
  normalizePhoneDigits,
  parseTimestampMs,
  requestMandatoryGpsLocation,
  resolveUserRole,
  saveActiveSessionToken,
  saveAuthSession,
  saveBiometricBinding,
  sendSupabaseEmailOtp,
  StoredGpsLocation,
  syncGpsToSupabaseUser,
  TWO_DAYS_MS,
  verifyBiometricPasskey,
  verifySupabaseEmailOtp,
} from '../utils/adminApiConfig';

function validateCnicPhotoFile(file: File): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const failMsg = 'Please upload a valid, non-blank CNIC photo (min 200x200px).';
    const isImageMime =
      !file.type || file.type.toLowerCase().startsWith('image/');
    if (!isImageMime || file.size < 1024) {
      resolve({ ok: false, error: failMsg });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve({ ok: false, error: failMsg });
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        resolve({ ok: false, error: failMsg });
        return;
      }
      const img = new Image();
      img.onerror = () => resolve({ ok: false, error: failMsg });
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          if (w < 200 || h < 200) {
            resolve({
              ok: false,
              error: 'Photo bohot chhoti hai (< 200px). Baraye meharbani wazeh CNIC photo select karein.',
            });
            return;
          }
          // Flexible check: allow zoomed-out CNIC, tilted angles, hands/table in frame; only reject completely blank/solid images
          const sampleW = 64;
          const sampleH = 64;
          const canvas = document.createElement('canvas');
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ ok: true });
            return;
          }
          ctx.drawImage(img, 0, 0, sampleW, sampleH);
          const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
          const count = sampleW * sampleH;
          const lum = new Float32Array(count);
          let sum = 0;
          let minL = 255;
          let maxL = 0;
          for (let i = 0; i < count; i++) {
            const idx = i * 4;
            const y =
              0.299 * data[idx] +
              0.587 * data[idx + 1] +
              0.114 * data[idx + 2];
            lum[i] = y;
            sum += y;
            if (y < minL) minL = y;
            if (y > maxL) maxL = y;
          }
          const mean = sum / count;
          let sqDiff = 0;
          for (let i = 0; i < count; i++) {
            const d = lum[i] - mean;
            sqDiff += d * d;
          }
          const stddev = Math.sqrt(sqDiff / count);
          if (maxL - minL < 12 || stddev < 4) {
            resolve({
              ok: false,
              error: 'Yeh photo bilkul blank / khali lag rahi hai. Dobara CNIC photo upload karein.',
            });
            return;
          }
          resolve({ ok: true });
        } catch {
          resolve({ ok: false, error: failMsg });
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

const PENDING_REG_DRAFT_KEY = 'boss_pending_reg_draft_v1';

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

interface ClientAuthModalProps {
  clientDeviceId: string;
  onAuthenticated: (session: ClientAuthSession) => void;
  externalNotice?: string | null;
  mainLogoUrl?: string;
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
  clientDeviceId,
  onAuthenticated,
  externalNotice,
  mainLogoUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(externalNotice || null);
  const [showSwitchToRegisterHint, setShowSwitchToRegisterHint] = useState(false);
  const [showSwitchToLoginHint, setShowSwitchToLoginHint] = useState(false);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [biometricBinding, setBiometricBinding] = useState<BiometricBinding | null>(() =>
    loadBiometricBinding()
  );

  // Google OAuth State
  const [isGoogleAuthenticating, setIsGoogleAuthenticating] = useState(false);
  const processedGoogleUserIdRef = useRef<string | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any | null>(null);
  const [googleProfileStep, setGoogleProfileStep] = useState<{
    supaUser: any;
    email: string;
    name: string;
    activeDeviceId: string;
    macAddress: string;
    deviceModel: string;
    publicIp: string;
    masterCfg: Record<string, any>;
    gps: StoredGpsLocation | null;
    serverNowMs: number;
    existingMatch?: {
      matchedUser: any;
      matchedClientUser: any;
      matchedSub: any;
      matchedUac: any;
    } | null;
  } | null>(null);
  const [gpName, setGpName] = useState('');
  const [gpPhone, setGpPhone] = useState('');
  const [gpCompany, setGpCompany] = useState('');
  const [gpCnic, setGpCnic] = useState('');
  const [gpAddress, setGpAddress] = useState('');
  const [gpCnicFront, setGpCnicFront] = useState('');
  const [gpCnicBack, setGpCnicBack] = useState('');
  const [isCompressingGpPhoto, setIsCompressingGpPhoto] = useState<'FRONT' | 'BACK' | null>(null);
  const [isSavingGoogleProfile, setIsSavingGoogleProfile] = useState(false);

  // Mandatory GPS Location State for New Account Creation
  const [liveGps, setLiveGps] = useState<StoredGpsLocation | null>(() => loadStoredGpsLocation());
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'CHECKING' | 'READY' | 'ERROR'>(() =>
    loadStoredGpsLocation() ? 'READY' : 'IDLE'
  );
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string>('');

  // Create Account State
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCnic, setRegCnic] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordHash, setRegPasswordHash] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [cnicFrontPhoto, setCnicFrontPhoto] = useState('');
  const [cnicBackPhoto, setCnicBackPhoto] = useState('');
  const [selfiePhoto, setSelfiePhoto] = useState('');
  const [shopPhoto, setShopPhoto] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<
    'FRONT' | 'BACK' | 'SELFIE' | 'SHOP' | null
  >(null);

  // Email OTP Step State (NEVER render/display OTP code on screen)
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingAndCreating, setIsVerifyingAndCreating] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [resendCooldownSec, setResendCooldownSec] = useState<number>(0);

  const ensureMandatoryGpsForNewAccount = async (
    showErrorBanner = true
  ): Promise<StoredGpsLocation | null> => {
    setGpsStatus('CHECKING');
    const res = await requestMandatoryGpsLocation();
    if (res.ok && res.gps) {
      setLiveGps(res.gps);
      setGpsStatus('READY');
      setGpsStatusMsg(res.message);
      return res.gps;
    }
    setLiveGps(null);
    setGpsStatus('ERROR');
    setGpsStatusMsg(res.message);
    if (showErrorBanner) {
      setErrorMsg(res.message);
    }
    return null;
  };

  useEffect(() => {
    if (activeTab === 'REGISTER') {
      ensureMandatoryGpsForNewAccount(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (externalNotice) {
      setInfoMsg(externalNotice);
    }
  }, [externalNotice]);

  useEffect(() => {
    if (resendCooldownSec <= 0) return;
    const t = setInterval(() => {
      setResendCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldownSec]);

  // Prevent Escape key from dismissing startup auth modal
  useEffect(() => {
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockEscape, true);
    return () => window.removeEventListener('keydown', blockEscape, true);
  }, []);

  // Shared helper: Log user directly into an existing matched record (NO new account, NO new free trial, trial_used = true)
  const loginIntoMatchedExistingRecord = async (params: {
    matchedUser: any | null;
    matchedClientUser?: any | null;
    matchedSub: any | null;
    matchedUac: any | null;
    usersList: any[];
    clientUsersList?: any[];
    subsList: any[];
    masterCfg: Record<string, any>;
    publicIp: string;
    macAddress: string;
    deviceModel: string;
    gps: ReturnType<typeof loadStoredGpsLocation>;
    serverNowMs: number;
    fallbackName?: string;
    fallbackEmail?: string;
    fallbackPhone?: string;
    fallbackCnic?: string;
    fallbackAddress?: string;
  }): Promise<boolean> => {
    const {
      matchedUser,
      matchedClientUser = null,
      matchedSub,
      matchedUac,
      usersList,
      clientUsersList = [],
      subsList,
      masterCfg,
      publicIp,
      macAddress,
      deviceModel,
      gps,
      serverNowMs,
      fallbackName = 'Valued Client',
      fallbackEmail = '',
      fallbackPhone = '',
      fallbackCnic = '',
      fallbackAddress = '',
    } = params;

    const now = serverNowMs > 0 ? serverNowMs : getEffectiveServerNowMs() || Date.now();
    const nowIso = new Date(now).toISOString();
    const activeDeviceId = clientDeviceId || getOrCreateClientDeviceId();

    const resolvedEmail = String(
      matchedUser?.email ||
        matchedClientUser?.email ||
        matchedSub?.email ||
        matchedUac?.email ||
        fallbackEmail
    )
      .trim()
      .toLowerCase();
    const resolvedPhone = String(
      matchedUser?.phone ||
        matchedClientUser?.phone ||
        matchedSub?.phone ||
        matchedUac?.phone ||
        fallbackPhone
    ).trim();
    const resolvedCnic = String(
      matchedUser?.cnic ||
        matchedClientUser?.cnic ||
        matchedSub?.cnic ||
        matchedUac?.cnic ||
        fallbackCnic
    ).trim();
    const resolvedName = String(
      matchedUser?.name ||
        matchedClientUser?.name ||
        matchedSub?.user_name ||
        matchedUac?.name ||
        fallbackName
    ).trim();

    const resolvedRole: BossUserRole = resolveUserRole({
      email: resolvedEmail,
      phone: resolvedPhone,
      cnic: resolvedCnic,
      matchedUser,
      matchedClientUser,
      matchedSub,
      matchedUac,
      masterCfg,
    });
    const isOwner = resolvedRole === 'OWNER';

    const devCandidates = [
      matchedUser?.device_id,
      matchedClientUser?.device_id,
      matchedSub?.device_id,
      matchedUac?.device_id,
      matchedUac?.deviceId,
    ]
      .map((d) => String(d || '').trim())
      .filter(Boolean);
    const resetDevId = devCandidates.find((d) => d.startsWith('RESET_')) || '';
    const cloudDevId = resetDevId || devCandidates[0] || '';
    const effectiveDeviceId = isOwner
      ? cloudDevId && !cloudDevId.startsWith('RESET_')
        ? cloudDevId
        : activeDeviceId
      : resetDevId || !cloudDevId
      ? activeDeviceId
      : cloudDevId;

    const sessionToken = generateActiveSessionToken();

    const preEval = evaluateClientAccessState({
      session: {
        verified: true,
        deviceId: effectiveDeviceId,
        name: resolvedName,
        phone: resolvedPhone,
        email: resolvedEmail,
        cnic: resolvedCnic,
        shopAddress: String(
          matchedUser?.shop_address ||
            matchedClientUser?.shop_address ||
            matchedUac?.shop_address ||
            fallbackAddress
        ),
        loggedInAt: now,
        activeSessionToken: sessionToken,
        userRole: resolvedRole,
      },
      clientDeviceId: effectiveDeviceId,
      clientIpAddress: publicIp,
      clientMacAddress: macAddress,
      usersList,
      clientUsersList,
      subsList,
      masterCfg,
      serverNowMs: now,
    });

    if (!isOwner && preEval.status === 'BLOCKED') {
      await supabase.auth.signOut().catch(() => {});
      setErrorMsg(`Account Blocked: ${preEval.reason || 'Suspended by Master Admin'}`);
      setInfoMsg(null);
      return false;
    }

    const ownerVipFields = isOwner
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
      : {};

    const buildFilter = (row: any) =>
      row?.device_id
        ? `device_id=eq.${encodeURIComponent(String(row.device_id))}`
        : row?.email
        ? `email=ilike.${encodeURIComponent(String(row.email))}`
        : row?.phone
        ? `phone=eq.${encodeURIComponent(String(row.phone))}`
        : '';

    const userFilter = buildFilter(matchedUser);
    const clientUserFilter = buildFilter(matchedClientUser) || userFilter;
    const subFilter = buildFilter(matchedSub) || userFilter;

    // Mark trial_used = true, refresh telemetry & save active_session_token for single-device lock
    const telemetryPatch: Record<string, any> = {
      trial_used: true,
      is_registered: true,
      is_online: true,
      active_session_token: sessionToken,
      last_seen: nowIso,
      last_cloud_sync: now,
      mac_address: macAddress,
      device_model: deviceModel,
      fingerprint_enabled: true,
      ...ownerVipFields,
      ...(resetDevId ? { device_id: activeDeviceId, user_id: activeDeviceId } : {}),
      ...(publicIp ? { ip_address: publicIp } : {}),
      ...(gps
        ? { latitude: gps.latitude, longitude: gps.longitude, location_url: gps.locationUrl }
        : {}),
    };

    const subPatch: Record<string, any> = {
      trial_used: true,
      ...ownerVipFields,
      ...(resetDevId ? { device_id: activeDeviceId } : {}),
      updated_at: nowIso,
      last_updated: now,
    };

    saveActiveSessionToken(sessionToken);

    await Promise.all([
      userFilter
        ? callSupabaseProxy({
            table: 'users',
            method: 'PATCH',
            query: userFilter,
            payload: telemetryPatch,
            timeoutMs: 7000,
          })
        : Promise.resolve(null),
      clientUserFilter
        ? callSupabaseProxy({
            table: 'client_users',
            method: 'PATCH',
            query: clientUserFilter,
            payload: {
              active_session_token: sessionToken,
              is_online: true,
              last_seen: nowIso,
              ...(resetDevId ? { device_id: activeDeviceId } : {}),
            },
            timeoutMs: 7000,
          })
        : Promise.resolve(null),
      subFilter
        ? callSupabaseProxy({
            table: 'subscriptions',
            method: 'PATCH',
            query: subFilter,
            payload: subPatch,
            timeoutMs: 7000,
          })
        : Promise.resolve(null),
    ]).catch(() => {});

    const trialStart =
      [
        matchedSub?.trial_start_ms,
        matchedSub?.trial_start_time,
        matchedUser?.trial_start,
        matchedUser?.trial_start_time,
        matchedClientUser?.trial_start,
        matchedClientUser?.trial_start_time,
        matchedUser?.registered_at_epoch_ms,
        matchedUser?.created_at,
        matchedSub?.created_at,
        matchedUac?.trial_start_time,
      ]
        .map(parseTimestampMs)
        .find((t) => t > 0) || now;

    const cloudExpiry = isOwner
      ? 0
      : Math.max(
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
            matchedUac?.subscription_expiry,
            matchedUac?.subscriptionExpiresAt,
            matchedUac?.activatedUntil,
            matchedUac?.activated_until,
          ].map(parseTimestampMs)
        );

    const session: ClientAuthSession = {
      verified: true,
      deviceId: effectiveDeviceId,
      userId: String(matchedUser?.user_id || matchedClientUser?.user_id || effectiveDeviceId),
      name: resolvedName,
      phone: resolvedPhone,
      email: resolvedEmail,
      cnic: resolvedCnic,
      shopAddress: String(
        matchedUser?.shop_address ||
          matchedClientUser?.shop_address ||
          matchedUac?.shop_address ||
          fallbackAddress
      ),
      companyName: String(
        matchedUser?.company_name ||
          matchedClientUser?.company_name ||
          (isOwner ? 'BOSS ALUMINIUM & GLASS' : '')
      ),
      selfieUrl: String(matchedUser?.selfie_url || ''),
      shopPhotoUrl: String(matchedUser?.shop_photo_url || ''),
      loggedInAt: now,
      trialStartTime: trialStart,
      trialExpiresAt: isOwner ? 0 : cloudExpiry > 0 ? cloudExpiry : trialStart + TWO_DAYS_MS,
      activeSessionToken: sessionToken,
      userRole: resolvedRole,
      ...(isOwner
        ? {
            isLifetimeFree: true,
            isActivated: true,
            packagePlan: 'LIFETIME_VIP',
            isBlocked: false,
          }
        : {}),
    };

    const bioEnrolled = await enrollBiometricPasskey({
      deviceId: session.deviceId,
      identifier: resolvedEmail || resolvedPhone || resolvedCnic || effectiveDeviceId,
      userName: session.name,
    });
    const finalCredId = bioEnrolled.credentialId || biometricBinding?.credentialId;
    if (finalCredId) {
      const binding: BiometricBinding = {
        deviceId: session.deviceId,
        identifier: resolvedEmail || resolvedPhone || resolvedCnic || effectiveDeviceId,
        userName: session.name,
        email: session.email,
        phone: session.phone,
        cnic: session.cnic,
        credentialId: finalCredId,
        enrolledAt: now,
      };
      saveBiometricBinding(binding);
      setBiometricBinding(binding);
    }

    try {
      localStorage.removeItem(PENDING_REG_DRAFT_KEY);
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    saveAuthSession(session);
    onAuthenticated(session);
    return true;
  };

  // =========================================================================
  // RULE 1: HANDLE RETURN FROM GOOGLE OAUTH (AUTO-VERIFIED ACCOUNT / LOGIN)
  // =========================================================================
  const finalizeGoogleOAuthUser = async (supaUser: any, forceRetry = false) => {
    const gEmail = String(supaUser?.email || '').trim().toLowerCase();
    if (!gEmail) return;
    if (!forceRetry && processedGoogleUserIdRef.current === `${supaUser.id || gEmail}`) return;
    processedGoogleUserIdRef.current = `${supaUser.id || gEmail}`;

    const gName =
      String(
        supaUser?.user_metadata?.full_name ||
          supaUser?.user_metadata?.name ||
          gEmail.split('@')[0] ||
          'Valued Client'
      ).trim() || 'Valued Client';

    setIsGoogleAuthenticating(true);
    setErrorMsg(null);
    setInfoMsg(`Google Account (${gEmail}) verify ho raha hai...`);

    try {
      const activeDeviceId = clientDeviceId || getOrCreateClientDeviceId();
      const macAddress = getOrCreateDeviceMacFingerprint();
      const deviceModel = getDeviceModelName();

      // Fast lightweight duplicate/existence projection (never pulls heavy base64 CNIC photos)
      const [usersDupRes, clientUsersDupRes, subsDupRes, masterCfg, publicIp, serverNowMs] =
        await Promise.all([
          fetchDuplicateCheckRows('users', 8000),
          fetchDuplicateCheckRows('client_users', 8000),
          fetchDuplicateCheckRows('subscriptions', 8000),
          fetchMasterEngineConfigFromSupabase(),
          getClientPublicIpAddress(),
          fetchSupabaseServerTimeMs(),
        ]);

      if (!usersDupRes.ok && !clientUsersDupRes.ok) {
        setErrorMsg(
          `Database connection error (${usersDupRes.error || clientUsersDupRes.error || 'Supabase unreachable'}). Internet check karein.`
        );
        setInfoMsg(null);
        return;
      }

      const usersList = usersDupRes.rows;
      const clientUsersList = clientUsersDupRes.rows;
      const subsList = subsDupRes.rows;
      const uacList = Array.isArray(masterCfg?.userAccessControl)
        ? masterCfg.userAccessControl
        : Object.values(masterCfg?.userAccessControl || {});

      const isOwner = isOwnerIdentity({ email: gEmail, masterCfg });

      // 1) Check if this Google email already belongs to an existing account (Login — GPS optional)
      const emailMatch = findExistingAccountComboMatch({
        email: gEmail,
        usersList,
        clientUsersList,
        subsList,
        uacList,
        identityOnly: true,
      });

      if (
        emailMatch.matchedUser ||
        emailMatch.matchedClientUser ||
        emailMatch.matchedSub ||
        emailMatch.matchedUac
      ) {
        // Fetch targeted full rows for the matched user before logging in
        const [fullU, fullCu, fullSub] = await Promise.all([
          callSupabaseProxy({
            table: 'users',
            method: 'GET',
            query: `email=ilike.${encodeURIComponent(gEmail)}&select=*&limit=5`,
            timeoutMs: 7000,
          }),
          callSupabaseProxy({
            table: 'client_users',
            method: 'GET',
            query: `email=ilike.${encodeURIComponent(gEmail)}&select=*&limit=5`,
            timeoutMs: 7000,
          }),
          callSupabaseProxy({
            table: 'subscriptions',
            method: 'GET',
            query: `email=ilike.${encodeURIComponent(gEmail)}&select=*&limit=5`,
            timeoutMs: 7000,
          }),
        ]);
        const fullMatchedUser =
          (Array.isArray(fullU.data) && fullU.data[0]) || emailMatch.matchedUser;
        const fullMatchedClientUser =
          (Array.isArray(fullCu.data) && fullCu.data[0]) || emailMatch.matchedClientUser;
        const fullMatchedSub =
          (Array.isArray(fullSub.data) && fullSub.data[0]) || emailMatch.matchedSub;

        setPendingGoogleUser(null);

        const existingPhoneDigits = normalizePhoneDigits(
          String(
            fullMatchedUser?.phone ||
              fullMatchedClientUser?.phone ||
              fullMatchedSub?.phone ||
              ''
          )
        );
        const existingCnicDigits = normalizeCnicDigits(
          String(
            fullMatchedUser?.cnic ||
              fullMatchedClientUser?.cnic ||
              fullMatchedSub?.cnic ||
              ''
          )
        );
        const existingFront = String(
          fullMatchedUser?.cnic_front_url || fullMatchedUser?.cnic_front || ''
        ).trim();
        const existingBack = String(
          fullMatchedUser?.cnic_back_url || fullMatchedUser?.cnic_back || ''
        ).trim();

        if (
          !isOwner &&
          (existingPhoneDigits.length < 10 ||
            existingCnicDigits.length !== 13 ||
            !existingFront ||
            !existingBack)
        ) {
          const existingBlocked =
            String(fullMatchedUser?.account_status || fullMatchedUser?.status || '')
              .trim()
              .toUpperCase() === 'BLOCKED' || Boolean(fullMatchedUser?.is_blocked);
          if (existingBlocked) {
            await supabase.auth.signOut().catch(() => {});
            setErrorMsg(
              `Account Blocked: ${fullMatchedUser?.block_reason || 'Suspended by Master Admin'}`
            );
            setInfoMsg(null);
            return;
          }

          const prefillName = String(
            fullMatchedUser?.name || fullMatchedClientUser?.name || gName
          ).trim();
          const prefillCompany = String(
            fullMatchedUser?.company_name ||
              fullMatchedClientUser?.company_name ||
              `${prefillName} Aluminium & Glass`
          ).trim();
          const prefillPhone = String(
            fullMatchedUser?.phone ||
              fullMatchedClientUser?.phone ||
              fullMatchedSub?.phone ||
              ''
          ).trim();
          const prefillCnic = String(
            fullMatchedUser?.cnic ||
              fullMatchedClientUser?.cnic ||
              fullMatchedSub?.cnic ||
              ''
          ).trim();
          const prefillAddr = String(
            fullMatchedUser?.shop_address || fullMatchedClientUser?.shop_address || ''
          ).trim();

          setGpName(prefillName);
          setGpPhone(prefillPhone);
          setGpCompany(prefillCompany);
          setGpCnic(prefillCnic);
          setGpAddress(prefillAddr);
          setGpCnicFront(existingFront);
          setGpCnicBack(existingBack);
          setInfoMsg(null);
          setErrorMsg(null);
          setGoogleProfileStep({
            supaUser,
            email: gEmail,
            name: prefillName,
            activeDeviceId,
            macAddress,
            deviceModel,
            publicIp,
            masterCfg,
            gps: loadStoredGpsLocation(),
            serverNowMs,
            existingMatch: {
              matchedUser: fullMatchedUser,
              matchedClientUser: fullMatchedClientUser,
              matchedSub: fullMatchedSub,
              matchedUac: emailMatch.matchedUac,
            },
          });
          return;
        }

        await loginIntoMatchedExistingRecord({
          matchedUser: fullMatchedUser,
          matchedClientUser: fullMatchedClientUser,
          matchedSub: fullMatchedSub,
          matchedUac: emailMatch.matchedUac,
          usersList: fullMatchedUser ? [fullMatchedUser] : usersList,
          clientUsersList: fullMatchedClientUser ? [fullMatchedClientUser] : clientUsersList,
          subsList: fullMatchedSub ? [fullMatchedSub] : subsList,
          masterCfg,
          publicIp,
          macAddress,
          deviceModel,
          gps: loadStoredGpsLocation(),
          serverNowMs,
          fallbackName: gName,
          fallbackEmail: gEmail,
        });
        return;
      }

      // 2) For brand-new Google signup: block if this Device/IP/MAC already has another account (unless Owner or allow_multi_account)
      const deviceComboMatch = findExistingAccountComboMatch({
        email: gEmail,
        deviceId: activeDeviceId,
        ipAddress: publicIp,
        macAddress,
        usersList,
        clientUsersList,
        subsList,
        uacList,
        identityOnly: isOwner,
      });

      if (
        !isOwner &&
        (deviceComboMatch.matchedUser ||
          deviceComboMatch.matchedClientUser ||
          deviceComboMatch.matchedSub ||
          deviceComboMatch.matchedUac) &&
        !deviceComboMatch.allowMultiAccount
      ) {
        setPendingGoogleUser(null);
        await supabase.auth.signOut().catch(() => {});
        setInfoMsg(null);
        setErrorMsg(
          `Is Device (${activeDeviceId}) par pehle se aik account registered hai. Duplicate account banana allowed nahi — apni purani ID se Login karein.`
        );
        setShowSwitchToLoginHint(true);
        return;
      }

      // 3) Mandatory GPS Location enforcement for creating ANY brand-new non-owner Google account
      let gps = loadStoredGpsLocation();
      if (!isOwner) {
        const gpsRes = await requestMandatoryGpsLocation();
        if (!gpsRes.ok || !gpsRes.gps) {
          setPendingGoogleUser(supaUser);
          setGpsStatus('ERROR');
          setGpsStatusMsg(gpsRes.message);
          setInfoMsg(null);
          setErrorMsg(gpsRes.message || 'Please allow Location access to create your account');
          return;
        }
        gps = gpsRes.gps;
        setLiveGps(gps);
        setGpsStatus('READY');
        setGpsStatusMsg(gpsRes.message);
      }
      setPendingGoogleUser(null);

      // Non-Owner brand-new Google user MUST complete Shop Name, Mobile Number (no SMS OTP), CNIC & CNIC Front/Back photos first
      if (!isOwner) {
        const resolvedGpsAddress = gps?.address || gps?.city || '';
        setGpName(gName);
        setGpPhone('');
        setGpCompany(`${gName} Aluminium & Glass`);
        setGpCnic('');
        setGpAddress(resolvedGpsAddress);
        setGpCnicFront('');
        setGpCnicBack('');
        setInfoMsg(null);
        setErrorMsg(null);
        setGoogleProfileStep({
          supaUser,
          email: gEmail,
          name: gName,
          activeDeviceId,
          macAddress,
          deviceModel,
          publicIp,
          masterCfg,
          gps,
          serverNowMs,
          existingMatch: null,
        });
        return;
      }

      const now = serverNowMs > 0 ? serverNowMs : getEffectiveServerNowMs() || Date.now();
      const nowIso = new Date(now).toISOString();
      const sessionToken = generateActiveSessionToken();
      const userRole = resolveUserRole({ email: gEmail, masterCfg });
      const recordUuid = generateSafeUUID();
      const resolvedGpsAddress = gps?.address || gps?.city || '';

      // Owner VIP Google login: Auto-create / sign-in Verified LIFETIME_VIP account
      const expiry = 0;
      const newUserPayload: Record<string, any> = {
        id: recordUuid,
        device_id: activeDeviceId,
        user_id: activeDeviceId,
        name: gName,
        company_name: `${gName} Aluminium & Glass`,
        phone: '',
        email: gEmail,
        cnic: '',
        shop_address: resolvedGpsAddress,
        ip_address: publicIp || '',
        mac_address: macAddress,
        device_model: deviceModel,
        fingerprint_enabled: true,
        active_session_token: sessionToken,
        is_online: true,
        last_seen: nowIso,
        is_registered: true,
        trial_used: true,
        account_status: 'ACTIVE',
        status: 'ACTIVE',
        is_activated: true,
        is_lifetime: true,
        is_blocked: false,
        block_reason: '',
        subscription_tier: 'LIFETIME_VIP',
        package_name: 'Lifetime Free VIP Package',
        trial_start: nowIso,
        trial_start_time: now,
        activated_until: expiry,
        activated_until_ms: expiry,
        subscription_expiry: expiry,
        last_cloud_sync: now,
        created_at: nowIso,
        ...(gps
          ? {
              latitude: gps.latitude,
              longitude: gps.longitude,
              location_url: gps.locationUrl,
              ...(gps.city ? { gps_city: gps.city } : {}),
              ...(gps.address ? { gps_address: gps.address } : {}),
            }
          : {}),
      };

      const newSubPayload = {
        device_id: activeDeviceId,
        user_name: gName,
        email: gEmail,
        phone: '',
        cnic: '',
        trial_used: true,
        status: 'ACTIVE',
        is_activated: true,
        is_lifetime: true,
        is_blocked: false,
        subscription_tier: 'LIFETIME_VIP',
        package_name: 'Lifetime Free VIP Package',
        activated_until: expiry,
        activated_until_ms: expiry,
        last_updated: now,
        updated_at: nowIso,
        created_at: nowIso,
      };

      // Strict Database Insert (both users AND client_users MUST succeed — zero silent offline fallback)
      const [uRes, cuRes] = await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'POST',
          upsert: true,
          payload: newUserPayload,
          timeoutMs: 12000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'POST',
          upsert: true,
          payload: {
            id: recordUuid,
            device_id: activeDeviceId,
            name: gName,
            email: gEmail,
            phone: '',
            cnic: '',
            shop_address: resolvedGpsAddress,
            role: userRole,
            active_session_token: sessionToken,
            is_online: true,
            last_seen: nowIso,
            created_at: nowIso,
          },
          timeoutMs: 10000,
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: newSubPayload,
          timeoutMs: 10000,
        }),
      ]);

      if (!uRes.ok || !cuRes.ok) {
        const errs: string[] = [];
        if (!uRes.ok) errs.push(`users: ${uRes.error || `HTTP ${uRes.status}`}`);
        if (!cuRes.ok) errs.push(`client_users: ${cuRes.error || `HTTP ${cuRes.status}`}`);
        setErrorMsg(`Database save error — profile create nahi hua (${errs.join(' | ')}).`);
        setInfoMsg(null);
        return;
      }

      saveActiveSessionToken(sessionToken);

      const session: ClientAuthSession = {
        verified: true,
        deviceId: activeDeviceId,
        userId: activeDeviceId,
        name: gName,
        phone: '',
        email: gEmail,
        cnic: '',
        shopAddress: resolvedGpsAddress,
        companyName: `${gName} Aluminium & Glass`,
        loggedInAt: now,
        trialStartTime: now,
        trialExpiresAt: expiry,
        activeSessionToken: sessionToken,
        userRole,
        isLifetimeFree: true,
        isActivated: true,
        packagePlan: 'LIFETIME_VIP',
        isBlocked: false,
      };

      const bioEnrolled = await enrollBiometricPasskey({
        deviceId: activeDeviceId,
        identifier: gEmail,
        userName: gName,
      });
      if (bioEnrolled.ok && bioEnrolled.credentialId) {
        const binding: BiometricBinding = {
          deviceId: activeDeviceId,
          identifier: gEmail,
          userName: gName,
          email: gEmail,
          phone: '',
          cnic: '',
          credentialId: bioEnrolled.credentialId,
          enrolledAt: now,
        };
        saveBiometricBinding(binding);
        setBiometricBinding(binding);
      }

      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      saveAuthSession(session);
      onAuthenticated(session);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google verification ke dauran cloud network error aaya.');
      setInfoMsg(null);
    } finally {
      setIsGoogleAuthenticating(false);
    }
  };

  const handleGpPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'FRONT' | 'BACK'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setIsCompressingGpPhoto(side);
    try {
      const validation = await validateCnicPhotoFile(file);
      if (!validation.ok) {
        setErrorMsg(validation.error || 'Please upload a clear CNIC ID Card photo');
        return;
      }
      const uploaded = await uploadImageToUserUploadsBucket({
        fileOrDataUrl: file,
        folder: 'cnic',
        deviceId: googleProfileStep?.activeDeviceId || clientDeviceId,
        tag: `google_cnic_${side.toLowerCase()}`,
      });
      const finalVal = uploaded.url || (await compressImageToDataUrl(file, 800, 0.6, 80 * 1024));
      if (side === 'FRONT') setGpCnicFront(finalVal);
      else setGpCnicBack(finalVal);
    } catch {
      setErrorMsg('Please upload a clear CNIC ID Card photo');
    } finally {
      setIsCompressingGpPhoto(null);
    }
  };

  const handleCompleteGoogleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleProfileStep) return;
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanName = gpName.trim() || googleProfileStep.name;
    const cleanCompany = gpCompany.trim();
    const phoneDigits = normalizePhoneDigits(gpPhone);
    const cleanPhone = formatPakPhone(gpPhone);
    const cnicDigits = normalizeCnicDigits(gpCnic);
    const cleanCnic = formatPakCnic(gpCnic);
    const cleanAddress = gpAddress.trim();
    const gEmail = googleProfileStep.email;

    if (cleanName.length < 2) {
      setErrorMsg('Apna mukammal naam darj karein.');
      return;
    }
    if (!cleanCompany || cleanCompany.length < 2) {
      setErrorMsg('Apni Shop / Company ka naam darj karein.');
      return;
    }
    if (phoneDigits.length < 10) {
      setErrorMsg('Sahi Pakistani Mobile Number darj karein (maslan 0300-1234567).');
      return;
    }
    if (cnicDigits.length !== 13) {
      setErrorMsg('13 digits ka sahi CNIC Number darj karein (maslan 37405-1234567-1).');
      return;
    }
    if (!gpCnicFront || !gpCnicBack) {
      setErrorMsg('CNIC ki Front aur Back dono tasveerein upload karna lazmi hai.');
      return;
    }

    setIsSavingGoogleProfile(true);
    try {
      const activeDeviceId = googleProfileStep.activeDeviceId || getOrCreateClientDeviceId();
      const [usersDupRes, clientUsersDupRes, subsDupRes, masterCfg, publicIp, serverNowMs] =
        await Promise.all([
          fetchDuplicateCheckRows('users', 8000),
          fetchDuplicateCheckRows('client_users', 8000),
          fetchDuplicateCheckRows('subscriptions', 8000),
          fetchMasterEngineConfigFromSupabase(),
          getClientPublicIpAddress(),
          fetchSupabaseServerTimeMs(),
        ]);

      if (!usersDupRes.ok && !clientUsersDupRes.ok) {
        setErrorMsg(
          `Database connection error (${usersDupRes.error || clientUsersDupRes.error || 'Supabase unreachable'}). Profile save nahi hua.`
        );
        return;
      }

      const effectiveMasterCfg =
        Object.keys(masterCfg || {}).length > 0 ? masterCfg : googleProfileStep.masterCfg;
      const uacList = Array.isArray(effectiveMasterCfg?.userAccessControl)
        ? effectiveMasterCfg.userAccessControl
        : Object.values(effectiveMasterCfg?.userAccessControl || {});

      const existingOwnDev = String(
        googleProfileStep.existingMatch?.matchedUser?.device_id ||
          googleProfileStep.existingMatch?.matchedClientUser?.device_id ||
          googleProfileStep.existingMatch?.matchedSub?.device_id ||
          ''
      ).trim();

      const excludeSelfRows = (rows: any[]) =>
        rows.filter((r: any) => {
          const rEmail = String(r?.email || '').trim().toLowerCase();
          const rDev = String(r?.device_id || '').trim();
          if (rEmail && rEmail === gEmail) return false;
          if (existingOwnDev && rDev && rDev === existingOwnDev) return false;
          return true;
        });

      const otherUsers = excludeSelfRows(usersDupRes.rows);
      const otherClientUsers = excludeSelfRows(clientUsersDupRes.rows);
      const otherSubs = excludeSelfRows(subsDupRes.rows);
      const otherUac = excludeSelfRows(uacList);

      // Strict Duplicate CNIC, Phone, and Device check against all OTHER users (prevents duplicate trial abuse)
      const dupMatch = findExistingAccountComboMatch({
        email: gEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        deviceId: googleProfileStep.existingMatch ? undefined : activeDeviceId,
        ipAddress: googleProfileStep.existingMatch ? undefined : publicIp,
        macAddress: googleProfileStep.existingMatch ? undefined : googleProfileStep.macAddress,
        usersList: otherUsers,
        clientUsersList: otherClientUsers,
        subsList: otherSubs,
        uacList: otherUac,
        identityOnly: false,
      });

      if (
        (dupMatch.matchedUser ||
          dupMatch.matchedClientUser ||
          dupMatch.matchedSub ||
          dupMatch.matchedUac) &&
        !dupMatch.allowMultiAccount
      ) {
        const dupLabels = dupMatch.matchedFields.join(', ') || 'CNIC / Phone / Device';
        setErrorMsg(
          `Duplicate Account Detected (${dupLabels}): Yeh CNIC ya Mobile Number pehle se kisi aur account par registered hai. Same CNIC se dobara free trial lena allowed nahi!`
        );
        return;
      }

      // Ensure GPS location for non-owner signup completion
      let gps = googleProfileStep.gps || liveGps || loadStoredGpsLocation();
      if (!gps) {
        const gpsRes = await requestMandatoryGpsLocation();
        if (!gpsRes.ok || !gpsRes.gps) {
          setGpsStatus('ERROR');
          setGpsStatusMsg(gpsRes.message);
          setErrorMsg(gpsRes.message || 'Please allow Location access to complete your account.');
          return;
        }
        gps = gpsRes.gps;
        setLiveGps(gps);
        setGpsStatus('READY');
        setGpsStatusMsg(gpsRes.message);
      }

      const now =
        serverNowMs > 0
          ? serverNowMs
          : googleProfileStep.serverNowMs > 0
          ? googleProfileStep.serverNowMs
          : getEffectiveServerNowMs() || Date.now();
      const nowIso = new Date(now).toISOString();
      const resolvedAddress = cleanAddress || gps?.address || gps?.city || '';

      // Case 1: Returning incomplete Google user — patch existing record & sign in preserving original trial
      if (googleProfileStep.existingMatch) {
        const { matchedUser, matchedClientUser, matchedSub, matchedUac } =
          googleProfileStep.existingMatch;

        const targetEmail = String(
          matchedUser?.email || matchedClientUser?.email || gEmail
        ).trim();
        const targetDev = String(
          matchedUser?.device_id || matchedClientUser?.device_id || ''
        ).trim();
        const userPatchQuery = targetDev
          ? `device_id=eq.${encodeURIComponent(targetDev)}`
          : `email=ilike.${encodeURIComponent(targetEmail)}`;

        const [uPatchRes, cuPatchRes] = await Promise.all([
          matchedUser
            ? callSupabaseProxy({
                table: 'users',
                method: 'PATCH',
                query: userPatchQuery,
                payload: {
                  name: cleanName,
                  company_name: cleanCompany,
                  phone: cleanPhone,
                  cnic: cleanCnic,
                  shop_address: resolvedAddress,
                  cnic_front_url: gpCnicFront,
                  cnic_back_url: gpCnicBack,
                  last_cloud_sync: now,
                  last_seen: nowIso,
                },
                timeoutMs: 12000,
              })
            : callSupabaseProxy({
                table: 'users',
                method: 'POST',
                upsert: true,
                payload: {
                  id: generateSafeUUID(),
                  device_id: targetDev || activeDeviceId,
                  user_id: targetDev || activeDeviceId,
                  name: cleanName,
                  company_name: cleanCompany,
                  phone: cleanPhone,
                  email: gEmail,
                  cnic: cleanCnic,
                  shop_address: resolvedAddress,
                  cnic_front_url: gpCnicFront,
                  cnic_back_url: gpCnicBack,
                  trial_used: true,
                  is_registered: true,
                  created_at: nowIso,
                },
                timeoutMs: 12000,
              }),
          callSupabaseProxy({
            table: 'client_users',
            method: matchedClientUser ? 'PATCH' : 'POST',
            ...(matchedClientUser
              ? { query: userPatchQuery }
              : { upsert: true }),
            payload: {
              ...(matchedClientUser ? {} : { id: generateSafeUUID(), device_id: targetDev || activeDeviceId, email: gEmail, created_at: nowIso }),
              name: cleanName,
              company_name: cleanCompany,
              phone: cleanPhone,
              cnic: cleanCnic,
              shop_address: resolvedAddress,
              last_seen: nowIso,
            },
            timeoutMs: 10000,
          }),
          matchedSub
            ? callSupabaseProxy({
                table: 'subscriptions',
                method: 'PATCH',
                query: matchedSub?.device_id
                  ? `device_id=eq.${encodeURIComponent(String(matchedSub.device_id))}`
                  : userPatchQuery,
                payload: {
                  user_name: cleanName,
                  phone: cleanPhone,
                  cnic: cleanCnic,
                  updated_at: nowIso,
                  last_updated: now,
                },
                timeoutMs: 8000,
              })
            : Promise.resolve({ ok: true }),
        ]);

        if (!uPatchRes.ok && !cuPatchRes.ok) {
          setErrorMsg(
            `Database save error — profile update nahi hua (${uPatchRes.error || cuPatchRes.error || 'Network error'}).`
          );
          return;
        }

        const updatedMatchedUser = {
          ...(matchedUser || {}),
          name: cleanName,
          company_name: cleanCompany,
          phone: cleanPhone,
          email: gEmail,
          cnic: cleanCnic,
          shop_address: resolvedAddress,
          cnic_front_url: gpCnicFront,
          cnic_back_url: gpCnicBack,
        };
        const updatedMatchedClient = {
          ...(matchedClientUser || {}),
          name: cleanName,
          company_name: cleanCompany,
          phone: cleanPhone,
          email: gEmail,
          cnic: cleanCnic,
          shop_address: resolvedAddress,
        };

        setGoogleProfileStep(null);
        await loginIntoMatchedExistingRecord({
          matchedUser: updatedMatchedUser,
          matchedClientUser: updatedMatchedClient,
          matchedSub,
          matchedUac,
          usersList: [updatedMatchedUser],
          clientUsersList: [updatedMatchedClient],
          subsList: matchedSub ? [matchedSub] : subsDupRes.rows,
          masterCfg: effectiveMasterCfg,
          publicIp: publicIp || googleProfileStep.publicIp,
          macAddress: googleProfileStep.macAddress,
          deviceModel: googleProfileStep.deviceModel,
          gps,
          serverNowMs: now,
          fallbackName: cleanName,
          fallbackEmail: gEmail,
          fallbackPhone: cleanPhone,
          fallbackCnic: cleanCnic,
          fallbackAddress: resolvedAddress,
        });
        return;
      }

      // Case 2: Brand-new Google user — strict insert into users, client_users, subscriptions
      const sessionToken = generateActiveSessionToken();
      const userRole = resolveUserRole({
        email: gEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        masterCfg: effectiveMasterCfg,
      });
      const recordUuid = generateSafeUUID();
      const expiry = now + TWO_DAYS_MS;

      const newUserPayload: Record<string, any> = {
        id: recordUuid,
        device_id: activeDeviceId,
        user_id: activeDeviceId,
        name: cleanName,
        company_name: cleanCompany,
        phone: cleanPhone,
        email: gEmail,
        cnic: cleanCnic,
        shop_address: resolvedAddress,
        cnic_front_url: gpCnicFront,
        cnic_back_url: gpCnicBack,
        ip_address: publicIp || googleProfileStep.publicIp || '',
        mac_address: googleProfileStep.macAddress,
        device_model: googleProfileStep.deviceModel,
        fingerprint_enabled: true,
        active_session_token: sessionToken,
        is_online: true,
        last_seen: nowIso,
        is_registered: true,
        trial_used: true,
        account_status: 'TRIAL',
        status: 'TRIAL',
        is_activated: false,
        is_lifetime: false,
        is_blocked: false,
        block_reason: '',
        subscription_tier: 'TRIAL',
        trial_start: nowIso,
        trial_end: new Date(expiry).toISOString(),
        trial_start_time: now,
        activated_until: expiry,
        activated_until_ms: expiry,
        subscription_expiry: expiry,
        last_cloud_sync: now,
        created_at: nowIso,
        ...(gps
          ? {
              latitude: gps.latitude,
              longitude: gps.longitude,
              location_url: gps.locationUrl,
              ...(gps.city ? { gps_city: gps.city } : {}),
              ...(gps.address ? { gps_address: gps.address } : {}),
            }
          : {}),
      };

      const newSubPayload = {
        device_id: activeDeviceId,
        user_name: cleanName,
        email: gEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        trial_used: true,
        status: 'TRIAL',
        is_activated: false,
        is_lifetime: false,
        is_blocked: false,
        subscription_tier: 'TRIAL',
        activated_until: expiry,
        activated_until_ms: expiry,
        last_updated: now,
        updated_at: nowIso,
        created_at: nowIso,
      };

      const [uRes, cuRes, subRes] = await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'POST',
          upsert: true,
          payload: newUserPayload,
          timeoutMs: 14000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'POST',
          upsert: true,
          payload: {
            id: recordUuid,
            device_id: activeDeviceId,
            name: cleanName,
            email: gEmail,
            phone: cleanPhone,
            cnic: cleanCnic,
            shop_address: resolvedAddress,
            company_name: cleanCompany,
            role: userRole,
            active_session_token: sessionToken,
            is_online: true,
            last_seen: nowIso,
            created_at: nowIso,
          },
          timeoutMs: 10000,
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: newSubPayload,
          timeoutMs: 10000,
        }),
      ]);

      if (!uRes.ok || !cuRes.ok) {
        const errs: string[] = [];
        if (!uRes.ok) errs.push(`users: ${uRes.error || `HTTP ${uRes.status}`}`);
        if (!cuRes.ok) errs.push(`client_users: ${cuRes.error || `HTTP ${cuRes.status}`}`);
        setErrorMsg(`Database save error — profile create nahi hua (${errs.join(' | ')}).`);
        return;
      }

      if (!subRes.ok) {
        await callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: {
            device_id: activeDeviceId,
            user_name: cleanName,
            email: gEmail,
            phone: cleanPhone,
            cnic: cleanCnic,
            trial_used: true,
            status: 'TRIAL',
            is_activated: false,
            is_lifetime: false,
            subscription_tier: 'TRIAL',
            updated_at: nowIso,
          },
          timeoutMs: 8000,
        });
      }

      saveActiveSessionToken(sessionToken);

      const session: ClientAuthSession = {
        verified: true,
        deviceId: activeDeviceId,
        userId: activeDeviceId,
        name: cleanName,
        phone: cleanPhone,
        email: gEmail,
        cnic: cleanCnic,
        shopAddress: resolvedAddress,
        companyName: cleanCompany,
        loggedInAt: now,
        trialStartTime: now,
        trialExpiresAt: expiry,
        activeSessionToken: sessionToken,
        userRole,
      };

      const bioEnrolled = await enrollBiometricPasskey({
        deviceId: activeDeviceId,
        identifier: gEmail,
        userName: cleanName,
      });
      if (bioEnrolled.ok && bioEnrolled.credentialId) {
        const binding: BiometricBinding = {
          deviceId: activeDeviceId,
          identifier: gEmail,
          userName: cleanName,
          email: gEmail,
          phone: cleanPhone,
          cnic: cleanCnic,
          credentialId: bioEnrolled.credentialId,
          enrolledAt: now,
        };
        saveBiometricBinding(binding);
        setBiometricBinding(binding);
      }

      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setGoogleProfileStep(null);
      saveAuthSession(session);
      onAuthenticated(session);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Profile save karte waqt network error aaya. Dobara try karein.');
    } finally {
      setIsSavingGoogleProfile(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const isGoogleAuthUser = (u: any) => {
      if (!u?.email) return false;
      const provider = String(u?.app_metadata?.provider || '').toLowerCase();
      const identities = Array.isArray(u?.identities) ? u.identities : [];
      return (
        provider === 'google' ||
        identities.some((id: any) => String(id?.provider || '').toLowerCase() === 'google')
      );
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const u = data?.session?.user;
        if (u && isGoogleAuthUser(u)) {
          finalizeGoogleOAuthUser(u);
        }
      })
      .catch(() => {});

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        if (isGoogleAuthUser(session.user)) {
          finalizeGoogleOAuthUser(session.user);
        }
      }
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // Restore pending registration draft if returning from a confirmation email link redirect
  useEffect(() => {
    try {
      const callback = extractAuthCallbackFromUrl();
      const rawDraft = localStorage.getItem(PENDING_REG_DRAFT_KEY);
      if (rawDraft) {
        const d = JSON.parse(rawDraft);
        if (d && d.email) {
          setRegName(d.name || '');
          setRegCompany(d.companyName || '');
          setRegPhone(d.phone || '');
          setRegEmail(d.email || '');
          setRegCnic(d.cnic || '');
          setRegAddress(d.shopAddress || '');
          setRegPasswordHash(d.passwordHash || '');
          setCnicFrontPhoto(d.cnicFrontPhoto || '');
          setCnicBackPhoto(d.cnicBackPhoto || '');
          setSelfiePhoto(d.selfiePhoto || '');
          setShopPhoto(d.shopPhoto || '');
          setActiveTab('REGISTER');
          setRegStep('OTP');
          if (callback) {
            const tokenStr = callback.accessToken
              ? `access_token=${encodeURIComponent(callback.accessToken)}`
              : `token_hash=${encodeURIComponent(callback.tokenHash)}&type=${encodeURIComponent(callback.type)}`;
            setOtpInput(tokenStr);
            setInfoMsg('Email link verify ho gaya! Ab "Verify Email OTP & Create Account" par click karein.');
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setShowSwitchToRegisterHint(false);
    setShowSwitchToLoginHint(false);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorMsg('Internet band hai (Offline). Pehli baar Google Login ke liye Internet ON karein.');
      return;
    }
    if (activeTab === 'REGISTER') {
      const gpsCheck = await ensureMandatoryGpsForNewAccount(true);
      if (!gpsCheck) {
        return;
      }
    }
    setIsGoogleAuthenticating(true);
    try {
      const redirectTo =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) {
        setErrorMsg(error.message || 'Google Sign-In start nahi ho saka.');
        setIsGoogleAuthenticating(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google OAuth connect nahi ho saka.');
      setIsGoogleAuthenticating(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'FRONT' | 'BACK' | 'SELFIE' | 'SHOP'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setIsCompressingPhoto(side);
    try {
      if (side === 'FRONT' || side === 'BACK') {
        const validation = await validateCnicPhotoFile(file);
        if (!validation.ok) {
          setErrorMsg(validation.error || 'Please upload a clear CNIC ID Card photo');
          return;
        }
      }
      const folder =
        side === 'SELFIE' ? 'selfies' : side === 'SHOP' ? 'shops' : 'cnic';
      const uploaded = await uploadImageToUserUploadsBucket({
        fileOrDataUrl: file,
        folder,
        deviceId: clientDeviceId,
        tag: side.toLowerCase(),
      });
      const finalVal =
        uploaded.url ||
        (side === 'SELFIE' || side === 'SHOP'
          ? await compressImageToDataUrl(file, 800, 0.65, 120 * 1024)
          : await compressImageToDataUrl(file, 800, 0.6, 80 * 1024));
      if (side === 'FRONT') setCnicFrontPhoto(finalVal);
      else if (side === 'BACK') setCnicBackPhoto(finalVal);
      else if (side === 'SELFIE') setSelfiePhoto(finalVal);
      else setShopPhoto(finalVal);
    } catch {
      setErrorMsg(
        side === 'FRONT' || side === 'BACK'
          ? 'Please upload a clear CNIC ID Card photo'
          : 'Image load nahi ho saki, dobara try karein.'
      );
    } finally {
      setIsCompressingPhoto(null);
    }
  };

  // =========================================================================
  // RULE 2 & 3: UNIVERSAL LOGIN (Email / Phone / CNIC + Password / Fingerprint)
  // =========================================================================
  const performUniversalLogin = async (opts: {
    identifier: string;
    password: string;
    skipPasswordCheck?: boolean;
    enrollBiometric?: boolean;
  }): Promise<boolean> => {
    const rawId = opts.identifier.trim();
    const phoneDigits = normalizePhoneDigits(rawId);
    const cnicDigits = normalizeCnicDigits(rawId);
    const isEmailInput = rawId.includes('@');

    if (!rawId || (!isEmailInput && phoneDigits.length < 7 && cnicDigits.length < 10)) {
      setErrorMsg('Apna registered Mobile Number, Email ya CNIC darj karein.');
      return false;
    }

    const formattedPhone = formatPakPhone(rawId);
    const formattedCnic = cnicDigits.length === 13 ? formatPakCnic(rawId) : rawId;

    // Targeted OR search ONLY for matching email, phone, or CNIC (never downloads all users / 5MB full table)
    const orFilters: string[] = [];
    const subPhoneFilters: string[] = [];
    if (isEmailInput) {
      orFilters.push(`email.ilike.${encodeURIComponent(rawId.toLowerCase())}`);
    }
    if (formattedPhone) {
      const f = `phone.eq.${encodeURIComponent(formattedPhone)}`;
      orFilters.push(f);
      subPhoneFilters.push(f);
    }
    if (rawId !== formattedPhone && !isEmailInput) {
      const f = `phone.eq.${encodeURIComponent(rawId)}`;
      orFilters.push(f);
      if (phoneDigits.length >= 7) {
        subPhoneFilters.push(f);
      }
    }
    if (phoneDigits.length >= 10) {
      const eq0 = `phone.eq.${encodeURIComponent(`0${phoneDigits}`)}`;
      const eq92 = `phone.eq.${encodeURIComponent(`+92${phoneDigits}`)}`;
      const eqRaw = `phone.eq.${encodeURIComponent(phoneDigits)}`;
      orFilters.push(eq0, eq92, eqRaw);
      subPhoneFilters.push(eq0, eq92);
    }
    if (cnicDigits.length >= 10) {
      orFilters.push(`cnic.eq.${encodeURIComponent(formattedCnic)}`);
      orFilters.push(`cnic.eq.${encodeURIComponent(cnicDigits)}`);
    }
    const orQuery = `or=(${Array.from(new Set(orFilters)).join(',')})&select=*&limit=5`;
    const uniqueSubPhoneFilters = Array.from(new Set(subPhoneFilters));
    const subOrQuery =
      uniqueSubPhoneFilters.length > 0
        ? `or=(${uniqueSubPhoneFilters.join(',')})&select=*&limit=5`
        : null;

    const [directUserRes, clientUsersRes, initialSubRes, masterCfg, publicIp, serverNowMs] = await Promise.all([
      callSupabaseProxy({
        table: 'users',
        method: 'GET',
        query: orQuery,
        timeoutMs: 8000,
      }),
      callSupabaseProxy({
        table: 'client_users',
        method: 'GET',
        query: orQuery,
        timeoutMs: 8000,
      }),
      subOrQuery
        ? callSupabaseProxy({
            table: 'subscriptions',
            method: 'GET',
            query: subOrQuery,
            timeoutMs: 8000,
          })
        : Promise.resolve({ ok: true, status: 200, data: [] as any[] }),
      fetchMasterEngineConfigFromSupabase(),
      getClientPublicIpAddress(),
      fetchSupabaseServerTimeMs(),
    ]);

    let directSubRes = initialSubRes;
    const firstMatchedUser = Array.isArray(directUserRes.data) ? directUserRes.data[0] : null;
    const firstMatchedClient = Array.isArray(clientUsersRes.data) ? clientUsersRes.data[0] : null;
    const resolvedSubDev = String(
      firstMatchedUser?.device_id || firstMatchedClient?.device_id || ''
    ).trim();
    const resolvedSubPhone = String(
      firstMatchedUser?.phone || firstMatchedClient?.phone || ''
    ).trim();
    if (
      (!Array.isArray(directSubRes.data) || directSubRes.data.length === 0) &&
      (resolvedSubDev || resolvedSubPhone)
    ) {
      const subFallbackFilters: string[] = [];
      if (resolvedSubDev && !resolvedSubDev.startsWith('RESET_')) {
        subFallbackFilters.push(`device_id.eq.${encodeURIComponent(resolvedSubDev)}`);
      }
      if (resolvedSubPhone) {
        subFallbackFilters.push(`phone.eq.${encodeURIComponent(resolvedSubPhone)}`);
      }
      if (subFallbackFilters.length > 0) {
        directSubRes = await callSupabaseProxy({
          table: 'subscriptions',
          method: 'GET',
          query: `or=(${Array.from(new Set(subFallbackFilters)).join(',')})&select=*&limit=5`,
          timeoutMs: 7000,
        });
      }
    }

    const matchesIdentity = (rec: any) => {
      if (!rec || typeof rec !== 'object') return false;
      const rPhone = normalizePhoneDigits(rec.phone || '');
      const rEmail = String(rec.email || '').trim().toLowerCase();
      const rCnic = normalizeCnicDigits(rec.cnic || '');
      if (isEmailInput && rEmail && rEmail === rawId.toLowerCase()) return true;
      if (phoneDigits.length >= 10 && rPhone && rPhone === phoneDigits) return true;
      if (cnicDigits.length >= 13 && rCnic && rCnic === cnicDigits) return true;
      if (
        formattedPhone &&
        String(rec.phone || '').trim().toLowerCase() === formattedPhone.toLowerCase()
      ) {
        return true;
      }
      return false;
    };

    const directUsers = Array.isArray(directUserRes.data) ? directUserRes.data : [];
    const clientUsersList = Array.isArray(clientUsersRes.data) ? clientUsersRes.data : [];
    const directSubs = Array.isArray(directSubRes.data) ? directSubRes.data : [];
    const usersList = directUsers;
    const subsList = directSubs;
    const uacList = Array.isArray(masterCfg?.userAccessControl)
      ? masterCfg.userAccessControl
      : Object.values(masterCfg?.userAccessControl || {});

    const matchedUser =
      directUsers.find(matchesIdentity) ||
      directUsers[0] ||
      null;
    const matchedClientUser =
      clientUsersList.find(matchesIdentity) ||
      clientUsersList[0] ||
      null;
    const matchedSub =
      directSubs.find(matchesIdentity) ||
      directSubs[0] ||
      null;
    const matchedUac: any = uacList.find(matchesIdentity) || null;

    const resolvedRole: BossUserRole = resolveUserRole({
      email:
        matchedUser?.email ||
        matchedClientUser?.email ||
        matchedUac?.email ||
        matchedSub?.email ||
        (isEmailInput ? rawId.toLowerCase() : ''),
      phone:
        matchedUser?.phone ||
        matchedClientUser?.phone ||
        matchedUac?.phone ||
        matchedSub?.phone ||
        (!isEmailInput && phoneDigits.length >= 10 ? formattedPhone : ''),
      cnic:
        matchedUser?.cnic ||
        matchedClientUser?.cnic ||
        matchedUac?.cnic ||
        matchedSub?.cnic ||
        (cnicDigits.length >= 13 ? formattedCnic : ''),
      matchedUser,
      matchedClientUser,
      matchedSub,
      matchedUac,
      masterCfg,
    });
    const isOwner = resolvedRole === 'OWNER';

    if (!matchedUser && !matchedClientUser && !matchedUac && !matchedSub && !isOwner) {
      setErrorMsg('Account nahi mila, pehle Create Account karein.');
      setShowSwitchToRegisterHint(true);
      return false;
    }

    const activeDeviceId = clientDeviceId || getOrCreateClientDeviceId();
    const macAddress = getOrCreateDeviceMacFingerprint();
    const deviceModel = getDeviceModelName();
    const gps = loadStoredGpsLocation();
    const now = serverNowMs > 0 ? serverNowMs : getEffectiveServerNowMs() || Date.now();
    const nowIso = new Date(now).toISOString();

    const targetEmailCheck = String(
      matchedUser?.email ||
        matchedClientUser?.email ||
        matchedUac?.email ||
        matchedSub?.email ||
        (isEmailInput ? rawId.toLowerCase() : isOwner ? 'ssaboor2t@gmail.com' : '')
    );
    const targetPhoneCheck = String(
      matchedUser?.phone ||
        matchedClientUser?.phone ||
        matchedUac?.phone ||
        matchedSub?.phone ||
        (!isEmailInput && phoneDigits.length >= 10 ? formattedPhone : '')
    );
    const targetCnicCheck = String(
      matchedUser?.cnic ||
        matchedClientUser?.cnic ||
        matchedUac?.cnic ||
        matchedSub?.cnic ||
        (cnicDigits.length >= 10 ? formattedCnic : '')
    );

    const sessionToken = generateActiveSessionToken();

    const preBlockCheck = evaluateClientAccessState({
      session: {
        verified: true,
        deviceId: matchedUser?.device_id || matchedClientUser?.device_id || activeDeviceId,
        name: String(
          matchedUser?.name ||
            matchedClientUser?.name ||
            matchedUac?.name ||
            (isOwner ? 'Syed Saboor Nawab (Owner)' : 'Client')
        ),
        phone: targetPhoneCheck,
        email: targetEmailCheck,
        cnic: targetCnicCheck,
        shopAddress: String(matchedUser?.shop_address || matchedClientUser?.shop_address || ''),
        loggedInAt: now,
        activeSessionToken: sessionToken,
        userRole: resolvedRole,
      },
      clientDeviceId: matchedUser?.device_id || matchedClientUser?.device_id || activeDeviceId,
      clientIpAddress: publicIp,
      clientMacAddress: macAddress,
      usersList,
      clientUsersList,
      subsList,
      masterCfg,
      serverNowMs: now,
    });

    if (!isOwner && preBlockCheck.status === 'BLOCKED') {
      setErrorMsg(`Account Blocked: ${preBlockCheck.reason || 'Suspended by Master Admin'}`);
      return false;
    }

    // Password verification (when account has a password_hash stored)
    const storedHash = String(
      matchedUser?.password_hash || matchedClientUser?.password_hash || ''
    ).trim();
    if (!opts.skipPasswordCheck) {
      if (storedHash) {
        if (!opts.password.trim()) {
          setErrorMsg('Apna Account Password darj karein.');
          return false;
        }
        const enteredHash = await hashPasswordSha256(opts.password);
        if (enteredHash !== storedHash) {
          setErrorMsg('Password ghalat hai. Apna sahih Password darj karein.');
          return false;
        }
      }
    }

    const enforceLock =
      !isOwner &&
      (masterCfg?.layoutConfig?.enforceDeviceHardwareLock !== undefined
        ? Boolean(masterCfg.layoutConfig.enforceDeviceHardwareLock)
        : true);

    const loginDevCandidates = [
      matchedUser?.device_id,
      matchedClientUser?.device_id,
      matchedSub?.device_id,
      matchedUac?.device_id,
      matchedUac?.deviceId,
    ]
      .map((d) => String(d || '').trim())
      .filter(Boolean);

    const resetDeviceId = loginDevCandidates.find((d) => d.startsWith('RESET_')) || '';
    const cloudDeviceId = resetDeviceId || loginDevCandidates[0] || '';

    // Optional new password save if legacy account had none
    const newPasswordHashToSave =
      !storedHash && opts.password.trim().length >= 6
        ? await hashPasswordSha256(opts.password)
        : undefined;

    const ownerVipFields = isOwner
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
      : {};

    const commonTelemetryPayload: Record<string, any> = {
      trial_used: true,
      is_registered: true,
      is_online: true,
      active_session_token: sessionToken,
      last_seen: nowIso,
      last_cloud_sync: now,
      mac_address: macAddress,
      device_model: deviceModel,
      fingerprint_enabled: true,
      ...ownerVipFields,
      ...(publicIp ? { ip_address: publicIp } : {}),
      ...(newPasswordHashToSave ? { password_hash: newPasswordHashToSave } : {}),
      ...(gps
        ? { latitude: gps.latitude, longitude: gps.longitude, location_url: gps.locationUrl }
        : {}),
    };

    if (!matchedUser && isOwner) {
      const ownerName = String(
        matchedUac?.name || matchedSub?.user_name || 'Syed Saboor Nawab (Owner)'
      );
      await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'POST',
          upsert: true,
          payload: {
            device_id: activeDeviceId,
            user_id: activeDeviceId,
            name: ownerName,
            company_name: 'BOSS ALUMINIUM & GLASS',
            email: targetEmailCheck,
            phone: targetPhoneCheck,
            cnic: targetCnicCheck,
            shop_address: String(matchedUac?.shop_address || 'Boss Aluminium & Glass HQ'),
            ...commonTelemetryPayload,
            created_at: nowIso,
          },
          timeoutMs: 10000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'POST',
          upsert: true,
          payload: {
            device_id: activeDeviceId,
            name: ownerName,
            email: targetEmailCheck,
            phone: targetPhoneCheck,
            cnic: targetCnicCheck,
            role: 'OWNER',
            active_session_token: sessionToken,
            is_online: true,
            last_seen: nowIso,
            created_at: nowIso,
          },
          timeoutMs: 8000,
        }).catch(() => ({ ok: false })),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: {
            device_id: activeDeviceId,
            user_name: ownerName,
            email: targetEmailCheck,
            phone: targetPhoneCheck,
            cnic: targetCnicCheck,
            ...ownerVipFields,
            last_updated: now,
            updated_at: nowIso,
            created_at: nowIso,
          },
          timeoutMs: 8000,
        }),
      ]).catch(() => {});
    } else if (resetDeviceId) {
      const targetPhone =
        matchedUser?.phone ||
        matchedClientUser?.phone ||
        matchedUac?.phone ||
        matchedSub?.phone ||
        formattedPhone;
      const targetEmail =
        matchedUser?.email ||
        matchedClientUser?.email ||
        matchedUac?.email ||
        matchedSub?.email ||
        (isEmailInput ? rawId.toLowerCase() : '');
      const patchFilter =
        matchedUser?.device_id && String(matchedUser.device_id).startsWith('RESET_')
          ? `device_id=eq.${encodeURIComponent(resetDeviceId)}`
          : targetPhone
          ? `phone=eq.${encodeURIComponent(targetPhone)}`
          : targetEmail
          ? `email=ilike.${encodeURIComponent(targetEmail)}`
          : `device_id=eq.${encodeURIComponent(resetDeviceId)}`;

      await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'PATCH',
          query: patchFilter,
          payload: {
            device_id: activeDeviceId,
            user_id: activeDeviceId,
            ...commonTelemetryPayload,
          },
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'PATCH',
          query: patchFilter,
          payload: {
            device_id: activeDeviceId,
            active_session_token: sessionToken,
            is_online: true,
            last_seen: nowIso,
          },
        }).catch(() => ({ ok: false })),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'PATCH',
          query: patchFilter,
          payload: {
            device_id: activeDeviceId,
            ...ownerVipFields,
            last_updated: now,
            updated_at: nowIso,
          },
        }),
      ]);
    } else if (enforceLock && cloudDeviceId && cloudDeviceId !== activeDeviceId) {
      setErrorMsg(
        'Yeh account kisi aur device par registered hai. Admin se Device Reset karwayein.'
      );
      return false;
    } else {
      const targetFilter = cloudDeviceId
        ? `device_id=eq.${encodeURIComponent(cloudDeviceId)}`
        : matchedUser?.phone || matchedClientUser?.phone
        ? `phone=eq.${encodeURIComponent(matchedUser?.phone || matchedClientUser?.phone)}`
        : matchedUser?.email || matchedClientUser?.email
        ? `email=ilike.${encodeURIComponent(matchedUser?.email || matchedClientUser?.email)}`
        : '';

      if (targetFilter) {
        await Promise.all([
          callSupabaseProxy({
            table: 'users',
            method: 'PATCH',
            query: targetFilter,
            payload: {
              ...(!cloudDeviceId ? { device_id: activeDeviceId, user_id: activeDeviceId } : {}),
              ...commonTelemetryPayload,
            },
            timeoutMs: 6000,
          }).catch(() => {}),
          callSupabaseProxy({
            table: 'client_users',
            method: 'PATCH',
            query: targetFilter,
            payload: {
              active_session_token: sessionToken,
              is_online: true,
              last_seen: nowIso,
              ...(!cloudDeviceId ? { device_id: activeDeviceId } : {}),
            },
            timeoutMs: 6000,
          }).catch(() => {}),
        ]);
      }
    }

    saveActiveSessionToken(sessionToken);

    const trialStart =
      Number(
        matchedSub?.trial_start_ms ||
          matchedSub?.trial_start_time ||
          matchedUser?.trial_start_time ||
          matchedClientUser?.trial_start_time ||
          matchedUac?.trial_start_time ||
          now
      ) || now;

    const cloudExpiry = isOwner
      ? 0
      : Math.max(
          0,
          ...[
            matchedSub?.activated_until_ms,
            matchedSub?.activated_until,
            matchedSub?.subscription_expiry,
            matchedUser?.activated_until_ms,
            matchedUser?.activated_until,
            matchedUser?.subscription_expiry,
            matchedClientUser?.activated_until_ms,
            matchedClientUser?.activated_until,
            matchedClientUser?.subscription_expiry,
            matchedUac?.subscription_expiry,
            matchedUac?.subscriptionExpiresAt,
            matchedUac?.activatedUntil,
            matchedUac?.activated_until,
          ].map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
        );

    const sessionDeviceId = isOwner
      ? cloudDeviceId && !cloudDeviceId.startsWith('RESET_')
        ? cloudDeviceId
        : activeDeviceId
      : resetDeviceId || !cloudDeviceId
      ? activeDeviceId
      : cloudDeviceId;
    const session: ClientAuthSession = {
      verified: true,
      deviceId: sessionDeviceId,
      userId: String(matchedUser?.user_id || matchedClientUser?.user_id || sessionDeviceId),
      name: String(
        matchedUser?.name ||
          matchedClientUser?.name ||
          matchedUac?.name ||
          matchedSub?.user_name ||
          (isOwner ? 'Syed Saboor Nawab (Owner)' : 'Valued Client')
      ),
      phone: targetPhoneCheck,
      email: targetEmailCheck,
      cnic: targetCnicCheck,
      shopAddress: String(
        matchedUser?.shop_address ||
          matchedClientUser?.shop_address ||
          matchedUac?.shopAddress ||
          ''
      ),
      companyName: String(
        matchedUser?.company_name ||
          matchedClientUser?.company_name ||
          (isOwner ? 'BOSS ALUMINIUM & GLASS' : '')
      ),
      selfieUrl: String(matchedUser?.selfie_url || ''),
      shopPhotoUrl: String(matchedUser?.shop_photo_url || ''),
      loggedInAt: now,
      trialStartTime: trialStart,
      trialExpiresAt: isOwner ? 0 : cloudExpiry > 0 ? cloudExpiry : trialStart + TWO_DAYS_MS,
      activeSessionToken: sessionToken,
      userRole: resolvedRole,
      ...(isOwner
        ? {
            isLifetimeFree: true,
            isActivated: true,
            packagePlan: 'LIFETIME_VIP',
            isBlocked: false,
          }
        : {}),
    };

    // Save real biometric binding ONLY if WebAuthn credential actually succeeded
    const bioRes = await enrollBiometricPasskey({
      deviceId: session.deviceId,
      identifier: session.email || session.phone || session.cnic || rawId,
      userName: session.name,
    });
    const finalCredId = bioRes.credentialId || biometricBinding?.credentialId;
    if (finalCredId) {
      const nextBinding: BiometricBinding = {
        deviceId: session.deviceId,
        identifier: session.email || session.phone || session.cnic || rawId,
        userName: session.name,
        email: session.email,
        phone: session.phone,
        cnic: session.cnic,
        credentialId: finalCredId,
        enrolledAt: now,
      };
      saveBiometricBinding(nextBinding);
      setBiometricBinding(nextBinding);
    }

    saveAuthSession(session);
    if (gps) {
      syncGpsToSupabaseUser(session.deviceId, gps);
    }
    onAuthenticated(session);
    return true;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setShowSwitchToRegisterHint(false);
    setShowSwitchToLoginHint(false);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorMsg('Internet band hai (Offline). Account login karne ke liye internet ON karein; login ke baad app offline bhi chale gi.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await performUniversalLogin({
        identifier: loginIdentifier,
        password: loginPassword,
        skipPasswordCheck: false,
      });
    } catch {
      setErrorMsg('Cloud server se rabta nahi ho saka. Internet connection check karein.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFingerprintLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setShowSwitchToRegisterHint(false);
    setShowSwitchToLoginHint(false);

    const saved = loadBiometricBinding();
    const enteredId = loginIdentifier.trim();

    if (!saved || !saved.credentialId) {
      setErrorMsg(
        'Fingerprint / Biometric is device par registered nahi hai. Pehle Password ya Google se Login karein (taakay real Biometric passkey link ho sakay).'
      );
      return;
    }

    setIsBiometricLoggingIn(true);
    try {
      const bioVerify = await verifyBiometricPasskey(saved.credentialId);
      if (!bioVerify.ok) {
        setErrorMsg(
          bioVerify.error ||
            'Fingerprint / Biometric verification fail ya cancel ho gayi. Password ya Google se Login karein.'
        );
        return;
      }

      await performUniversalLogin({
        identifier: enteredId || saved.identifier,
        password: loginPassword,
        skipPasswordCheck: !enteredId || enteredId.toLowerCase() === saved.identifier.toLowerCase(),
        enrollBiometric: true,
      });
    } catch {
      setErrorMsg('Fingerprint login verify karte waqt network error aaya.');
    } finally {
      setIsBiometricLoggingIn(false);
    }
  };

  // =========================================================================
  // DISPATCH EMAIL OTP VIA STRICT supabase.auth.signInWithOtp
  // =========================================================================
  const dispatchEmailOtp = async (params: {
    cleanName: string;
    cleanPhone: string;
    cleanEmail: string;
  }) => {
    const { cleanName, cleanPhone, cleanEmail } = params;
    const sbOtp = await sendSupabaseEmailOtp(cleanEmail, {
      name: cleanName,
      phone: cleanPhone,
      device_id: clientDeviceId,
    });

    if (!sbOtp.ok) {
      if (sbOtp.status === 429 || /rate|seconds|limit/i.test(sbOtp.error || '')) {
        throw new Error(
          'Email OTP bhejne mein thora waqfa darkar hai — 60 seconds baad dobara try karein.'
        );
      }
      throw new Error(
        sbOtp.error || 'Email par OTP send nahi ho saka. Apna email address verify karein.'
      );
    }

    setResendCooldownSec(60);
  };

  // =========================================================================
  // REGISTER STEP 1: VALIDATE, PASSWORD HASH, DUPLICATE CHECK & SEND OTP
  // =========================================================================
  const handleSendOtpStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setShowSwitchToRegisterHint(false);
    setShowSwitchToLoginHint(false);

    const cleanName = regName.trim();
    const cleanPhone = formatPakPhone(regPhone);
    const phoneDigits = normalizePhoneDigits(cleanPhone);
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanCnic = formatPakCnic(regCnic);
    const cnicDigits = normalizeCnicDigits(cleanCnic);
    const cleanAddress = regAddress.trim();
    const cleanPassword = regPassword;

    if (cleanName.length < 3) {
      setErrorMsg('Poora naam (Full Name) darj karein.');
      return;
    }
    if (phoneDigits.length < 10) {
      setErrorMsg('Sahih Mobile Number darj karein (e.g. 0300-1234567).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Sahih Email Address darj karein — OTP is email par bheja jaye ga.');
      return;
    }
    if (cnicDigits.length !== 13) {
      setErrorMsg('13 digits CNIC number darj karein (e.g. 37405-1234567-1).');
      return;
    }
    if (cleanAddress.length < 4) {
      setErrorMsg('Shop / Factory Address darj karein.');
      return;
    }
    if (cleanPassword.trim().length < 6) {
      setErrorMsg('Kam az kam 6 characters ka Account Password darj karein.');
      return;
    }
    if (!cnicFrontPhoto || !cnicBackPhoto) {
      setErrorMsg('Please upload a clear CNIC ID Card photo');
      return;
    }

    setIsSendingOtp(true);
    try {
      const activeDeviceId = clientDeviceId || getOrCreateClientDeviceId();
      const macAddress = getOrCreateDeviceMacFingerprint();
      const deviceModel = getDeviceModelName();

      const [usersDupRes, clientUsersDupRes, subsDupRes, masterCfg, publicIp, gpsRes, serverNowMs] =
        await Promise.all([
          fetchDuplicateCheckRows('users', 8000),
          fetchDuplicateCheckRows('client_users', 8000),
          fetchDuplicateCheckRows('subscriptions', 8000),
          fetchMasterEngineConfigFromSupabase(),
          getClientPublicIpAddress(),
          requestMandatoryGpsLocation(),
          fetchSupabaseServerTimeMs(),
        ]);

      if (!usersDupRes.ok && !clientUsersDupRes.ok) {
        setErrorMsg(
          `Database connection error (${usersDupRes.error || clientUsersDupRes.error || 'Supabase unreachable'}). Internet check karein.`
        );
        return;
      }

      const gps = gpsRes.ok ? gpsRes.gps : loadStoredGpsLocation();
      if (gpsRes.ok && gpsRes.gps) {
        setLiveGps(gpsRes.gps);
        setGpsStatus('READY');
        setGpsStatusMsg(gpsRes.message);
      }

      const usersList = usersDupRes.rows;
      const clientUsersList = clientUsersDupRes.rows;
      const subsList = subsDupRes.rows;
      const uacList = Array.isArray(masterCfg?.userAccessControl)
        ? masterCfg.userAccessControl
        : Object.values(masterCfg?.userAccessControl || {});

      const isOwner = isOwnerIdentity({
        email: cleanEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        masterCfg,
      });

      // Strict Duplicate Check across users & client_users (CNIC, Phone, Email, Device ID)
      const comboMatch = findExistingAccountComboMatch({
        email: cleanEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        deviceId: activeDeviceId,
        ipAddress: publicIp,
        macAddress,
        usersList,
        clientUsersList,
        subsList,
        uacList,
        identityOnly: isOwner,
      });

      const hasDuplicateMatch = Boolean(
        comboMatch.matchedUser ||
          comboMatch.matchedClientUser ||
          comboMatch.matchedSub ||
          comboMatch.matchedUac
      );

      if (hasDuplicateMatch) {
        if (isOwner) {
          // Load full owner rows before logging in
          const [fullU, fullCu, fullSub] = await Promise.all([
            callSupabaseProxy({
              table: 'users',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=5`,
              timeoutMs: 7000,
            }),
            callSupabaseProxy({
              table: 'client_users',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=5`,
              timeoutMs: 7000,
            }),
            callSupabaseProxy({
              table: 'subscriptions',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=5`,
              timeoutMs: 7000,
            }),
          ]);
          const fullMatchedUser =
            (Array.isArray(fullU.data) && fullU.data[0]) || comboMatch.matchedUser;
          const fullMatchedClientUser =
            (Array.isArray(fullCu.data) && fullCu.data[0]) || comboMatch.matchedClientUser;
          const fullMatchedSub =
            (Array.isArray(fullSub.data) && fullSub.data[0]) || comboMatch.matchedSub;

          await loginIntoMatchedExistingRecord({
            matchedUser: fullMatchedUser,
            matchedClientUser: fullMatchedClientUser,
            matchedSub: fullMatchedSub,
            matchedUac: comboMatch.matchedUac,
            usersList: fullMatchedUser ? [fullMatchedUser] : usersList,
            clientUsersList: fullMatchedClientUser ? [fullMatchedClientUser] : clientUsersList,
            subsList: fullMatchedSub ? [fullMatchedSub] : subsList,
            masterCfg,
            publicIp,
            macAddress,
            deviceModel,
            gps,
            serverNowMs,
            fallbackName: cleanName,
            fallbackEmail: cleanEmail,
            fallbackPhone: cleanPhone,
            fallbackCnic: cleanCnic,
            fallbackAddress: cleanAddress,
          });
          return;
        }
        if (!comboMatch.allowMultiAccount) {
          const dupLabels = comboMatch.matchedFields.join(', ') || 'CNIC / Phone / Email / Device ID';
          setErrorMsg(
            `Account pehle se maujood hai (${dupLabels}). Duplicate ID banana mana hai — apni purani ID se Login karein.`
          );
          setShowSwitchToLoginHint(true);
          return;
        }
      }

      // Mandatory GPS Location enforcement for ANY brand-new non-owner account creation
      if (!isOwner && (!gpsRes.ok || !gpsRes.gps)) {
        setLiveGps(null);
        setGpsStatus('ERROR');
        setGpsStatusMsg(gpsRes.message);
        setErrorMsg(gpsRes.message || 'Please allow Location access to create your account');
        return;
      }

      const passwordHash = await hashPasswordSha256(cleanPassword);
      setRegPasswordHash(passwordHash);
      setOtpInput('');

      await dispatchEmailOtp({
        cleanName,
        cleanPhone,
        cleanEmail,
      });

      try {
        localStorage.setItem(
          PENDING_REG_DRAFT_KEY,
          JSON.stringify({
            name: cleanName,
            companyName: regCompany.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            cnic: cleanCnic,
            shopAddress: cleanAddress,
            passwordHash,
            cnicFrontPhoto,
            cnicBackPhoto,
            selfiePhoto,
            shopPhoto,
          })
        );
      } catch {
        // ignore quota error
      }

      setInfoMsg(
        `6-digit OTP code aapke Email (${cleanEmail}) par bhej diya gaya hai. Apna Inbox ya Spam folder check karein.`
      );
      setRegStep('OTP');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Email par OTP bhejne mein masla aaya. Dobara try karein.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldownSec > 0 || isSendingOtp) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSendingOtp(true);
    try {
      await dispatchEmailOtp({
        cleanName: regName.trim(),
        cleanPhone: formatPakPhone(regPhone),
        cleanEmail: regEmail.trim().toLowerCase(),
      });
      setInfoMsg(`Naya OTP code (${regEmail.trim().toLowerCase()}) par bhej diya gaya hai!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'OTP resend nahi ho saka. Thori der baad try karein.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // =========================================================================
  // REGISTER STEP 2: STRICT supabase.auth.verifyOtp & SAVE TO SUPABASE
  // =========================================================================
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const entered = otpInput.trim();
    const isUrlOrToken =
      entered.includes('access_token=') ||
      entered.includes('token_hash=') ||
      entered.includes('token=');
    const cleanDigitsOrCode = isUrlOrToken ? entered : entered.replace(/\s+/g, '');
    if (cleanDigitsOrCode.length < 6) {
      setErrorMsg('Email mein aaya 6-digit OTP code (ya confirmation link) darj karein.');
      return;
    }

    const cleanName = regName.trim();
    const cleanPhone = formatPakPhone(regPhone);
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanCnic = formatPakCnic(regCnic);
    const cleanAddress = regAddress.trim();

    setIsVerifyingAndCreating(true);
    try {
      // Strict Supabase Auth verifyOtp — profile is NEVER saved without verified OTP
      const verified = await verifySupabaseEmailOtp(cleanEmail, cleanDigitsOrCode);
      if (!verified.ok) {
        setErrorMsg(
          verified.error || 'OTP code ghalat ya expire ho chuka hai. Dobara check karein.'
        );
        return;
      }

      const activeDeviceId = clientDeviceId || getOrCreateClientDeviceId();
      const macAddress = getOrCreateDeviceMacFingerprint();
      const deviceModel = getDeviceModelName();

      const [usersDupRes, clientUsersDupRes, subsDupRes, masterCfg, gpsRes, publicIp, serverNowMs] =
        await Promise.all([
          fetchDuplicateCheckRows('users', 8000),
          fetchDuplicateCheckRows('client_users', 8000),
          fetchDuplicateCheckRows('subscriptions', 8000),
          fetchMasterEngineConfigFromSupabase(),
          requestMandatoryGpsLocation(),
          getClientPublicIpAddress(),
          fetchSupabaseServerTimeMs(),
        ]);

      if (!usersDupRes.ok && !clientUsersDupRes.ok) {
        setErrorMsg(
          `Database connection error (${usersDupRes.error || clientUsersDupRes.error || 'Supabase unreachable'}). Profile save nahi hua.`
        );
        return;
      }

      const gps = gpsRes.ok ? gpsRes.gps : loadStoredGpsLocation();
      if (gpsRes.ok && gpsRes.gps) {
        setLiveGps(gpsRes.gps);
        setGpsStatus('READY');
        setGpsStatusMsg(gpsRes.message);
      }

      const usersList = usersDupRes.rows;
      const clientUsersList = clientUsersDupRes.rows;
      const subsList = subsDupRes.rows;
      const uacList = Array.isArray(masterCfg?.userAccessControl)
        ? masterCfg.userAccessControl
        : Object.values(masterCfg?.userAccessControl || {});

      const effectiveMasterCfg =
        Object.keys(masterCfg || {}).length ? masterCfg : loadCachedMasterEngineConfig();
      const isOwner = isOwnerIdentity({
        email: cleanEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        masterCfg: effectiveMasterCfg,
      });

      // Final Duplicate Check BEFORE creating any account/trial
      const comboMatch = findExistingAccountComboMatch({
        email: cleanEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        deviceId: activeDeviceId,
        ipAddress: publicIp,
        macAddress,
        usersList,
        clientUsersList,
        subsList,
        uacList,
        identityOnly: isOwner,
      });

      const hasDuplicateMatch = Boolean(
        comboMatch.matchedUser ||
          comboMatch.matchedClientUser ||
          comboMatch.matchedSub ||
          comboMatch.matchedUac
      );

      if (hasDuplicateMatch) {
        if (isOwner) {
          const [fullU, fullCu, fullSub] = await Promise.all([
            callSupabaseProxy({
              table: 'users',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=5`,
              timeoutMs: 7000,
            }),
            callSupabaseProxy({
              table: 'client_users',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=5`,
              timeoutMs: 7000,
            }),
            callSupabaseProxy({
              table: 'subscriptions',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=5`,
              timeoutMs: 7000,
            }),
          ]);
          const fullMatchedUser =
            (Array.isArray(fullU.data) && fullU.data[0]) || comboMatch.matchedUser;
          const fullMatchedClientUser =
            (Array.isArray(fullCu.data) && fullCu.data[0]) || comboMatch.matchedClientUser;
          const fullMatchedSub =
            (Array.isArray(fullSub.data) && fullSub.data[0]) || comboMatch.matchedSub;

          await loginIntoMatchedExistingRecord({
            matchedUser: fullMatchedUser,
            matchedClientUser: fullMatchedClientUser,
            matchedSub: fullMatchedSub,
            matchedUac: comboMatch.matchedUac,
            usersList: fullMatchedUser ? [fullMatchedUser] : usersList,
            clientUsersList: fullMatchedClientUser ? [fullMatchedClientUser] : clientUsersList,
            subsList: fullMatchedSub ? [fullMatchedSub] : subsList,
            masterCfg: effectiveMasterCfg,
            publicIp,
            macAddress,
            deviceModel,
            gps,
            serverNowMs,
            fallbackName: cleanName,
            fallbackEmail: cleanEmail,
            fallbackPhone: cleanPhone,
            fallbackCnic: cleanCnic,
            fallbackAddress: cleanAddress,
          });
          return;
        }
        if (!comboMatch.allowMultiAccount) {
          const dupLabels = comboMatch.matchedFields.join(', ') || 'CNIC / Phone / Email / Device ID';
          setErrorMsg(
            `Account pehle se maujood hai (${dupLabels}). Duplicate ID banana mana hai — apni purani ID se Login karein.`
          );
          setShowSwitchToLoginHint(true);
          return;
        }
      }

      if (!isOwner && (!gpsRes.ok || !gpsRes.gps)) {
        setLiveGps(null);
        setGpsStatus('ERROR');
        setGpsStatusMsg(gpsRes.message);
        setErrorMsg(gpsRes.message || 'Please allow Location access to create your account');
        return;
      }

      const trialStart = serverNowMs > 0 ? serverNowMs : getEffectiveServerNowMs() || Date.now();
      const trialStartIso = new Date(trialStart).toISOString();
      const expiry = isOwner ? 0 : trialStart + TWO_DAYS_MS;
      const expiryIso = new Date(isOwner ? trialStart : expiry).toISOString();
      const effectivePasswordHash =
        regPasswordHash || (regPassword.trim() ? await hashPasswordSha256(regPassword) : '');
      const cleanCompany = regCompany.trim() || `${cleanName} Aluminium & Glass`;
      const sessionToken = generateActiveSessionToken();
      const recordUuid = generateSafeUUID();
      const userRole = resolveUserRole({
        email: cleanEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        masterCfg: effectiveMasterCfg,
      });

      const userPayload: Record<string, any> = {
        id: recordUuid,
        device_id: activeDeviceId,
        user_id: activeDeviceId,
        name: cleanName,
        company_name: cleanCompany,
        phone: cleanPhone,
        email: cleanEmail,
        cnic: cleanCnic,
        shop_address: cleanAddress || gps?.address || gps?.city || '',
        cnic_front_url: cnicFrontPhoto,
        cnic_back_url: cnicBackPhoto,
        ...(selfiePhoto ? { selfie_url: selfiePhoto } : {}),
        ...(shopPhoto ? { shop_photo_url: shopPhoto } : {}),
        password_hash: effectivePasswordHash,
        ip_address: publicIp || '',
        mac_address: macAddress,
        device_model: deviceModel,
        fingerprint_enabled: true,
        active_session_token: sessionToken,
        is_online: true,
        last_seen: trialStartIso,
        is_registered: true,
        trial_used: true,
        account_status: isOwner ? 'ACTIVE' : 'TRIAL',
        status: isOwner ? 'ACTIVE' : 'TRIAL',
        is_activated: isOwner,
        is_lifetime: isOwner,
        is_blocked: false,
        block_reason: '',
        subscription_tier: isOwner ? 'LIFETIME_VIP' : 'TRIAL',
        ...(isOwner ? { package_name: 'Lifetime Free VIP Package' } : {}),
        trial_start: trialStartIso,
        ...(isOwner ? {} : { trial_end: expiryIso }),
        trial_start_time: trialStart,
        activated_until: expiry,
        activated_until_ms: expiry,
        subscription_expiry: expiry,
        last_cloud_sync: trialStart,
        created_at: trialStartIso,
        ...(gps
          ? {
              latitude: gps.latitude,
              longitude: gps.longitude,
              location_url: gps.locationUrl,
              ...(gps.city ? { gps_city: gps.city } : {}),
              ...(gps.address ? { gps_address: gps.address } : {}),
            }
          : {}),
      };

      const subscriptionPayload = {
        device_id: activeDeviceId,
        user_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        cnic: cleanCnic,
        trial_used: true,
        status: isOwner ? 'ACTIVE' : 'TRIAL',
        is_activated: isOwner,
        is_lifetime: isOwner,
        is_blocked: false,
        subscription_tier: isOwner ? 'LIFETIME_VIP' : 'TRIAL',
        ...(isOwner ? { package_name: 'Lifetime Free VIP Package' } : {}),
        activated_until: expiry,
        activated_until_ms: expiry,
        last_updated: trialStart,
        updated_at: trialStartIso,
        created_at: trialStartIso,
      };

      // Strict Database Insert (both users AND client_users MUST succeed — zero silent offline-only fallback)
      const [uRes, cuRes, subRes] = await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'POST',
          upsert: true,
          payload: userPayload,
          timeoutMs: 14000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'POST',
          upsert: true,
          payload: {
            id: recordUuid,
            device_id: activeDeviceId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            cnic: cleanCnic,
            shop_address: cleanAddress || gps?.address || gps?.city || '',
            company_name: cleanCompany,
            role: userRole,
            active_session_token: sessionToken,
            is_online: true,
            last_seen: trialStartIso,
            created_at: trialStartIso,
          },
          timeoutMs: 10000,
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: subscriptionPayload,
          timeoutMs: 10000,
        }),
      ]);

      if (!uRes.ok || !cuRes.ok) {
        const errs: string[] = [];
        if (!uRes.ok) errs.push(`users: ${uRes.error || `HTTP ${uRes.status}`}`);
        if (!cuRes.ok) errs.push(`client_users: ${cuRes.error || `HTTP ${cuRes.status}`}`);
        setErrorMsg(
          `Database save error — profile create nahi hua (${errs.join(' | ')}).`
        );
        return;
      }

      if (!subRes.ok) {
        await callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: {
            device_id: activeDeviceId,
            user_name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            cnic: cleanCnic,
            trial_used: true,
            status: isOwner ? 'ACTIVE' : 'TRIAL',
            is_activated: isOwner,
            is_lifetime: isOwner,
            subscription_tier: isOwner ? 'LIFETIME_VIP' : 'TRIAL',
            updated_at: trialStartIso,
          },
          timeoutMs: 8000,
        });
      }

      saveActiveSessionToken(sessionToken);

      const session: ClientAuthSession = {
        verified: true,
        deviceId: activeDeviceId,
        userId: activeDeviceId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        cnic: cleanCnic,
        shopAddress: cleanAddress || gps?.address || gps?.city || '',
        companyName: cleanCompany,
        selfieUrl: selfiePhoto || '',
        shopPhotoUrl: shopPhoto || '',
        loggedInAt: trialStart,
        trialStartTime: trialStart,
        trialExpiresAt: expiry,
        activeSessionToken: sessionToken,
        userRole,
        ...(isOwner
          ? {
              isLifetimeFree: true,
              isActivated: true,
              packagePlan: 'LIFETIME_VIP',
              isBlocked: false,
            }
          : {}),
      };

      // Enroll real WebAuthn passkey if supported (only bind when genuine credentialId exists)
      const bioRes = await enrollBiometricPasskey({
        deviceId: clientDeviceId,
        identifier: cleanEmail || cleanPhone,
        userName: cleanName,
      });
      if (bioRes.ok && bioRes.credentialId) {
        const binding: BiometricBinding = {
          deviceId: clientDeviceId,
          identifier: cleanEmail || cleanPhone,
          userName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          cnic: cleanCnic,
          credentialId: bioRes.credentialId,
          enrolledAt: trialStart,
        };
        saveBiometricBinding(binding);
        setBiometricBinding(binding);
      }

      try {
        localStorage.removeItem(PENDING_REG_DRAFT_KEY);
      } catch {
        // ignore
      }
      saveAuthSession(session);
      onAuthenticated(session);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration complete karte waqt network error aaya.');
    } finally {
      setIsVerifyingAndCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#05070B]/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overflow-x-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0C1017] border-2 border-[#F5B738] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Locked Brand & Non-Dismissible Gate) */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#121822] via-[#171E2B] to-[#121822] border-b border-[#F5B738]/40 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={mainLogoUrl || bossLionLogoImg}
              alt="Boss Aluminium & Glass"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#F5B738] shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-[#F5B738] tracking-wide truncate">
                BOSS ALUMINIUM &amp; GLASS
              </h1>
              <p className="text-[10.5px] text-slate-300 truncate">
                Client Verification &amp; Cloud Account Gate
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-[#F5B738]/50 text-[#F5B738] font-mono text-[9.5px] font-bold shrink-0">
            {clientDeviceId}
          </span>
        </div>

        {/* 2 Clean Tabs: Login vs Create Account (hidden while completing mandatory Google Shop & CNIC Profile) */}
        {!googleProfileStep && (
          <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-[#090C12] border-b border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMsg(null);
                setShowSwitchToRegisterHint(false);
                setShowSwitchToLoginHint(false);
              }}
              className={`boss-flat-btn py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'LOGIN'
                  ? 'bg-[#F5B738] text-black shadow-md'
                  : 'bg-[#14181F] text-slate-300 border border-slate-800 hover:border-[#F5B738]/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Login (Pehle Se Account Hai)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('REGISTER');
                setErrorMsg(null);
                setShowSwitchToRegisterHint(false);
                setShowSwitchToLoginHint(false);
              }}
              className={`boss-flat-btn py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'bg-[#F5B738] text-black shadow-md'
                  : 'bg-[#14181F] text-slate-300 border border-slate-800 hover:border-[#F5B738]/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Create Account (Naya Account)</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[78vh] overflow-y-auto">
          {infoMsg && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-[#F5B738]/50 text-amber-200 text-[11px] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#F5B738] shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/80 text-rose-200 text-[11.5px] space-y-2">
              <div className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {pendingGoogleUser && (
                <button
                  type="button"
                  onClick={() => finalizeGoogleOAuthUser(pendingGoogleUser, true)}
                  disabled={isGoogleAuthenticating}
                  className="boss-flat-btn px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Enable GPS Location &amp; Complete Google Signup</span>
                </button>
              )}
              {showSwitchToRegisterHint && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setErrorMsg(null);
                    setShowSwitchToRegisterHint(false);
                  }}
                  className="boss-flat-btn px-3 py-1 rounded-lg bg-[#F5B738] text-black font-black text-[11px] cursor-pointer"
                >
                  Create Account par jayein →
                </button>
              )}
              {showSwitchToLoginHint && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setLoginIdentifier(formatPakPhone(regPhone) || regEmail.trim());
                    setErrorMsg(null);
                    setShowSwitchToLoginHint(false);
                  }}
                  className="boss-flat-btn px-3 py-1 rounded-lg bg-[#F5B738] text-black font-black text-[11px] cursor-pointer"
                >
                  Login Tab par jayein →
                </button>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* MANDATORY GOOGLE SIGN-IN COMPLETION: SHOP & CNIC PROFILE POPUP  */}
          {/* =============================================================== */}
          {googleProfileStep && (
            <form onSubmit={handleCompleteGoogleProfileSubmit} className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/50 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-[#F5B738] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Complete Your Shop &amp; CNIC Profile</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9.5px] font-bold">
                    Google Verified ✓
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-snug">
                  <strong className="text-white">{googleProfileStep.email}</strong> verify ho chuka hai. App use karne se pehle apna Mobile Number (bina SMS OTP ke), Shop Name, aur CNIC verification mukammal karein.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Full Name <span className="text-[#F5B738]">*</span>
                  </label>
                  <input
                    type="text"
                    value={gpName}
                    onChange={(e) => setGpName(e.target.value)}
                    placeholder="Muhammad Kashif"
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Mobile Number (No SMS OTP) <span className="text-[#F5B738]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={gpPhone}
                    onChange={(e) => setGpPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs font-mono focus:border-[#F5B738] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Shop / Company Name <span className="text-[#F5B738]">*</span>
                  </label>
                  <input
                    type="text"
                    value={gpCompany}
                    onChange={(e) => setGpCompany(e.target.value)}
                    placeholder="e.g. Bismillah Aluminium & Glass"
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    CNIC Number (13 Digits) <span className="text-[#F5B738]">*</span>
                  </label>
                  <input
                    type="text"
                    value={gpCnic}
                    onChange={(e) => setGpCnic(e.target.value)}
                    placeholder="37405-1234567-1"
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs font-mono focus:border-[#F5B738] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                  Shop / Factory Address
                </label>
                <input
                  type="text"
                  value={gpAddress}
                  onChange={(e) => setGpAddress(e.target.value)}
                  placeholder="Main Aluminium Market, City"
                  className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[92px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleGpPhotoUpload(e, 'FRONT')}
                    className="hidden"
                  />
                  {gpCnicFront ? (
                    <>
                      <img
                        src={gpCnicFront}
                        alt="CNIC Front"
                        className="w-full h-14 object-cover rounded-lg border border-emerald-500/60"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CNIC Front Ready
                      </span>
                    </>
                  ) : (
                    <>
                      {isCompressingGpPhoto === 'FRONT' ? (
                        <RefreshCw className="w-5 h-5 text-[#F5B738] animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-[#F5B738]" />
                      )}
                      <span className="text-[10.5px] font-bold text-white">CNIC Front Photo *</span>
                      <span className="text-[9.5px] text-slate-400 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Camera / Gallery (&lt;80KB)
                      </span>
                    </>
                  )}
                </label>

                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[92px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleGpPhotoUpload(e, 'BACK')}
                    className="hidden"
                  />
                  {gpCnicBack ? (
                    <>
                      <img
                        src={gpCnicBack}
                        alt="CNIC Back"
                        className="w-full h-14 object-cover rounded-lg border border-emerald-500/60"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CNIC Back Ready
                      </span>
                    </>
                  ) : (
                    <>
                      {isCompressingGpPhoto === 'BACK' ? (
                        <RefreshCw className="w-5 h-5 text-[#F5B738] animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-[#F5B738]" />
                      )}
                      <span className="text-[10.5px] font-bold text-white">CNIC Back Photo *</span>
                      <span className="text-[9.5px] text-slate-400 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Camera / Gallery (&lt;80KB)
                      </span>
                    </>
                  )}
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingGoogleProfile}
                  onClick={async () => {
                    setGoogleProfileStep(null);
                    setErrorMsg(null);
                    setInfoMsg(null);
                    processedGoogleUserIdRef.current = null;
                    await supabase.auth.signOut().catch(() => {});
                  }}
                  className="boss-flat-btn px-3 py-2.5 rounded-xl bg-[#14181F] border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingGoogleProfile || isCompressingGpPhoto !== null}
                  className="boss-flat-btn flex-1 py-2.5 px-3 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSavingGoogleProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying CNIC &amp; Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save Shop &amp; CNIC Profile &amp; Enter App</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* TAB A: LOGIN (UNIVERSAL EMAIL/PHONE/CNIC + PASSWORD + BIOMETRIC) */}
          {/* =============================================================== */}
          {!googleProfileStep && activeTab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              {/* Continue with Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleAuthenticating || isLoggingIn || isBiometricLoggingIn}
                className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isGoogleAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Connecting Google Account...</span>
                  </>
                ) : (
                  <>
                    <GoogleGIcon className="w-4 h-4 shrink-0" />
                    <span>Continue with Google (Direct Auto-Verified Login)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="flex-1 h-px bg-slate-800" />
                <span>YA EMAIL / MOBILE / CNIC SE LOGIN KAREIN</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Email / Mobile Number / CNIC <span className="text-[#F5B738]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#F5B738] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="email@gmail.com / 0300-1234567 / 37405-..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#14181F] border border-slate-700 text-white text-xs font-mono focus:border-[#F5B738] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#F5B738] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Apna password darj karein"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="submit"
                  disabled={isLoggingIn || isBiometricLoggingIn || isGoogleAuthenticating}
                  className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Login &amp; Restore</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleFingerprintLogin}
                  disabled={isLoggingIn || isBiometricLoggingIn || isGoogleAuthenticating}
                  className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-[#14181F] border border-[#F5B738]/70 hover:bg-[#F5B738]/15 text-[#F5B738] font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isBiometricLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 shrink-0" />
                      <span>Fingerprint Login</span>
                    </>
                  )}
                </button>
              </div>

              {biometricBinding && biometricBinding.credentialId && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] text-emerald-300 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate">
                    <Fingerprint className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">
                      Linked Biometric: <strong>{biometricBinding.userName}</strong> ({biometricBinding.identifier})
                    </span>
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10.5px] text-slate-400">
                <span>
                  Device ID: <strong className="text-slate-200 font-mono">{clientDeviceId}</strong>
                </span>
                <a
                  href={`https://wa.me/923105524225?text=${encodeURIComponent(
                    `Assalam-o-Alaikum Boss Admin, mera Device ID ${clientDeviceId} hai. Mujhe account login / device reset mein help chahiye.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Admin Help (WhatsApp)
                </a>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* TAB B: CREATE ACCOUNT (GOOGLE + PASSWORD + CNIC + EMAIL OTP)    */}
          {/* =============================================================== */}
          {!googleProfileStep && activeTab === 'REGISTER' && regStep === 'FORM' && (
            <form onSubmit={handleSendOtpStep} className="space-y-3">
              {/* Continue with Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleAuthenticating || isSendingOtp}
                className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isGoogleAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Creating Auto-Verified Account...</span>
                  </>
                ) : (
                  <>
                    <GoogleGIcon className="w-4 h-4 shrink-0" />
                    <span>Continue with Google (Instant Verified ID)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="flex-1 h-px bg-slate-800" />
                <span>YA FORM BHAR KAR ACCOUNT BANAYEIN</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Full Name <span className="text-[#F5B738]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Mobile Number <span className="text-[#F5B738]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white font-mono text-xs focus:border-[#F5B738] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Email Address (OTP yahan aaye ga) <span className="text-[#F5B738]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    CNIC Number <span className="text-[#F5B738]">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regCnic}
                      onChange={(e) => setRegCnic(formatPakCnic(e.target.value))}
                      placeholder="37405-1234567-1"
                      maxLength={15}
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white font-mono text-xs focus:border-[#F5B738] outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Shop / Factory Address <span className="text-[#F5B738]">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Main Aluminium Market, City"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                    Set Account Password <span className="text-[#F5B738]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      minLength={6}
                      className="w-full pl-8 pr-9 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      aria-label="Toggle registration password"
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                  Company / Shop Name
                </label>
                <input
                  type="text"
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                  placeholder="e.g. Bismillah Aluminium & Glass"
                  className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                />
              </div>

              {/* CNIC Front & Back + Selfie & Shop Photo Uploads */}
              <div className="grid grid-cols-2 gap-2.5">
                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[92px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'FRONT')}
                    className="hidden"
                  />
                  {cnicFrontPhoto ? (
                    <>
                      <img
                        src={cnicFrontPhoto}
                        alt="CNIC Front"
                        className="w-full h-14 object-cover rounded-lg border border-emerald-500/60"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CNIC Front Ready
                      </span>
                    </>
                  ) : (
                    <>
                      {isCompressingPhoto === 'FRONT' ? (
                        <RefreshCw className="w-5 h-5 text-[#F5B738] animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-[#F5B738]" />
                      )}
                      <span className="text-[10.5px] font-bold text-white">CNIC Front Photo *</span>
                      <span className="text-[9.5px] text-slate-400 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Camera / Gallery
                      </span>
                    </>
                  )}
                </label>

                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[92px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'BACK')}
                    className="hidden"
                  />
                  {cnicBackPhoto ? (
                    <>
                      <img
                        src={cnicBackPhoto}
                        alt="CNIC Back"
                        className="w-full h-14 object-cover rounded-lg border border-emerald-500/60"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CNIC Back Ready
                      </span>
                    </>
                  ) : (
                    <>
                      {isCompressingPhoto === 'BACK' ? (
                        <RefreshCw className="w-5 h-5 text-[#F5B738] animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-[#F5B738]" />
                      )}
                      <span className="text-[10.5px] font-bold text-white">CNIC Back Photo *</span>
                      <span className="text-[9.5px] text-slate-400 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Camera / Gallery
                      </span>
                    </>
                  )}
                </label>

                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[84px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handlePhotoUpload(e, 'SELFIE')}
                    className="hidden"
                  />
                  {selfiePhoto ? (
                    <>
                      <img
                        src={selfiePhoto}
                        alt="Selfie Photo"
                        className="w-full h-14 object-cover rounded-lg border border-emerald-500/60"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Selfie Ready
                      </span>
                    </>
                  ) : (
                    <>
                      {isCompressingPhoto === 'SELFIE' ? (
                        <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-sky-400" />
                      )}
                      <span className="text-[10px] font-bold text-slate-200">Selfie Photo (Optional)</span>
                    </>
                  )}
                </label>

                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[84px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoUpload(e, 'SHOP')}
                    className="hidden"
                  />
                  {shopPhoto ? (
                    <>
                      <img
                        src={shopPhoto}
                        alt="Shop Photo"
                        className="w-full h-14 object-cover rounded-lg border border-emerald-500/60"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Shop Photo Ready
                      </span>
                    </>
                  ) : (
                    <>
                      {isCompressingPhoto === 'SHOP' ? (
                        <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="text-[10px] font-bold text-slate-200">Shop / Factory Photo</span>
                    </>
                  )}
                </label>
              </div>

              {/* Mandatory GPS Location Requirement Indicator */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                  gpsStatus === 'READY' && liveGps
                    ? 'bg-emerald-950/35 border-emerald-500/60 text-emerald-200'
                    : 'bg-amber-950/35 border-amber-500/70 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin
                    className={`w-4 h-4 shrink-0 ${
                      gpsStatus === 'READY' && liveGps ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-bold truncate">
                      {gpsStatus === 'READY' && liveGps
                        ? `GPS Location Active (${liveGps.latitude}, ${liveGps.longitude})`
                        : gpsStatus === 'CHECKING'
                        ? 'Checking GPS Location...'
                        : 'GPS Location Required (Must Be ON)'}
                    </div>
                    <div className="text-[10px] opacity-85 truncate">
                      {gpsStatus === 'READY' && liveGps
                        ? 'Account create karte waqt aapki location save hogi'
                        : gpsStatusMsg || 'Account banane ke liye Mobile/Browser Location ON karein'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => ensureMandatoryGpsForNewAccount(true)}
                  disabled={gpsStatus === 'CHECKING'}
                  className={`boss-flat-btn px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 cursor-pointer ${
                    gpsStatus === 'READY' && liveGps
                      ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-200 hover:bg-emerald-500 hover:text-black'
                      : 'bg-[#F5B738] text-black hover:bg-amber-400'
                  }`}
                >
                  {gpsStatus === 'CHECKING' ? 'Checking...' : gpsStatus === 'READY' ? 'Refresh GPS' : 'Turn On GPS'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSendingOtp || isCompressingPhoto !== null || isGoogleAuthenticating}
                className="boss-flat-btn w-full py-2.5 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending OTP to Email...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Email OTP &amp; Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* =============================================================== */}
          {/* TAB B STEP 2: EMAIL OTP VERIFICATION (NO ON-SCREEN OTP)         */}
          {/* =============================================================== */}
          {!googleProfileStep && activeTab === 'REGISTER' && regStep === 'OTP' && (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#14181F] border border-[#F5B738]/40 space-y-1 text-xs">
                <div className="font-bold text-[#F5B738] flex items-center gap-1.5">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>Email OTP Verification ({regEmail.trim()})</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Aapke email address par 6-digit verification code bheja gaya hai. Apna <strong>Inbox ya Spam folder</strong> check karke code neechay darj karein.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Enter 6-Digit Email OTP Code <span className="text-[#F5B738]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldownSec > 0 || isSendingOtp}
                    className="text-[10.5px] font-bold text-[#F5B738] hover:underline disabled:text-slate-500 cursor-pointer"
                  >
                    {resendCooldownSec > 0 ? `Resend in ${resendCooldownSec}s` : 'Resend Email OTP'}
                  </button>
                </div>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      val.includes('http') ||
                      val.includes('access_token=') ||
                      val.includes('token_hash=') ||
                      val.includes('token=')
                    ) {
                      setOtpInput(val);
                    } else {
                      setOtpInput(val.replace(/[^0-9]/g, '').slice(0, 8));
                    }
                  }}
                  placeholder="Enter 6-Digit Email OTP Code"
                  className={`w-full py-2.5 px-3 rounded-xl bg-[#14181F] border-2 border-[#F5B738]/70 text-center font-mono font-black text-[#F5B738] focus:border-[#F5B738] outline-none ${
                    otpInput.length > 10
                      ? 'text-xs tracking-normal'
                      : 'text-lg tracking-[0.35em]'
                  }`}
                  required
                />
                <p className="mt-1.5 text-[10px] text-slate-400 leading-snug">
                  Apne Email Inbox ya Spam folder mein aaya hua <strong className="text-slate-200">6-digit numeric OTP code</strong> yahan darj karein.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegStep('FORM');
                    setErrorMsg(null);
                  }}
                  className="boss-flat-btn px-3 py-2.5 rounded-xl bg-[#14181F] border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingAndCreating || otpInput.length < 6}
                  className="boss-flat-btn flex-1 py-2.5 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isVerifyingAndCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Account to Admin Cloud...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Email OTP &amp; Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
