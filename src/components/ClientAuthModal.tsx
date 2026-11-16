import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  KeyRound,
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
import { callSupabaseProxy } from '../utils/supabaseClientConfig';
import {
  ClientAuthSession,
  compressImageToDataUrl,
  extractAuthCallbackFromUrl,
  extractSmsGatewayConfig,
  fetchAdminServer,
  fetchMasterEngineConfigFromSupabase,
  formatPakCnic,
  formatPakPhone,
  getOrCreateClientDeviceId,
  normalizeCnicDigits,
  normalizePhoneDigits,
  saveAuthSession,
  sendSupabaseEmailOtp,
  syncRegisteredUserToAdminUac,
  TWO_DAYS_MS,
  verifySupabaseEmailOtp,
} from '../utils/adminApiConfig';

const PENDING_REG_DRAFT_KEY = 'boss_pending_reg_draft_v1';

interface ClientAuthModalProps {
  clientDeviceId: string;
  onAuthenticated: (session: ClientAuthSession) => void;
  externalNotice?: string | null;
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
  clientDeviceId,
  onAuthenticated,
  externalNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(externalNotice || null);
  const [showSwitchToRegisterHint, setShowSwitchToRegisterHint] = useState(false);
  const [showSwitchToLoginHint, setShowSwitchToLoginHint] = useState(false);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Create Account State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCnic, setRegCnic] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [cnicFrontPhoto, setCnicFrontPhoto] = useState('');
  const [cnicBackPhoto, setCnicBackPhoto] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<'FRONT' | 'BACK' | null>(null);

  // Email OTP Step State (NEVER render/display OTP code on screen)
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingAndCreating, setIsVerifyingAndCreating] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpProviderMode, setOtpProviderMode] = useState<'SUPABASE_EMAIL' | 'RESEND_EMAIL'>(
    'SUPABASE_EMAIL'
  );
  const [otpRowId, setOtpRowId] = useState<string | number | null>(null);
  const [resendCooldownSec, setResendCooldownSec] = useState<number>(0);

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

  // Restore pending registration draft if returning from a confirmation email link redirect
  useEffect(() => {
    try {
      const callback = extractAuthCallbackFromUrl();
      const rawDraft = localStorage.getItem(PENDING_REG_DRAFT_KEY);
      if (rawDraft) {
        const d = JSON.parse(rawDraft);
        if (d && d.email) {
          setRegName(d.name || '');
          setRegPhone(d.phone || '');
          setRegEmail(d.email || '');
          setRegCnic(d.cnic || '');
          setRegAddress(d.shopAddress || '');
          setCnicFrontPhoto(d.cnicFrontPhoto || '');
          setCnicBackPhoto(d.cnicBackPhoto || '');
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

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'FRONT' | 'BACK'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setIsCompressingPhoto(side);
    try {
      const compressed = await compressImageToDataUrl(file, 900, 0.72);
      if (side === 'FRONT') setCnicFrontPhoto(compressed);
      else setCnicBackPhoto(compressed);
    } catch {
      setErrorMsg('Image load nahi ho saki, dobara try karein.');
    } finally {
      setIsCompressingPhoto(null);
    }
  };

  // =========================================================================
  // LOGIN HANDLER (Existing Account + Hardware Device Lock + RESET_ Rebind)
  // =========================================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setShowSwitchToRegisterHint(false);
    setShowSwitchToLoginHint(false);

    const rawId = loginIdentifier.trim();
    const phoneDigits = normalizePhoneDigits(rawId);
    const cnicDigits = normalizeCnicDigits(rawId);
    const isEmailInput = rawId.includes('@');

    if (!rawId || (!isEmailInput && phoneDigits.length < 7 && cnicDigits.length < 10)) {
      setErrorMsg('Apna registered Mobile Number, Email ya CNIC darj karein.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const formattedPhone = formatPakPhone(rawId);

      const [directUserRes, allUsersRes, clientUsersRes, subsRes, masterCfg] = await Promise.all([
        !isEmailInput && formattedPhone
          ? callSupabaseProxy({
              table: 'users',
              method: 'GET',
              query: `phone=eq.${encodeURIComponent(formattedPhone)}&select=*`,
              timeoutMs: 8000,
            })
          : Promise.resolve({ ok: true, data: [] }),
        callSupabaseProxy({
          table: 'users',
          method: 'GET',
          query: 'select=*&limit=250',
          timeoutMs: 8000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'GET',
          query: 'select=*&limit=250',
          timeoutMs: 8000,
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'GET',
          query: 'select=*&limit=250',
          timeoutMs: 8000,
        }),
        fetchMasterEngineConfigFromSupabase(),
      ]);

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

      const directList = Array.isArray(directUserRes.data) ? directUserRes.data : [];
      const usersList = Array.isArray(allUsersRes.data) ? allUsersRes.data : [];
      const clientList = Array.isArray(clientUsersRes.data) ? clientUsersRes.data : [];
      const subsList = Array.isArray(subsRes.data) ? subsRes.data : [];
      const uacList = Array.isArray(masterCfg?.userAccessControl)
        ? masterCfg.userAccessControl
        : Object.values(masterCfg?.userAccessControl || {});

      const matchedUser =
        directList[0] ||
        usersList.find(matchesIdentity) ||
        clientList.find(matchesIdentity) ||
        null;
      const matchedUac: any = uacList.find(matchesIdentity) || null;
      const matchedSub = subsList.find(matchesIdentity) || null;

      if (!matchedUser && !matchedUac && !matchedSub) {
        setErrorMsg('Account nahi mila, pehle Create Account karein.');
        setShowSwitchToRegisterHint(true);
        return;
      }

      const isBlocked = Boolean(
        matchedUser?.is_blocked ||
          matchedUser?.isBlocked ||
          matchedUser?.account_status === 'BLOCKED' ||
          matchedSub?.is_blocked ||
          matchedUac?.is_blocked ||
          matchedUac?.isBlocked
      );
      if (isBlocked) {
        const blockReason =
          matchedUser?.block_reason ||
          matchedUac?.block_reason ||
          matchedUac?.blockReason ||
          'Suspended by Master Admin';
        setErrorMsg(`Account Blocked: ${blockReason}`);
        return;
      }

      const enforceLock =
        masterCfg?.layoutConfig?.enforceDeviceHardwareLock !== undefined
          ? Boolean(masterCfg.layoutConfig.enforceDeviceHardwareLock)
          : true;

      const loginDevCandidates = [
        matchedUser?.device_id,
        matchedSub?.device_id,
        matchedUac?.device_id,
        matchedUac?.deviceId,
      ]
        .map((d) => String(d || '').trim())
        .filter(Boolean);

      const resetDeviceId = loginDevCandidates.find((d) => d.startsWith('RESET_')) || '';
      const cloudDeviceId = resetDeviceId || loginDevCandidates[0] || '';

      const activeDeviceId = clientDeviceId || getOrCreateClientDeviceId();

      if (resetDeviceId) {
        const now = Date.now();
        const targetPhone = matchedUser?.phone || matchedUac?.phone || matchedSub?.phone || formattedPhone;
        const patchFilter =
          matchedUser?.device_id && String(matchedUser.device_id).startsWith('RESET_')
            ? `device_id=eq.${encodeURIComponent(resetDeviceId)}`
            : targetPhone
            ? `phone=eq.${encodeURIComponent(targetPhone)}`
            : `device_id=eq.${encodeURIComponent(resetDeviceId)}`;
        await Promise.all([
          callSupabaseProxy({
            table: 'users',
            method: 'PATCH',
            query: patchFilter,
            payload: {
              device_id: activeDeviceId,
              user_id: activeDeviceId,
              updated_at_epoch_ms: now,
            },
          }),
          callSupabaseProxy({
            table: 'client_users',
            method: 'PATCH',
            query: patchFilter,
            payload: {
              device_id: activeDeviceId,
              user_id: activeDeviceId,
              updated_at_epoch_ms: now,
            },
          }),
          callSupabaseProxy({
            table: 'subscriptions',
            method: 'PATCH',
            query: patchFilter,
            payload: {
              device_id: activeDeviceId,
              user_id: activeDeviceId,
              updated_at: new Date().toISOString(),
            },
          }),
          syncRegisteredUserToAdminUac({
            device_id: activeDeviceId,
            name: String(matchedUser?.name || matchedUac?.name || 'Valued Client'),
            phone: String(matchedUser?.phone || matchedUac?.phone || formattedPhone || rawId),
            email: String(matchedUser?.email || matchedUac?.email || (isEmailInput ? rawId : '')),
            cnic: String(matchedUser?.cnic || matchedUac?.cnic || ''),
            shop_address: String(
              matchedUser?.shop_address || matchedUac?.shop_address || matchedUac?.shopAddress || ''
            ),
            trial_start_time: Number(
              matchedSub?.trial_start_ms ||
                matchedUser?.registered_at_epoch_ms ||
                matchedUac?.trial_start_time ||
                now
            ),
            subscription_expiry: Number(
              matchedSub?.activated_until_ms ||
                matchedUac?.subscription_expiry ||
                now + TWO_DAYS_MS
            ),
          }),
        ]);
      } else if (enforceLock && cloudDeviceId && cloudDeviceId !== activeDeviceId) {
        setErrorMsg(
          'Yeh account kisi aur device par registered hai. Admin se Device Reset karwayein.'
        );
        return;
      } else if (!cloudDeviceId) {
        const targetPhone = matchedUser?.phone || matchedUac?.phone || formattedPhone;
        if (targetPhone) {
          await callSupabaseProxy({
            table: 'users',
            method: 'PATCH',
            query: `phone=eq.${encodeURIComponent(targetPhone)}`,
            payload: { device_id: activeDeviceId, user_id: activeDeviceId },
          });
        }
      }

      const trialStart =
        Number(
          matchedSub?.trial_start_ms ||
            matchedSub?.trial_start_time ||
            matchedUser?.trial_start_time ||
            matchedUser?.registered_at_epoch_ms ||
            matchedUac?.trial_start_time ||
            matchedUac?.trialStartTime ||
            Date.now()
        ) || Date.now();

      const cloudExpiry = Math.max(
        0,
        ...[
          matchedSub?.activated_until_ms,
          matchedSub?.activated_until,
          matchedSub?.subscription_expiry,
          matchedUser?.activated_until_ms,
          matchedUser?.activated_until,
          matchedUser?.subscription_expiry,
          matchedUac?.subscription_expiry,
          matchedUac?.subscriptionExpiresAt,
          matchedUac?.activatedUntil,
          matchedUac?.activated_until,
        ].map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
      );

      const session: ClientAuthSession = {
        verified: true,
        deviceId: activeDeviceId,
        userId: String(matchedUser?.user_id || activeDeviceId),
        name: String(matchedUser?.name || matchedUac?.name || 'Valued Client'),
        phone: String(matchedUser?.phone || matchedUac?.phone || formattedPhone || rawId),
        email: String(matchedUser?.email || matchedUac?.email || (isEmailInput ? rawId : '')),
        cnic: String(matchedUser?.cnic || matchedUac?.cnic || ''),
        shopAddress: String(matchedUser?.shop_address || matchedUac?.shopAddress || ''),
        loggedInAt: Date.now(),
        trialStartTime: trialStart,
        trialExpiresAt: cloudExpiry > 0 ? cloudExpiry : trialStart + TWO_DAYS_MS,
      };

      saveAuthSession(session);
      onAuthenticated(session);
    } catch {
      setErrorMsg('Cloud server se rabta nahi ho saka. Internet connection check karein.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // =========================================================================
  // DISPATCH EMAIL OTP (NO CODE SHOWN ON SCREEN)
  // =========================================================================
  const dispatchEmailOtp = async (params: {
    cleanName: string;
    cleanPhone: string;
    cleanEmail: string;
    smsCfg: ReturnType<typeof extractSmsGatewayConfig>;
  }) => {
    const { cleanName, cleanPhone, cleanEmail, smsCfg } = params;
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Try server /api/send-email-otp (uses Resend API if Admin or env configured)
    let sentViaResend = false;
    try {
      const emailResp = await fetch('/api/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
          otp: code,
        }),
      });
      const emailData = await emailResp.json().catch(() => ({}));
      if (emailResp.ok && emailData?.ok) {
        sentViaResend = true;
      }
    } catch {
      // fall through to Supabase Auth Email OTP
    }

    if (sentViaResend) {
      setOtpProviderMode('RESEND_EMAIL');
      const otpRes = await callSupabaseProxy({
        table: 'otp_verifications',
        method: 'POST',
        upsert: true,
        payload: {
          phone: cleanPhone,
          email: cleanEmail,
          otp_code: code,
          is_verified: false,
          created_at: new Date().toISOString(),
        },
        timeoutMs: 8000,
      });
      if (otpRes.ok && Array.isArray(otpRes.data) && otpRes.data[0]?.id) {
        setOtpRowId(otpRes.data[0].id);
      } else if (otpRes.ok && otpRes.data?.id) {
        setOtpRowId(otpRes.data.id);
      }
    } else {
      // Dispatch real Email OTP via Supabase Built-in Auth Mailer
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

      setOtpProviderMode('SUPABASE_EMAIL');
      const otpRes = await callSupabaseProxy({
        table: 'otp_verifications',
        method: 'POST',
        upsert: true,
        payload: {
          phone: cleanPhone,
          email: cleanEmail,
          otp_code: 'EMAIL_SENT',
          is_verified: false,
          created_at: new Date().toISOString(),
        },
        timeoutMs: 8000,
      });
      if (otpRes.ok && Array.isArray(otpRes.data) && otpRes.data[0]?.id) {
        setOtpRowId(otpRes.data[0].id);
      }
    }

    // Optional SendPK SMS relay if Admin enabled SendPK
    if (smsCfg.sendpkEnabled) {
      try {
        await fetchAdminServer('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            email: cleanEmail,
            otp: code,
            deviceId: clientDeviceId,
          }),
          timeoutMs: 5000,
        });
      } catch {
        // non-fatal
      }
    }

    setResendCooldownSec(60);
  };

  // =========================================================================
  // REGISTER STEP 1: VALIDATE, DUPLICATE CHECK & SEND OTP TO EMAIL
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
    const cleanEmail = regEmail.trim();
    const cleanCnic = formatPakCnic(regCnic);
    const cnicDigits = normalizeCnicDigits(cleanCnic);
    const cleanAddress = regAddress.trim();

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
    if (!cnicFrontPhoto || !cnicBackPhoto) {
      setErrorMsg('CNIC Front aur Back dono photos upload karein.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const [usersRes, clientUsersRes, masterCfg] = await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'GET',
          query: 'select=device_id,phone,cnic,email&limit=300',
          timeoutMs: 8000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'GET',
          query: 'select=device_id,phone,cnic,email&limit=300',
          timeoutMs: 8000,
        }),
        fetchMasterEngineConfigFromSupabase(),
      ]);

      const usersList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const clientList = Array.isArray(clientUsersRes.data) ? clientUsersRes.data : [];
      const uacList = Array.isArray(masterCfg?.userAccessControl)
        ? masterCfg.userAccessControl
        : Object.values(masterCfg?.userAccessControl || {});

      const allExisting = [...usersList, ...clientList, ...uacList];
      const allowSecondCnic = Boolean(
        masterCfg?.allowSecondCnic ?? masterCfg?.layoutConfig?.allowSecondCnic
      );

      const phoneDuplicate = allExisting.some(
        (r: any) => normalizePhoneDigits(r?.phone || '') === phoneDigits
      );
      const cnicDuplicate =
        !allowSecondCnic &&
        allExisting.some((r: any) => normalizeCnicDigits(r?.cnic || '') === cnicDigits);

      if (phoneDuplicate || cnicDuplicate) {
        setErrorMsg('Account already exists, please Login');
        setShowSwitchToLoginHint(true);
        return;
      }

      const smsCfg = extractSmsGatewayConfig(masterCfg);
      setOtpInput('');

      await dispatchEmailOtp({
        cleanName,
        cleanPhone,
        cleanEmail,
        smsCfg,
      });

      try {
        localStorage.setItem(
          PENDING_REG_DRAFT_KEY,
          JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            cnic: cleanCnic,
            shopAddress: cleanAddress,
            cnicFrontPhoto,
            cnicBackPhoto,
          })
        );
      } catch {
        // ignore quota error
      }

      setInfoMsg(
        `Verification code aapke Email (${cleanEmail}) par bhej diya gaya hai. Apna Inbox ya Spam folder check karein.`
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
      const masterCfg = await fetchMasterEngineConfigFromSupabase();
      const smsCfg = extractSmsGatewayConfig(masterCfg);
      await dispatchEmailOtp({
        cleanName: regName.trim(),
        cleanPhone: formatPakPhone(regPhone),
        cleanEmail: regEmail.trim(),
        smsCfg,
      });
      setInfoMsg(`Naya OTP code (${regEmail.trim()}) par bhej diya gaya hai!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'OTP resend nahi ho saka. Thori der baad try karein.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // =========================================================================
  // REGISTER STEP 2: VERIFY EMAIL OTP & SYNC TO USERS + CLIENT_USERS + SUBS + ADMIN UAC
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
    const cleanEmail = regEmail.trim();
    const cleanCnic = formatPakCnic(regCnic);
    const cleanAddress = regAddress.trim();

    setIsVerifyingAndCreating(true);
    try {
      if (otpProviderMode === 'RESEND_EMAIL' && !isUrlOrToken) {
        const otpCheck = await callSupabaseProxy({
          table: 'otp_verifications',
          method: 'GET',
          query: `email=eq.${encodeURIComponent(cleanEmail)}&order=created_at.desc&limit=1`,
          timeoutMs: 7000,
        });
        const latestRow = Array.isArray(otpCheck.data) ? otpCheck.data[0] : null;
        if (!latestRow?.otp_code || String(latestRow.otp_code) !== cleanDigitsOrCode) {
          setErrorMsg('OTP code ghalat hai. Apna Email inbox check karke sahih code darj karein.');
          return;
        }
      } else {
        const verified = await verifySupabaseEmailOtp(cleanEmail, cleanDigitsOrCode);
        if (!verified.ok) {
          setErrorMsg(
            verified.error || 'OTP code ghalat ya expire ho chuka hai. Dobara check karein.'
          );
          return;
        }
      }

      const trialStart = Date.now();
      const expiry = trialStart + TWO_DAYS_MS;

      if (otpRowId !== null) {
        await callSupabaseProxy({
          table: 'otp_verifications',
          method: 'PATCH',
          query: `id=eq.${encodeURIComponent(String(otpRowId))}`,
          payload: { is_verified: true },
          timeoutMs: 5000,
        });
      }

      // Exact column payloads matching live Supabase tables
      const userPayload = {
        device_id: clientDeviceId,
        user_id: clientDeviceId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        whatsapp: cleanPhone,
        cnic: cleanCnic,
        shop_address: cleanAddress,
        is_phone_verified: true,
        is_email_verified: true,
        is_profile_completed: true,
        cnic_front_url: cnicFrontPhoto,
        cnic_back_url: cnicBackPhoto,
        account_status: 'TRIAL',
        isBlocked: false,
        is_blocked: false,
        block_reason: '',
        registered_at_epoch_ms: trialStart,
        updated_at_epoch_ms: trialStart,
      };

      const clientUserPayload = { ...userPayload };
      delete (clientUserPayload as any).block_reason;

      const subscriptionPayload = {
        device_id: clientDeviceId,
        user_id: clientDeviceId,
        phone: cleanPhone,
        cnic: cleanCnic,
        is_activated: false,
        is_lifetime: false,
        subscription_tier: 'TRIAL',
        trial_start_ms: trialStart,
        activated_until_ms: expiry,
        updated_at: new Date().toISOString(),
      };

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
          payload: clientUserPayload,
          timeoutMs: 14000,
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: subscriptionPayload,
          timeoutMs: 10000,
        }),
      ]);

      // Also sync into Admin Panel's master_engine_config.userAccessControl immediately
      await syncRegisteredUserToAdminUac({
        device_id: clientDeviceId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        cnic: cleanCnic,
        shop_address: cleanAddress,
        trial_start_time: trialStart,
        subscription_expiry: expiry,
      });

      if (!uRes.ok && !cuRes.ok) {
        setErrorMsg(
          uRes.error ||
            cuRes.error ||
            'Admin cloud par account details save nahi ho sakin. Dobara try karein.'
        );
        return;
      }

      if (!subRes.ok) {
        // Retry minimal subscription row silently if needed
        await callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: {
            device_id: clientDeviceId,
            user_id: clientDeviceId,
            phone: cleanPhone,
            cnic: cleanCnic,
            is_activated: false,
            is_lifetime: false,
            subscription_tier: 'TRIAL',
            updated_at: new Date().toISOString(),
          },
          timeoutMs: 8000,
        });
      }

      const session: ClientAuthSession = {
        verified: true,
        deviceId: clientDeviceId,
        userId: clientDeviceId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        cnic: cleanCnic,
        shopAddress: cleanAddress,
        loggedInAt: trialStart,
        trialStartTime: trialStart,
        trialExpiresAt: expiry,
      };

      try {
        localStorage.removeItem(PENDING_REG_DRAFT_KEY);
      } catch {
        // ignore
      }
      saveAuthSession(session);
      onAuthenticated(session);
    } catch {
      setErrorMsg('Registration complete karte waqt network error aaya.');
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
              src={bossLionLogoImg}
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

        {/* 2 Clean Tabs: Login vs Create Account */}
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
                    setLoginIdentifier(formatPakPhone(regPhone));
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
          {/* TAB A: LOGIN (REGISTERED USER)                                  */}
          {/* =============================================================== */}
          {activeTab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800 space-y-1 text-[11px] text-slate-300">
                <div className="font-bold text-[#F5B738] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Registered Client Login</span>
                </div>
                <p className="text-slate-400 leading-snug">
                  Apna registered Mobile Number, Email ya CNIC darj karein. Account Admin Cloud aur Device Hardware Lock se verify hoga.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Mobile Number / Email / CNIC <span className="text-[#F5B738]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#F5B738] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="0300-1234567 / email@domain.com / 37405-..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#14181F] border border-slate-700 text-white text-xs font-mono focus:border-[#F5B738] outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="boss-flat-btn w-full py-2.5 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Cloud Account...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login &amp; Open Calculator</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10.5px] text-slate-400">
                <span>Device ID: <strong className="text-slate-200 font-mono">{clientDeviceId}</strong></span>
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
          {/* TAB B: CREATE ACCOUNT (REGISTRATION + CNIC + EMAIL OTP)         */}
          {/* =============================================================== */}
          {activeTab === 'REGISTER' && regStep === 'FORM' && (
            <form onSubmit={handleSendOtpStep} className="space-y-3">
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

              {/* CNIC Front & Back Photo Uploads */}
              <div className="grid grid-cols-2 gap-2.5">
                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[96px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoUpload(e, 'FRONT')}
                    className="hidden"
                  />
                  {cnicFrontPhoto ? (
                    <>
                      <img
                        src={cnicFrontPhoto}
                        alt="CNIC Front"
                        className="w-full h-16 object-cover rounded-lg border border-emerald-500/60"
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

                <label className="cursor-pointer rounded-xl bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[96px] overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoUpload(e, 'BACK')}
                    className="hidden"
                  />
                  {cnicBackPhoto ? (
                    <>
                      <img
                        src={cnicBackPhoto}
                        alt="CNIC Back"
                        className="w-full h-16 object-cover rounded-lg border border-emerald-500/60"
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
              </div>

              <button
                type="submit"
                disabled={isSendingOtp || isCompressingPhoto !== null}
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
          {activeTab === 'REGISTER' && regStep === 'OTP' && (
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
                  placeholder="6-Digit OTP ya Confirmation Link Paste Karein"
                  className={`w-full py-2.5 px-3 rounded-xl bg-[#14181F] border-2 border-[#F5B738]/70 text-center font-mono font-black text-[#F5B738] focus:border-[#F5B738] outline-none ${
                    otpInput.length > 10
                      ? 'text-xs tracking-normal'
                      : 'text-lg tracking-[0.35em]'
                  }`}
                  required
                />
                <p className="mt-1.5 text-[10px] text-slate-400 leading-snug">
                  Agar email mein 6-digit code ki jagah <strong className="text-slate-300">&quot;Confirm your mail&quot;</strong> link aaya ho aur click par <strong className="text-rose-300">localhost refused to connect</strong> aaye, to browser address bar se us link ko copy karke yahan paste kar dein.
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
