import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
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
  Zap,
} from 'lucide-react';
import bossLionLogoImg from '../assets/images/boss_lion_logo_1791741005749.jpg';
import {
  BankAccountConfig,
  SubscriptionPackageConfig,
} from '../types/bossModels';
import { ClientAuthSession, fetchAdminServer } from '../utils/adminApiConfig';

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
              {authSession.name} · {authSession.phone}
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
}) => {
  const [selectedPkg, setSelectedPkg] = useState<SubscriptionPackageConfig | null>(
    packages[0] || null
  );
  const [selectedBank, setSelectedBank] = useState<string>(
    bankAccounts[0]?.bankName || 'Easypaisa Wallet'
  );
  const [tidInput, setTidInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  useEffect(() => {
    if (!selectedPkg && packages.length > 0) setSelectedPkg(packages[0]);
  }, [packages, selectedPkg]);

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

  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'PENDING') return;
    const t = setInterval(checkOrder, 5000);
    return () => clearInterval(t);
  }, [activeOrder]);

  const handleSubmitTid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tidInput.trim()) {
      setOrderNotice('Bank receipt ki Transaction ID (TID) darj karein.');
      return;
    }
    const pkg = selectedPkg || packages[0];
    if (!pkg) return;

    setIsSubmitting(true);
    setOrderNotice(null);
    try {
      const bankObj =
        bankAccounts.find((b) => b.bankName === selectedBank) || bankAccounts[0];
      const resp = await fetchAdminServer('/api/client-submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: clientDeviceId,
          clientName: authSession.name,
          clientPhone: authSession.phone,
          clientEmail: authSession.email,
          clientCnic: authSession.cnic,
          packageId: pkg.id,
          packageName: pkg.name,
          planCode: pkg.planCode || 'MONTHLY',
          durationMonths: pkg.durationMonths || 1,
          amountRs: pkg.priceRs || pkg.price || 3000,
          bankAccountId: bankObj?.id || '',
          bankName: selectedBank,
          accountTitle: bankObj?.accountTitle || 'Syed Saboor Nawab',
          accountNumber: bankObj?.accountNumber || '03105524225',
          tid: tidInput.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        setOrderNotice(data?.error || 'Order submit nahi ho saka.');
        return;
      }
      setActiveOrder(data.order);
      if (data.isApprovedNow) {
        setOrderNotice('🎉 Payment Verify ho gayi! App unlock ho rahi hai...');
        await onRefreshCloudStatus();
      } else {
        setOrderNotice('✅ TID submit ho gayi hai. Admin / Robot verify karte hi App khul jaye gi!');
      }
    } catch {
      setOrderNotice('Server se rabta nahi ho saka. WhatsApp par receipt bhej dein.');
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
              src={bossLionLogoImg}
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
                {authSession.name} ({authSession.phone}) · ID: {clientDeviceId}
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
                  onClick={() => setSelectedPkg(pkg)}
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

          {/* TID Submission Form */}
          <form
            onSubmit={handleSubmitTid}
            className="p-3.5 rounded-xl bg-[#14181F] border border-[#F5B738]/50 space-y-2.5 text-xs"
          >
            <div className="font-black text-[#F5B738] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Payment Raseed ki TID Submit Karein (Auto-Unlock)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                type="text"
                value={tidInput}
                onChange={(e) => setTidInput(e.target.value)}
                placeholder="Enter TID (e.g. 42819038291)"
                className="px-3 py-2 rounded-lg bg-[#0C1017] border-2 border-[#F5B738]/70 text-[#F5B738] font-mono font-bold text-xs outline-none uppercase"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <a
                href={`https://wa.me/923105524225?text=${encodeURIComponent(
                  `Assalam-o-Alaikum Admin, I sent payment for ${selectedPkg?.name || 'Plan'}. Name: ${authSession.name}, Phone: ${authSession.phone}, Device: ${clientDeviceId}, TID: ${tidInput}`
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
                disabled={isSubmitting || !tidInput.trim()}
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
