import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  AppOfferBanner,
  BankAccountConfig,
  ClientAppLayoutControlConfig,
  ClientSupportRequest,
  SubscriptionPackageConfig,
} from '../types/bossModels';
import {
  BiometricBinding,
  clearBiometricBinding,
  ClientAuthSession,
  deleteClientAccountInSupabase,
  enrollBiometricPasskey,
  hashPasswordSha256,
  isOwnerIdentity,
  loadBiometricBinding,
  loadCachedMasterEngineConfig,
  saveBiometricBinding,
  sendSupabaseEmailOtp,
  syncUserPasswordAndOtpToCloud,
  upsertClientSubscriptionOrder,
  verifySupabaseEmailOtp,
} from '../utils/adminApiConfig';
import {
  callSupabaseProxy,
  compressFileToJpegDataUrl,
  getEffectiveServerNowMs,
  uploadImageToUserUploadsBucket,
} from '../utils/supabaseClientConfig';

export type ProfileHubTab = 'PACKAGE' | 'SHOP' | 'IDENTITY' | 'SECURITY' | 'SUPPORT';

interface ClientProfileHubModalProps {
  initialTab: ProfileHubTab;
  onClose: () => void;
  authSession: ClientAuthSession | null;
  clientDeviceId: string;
  cloudAccessInfo?: {
    status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
    tier: string;
    role?: string;
    expiresAt: number | null;
    serverNowMs?: number;
    reason: string;
    lastSyncedAt: number | null;
  };
  isSyncingCloud?: boolean;
  onSyncFromSupabase?: (options?: { forceRates?: boolean; silent?: boolean }) => Promise<boolean>;
  // Package & Payments
  packages: SubscriptionPackageConfig[];
  bankAccounts: BankAccountConfig[];
  activeOffer?: AppOfferBanner | null;
  preselectedPackage?: SubscriptionPackageConfig | null;
  // Shop Branding
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone: string;
  companyNtn: string;
  onUpdateCompanyInfo: (info: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    ntn?: string;
  }) => void;
  layoutConfig: ClientAppLayoutControlConfig;
  onUpdateLayoutConfig: (cfg: ClientAppLayoutControlConfig) => void;
  mainLogoUrl: string;
  letterheadBgUrl: string;
  onUpdateLetterheadBgUrl: (url: string) => void;
  onRestoreDefaultBrandingAssets?: () => void;
  onSyncUserProfileToCloud?: (profilePatch: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyNtn?: string;
    tagline?: string;
    selfieUrl?: string;
    shopPhotoUrl?: string;
  }) => Promise<void> | void;
  // Support & Messages
  supportRequests: ClientSupportRequest[];
  isSubmittingSupportRequest: boolean;
  onSubmitSupportRequest?: (payload: {
    userName: string;
    userPhone: string;
    userEmail: string;
    requestType: string;
    message: string;
  }) => Promise<boolean | { ok: boolean; error?: string }>;
  onRefreshSupportRequests?: () => Promise<void> | void;
  onDeleteSupportRequest?: (id: string) => Promise<void> | void;
  onClearAllSupportRequests?: () => Promise<void> | void;
  unreadAdminSupportCount?: number;
  onMarkSupportMessagesRead?: () => void;
  // Logout / Account Deletion
  onLogout?: () => void;
  onAccountDeletedLogout: () => void;
}

function generateSixDigitOtp(): string {
  try {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return String(100000 + (arr[0] % 900000));
  } catch {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}

function extractSupportScreenshotUrl(msg: string): { cleanText: string; screenshotUrl: string | null } {
  const match = msg.match(/\[Screenshot:\s*(https?:\/\/[^\]\s]+)\]/i);
  if (!match) return { cleanText: msg, screenshotUrl: null };
  return {
    cleanText: msg.replace(match[0], '').trim(),
    screenshotUrl: match[1],
  };
}

