import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  LogOut,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import bossLionLogoImg from '../assets/images/boss_lion_logo_1791741005749.jpg';
import {
  BankAccountConfig,
  SubscriptionPackageConfig,
} from '../types/bossModels';
import { ClientAuthSession, fetchAdminServer } from '../utils/adminApiConfig';
import {
  callSupabaseProxy,
  uploadImageToUserUploadsBucket,
} from '../utils/supabaseClientConfig';

// =========================================================================
// 1. NON-DISMISSIBLE ACCOUNT BLOCKED LOCK MODAL (RED SECURITY GATE)
// =========================================================================
interface AccountBlockedLockModalProps {
  authSession: ClientAuthSession;
  clientDeviceId: string;
  blockReason: string;
  isSyncing: boolean;
  onRefreshStatus: () => void;
  onLogout: () => void;
}

export const AccountBlockedLockModal: React.FC<AccountBlockedLockModalProps> = ({
  authSession,
  clientDeviceId,
  blockReason,
  isSyncing,
  onRefreshStatus,
  onLogout,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 bg-[#080306]/95 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#11080B] border-2 border-rose-500 shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-rose-500/30 pb-3">
          <div className="w-11 h-11 rounded-xl bg-rose-600/20 border border-rose-500 text-rose-400 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-rose-400 tracking-wide">
              ACCOUNT BLOCKED BY ADMIN
            </h2>
            <p className="text-[11px] text-rose-200/80 truncate">
              {authSession.name} · {authSession.phone || authSession.email}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/60 space-y-1 text-xs">
          <div className="text-[10px] font-bold uppercase text-rose-300">Block Reason</div>
          <div className="text-sm font-bold text-white">
            {blockReason || 'Suspended by Master Admin'}
          </div>
          <div className="text-[10.5px] text-rose-200/75 pt-1 font-mono">
            Device ID: {clientDeviceId}
          </div>
        </div>

        <p className="text-[11.5px] text-slate-300 leading-relaxed">
          Aapka account Master Admin Panel se lock kar diya gaya hai. Account bahal (unblock) karwane ke liye support team se rabta karein aur check status dabain.
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onRefreshStatus}
            disabled={isSyncing}
            className="boss-flat-btn w-full py-2.5 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Checking Admin Cloud...' : 'Check Status Again'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/923105524225?text=${encodeURIComponent(
                `Assalam-o-Alaikum Admin, mera account blocked show ho raha hai.\nName: ${authSession.name}\nPhone: ${authSession.phone}\nDevice: ${clientDeviceId}\nReason: ${blockReason}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="boss-flat-btn py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp Support</span>
            </a>

            <button
              type="button"
              onClick={onLogout}
              className="boss-flat-btn py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. NON-DISMISSIBLE EXPIRED TRIAL / SUBSCRIPTION UPGRADE & TID MODAL
// =========================================================================
interface SubscriptionExpiredLockModalProps {
  authSession: ClientAuthSession;
  clientDeviceId: string;
  packages: SubscriptionPackageConfig[];
  bankAccounts: BankAccountConfig[];
  expiresAt: number | null;
  isSyncing: boolean;
  onRefreshCloudStatus: () => Promise<boolean>;
  onLogout: () => void;
  mainLogoUrl?: string;
}

export const SubscriptionExpiredLockModal: React.FC<SubscriptionExpiredLockModalProps> = ({
  authSession,
  clientDeviceId,
  packages,
  bankAccounts,
  expiresAt,
  isSyncing,
  onRefreshCloudStatus,
  onLogout,
  mainLogoUrl,
}) => {
  const [selectedPkg, setSelectedPkg] = useState<SubscriptionPackageConfig | null>(
    packages[0] || null
  );
  const [selectedBank, setSelectedBank] = useState<string>(
    bankAccounts[0]?.bankName || 'Easypaisa Wallet'
  );
  const [amountInput, setAmountInput] = useState<string>(() =>
    String(packages[0]?.priceRs ?? packages[0]?.price ?? 3000)
  );
  const [tidInput, setTidInput] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  useEffect(() => {
    if (!selectedPkg && packages.length > 0) {
      setSelectedPkg(packages[0]);
      setAmountInput(String(packages[0].priceRs ?? packages[0].price ?? 3000));
    }
  }, [packages, selectedPkg]);

  useEffect(() => {
    const activeBanks = bankAccounts.filter((b) => b.isActive !== false);
    if (activeBanks.length > 0 && !activeBanks.some((b) => b.bankName === selectedBank)) {
      setSelectedBank(activeBanks[0].bankName);
    }
  }, [bankAccounts, selectedBank]);

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

  const checkOrder = async () => {
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
            amount: subRow.amount,
            bankName: subRow.payment_method,
            receiptUrl: subRow.receipt_url,
          });
        }
        if (isApproved) {
          await onRefreshCloudStatus();
          return;
        }
      }
    } catch {
      // ignore direct check error
    }

    try {
      const resp = await fetchAdminServer(
        `/api/client-order-status/${encodeURIComponent(clientDeviceId)}`
      );
      const data = await resp.json();
      if (data?.ok && data?.latestOrder) {
        setActiveOrder(data.latestOrder);
        if (
          data.latestOrder.status === 'APPROVED_AUTO' ||
          data.latestOrder.status === 'APPROVED_MANUAL'
        ) {
          await onRefreshCloudStatus();
        }
      }
    } catch {
      // ignore offline check
    }
  };

  useEffect(() => {
    checkOrder();
  }, [clientDeviceId]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingReceipt(true);
    setOrderNotice(null);
    try {
      const uploaded = await uploadImageToUserUploadsBucket({
        fileOrDataUrl: file,
        folder: 'receipts',
        deviceId: clientDeviceId,
        tag: 'payment_receipt',
      });
      setReceiptUrl(uploaded.url);
    } catch {
      setOrderNotice('Receipt screenshot upload nahi ho saka, dobara try karein.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSubmitTid = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTid = tidInput.trim().toUpperCase();
    if (!cleanTid) {
      setOrderNotice('Bank receipt ki Transaction ID (TID) darj karein.');
      return;
    }
    const pkg = selectedPkg || packages[0];
    const pkgAmount = Number(amountInput) || pkg?.priceRs || pkg?.price || 3000;

    setIsSubmitting(true);
    setOrderNotice(null);
    try {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const subPayload: Record<string, any> = {
        device_id: clientDeviceId,
        user_name: authSession.name || 'Client',
        phone: authSession.phone || '',
        email: authSession.email || '',
        cnic: authSession.cnic || '',
        package_name: pkg?.name || 'Monthly Pro Plan',
        subscription_tier: pkg?.planCode || 'MONTHLY',
        amount: pkgAmount,
        payment_method: selectedBank,
        last_payment_tid: cleanTid,
        ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
        status: 'PENDING',
        last_updated: now,
        updated_at: nowIso,
      };

      const [sbSubRes] = await Promise.all([
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'POST',
          upsert: true,
          payload: subPayload,
          timeoutMs: 12000,
        }),
        callSupabaseProxy({
          table: 'users',
          method: 'PATCH',
          query: `device_id=eq.${encodeURIComponent(clientDeviceId)}`,
          payload: {
            last_payment_tid: cleanTid,
            package_name: pkg?.name || 'Monthly Pro Plan',
            last_cloud_sync: now,
          },
          timeoutMs: 8000,
        }).catch(() => ({ ok: false })),
      ]);

      if (!sbSubRes.ok) {
        setOrderNotice(sbSubRes.error || 'Supabase par payment details save nahi ho sakin.');
        return;
      }

      const submittedOrder = {
        tid: cleanTid,
        status: 'PENDING',
        amount: pkgAmount,
        bankName: selectedBank,
        packageName: pkg?.name || 'Plan',
        receiptUrl,
      };
      setActiveOrder(submittedOrder);
      setOrderNotice(
        '✅ Payment TID aur Receipt Supabase par Admin Panel ko send ho chuki hai! Verify hote hi App unlock ho jaye gi.'
      );

      // Non-fatal optional ping to Admin Webhook server for instant email robot matching
      const bankObj =
        bankAccounts.find((b) => b.bankName === selectedBank) || bankAccounts[0];
      fetchAdminServer('/api/client-submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: clientDeviceId,
          clientName: authSession.name,
          clientPhone: authSession.phone,
          clientEmail: authSession.email,
          clientCnic: authSession.cnic,
          packageId: pkg?.id || 'pkg-custom',
          packageName: pkg?.name || 'Monthly Pro Plan',
          planCode: pkg?.planCode || 'MONTHLY',
          durationMonths: pkg?.durationMonths || 1,
          amountRs: pkgAmount,
          bankAccountId: bankObj?.id || '',
          bankName: selectedBank,
          accountTitle: bankObj?.accountTitle || 'Syed Saboor Nawab',
          accountNumber: bankObj?.accountNumber || '03105524225',
          tid: cleanTid,
          receiptUrl,
        }),
        timeoutMs: 6000,
      })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (d?.ok && d?.isApprovedNow) {
            setActiveOrder(d.order);
            setOrderNotice('🎉 Payment Verify ho gayi! App unlock ho rahi hai...');
            await onRefreshCloudStatus();
          }
        })
        .catch(() => {});
    } catch (err: any) {
      setOrderNotice(err?.message || 'Payment submit karte waqt error aaya.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070B]/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0C1017] border-2 border-[#F5B738] shadow-2xl p-4 sm:p-5 space-y-4 my-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={mainLogoUrl || bossLionLogoImg}
              alt="Boss Aluminium"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#F5B738] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-black text-[#F5B738] truncate">
                  Trial / Subscription Expired — Plan Activate Karein
                </h2>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {authSession.name} ({authSession.phone || authSession.email}) · ID: {clientDeviceId}
                {expiresAt ? ` · Expired: ${new Date(expiresAt).toLocaleDateString('en-GB')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefreshCloudStatus}
              disabled={isSyncing}
              className="boss-flat-btn px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500 hover:text-black text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Status</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="boss-flat-btn px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Packages */}
        <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {packages.map((pkg, idx) => {
              const price = pkg.priceRs ?? pkg.price ?? 0;
              const selected = selectedPkg?.id === pkg.id;
              return (
                <button
                  key={pkg.id || idx}
                  type="button"
                  onClick={() => {
                    setSelectedPkg(pkg);
                    setAmountInput(String(price));
                  }}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    selected
                      ? 'bg-amber-500/15 border-[#F5B738] ring-1 ring-[#F5B738]'
                      : 'bg-[#14181F] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-white truncate">{pkg.name}</span>
                    <Crown className="w-3.5 h-3.5 text-[#F5B738] shrink-0" />
                  </div>
                  <div className="text-lg font-black text-[#F5B738]">
                    Rs. {price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {pkg.durationLabel || `${pkg.durationMonths} Month(s)`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bank Accounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {bankAccounts
              .filter((b) => b.isActive !== false)
              .map((acc, i) => (
                <div
                  key={acc.id || i}
                  className="p-2.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-1 text-[11px]"
                >
                  <div className="font-bold text-[#F5B738] truncate">{acc.bankName}</div>
                  <div className="text-slate-300 truncate">{acc.accountTitle}</div>
                  <div className="flex items-center justify-between gap-1 bg-[#0C1017] px-2 py-1 rounded border border-slate-800 font-mono">
                    <span className="text-emerald-400 font-bold truncate text-[10.5px]">
                      {acc.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(acc.accountNumber);
                        setCopiedId(acc.id || String(i));
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="px-2 py-0.5 rounded bg-[#F5B738] text-black text-[10px] font-black shrink-0 cursor-pointer"
                    >
                      {copiedId === (acc.id || String(i)) ? 'Copied' : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {activeOrder && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-[#F5B738]/60 text-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {activeOrder.status === 'PENDING' ? (
                  <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="text-slate-200">
                  Order TID <strong className="font-mono text-[#F5B738]">{activeOrder.tid}</strong> ·{' '}
                  <strong>{activeOrder.status}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={checkOrder}
                className="px-2.5 py-1 rounded bg-[#14181F] border border-slate-700 text-[11px] font-bold text-white cursor-pointer"
              >
                Check Order
              </button>
            </div>
          )}

          {orderNotice && (
            <div className="p-2.5 rounded-xl bg-[#14181F] border border-[#F5B738]/60 text-xs text-amber-200">
              {orderNotice}
            </div>
          )}

          {/* TID + Amount + Receipt Screenshot Form */}
          <form
            onSubmit={handleSubmitTid}
            className="p-3.5 rounded-xl bg-[#14181F] border border-[#F5B738]/50 space-y-2.5 text-xs"
          >
            <div className="font-black text-[#F5B738] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Payment TID, Amount &amp; Raseed Screenshot Submit Karein</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
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
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Amount (Rs.)"
                min={1}
                className="px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-emerald-300 font-mono font-bold text-xs outline-none"
                required
              />

              <input
                type="text"
                value={tidInput}
                onChange={(e) => setTidInput(e.target.value)}
                placeholder="Enter TID (e.g. 42819038291)"
                className="px-3 py-2 rounded-lg bg-[#0C1017] border-2 border-[#F5B738]/70 text-[#F5B738] font-mono font-bold text-xs outline-none uppercase"
                required
              />
            </div>

            {/* Transaction Receipt Screenshot Upload */}
            <label className="cursor-pointer rounded-xl bg-[#0C1017] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex items-center justify-between gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
              />
              {receiptUrl ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={receiptUrl}
                    alt="Payment Receipt"
                    className="w-10 h-10 object-cover rounded-lg border border-emerald-500/60 shrink-0"
                  />
                  <span className="text-[11px] font-bold text-emerald-400 truncate">
                    ✓ Transaction Screenshot Attached (Tap to change)
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
                      ? 'Uploading Receipt Screenshot...'
                      : 'Upload Payment Screenshot / Raseed (Recommended)'}
                  </span>
                </div>
              )}
              <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </label>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <a
                href={`https://wa.me/923105524225?text=${encodeURIComponent(
                  `Assalam-o-Alaikum Admin, I sent Rs. ${amountInput} payment for ${selectedPkg?.name || 'Plan'}. Name: ${authSession.name}, Phone: ${authSession.phone}, Device: ${clientDeviceId}, TID: ${tidInput}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Send Receipt on WhatsApp</span>
              </a>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingReceipt || !tidInput.trim()}
                className="boss-flat-btn px-4 py-2 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit TID &amp; Activate</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