export const ClientProfileHubModal: React.FC<ClientProfileHubModalProps> = ({
  initialTab,
  onClose,
  authSession,
  clientDeviceId,
  cloudAccessInfo,
  isSyncingCloud = false,
  onSyncFromSupabase,
  packages,
  bankAccounts,
  activeOffer,
  preselectedPackage = null,
  companyName,
  companyTagline,
  companyAddress,
  companyPhone,
  companyNtn,
  onUpdateCompanyInfo,
  layoutConfig,
  onUpdateLayoutConfig,
  mainLogoUrl,
  letterheadBgUrl,
  onUpdateLetterheadBgUrl,
  onRestoreDefaultBrandingAssets,
  onSyncUserProfileToCloud,
  supportRequests,
  isSubmittingSupportRequest,
  onSubmitSupportRequest,
  onRefreshSupportRequests,
  onDeleteSupportRequest,
  onClearAllSupportRequests,
  unreadAdminSupportCount = 0,
  onMarkSupportMessagesRead,
  onLogout,
  onAccountDeletedLogout,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileHubTab>(initialTab);
  const [hubToast, setHubToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setHubToast(msg);
    setTimeout(() => setHubToast(null), 3600);
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // -------------------------------------------------------------------------
  // TAB 1: PACKAGE & PAYMENT ORDER STATE
  // -------------------------------------------------------------------------
  const [selectedPkg, setSelectedPkg] = useState<SubscriptionPackageConfig | null>(
    preselectedPackage || packages[0] || null
  );
  const [bankName, setBankName] = useState<string>(
    bankAccounts.find((b) => b.isActive !== false)?.bankName || 'Easypaisa Wallet'
  );
  const [amountInput, setAmountInput] = useState<string>(() =>
    String(
      (preselectedPackage || packages[0])?.priceRs ??
        (preselectedPackage || packages[0])?.price ??
        3000
    )
  );
  const [tidInput, setTidInput] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptBase64, setReceiptBase64] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [clientNameInput, setClientNameInput] = useState(authSession?.name || companyName || '');
  const [clientPhoneInput, setClientPhoneInput] = useState(authSession?.phone || companyPhone || '');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isCheckingOrder, setIsCheckingOrder] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedPackage) {
      setSelectedPkg(preselectedPackage);
      setAmountInput(String(preselectedPackage.priceRs ?? preselectedPackage.price ?? 3000));
    } else if (!selectedPkg && packages.length > 0) {
      setSelectedPkg(packages[0]);
      setAmountInput(String(packages[0].priceRs ?? packages[0].price ?? 3000));
    }
  }, [preselectedPackage, packages, selectedPkg]);

  const checkOrderStatus = async () => {
    if (!clientDeviceId) return;
    setIsCheckingOrder(true);
    try {
      const sbRes = await callSupabaseProxy({
        table: 'subscriptions',
        method: 'GET',
        query: `device_id=eq.${encodeURIComponent(clientDeviceId)}&select=*&limit=1`,
        timeoutMs: 7000,
      });
      const subRow = Array.isArray(sbRes.data) ? sbRes.data[0] : null;
      if (subRow && (subRow.last_payment_tid || subRow.status)) {
        const st = String(subRow.status || 'PENDING').toUpperCase();
        const isApproved =
          Boolean(subRow.is_activated) ||
          st === 'ACTIVE' ||
          st === 'APPROVED' ||
          st === 'APPROVED_AUTO' ||
          st === 'APPROVED_MANUAL';
        if (subRow.last_payment_tid || isApproved) {
          setActiveOrder({
            tid: subRow.last_payment_tid || 'CLOUD-SUB',
            status: isApproved ? 'APPROVED_MANUAL' : st,
            packageName: subRow.package_name || 'Subscription Plan',
            amount: subRow.amount,
            bankName: subRow.payment_method,
            receiptUrl: subRow.receipt_url,
          });
        }
        if (isApproved) {
          onSyncFromSupabase?.({ forceRates: false, silent: true });
        }
      }
    } catch {
      // ignore offline error
    } finally {
      setIsCheckingOrder(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PACKAGE') {
      checkOrderStatus();
    }
  }, [activeTab]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingReceipt(true);
    try {
      const uploaded = await uploadImageToUserUploadsBucket({
        fileOrDataUrl: file,
        folder: 'receipts',
        deviceId: clientDeviceId,
        tag: 'payment_receipt',
      });
      setReceiptUrl(uploaded.url);
      setReceiptBase64(uploaded.base64DataUrl);
      showToast('✅ Payment receipt compressed & attached!');
    } catch {
      showToast('Receipt image load nahi ho saki. Dobara try karein.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTid = tidInput.trim().toUpperCase();
    if (!cleanTid) {
      showToast('Transaction ID (TID) darj karein.');
      return;
    }
    const pkg = selectedPkg || packages[0];
    if (!pkg) return;
    const amountVal = Number(amountInput) || pkg.priceRs || pkg.price || 3000;
    setIsSubmittingOrder(true);
    try {
      const res = await upsertClientSubscriptionOrder({
        deviceId: clientDeviceId,
        userName: clientNameInput.trim() || authSession?.name || 'Client',
        phone: clientPhoneInput.trim() || authSession?.phone || '',
        email: authSession?.email || '',
        cnic: authSession?.cnic || '',
        packageName: pkg.name,
        subscriptionTier: pkg.planCode || 'MONTHLY',
        amount: amountVal,
        paymentMethod: bankName,
        lastPaymentTid: cleanTid,
        receiptUrl,
        receiptBase64,
      });
      if (!res.ok) {
        showToast(res.error || 'Payment details cloud par save nahi ho sakin.');
        return;
      }
      setActiveOrder({
        tid: cleanTid,
        status: 'PENDING',
        packageName: pkg.name,
        amount: amountVal,
        bankName,
        receiptUrl,
      });
      showToast('✅ Payment TID aur Receipt Admin Panel ko send ho chuki hai!');
    } catch (err: any) {
      showToast(err?.message || 'Payment submit karte waqt error aaya.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // -------------------------------------------------------------------------
  // TAB 2 & TAB 3: SHOP BRANDING + IDENTITY VERIFICATION PHOTOS
  // -------------------------------------------------------------------------
  const [cloudUserRecord, setCloudUserRecord] = useState<{
    cnicFrontUrl?: string;
    cnicBackUrl?: string;
    selfieUrl?: string;
    shopPhotoUrl?: string;
  }>({
    selfieUrl: authSession?.selfieUrl || '',
    shopPhotoUrl: authSession?.shopPhotoUrl || '',
  });
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false);
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [isUploadingShopImg, setIsUploadingShopImg] = useState<'LOGO' | 'LETTERHEAD' | 'SHOP_PHOTO' | 'SELFIE' | null>(null);

  useEffect(() => {
    if (activeTab !== 'IDENTITY' && activeTab !== 'SHOP') return;
    if (!clientDeviceId && !authSession?.email) return;
    let mounted = true;
    setIsLoadingIdentity(true);
    const q =
      clientDeviceId && !clientDeviceId.startsWith('RESET_')
        ? `device_id=eq.${encodeURIComponent(clientDeviceId)}&select=cnic_front_url,cnic_back_url,selfie_url,shop_photo_url&limit=1`
        : `email=ilike.${encodeURIComponent(authSession?.email || '')}&select=cnic_front_url,cnic_back_url,selfie_url,shop_photo_url&limit=1`;
    callSupabaseProxy({
      table: 'users',
      method: 'GET',
      query: q,
      timeoutMs: 7000,
    })
      .then((res) => {
        if (!mounted) return;
        const row = Array.isArray(res.data) ? res.data[0] : null;
        if (row) {
          setCloudUserRecord({
            cnicFrontUrl: String(row.cnic_front_url || '').trim(),
            cnicBackUrl: String(row.cnic_back_url || '').trim(),
            selfieUrl: String(row.selfie_url || authSession?.selfieUrl || '').trim(),
            shopPhotoUrl: String(row.shop_photo_url || authSession?.shopPhotoUrl || '').trim(),
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingIdentity(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeTab, clientDeviceId, authSession?.email]);

  const handleSaveShopToCloud = async () => {
    setIsSavingShop(true);
    try {
      await Promise.resolve(
        onSyncUserProfileToCloud?.({
          companyName,
          companyAddress,
          companyPhone,
          companyNtn,
          tagline: companyTagline,
          shopPhotoUrl: cloudUserRecord.shopPhotoUrl || authSession?.shopPhotoUrl,
        })
      );
      showToast('✅ Shop Details aur Branding Admin Cloud par sync ho gayi hain!');
    } catch {
      showToast('Shop details local save ho gayi hain; cloud sync dobara try karein.');
    } finally {
      setIsSavingShop(false);
    }
  };

  // -------------------------------------------------------------------------
  // TAB 4: SECURITY (BIOMETRIC, PASSWORD RESET, ACCOUNT DELETE)
  // -------------------------------------------------------------------------
  const [biometricBinding, setBiometricBinding] = useState<BiometricBinding | null>(() =>
    loadBiometricBinding()
  );
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);

  const [pwMode, setPwMode] = useState<'CURRENT_PW' | 'EMAIL_OTP'>('CURRENT_PW');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [pwOtpInput, setPwOtpInput] = useState('');
  const [pwOtpSent, setPwOtpSent] = useState(false);
  const [pwOtpCooldown, setPwOtpCooldown] = useState(0);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPwPlain, setShowPwPlain] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [pwNotice, setPwNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (pwOtpCooldown <= 0) return;
    const t = setInterval(() => {
      setPwOtpCooldown((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [pwOtpCooldown]);

  const handleEnableBiometric = async () => {
    if (!authSession) return;
    setIsUpdatingBio(true);
    try {
      const res = await enrollBiometricPasskey({
        deviceId: clientDeviceId,
        identifier: authSession.email || authSession.phone || authSession.name,
        userName: authSession.name,
      });
      if (!res.ok || !res.credentialId) {
        showToast(res.error || 'Is browser/device par Biometric Passkey support maujood nahi.');
        return;
      }
      const nextBinding: BiometricBinding = {
        deviceId: clientDeviceId,
        identifier: authSession.email || authSession.phone || authSession.name,
        userName: authSession.name,
        email: authSession.email || '',
        phone: authSession.phone || '',
        cnic: authSession.cnic || '',
        credentialId: res.credentialId,
        enrolledAt: Date.now(),
      };
      saveBiometricBinding(nextBinding);
      setBiometricBinding(nextBinding);
      await callSupabaseProxy({
        table: 'users',
        method: 'PATCH',
        query: `device_id=eq.${encodeURIComponent(clientDeviceId)}`,
        payload: { fingerprint_enabled: true },
        timeoutMs: 6000,
      }).catch(() => {});
      showToast('✅ Biometric Fingerprint Login enable ho gaya!');
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleDisableBiometric = async () => {
    setIsUpdatingBio(true);
    try {
      clearBiometricBinding();
      setBiometricBinding(null);
      await callSupabaseProxy({
        table: 'users',
        method: 'PATCH',
        query: `device_id=eq.${encodeURIComponent(clientDeviceId)}`,
        payload: { fingerprint_enabled: false },
        timeoutMs: 6000,
      }).catch(() => {});
      showToast('Biometric Fingerprint Lock disable kar diya gaya hai.');
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleSendPasswordResetOtp = async () => {
    const email = String(authSession?.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPwNotice({ type: 'err', text: 'Aapke account ke saath valid Email registered nahi hai.' });
      return;
    }
    setIsSavingPassword(true);
    setPwNotice(null);
    try {
      const fallbackOtp = generateSixDigitOtp();
      const nowMs = Date.now();
      const expIso = new Date(nowMs + 10 * 60 * 1000).toISOString();
      const resetToken = `RESET_OTP:${fallbackOtp}:${nowMs + 10 * 60 * 1000}`;

      const [sbOtp, otpRowRes] = await Promise.all([
        sendSupabaseEmailOtp(email, {
          name: authSession?.name || 'Client',
          phone: authSession?.phone || '',
          device_id: clientDeviceId,
        }),
        callSupabaseProxy({
          table: 'otp_codes',
          method: 'POST',
          upsert: false,
          payload: {
            email,
            phone: authSession?.phone || '',
            device_id: clientDeviceId,
            otp_code: fallbackOtp,
            code: fallbackOtp,
            purpose: 'PASSWORD_RESET',
            status: 'PENDING',
            expires_at: expIso,
            created_at: new Date(nowMs).toISOString(),
          },
          timeoutMs: 6000,
        }).catch(() => ({ ok: false })),
        syncUserPasswordAndOtpToCloud({
          deviceId: clientDeviceId,
          email,
          phone: authSession?.phone,
          otpCode: resetToken,
          emailOtp: fallbackOtp,
        }),
      ]);

      // Keep clean 6-digit otp_code alongside active_session_token reset token
      await Promise.allSettled([
        callSupabaseProxy({
          table: 'users',
          method: 'PATCH',
          query: `device_id=eq.${encodeURIComponent(clientDeviceId)}`,
          payload: { otp_code: fallbackOtp, email_otp: fallbackOtp },
          timeoutMs: 5000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'PATCH',
          query: `device_id=eq.${encodeURIComponent(clientDeviceId)}`,
          payload: { otp_code: fallbackOtp, email_otp: fallbackOtp },
          timeoutMs: 5000,
        }),
      ]);

      if (!sbOtp.ok && !otpRowRes.ok) {
        setPwNotice({
          type: 'err',
          text: sbOtp.error || 'Email OTP bhejne mein waqfa hai, 60s baad try karein.',
        });
        return;
      }
      setPwOtpSent(true);
      setPwOtpCooldown(60);
      setPwNotice({
        type: 'ok',
        text: `6-digit OTP code aapke email (${email}) par bhej diya gaya hai.`,
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);
    if (newPasswordInput.trim().length < 6) {
      setPwNotice({ type: 'err', text: 'Kam az kam 6 characters ka naya Password darj karein.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPwNotice({ type: 'err', text: 'New Password aur Confirm Password match nahi kar rahe.' });
      return;
    }

    const email = String(authSession?.email || '').trim().toLowerCase();
    setIsSavingPassword(true);
    try {
      if (pwMode === 'CURRENT_PW') {
        if (!currentPasswordInput.trim()) {
          setPwNotice({ type: 'err', text: 'Pehle apna mojooda (Current) Password darj karein.' });
          return;
        }
        const checkQuery =
          clientDeviceId && !clientDeviceId.startsWith('RESET_')
            ? `device_id=eq.${encodeURIComponent(clientDeviceId)}&select=password_hash&limit=1`
            : `email=ilike.${encodeURIComponent(email)}&select=password_hash&limit=1`;
        const [uRes, cuRes] = await Promise.all([
          callSupabaseProxy({ table: 'users', method: 'GET', query: checkQuery, timeoutMs: 7000 }),
          callSupabaseProxy({ table: 'client_users', method: 'GET', query: checkQuery, timeoutMs: 7000 }),
        ]);
        const uRow = Array.isArray(uRes.data) ? uRes.data[0] : null;
        const cuRow = Array.isArray(cuRes.data) ? cuRes.data[0] : null;
        const storedHash = String(uRow?.password_hash || cuRow?.password_hash || '').trim();
        if (storedHash) {
          const enteredHash = await hashPasswordSha256(currentPasswordInput);
          if (enteredHash !== storedHash) {
            setPwNotice({ type: 'err', text: 'Mojooda Password ghalat hai. Ya Email OTP mode istemal karein.' });
            return;
          }
        }
      } else {
        const cleanOtp = pwOtpInput.replace(/\s+/g, '');
        if (cleanOtp.length < 6) {
          setPwNotice({ type: 'err', text: '6-digit Email OTP code darj karein.' });
          return;
        }
        const verified = await verifySupabaseEmailOtp(email, cleanOtp);
        let otpMatched = verified.ok;
        if (!otpMatched && /^\d{6}$/.test(cleanOtp)) {
          const [uCheck, otpRowsRes] = await Promise.all([
            callSupabaseProxy({
              table: 'users',
              method: 'GET',
              query: `device_id=eq.${encodeURIComponent(clientDeviceId)}&select=active_session_token&limit=1`,
              timeoutMs: 6000,
            }),
            callSupabaseProxy({
              table: 'otp_codes',
              method: 'GET',
              query: `email=ilike.${encodeURIComponent(email)}&order=created_at.desc&limit=3`,
              timeoutMs: 6000,
            }),
          ]);
          const tok = String((Array.isArray(uCheck.data) ? uCheck.data[0] : null)?.active_session_token || '');
          if (tok.startsWith('RESET_OTP:') && tok.split(':')[1] === cleanOtp) {
            otpMatched = true;
          }
          if (!otpMatched && Array.isArray(otpRowsRes.data)) {
            otpMatched = otpRowsRes.data.some(
              (r: any) =>
                String(r?.otp_code || r?.code || '').trim() === cleanOtp &&
                String(r?.status || '').toUpperCase() !== 'USED'
            );
          }
        }
        if (!otpMatched) {
          setPwNotice({ type: 'err', text: 'Email OTP code ghalat ya expire ho chuka hai.' });
          return;
        }
      }

      const newHash = await hashPasswordSha256(newPasswordInput);
      await syncUserPasswordAndOtpToCloud({
        deviceId: clientDeviceId,
        email,
        phone: authSession?.phone,
        passwordHash: newHash,
        plainPassword: newPasswordInput,
      });

      setCurrentPasswordInput('');
      setPwOtpInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPwNotice({ type: 'ok', text: '✅ Naya Password kamyabi se update aur Cloud par sync ho gaya!' });
    } catch (err: any) {
      setPwNotice({ type: 'err', text: err?.message || 'Password update karne mein error aaya.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmWord.trim().toUpperCase() !== 'DELETE') return;
    setIsDeletingAccount(true);
    try {
      const res = await deleteClientAccountInSupabase({
        deviceId: clientDeviceId,
        email: authSession?.email,
        phone: authSession?.phone,
      });
      if (!res.ok) {
        showToast(res.error || 'Account delete nahi ho saka. Dobara try karein.');
        return;
      }
      onAccountDeletedLogout();
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // -------------------------------------------------------------------------
  // TAB 5: SUPPORT & MESSAGES STATE
  // -------------------------------------------------------------------------
  const [reqType, setReqType] = useState('Rate List / Section Request');
  const [reqName, setReqName] = useState(authSession?.name || companyName || '');
  const [reqPhone, setReqPhone] = useState(authSession?.phone || companyPhone || '');
  const [reqEmail, setReqEmail] = useState(authSession?.email || '');
  const [reqMessage, setReqMessage] = useState('');
  const [supportScreenshotUrl, setSupportScreenshotUrl] = useState('');
  const [isUploadingSupportSs, setIsUploadingSupportSs] = useState(false);
  const [supportStatusMsg, setSupportStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isRefreshingSupport, setIsRefreshingSupport] = useState(false);

  useEffect(() => {
    if (activeTab === 'SUPPORT') {
      onMarkSupportMessagesRead?.();
    }
  }, [activeTab]);

  const handleSupportScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingSupportSs(true);
    try {
      const uploaded = await uploadImageToUserUploadsBucket({
        fileOrDataUrl: file,
        folder: 'receipts',
        deviceId: clientDeviceId,
        tag: 'support_ss',
      });
      setSupportScreenshotUrl(uploaded.url);
      showToast('✅ Screenshot compressed & attached!');
    } catch {
      showToast('Screenshot attach nahi ho saka.');
    } finally {
      setIsUploadingSupportSs(false);
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqMessage.trim() || !onSubmitSupportRequest) return;
    setSupportStatusMsg(null);
    const fullMessage =
      supportScreenshotUrl && /^https?:\/\//i.test(supportScreenshotUrl)
        ? `${reqMessage.trim()}\n[Screenshot: ${supportScreenshotUrl}]`
        : reqMessage.trim();
    const res = await onSubmitSupportRequest({
      userName: reqName.trim() || companyName || 'Client',
      userPhone: reqPhone.trim() || companyPhone || '',
      userEmail: reqEmail.trim(),
      requestType: reqType,
      message: fullMessage,
    });
    const isOk = typeof res === 'boolean' ? res : Boolean(res?.ok);
    if (isOk) {
      setReqMessage('');
      setSupportScreenshotUrl('');
      setSupportStatusMsg({
        type: 'ok',
        text: '✅ Message Support Team ko send aur Supabase par save ho gaya hai!',
      });
    } else {
      setSupportStatusMsg({
        type: 'err',
        text:
          (typeof res === 'object' && res?.error) ||
          'Request sending error: Message send nahi ho saka.',
      });
    }
  };

  // Subscription status calculations
  const isOwnerAccount = Boolean(
    authSession &&
      isOwnerIdentity({
        email: authSession.email,
        phone: authSession.phone,
        cnic: authSession.cnic,
        masterCfg: loadCachedMasterEngineConfig(),
      })
  );
  const effectiveNow =
    (cloudAccessInfo?.serverNowMs && cloudAccessInfo.serverNowMs > 0
      ? cloudAccessInfo.serverNowMs
      : getEffectiveServerNowMs()) || Date.now();
  const daysRemaining =
    cloudAccessInfo?.expiresAt && cloudAccessInfo.expiresAt > effectiveNow
      ? Math.max(1, Math.ceil((cloudAccessInfo.expiresAt - effectiveNow) / 86400000))
      : 0;
  const planStatusLabel = isOwnerAccount
    ? 'LIFETIME VIP (OWNER)'
    : cloudAccessInfo?.status === 'FREE'
    ? 'FREE VIP ACTIVE'
    : cloudAccessInfo?.status === 'ACTIVE'
    ? 'PRO ACTIVE'
    : cloudAccessInfo?.status === 'BLOCKED'
    ? 'BLOCKED'
    : 'FREE TRIAL ACTIVE';

  const activeShopLogo =
    layoutConfig.shopLogoUrl && layoutConfig.shopLogoUrl.trim().length > 0
      ? layoutConfig.shopLogoUrl
      : mainLogoUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
      <div className="w-full max-w-4xl rounded-2xl bg-[#0C1017] border-2 border-[#F5B738] shadow-2xl overflow-hidden my-2 flex flex-col max-h-[92vh]">
        {/* Modal Header (Strictly NO Device ID / IP / MAC / UUID shown) */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#121822] via-[#171E2B] to-[#121822] border-b border-[#F5B738]/40 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={activeShopLogo}
              alt="Shop Logo"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#F5B738] shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[#F5B738] truncate">
                Client Profile &amp; Account Settings
              </h2>
              <p className="text-[10.5px] text-slate-300 truncate">
                {authSession?.name || companyName || 'Valued Client'} · {planStatusLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onSyncFromSupabase && (
              <button
                type="button"
                disabled={isSyncingCloud}
                onClick={() => onSyncFromSupabase({ forceRates: true, silent: false })}
                className="boss-flat-btn px-2.5 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/50 text-sky-300 hover:bg-sky-500 hover:text-black text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync Cloud</span>
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="boss-flat-btn px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="boss-flat-btn w-8 h-8 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              aria-label="Close settings hub"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Consolidated Tabs Bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#090C12] border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          {(
            [
              { id: 'PACKAGE', label: 'Package & Plan', icon: Award },
              { id: 'SHOP', label: 'Shop Details', icon: Store },
              { id: 'IDENTITY', label: 'ID & Account', icon: UserCheck },
              { id: 'SECURITY', label: 'Biometric & Password', icon: ShieldCheck },
              { id: 'SUPPORT', label: 'Support & Replies', icon: MessageSquarePlus },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`boss-flat-btn shrink-0 px-3 py-1.5 rounded-lg border text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSel
                    ? 'bg-[#F5B738] border-[#F5B738] text-black'
                    : 'bg-[#14181F] border-slate-800 text-slate-300 hover:border-[#F5B738]/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
                {t.id === 'SUPPORT' && unreadAdminSupportCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                    {unreadAdminSupportCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toast Feedback */}
        {hubToast && (
          <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{hubToast}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* =============================================================== */}
          {/* TAB 1: PACKAGE & SUBSCRIPTION                                   */}
          {/* =============================================================== */}
          {activeTab === 'PACKAGE' && (
            <div className="space-y-4">
              {/* Current Package Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#141A24] to-[#0E131D] border border-[#F5B738]/60 flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-amber-300 tracking-wider">
                    Current Subscription Status
                  </div>
                  <div className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                    <span>
                      {isOwnerAccount
                        ? 'Lifetime Free VIP Package'
                        : activeOrder?.packageName || cloudAccessInfo?.tier || 'Free Trial Plan'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isOwnerAccount || cloudAccessInfo?.status === 'FREE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                          : cloudAccessInfo?.status === 'ACTIVE'
                          ? 'bg-amber-500/20 text-[#F5B738] border border-[#F5B738]/60'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/60'
                      }`}
                    >
                      {planStatusLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {isOwnerAccount
                      ? 'Unlimited Lifetime Access Active'
                      : cloudAccessInfo?.expiresAt
                      ? `${daysRemaining} din baqi hain · Expiry: ${new Date(
                          cloudAccessInfo.expiresAt
                        ).toLocaleDateString('en-GB')}`
                      : 'Cloud trial status active'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={checkOrderStatus}
                  disabled={isCheckingOrder}
                  className="boss-flat-btn px-3 py-1.5 rounded-lg bg-[#1C222B] border border-slate-700 text-amber-300 hover:border-[#F5B738] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingOrder ? 'animate-spin' : ''}`} />
                  <span>{isCheckingOrder ? 'Checking...' : 'Check Order Status'}</span>
                </button>
              </div>

              {/* Active Offer Banner */}
              {activeOffer &&
                activeOffer.isActive !== false &&
                activeOffer.isVisible !== false &&
                activeOffer.showBanner !== false && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/60 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black uppercase">
                        {activeOffer.badgeText || 'OFFER'}
                      </span>
                      <span className="text-xs font-black text-white">{activeOffer.title}</span>
                      {activeOffer.discountPct && activeOffer.discountPct > 0 && (
                        <span className="text-[10.5px] font-black text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/40">
                          {activeOffer.discountPct}% OFF
                        </span>
                      )}
                    </div>
                    {activeOffer.message && (
                      <p className="text-[11px] text-slate-200">{activeOffer.message}</p>
                    )}
                  </div>
                )}

              {/* Packages Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {packages.map((pkg, idx) => {
                  const curPrice = pkg.priceRs ?? pkg.price ?? 0;
                  const origPrice = pkg.originalPriceRs ?? curPrice;
                  const discPct =
                    pkg.discountPct && pkg.discountPct > 0
                      ? pkg.discountPct
                      : origPrice > curPrice
                      ? Math.round(((origPrice - curPrice) / origPrice) * 100)
                      : 0;
                  const hasDiscount = discPct > 0 || origPrice > curPrice;
                  const isChosen = selectedPkg?.id === pkg.id;
                  return (
                    <div
                      key={pkg.id || idx}
                      className={`p-3.5 rounded-xl bg-[#141A24] border flex flex-col justify-between space-y-2.5 ${
                        isChosen
                          ? 'border-[#F5B738] ring-1 ring-[#F5B738]'
                          : hasDiscount
                          ? 'border-amber-500/60'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-black text-white text-sm">{pkg.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">
                              {pkg.planCode}
                            </span>
                          </div>
                          {(pkg.badge || pkg.badgeText) && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold">
                              {pkg.badge || pkg.badgeText}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className={`text-xl font-black ${
                              hasDiscount ? 'text-emerald-400' : 'text-[#F5B738]'
                            }`}
                          >
                            Rs. {curPrice.toLocaleString()}
                          </span>
                          {hasDiscount && (
                            <>
                              <span className="text-xs line-through text-slate-500">
                                Rs. {origPrice.toLocaleString()}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black">
                                {discPct}% OFF
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          Duration: {pkg.durationLabel || `${pkg.durationMonths} Month(s)`}
                        </div>
                        <ul className="space-y-1 pt-1.5 border-t border-slate-800 text-[11px] text-slate-300">
                          {(pkg.features || []).map((f, fi) => (
                            <li key={fi} className="flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPkg(pkg);
                          setAmountInput(String(curPrice));
                          const el = document.getElementById('hub-tid-box');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`boss-flat-btn w-full py-2 rounded-lg font-black text-xs cursor-pointer ${
                          isChosen
                            ? 'bg-emerald-500 text-black'
                            : 'bg-[#F5B738] hover:bg-amber-400 text-black'
                        }`}
                      >
                        {isChosen ? '✓ Plan Selected' : `Select Plan (Rs. ${curPrice.toLocaleString()})`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Official Bank Accounts */}
              {bankAccounts.filter((a) => a.isActive !== false).length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#141A24] border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-[#F5B738] uppercase">
                    Official Bank &amp; Wallet Accounts
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {bankAccounts
                      .filter((a) => a.isActive !== false)
                      .map((acc, i) => (
                        <div
                          key={acc.id || i}
                          className="p-2.5 rounded-xl bg-[#0C1017] border border-slate-700/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-amber-400 truncate">{acc.bankName}</span>
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {acc.accountType || 'BANK'}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-300 truncate">
                            Title: <strong className="text-white">{acc.accountTitle}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-1 bg-[#141A24] px-2 py-1 rounded border border-slate-800 font-mono">
                            <span className="text-emerald-400 font-bold text-[10.5px] truncate">
                              {acc.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(acc.accountNumber);
                                setCopiedBankId(acc.id || String(i));
                                showToast(`Copied ${acc.bankName} Number!`);
                                setTimeout(() => setCopiedBankId(null), 2000);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black shrink-0 cursor-pointer"
                            >
                              {copiedBankId === (acc.id || String(i)) ? 'Copied' : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Active Order Alert */}
              {activeOrder && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 flex-wrap ${
                    activeOrder.status === 'APPROVED_MANUAL' || activeOrder.status === 'APPROVED_AUTO'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-amber-950/30 border-amber-500/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {activeOrder.status === 'PENDING' ? (
                      <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>
                      Order TID <strong className="font-mono text-[#F5B738]">{activeOrder.tid}</strong> ·{' '}
                      {activeOrder.status}
                    </span>
                  </div>
                </div>
              )}

              {/* TID + Receipt Submission Form */}
              <form
                id="hub-tid-box"
                onSubmit={handleSubmitOrder}
                className="p-3.5 rounded-xl bg-[#101726] border border-[#F5B738]/60 space-y-3"
              >
                <div className="font-black text-[#F5B738] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Submit Payment TID &amp; Raseed Screenshot</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <select
                    value={selectedPkg?.id || (packages[0]?.id ?? '')}
                    onChange={(e) => {
                      const ch = packages.find((p) => p.id === e.target.value);
                      if (ch) {
                        setSelectedPkg(ch);
                        setAmountInput(String(ch.priceRs ?? ch.price ?? 3000));
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                  >
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Rs. {(p.priceRs ?? p.price ?? 0).toLocaleString()}
                      </option>
                    ))}
                  </select>

                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                  >
                    {bankAccounts
                      .filter((b) => b.isActive !== false)
                      .map((b) => (
                        <option key={b.id} value={b.bankName}>
                          {b.bankName} ({b.accountNumber})
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="Amount (Rs.)"
                    className="px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-emerald-300 font-mono font-bold text-xs outline-none"
                    required
                  />

                  <input
                    type="text"
                    value={tidInput}
                    onChange={(e) => setTidInput(e.target.value)}
                    placeholder="Enter TID (e.g. 42819038)"
                    className="px-3 py-2 rounded-lg bg-[#0C1017] border-2 border-[#F5B738]/70 text-[#F5B738] font-mono font-bold text-xs outline-none uppercase"
                    required
                  />
                </div>

                <label className="cursor-pointer rounded-xl bg-[#0C1017] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex items-center justify-between gap-2">
                  <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                  {receiptUrl ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={receiptUrl}
                        alt="Receipt"
                        className="w-10 h-10 object-cover rounded-lg border border-emerald-500/60 shrink-0"
                      />
                      <span className="text-[11px] font-bold text-emerald-400 truncate">
                        ✓ Receipt Screenshot Ready (Tap to change)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-300">
                      {isUploadingReceipt ? (
                        <RefreshCw className="w-4 h-4 text-[#F5B738] animate-spin shrink-0" />
                      ) : (
                        <Camera className="w-4 h-4 text-[#F5B738] shrink-0" />
                      )}
                      <span className="text-[11px] font-semibold">
                        {isUploadingReceipt
                          ? 'Compressing & Uploading Receipt...'
                          : 'Upload Payment Screenshot / Raseed (<120KB Auto-Compressed)'}
                      </span>
                    </div>
                  )}
                  <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder="Your Name / Shop Name"
                    className="px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={clientPhoneInput}
                    onChange={(e) => setClientPhoneInput(e.target.value)}
                    placeholder="WhatsApp Number (0300-1234567)"
                    className="px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <a
                    href={`https://wa.me/923105524225?text=${encodeURIComponent(
                      `Assalam-o-Alaikum Admin, I sent Rs. ${amountInput} for ${selectedPkg?.name || 'Plan'}. Name: ${clientNameInput}, Phone: ${clientPhoneInput}, TID: ${tidInput}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp Receipt</span>
                  </a>

                  <button
                    type="submit"
                    disabled={isSubmittingOrder || isUploadingReceipt || !tidInput.trim()}
                    className="boss-flat-btn px-4 py-2 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isSubmittingOrder ? 'Submitting...' : 'Submit Payment TID & Receipt'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: SHOP DETAILS & BRANDING                                  */}
          {/* =============================================================== */}
          {activeTab === 'SHOP' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                    Shop / Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) =>
                      onUpdateCompanyInfo({
                        name: e.target.value,
                        tagline: companyTagline,
                        address: companyAddress,
                        phone: companyPhone,
                        ntn: companyNtn,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white font-bold text-xs focus:border-[#F5B738] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={companyTagline}
                    onChange={(e) =>
                      onUpdateCompanyInfo({
                        name: companyName,
                        tagline: e.target.value,
                        address: companyAddress,
                        phone: companyPhone,
                        ntn: companyNtn,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                    Company Phone (Shown on Quotation)
                  </label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) =>
                      onUpdateCompanyInfo({
                        name: companyName,
                        tagline: companyTagline,
                        address: companyAddress,
                        phone: e.target.value,
                        ntn: companyNtn,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white font-mono text-xs focus:border-[#F5B738] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                    NTN Number (Optional — Shown on Quotation)
                  </label>
                  <input
                    type="text"
                    value={companyNtn}
                    onChange={(e) =>
                      onUpdateCompanyInfo({
                        name: companyName,
                        tagline: companyTagline,
                        address: companyAddress,
                        phone: companyPhone,
                        ntn: e.target.value,
                      })
                    }
                    placeholder="e.g. 1234567-8"
                    className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white font-mono text-xs focus:border-[#F5B738] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Shop / Office Address (Shown on Quotation)
                </label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) =>
                    onUpdateCompanyInfo({
                      name: companyName,
                      tagline: companyTagline,
                      address: e.target.value,
                      phone: companyPhone,
                      ntn: companyNtn,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-[#F5B738] outline-none"
                />
              </div>

              {/* Branding & Shop Photo Uploads (< 120KB auto-compressed) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Shop Logo */}
                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-[#F5B738]">Shop Logo</div>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeShopLogo}
                      alt="Shop Logo"
                      className="w-12 h-12 rounded-full object-cover border border-[#F5B738] shrink-0"
                    />
                    <label className="boss-flat-btn flex-1 py-2 px-2.5 rounded-lg bg-[#0C1017] border border-slate-700 hover:border-[#F5B738] text-center font-bold cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          setIsUploadingShopImg('LOGO');
                          try {
                            const url = await compressFileToJpegDataUrl(f, 800, 0.65, 120 * 1024);
                            onUpdateLayoutConfig({ ...layoutConfig, shopLogoUrl: url });
                            showToast('✅ Shop Logo compressed (<120KB) & updated!');
                          } finally {
                            setIsUploadingShopImg(null);
                          }
                        }}
                      />
                      {isUploadingShopImg === 'LOGO' ? 'Compressing...' : 'Change Logo'}
                    </label>
                  </div>
                  {layoutConfig.shopLogoUrl && (
                    <button
                      type="button"
                      onClick={() => onUpdateLayoutConfig({ ...layoutConfig, shopLogoUrl: '' })}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Reset to Default Icon
                    </button>
                  )}
                </div>

                {/* Quotation Letterhead Background */}
                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-[#F5B738]">Letterhead BG</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayoutConfig({
                          ...layoutConfig,
                          showLetterheadBackground: !layoutConfig.showLetterheadBackground,
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[9.5px] font-black cursor-pointer ${
                        layoutConfig.showLetterheadBackground
                          ? 'bg-emerald-500 text-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {layoutConfig.showLetterheadBackground ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={letterheadBgUrl}
                      alt="Letterhead"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <label className="boss-flat-btn flex-1 py-2 px-2.5 rounded-lg bg-[#0C1017] border border-slate-700 hover:border-[#F5B738] text-center font-bold cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          setIsUploadingShopImg('LETTERHEAD');
                          try {
                            const url = await compressFileToJpegDataUrl(f, 800, 0.65, 120 * 1024);
                            onUpdateLetterheadBgUrl(url);
                            showToast('✅ Letterhead BG compressed (<120KB) & updated!');
                          } finally {
                            setIsUploadingShopImg(null);
                          }
                        }}
                      />
                      {isUploadingShopImg === 'LETTERHEAD' ? 'Compressing...' : 'Upload BG'}
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Opacity</span>
                    <input
                      type="range"
                      min={0.12}
                      max={0.75}
                      step={0.03}
                      value={layoutConfig.letterheadOpacity || 0.28}
                      onChange={(e) =>
                        onUpdateLayoutConfig({
                          ...layoutConfig,
                          letterheadOpacity: parseFloat(e.target.value) || 0.28,
                        })
                      }
                      className="accent-[#F5B738] flex-1"
                    />
                    {onRestoreDefaultBrandingAssets && (
                      <button
                        type="button"
                        onClick={onRestoreDefaultBrandingAssets}
                        className="text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Shop Photo (Cloud Synced) */}
                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-[#F5B738]">Shop Photo</div>
                  <div className="flex items-center gap-2.5">
                    {cloudUserRecord.shopPhotoUrl ? (
                      <img
                        src={cloudUserRecord.shopPhotoUrl}
                        alt="Shop"
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-500/60 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#0C1017] border border-slate-800 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                    <label className="boss-flat-btn flex-1 py-2 px-2.5 rounded-lg bg-[#0C1017] border border-slate-700 hover:border-[#F5B738] text-center font-bold cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          setIsUploadingShopImg('SHOP_PHOTO');
                          try {
                            const up = await uploadImageToUserUploadsBucket({
                              fileOrDataUrl: f,
                              folder: 'shops',
                              deviceId: clientDeviceId,
                              tag: 'shop',
                            });
                            setCloudUserRecord((prev) => ({ ...prev, shopPhotoUrl: up.url }));
                            await Promise.resolve(
                              onSyncUserProfileToCloud?.({ shopPhotoUrl: up.url, companyName })
                            );
                            showToast('✅ Shop Photo compressed & Admin Cloud par save ho gayi!');
                          } finally {
                            setIsUploadingShopImg(null);
                          }
                        }}
                      />
                      {isUploadingShopImg === 'SHOP_PHOTO'
                        ? 'Uploading...'
                        : cloudUserRecord.shopPhotoUrl
                        ? 'Update Photo'
                        : 'Upload Photo'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isSavingShop}
                  onClick={handleSaveShopToCloud}
                  className="boss-flat-btn px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{isSavingShop ? 'Saving to Cloud...' : 'Save & Sync Shop Details'}</span>
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: ID & ACCOUNT DETAILS (STRICT PRIVACY HIDE)               */}
          {/* =============================================================== */}
          {activeTab === 'IDENTITY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Full Name</div>
                  <div className="text-sm font-black text-white mt-0.5">
                    {authSession?.name || 'Not Set'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Email Address</div>
                  <div className="text-sm font-bold text-sky-300 mt-0.5 truncate">
                    {authSession?.email || 'Not Set'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Mobile Number</div>
                  <div className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
                    {authSession?.phone || 'Not Set'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#14181F] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">CNIC Number</div>
                  <div className="text-sm font-mono font-bold text-[#F5B738] mt-0.5">
                    {authSession?.cnic || 'Not Verified Yet'}
                  </div>
                </div>
              </div>

              {/* CNIC Front / Back & Owner Selfie Status */}
              <div className="p-3.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-[#F5B738] flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>Identity Verification Documents &amp; Selfie</span>
                  </div>
                  {isLoadingIdentity && (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* CNIC Front */}
                  <div className="p-2.5 rounded-xl bg-[#0C1017] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-slate-300">CNIC Front</span>
                      <span
                        className={`font-bold ${
                          cloudUserRecord.cnicFrontUrl ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {cloudUserRecord.cnicFrontUrl ? '✓ Uploaded' : 'Pending'}
                      </span>
                    </div>
                    {cloudUserRecord.cnicFrontUrl ? (
                      <img
                        src={cloudUserRecord.cnicFrontUrl}
                        alt="CNIC Front"
                        className="w-full h-24 object-cover rounded-lg border border-emerald-500/40"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-lg bg-[#14181F] flex items-center justify-center text-[10px] text-slate-500">
                        No Preview
                      </div>
                    )}
                  </div>

                  {/* CNIC Back */}
                  <div className="p-2.5 rounded-xl bg-[#0C1017] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-slate-300">CNIC Back</span>
                      <span
                        className={`font-bold ${
                          cloudUserRecord.cnicBackUrl ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {cloudUserRecord.cnicBackUrl ? '✓ Uploaded' : 'Pending'}
                      </span>
                    </div>
                    {cloudUserRecord.cnicBackUrl ? (
                      <img
                        src={cloudUserRecord.cnicBackUrl}
                        alt="CNIC Back"
                        className="w-full h-24 object-cover rounded-lg border border-emerald-500/40"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-lg bg-[#14181F] flex items-center justify-center text-[10px] text-slate-500">
                        No Preview
                      </div>
                    )}
                  </div>

                  {/* Owner Selfie */}
                  <div className="p-2.5 rounded-xl bg-[#0C1017] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-slate-300">Owner Selfie</span>
                      <span
                        className={`font-bold ${
                          cloudUserRecord.selfieUrl ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {cloudUserRecord.selfieUrl ? '✓ Verified' : 'Optional'}
                      </span>
                    </div>
                    {cloudUserRecord.selfieUrl ? (
                      <img
                        src={cloudUserRecord.selfieUrl}
                        alt="Owner Selfie"
                        className="w-full h-24 object-cover rounded-lg border border-sky-500/40"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-lg bg-[#14181F] flex items-center justify-center text-[10px] text-slate-500">
                        Not Uploaded
                      </div>
                    )}
                    <label className="boss-flat-btn block w-full py-1.5 rounded-lg bg-[#14181F] border border-slate-700 hover:border-[#F5B738] text-center text-[10.5px] font-bold cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          setIsUploadingShopImg('SELFIE');
                          try {
                            const up = await uploadImageToUserUploadsBucket({
                              fileOrDataUrl: f,
                              folder: 'selfies',
                              deviceId: clientDeviceId,
                              tag: 'selfie',
                            });
                            setCloudUserRecord((prev) => ({ ...prev, selfieUrl: up.url }));
                            await Promise.resolve(
                              onSyncUserProfileToCloud?.({ selfieUrl: up.url, companyName })
                            );
                            showToast('✅ Selfie compressed & Admin Cloud par sync ho gayi!');
                          } finally {
                            setIsUploadingShopImg(null);
                          }
                        }}
                      />
                      {isUploadingShopImg === 'SELFIE'
                        ? 'Uploading Selfie...'
                        : cloudUserRecord.selfieUrl
                        ? 'Update Owner Selfie'
                        : 'Upload Owner Selfie'}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: SECURITY (BIOMETRIC, PASSWORD CHANGE/RESET, DELETE)      */}
          {/* =============================================================== */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4">
              {/* Biometric Fingerprint Section (Never displays raw credentialId or deviceId) */}
              <div className="p-3.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-[#F5B738] shrink-0" />
                    <div>
                      <div className="font-black text-white text-xs">
                        Biometric Fingerprint Lock
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        Status:{' '}
                        <strong
                          className={
                            biometricBinding?.credentialId
                              ? 'text-emerald-400'
                              : 'text-amber-300'
                          }
                        >
                          {biometricBinding?.credentialId ? 'Enabled ✓' : 'Not Enabled'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isUpdatingBio}
                      onClick={handleEnableBiometric}
                      className="boss-flat-btn px-3 py-1.5 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black font-black text-[11px] cursor-pointer disabled:opacity-60"
                    >
                      {biometricBinding?.credentialId ? 'Refresh Fingerprint' : 'Enable Fingerprint'}
                    </button>
                    {biometricBinding?.credentialId && (
                      <button
                        type="button"
                        disabled={isUpdatingBio}
                        onClick={handleDisableBiometric}
                        className="boss-flat-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] cursor-pointer disabled:opacity-60"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change / Reset Section */}
              <form
                onSubmit={handleUpdatePassword}
                className="p-3.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-black text-[#F5B738] flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    <span>Change or Reset Account Password</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#0C1017] p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setPwMode('CURRENT_PW');
                        setPwNotice(null);
                      }}
                      className={`px-2.5 py-1 rounded text-[10.5px] font-bold cursor-pointer ${
                        pwMode === 'CURRENT_PW' ? 'bg-[#F5B738] text-black' : 'text-slate-300'
                      }`}
                    >
                      Current Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPwMode('EMAIL_OTP');
                        setPwNotice(null);
                      }}
                      className={`px-2.5 py-1 rounded text-[10.5px] font-bold cursor-pointer ${
                        pwMode === 'EMAIL_OTP' ? 'bg-[#F5B738] text-black' : 'text-slate-300'
                      }`}
                    >
                      6-Digit Email OTP
                    </button>
                  </div>
                </div>

                {pwNotice && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] font-semibold ${
                      pwNotice.type === 'ok'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500 text-rose-200'
                    }`}
                  >
                    {pwNotice.text}
                  </div>
                )}

                {pwMode === 'CURRENT_PW' ? (
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type={showPwPlain ? 'text' : 'password'}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Mojooda password darj karein"
                      className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                        6-Digit Email OTP ({authSession?.email || 'Registered Email'})
                      </label>
                      <input
                        type="text"
                        value={pwOtpInput}
                        onChange={(e) => setPwOtpInput(e.target.value)}
                        placeholder="6-digit OTP code"
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-[#F5B738] font-mono font-bold text-xs outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSavingPassword || pwOtpCooldown > 0}
                      onClick={handleSendPasswordResetOtp}
                      className="boss-flat-btn px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/60 text-sky-300 hover:bg-sky-500 hover:text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {pwOtpCooldown > 0
                          ? `Resend (${pwOtpCooldown}s)`
                          : pwOtpSent
                          ? 'Resend OTP'
                          : 'Send Email OTP'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      New Password (min 6 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-[#F5B738] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPwPlain ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Naya password"
                        className="w-full pl-8 pr-9 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwPlain((p) => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPwPlain ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPwPlain ? 'text' : 'password'}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Confirm naya password"
                      className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="boss-flat-btn px-4 py-2 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs cursor-pointer disabled:opacity-60"
                  >
                    {isSavingPassword ? 'Saving Password...' : 'Save New Password'}
                  </button>
                </div>
              </form>

              {/* Danger Zone: Delete My Account */}
              <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-black text-rose-300 text-xs">Delete My Account</div>
                      <div className="text-[10.5px] text-rose-200/75">
                        Aapka cloud account aur local session hamesha ke liye delete ho jaye ga.
                      </div>
                    </div>
                  </div>
                  {!showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setDeleteConfirmWord('');
                      }}
                      className="boss-flat-btn px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] cursor-pointer"
                    >
                      Delete My Account
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <div className="p-3 rounded-lg bg-[#11080B] border border-rose-500/80 space-y-2.5">
                    <div className="flex items-start gap-2 text-[11px] text-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        Confirm karne ke liye neeche <strong className="font-mono text-white">DELETE</strong>{' '}
                        likhein aur Permanent Delete dabayein:
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={deleteConfirmWord}
                        onChange={(e) => setDeleteConfirmWord(e.target.value)}
                        placeholder="Type DELETE"
                        className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-[#0C1017] border border-rose-500/60 text-white font-mono text-xs outline-none uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={
                          isDeletingAccount || deleteConfirmWord.trim().toUpperCase() !== 'DELETE'
                        }
                        onClick={handleConfirmDeleteAccount}
                        className="boss-flat-btn px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Confirm Permanent Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: SUPPORT & ADMIN MESSAGES                                 */}
          {/* =============================================================== */}
          {activeTab === 'SUPPORT' && (
            <div className="space-y-4">
              <form
                onSubmit={handleSendSupport}
                className="p-3.5 rounded-xl bg-[#14181F] border border-sky-500/50 space-y-2.5"
              >
                {supportStatusMsg && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                      supportStatusMsg.type === 'ok'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-rose-950/70 border-rose-500 text-rose-200'
                    }`}
                  >
                    {supportStatusMsg.type === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{supportStatusMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                      Request Category
                    </label>
                    <select
                      value={reqType}
                      onChange={(e) => setReqType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                    >
                      <option value="Rate List / Section Request">Rate List / Section Request</option>
                      <option value="Account Activation / TID Help">Account Activation / TID Help</option>
                      <option value="Formula / Cutting Chart Help">Formula / Cutting Chart Help</option>
                      <option value="Custom Section / Formula Help">Custom Section / Formula Help</option>
                      <option value="Technical Support / Bug">Technical Support / Bug</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                      Your Name / Shop Name
                    </label>
                    <input
                      type="text"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="Shop / Name"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                      WhatsApp / Mobile Number
                    </label>
                    <input
                      type="text"
                      value={reqPhone}
                      onChange={(e) => setReqPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C1017] border border-slate-700 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      placeholder="client@email.com"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                    Message / Issue Details <span className="text-sky-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reqMessage}
                    onChange={(e) => setReqMessage(e.target.value)}
                    placeholder="Apni request ya masla yahan likhein..."
                    className="w-full p-2.5 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs outline-none"
                  />
                </div>

                {/* Optional Support Screenshot Upload */}
                <label className="cursor-pointer rounded-xl bg-[#0C1017] border border-dashed border-slate-700 hover:border-sky-400 p-2 flex items-center justify-between gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSupportScreenshotUpload}
                    className="hidden"
                  />
                  {supportScreenshotUrl ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={supportScreenshotUrl}
                        alt="Support Screenshot"
                        className="w-9 h-9 rounded object-cover border border-emerald-500/60 shrink-0"
                      />
                      <span className="text-[11px] font-bold text-emerald-400 truncate">
                        ✓ Screenshot Attached (Tap to change)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Camera className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-[11px]">
                        {isUploadingSupportSs
                          ? 'Uploading Screenshot...'
                          : 'Attach Screenshot (Optional, <120KB)'}
                      </span>
                    </div>
                  )}
                  <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </label>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <a
                    href={`https://wa.me/923105524225?text=${encodeURIComponent(
                      `Assalam-o-Alaikum Support Team,\nType: ${reqType}\nName: ${reqName || companyName}\nPhone: ${reqPhone}\nMessage: ${reqMessage}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp Support</span>
                  </a>

                  <button
                    type="submit"
                    disabled={isSubmittingSupportRequest || isUploadingSupportSs || !reqMessage.trim()}
                    className="boss-flat-btn px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingSupportRequest ? 'Sending...' : 'Send Support Request'}</span>
                  </button>
                </div>
              </form>

              {/* Submitted Messages & Admin Replies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-slate-300">
                    Messages &amp; Admin Replies ({supportRequests.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isRefreshingSupport}
                      onClick={() => {
                        onMarkSupportMessagesRead?.();
                        if (onRefreshSupportRequests) {
                          setIsRefreshingSupport(true);
                          Promise.resolve(onRefreshSupportRequests()).finally(() =>
                            setIsRefreshingSupport(false)
                          );
                        }
                      }}
                      className="boss-flat-btn px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/50 text-sky-300 hover:bg-sky-500 hover:text-black text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingSupport ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                    {supportRequests.length > 0 && onClearAllSupportRequests && (
                      <button
                        type="button"
                        onClick={() => onClearAllSupportRequests()}
                        className="boss-flat-btn px-2.5 py-1 rounded bg-rose-950/70 border border-rose-500/60 text-rose-300 hover:bg-rose-600 hover:text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {supportRequests.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 bg-[#14181F] rounded-xl border border-slate-800">
                    Abhi tak koi support message ya admin reply maujood nahi.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                    {supportRequests.map((req) => {
                      const isAdminMsg = req.sender === 'ADMIN';
                      const parsed = extractSupportScreenshotUrl(req.message || '');
                      return (
                        <div
                          key={req.id}
                          className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
                            isAdminMsg
                              ? 'bg-emerald-950/25 border-emerald-500/60'
                              : 'bg-[#14181F] border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isAdminMsg && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-black uppercase shrink-0">
                                  {req.isBroadcast ? 'ADMIN BROADCAST' : 'ADMIN MESSAGE'}
                                </span>
                              )}
                              <span className="font-bold text-sky-300 truncate">
                                {req.requestType}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isAdminMsg && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                    req.adminReply || req.isResolved
                                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {req.adminReply || req.isResolved ? 'Resolved / Replied' : 'Pending'}
                                </span>
                              )}
                              {onDeleteSupportRequest && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteSupportRequest(req.id)}
                                  className="boss-flat-btn p-1 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer"
                                  title="Clear message"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-slate-100 whitespace-pre-wrap break-words">
                            {parsed.cleanText}
                          </div>

                          {parsed.screenshotUrl && (
                            <a
                              href={parsed.screenshotUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block"
                            >
                              <img
                                src={parsed.screenshotUrl}
                                alt="Attached Screenshot"
                                className="max-h-28 rounded-lg border border-slate-700"
                              />
                            </a>
                          )}

                          {req.adminReply && (
                            <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/50 space-y-0.5">
                              <div className="flex items-center justify-between gap-2 text-[9.5px] font-black text-emerald-300">
                                <span>ADMIN REPLY</span>
                                {req.repliedAt && (
                                  <span className="font-mono text-emerald-200/70">
                                    {new Date(req.repliedAt).toLocaleString('en-GB')}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-emerald-100 whitespace-pre-wrap break-words">
                                {req.adminReply}
                              </div>
                            </div>
                          )}

                          <div className="text-[9.5px] text-slate-500 font-mono">
                            {new Date(req.createdAt).toLocaleString('en-GB')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
