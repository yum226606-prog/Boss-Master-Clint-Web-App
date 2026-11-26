import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Monitor,
  Smartphone,
  X,
} from 'lucide-react';
import {
  AppOfferBanner,
  BankAccountConfig,
  BossTab,
  ClientAppLayoutControlConfig,
  ClientSupportRequest,
  DeletedBackupItem,
  DgWindowItem,
  DoorItem,
  ExtraPiece,
  FixFrameItem,
  FormulaCategorySettings,
  FSectionFormula,
  GlassFormula,
  MeasurementUnit,
  MobileDownloadConfig,
  OpenableWindowItem,
  SavedQuotation,
  SlidingDoorFormulaSettings,
  SlidingDoorItem,
  SubscriptionPackage,
  WindowFormulaSettings,
  WindowItem,
} from './types/bossModels';
import {
  callSupabaseProxy,
  fetchSupabaseServerTimeMs,
  getActiveSupabaseCredentials,
  getEffectiveServerNowMs,
  isLocalClockRolledBack,
  reinitializeSupabaseClient,
  supabase,
} from './utils/supabaseClientConfig';
import {
  DEFAULT_COLORS,
  DEFAULT_SECTIONS,
  GAUGES,
  getClearedZeroRates,
  getDefaultCategoryFormula,
  getDefaultDgWindowFormula,
  getDefaultFSectionFormula,
  getDefaultGlassFormulas,
  getDefaultLayoutControlConfig,
  getDefaultSlidingDoorFormula,
  getDefaultWindowFormula,
  getInitialGlassRates,
  getInitialRates,
  getStarterBankAccounts,
  getStarterPackages,
  isSectionCodeMatch,
  mergeAvailableColorsWithDefaults,
  mergeGlassRatesWithDefaults,
  normalizeSectionCode,
} from './utils/bossDefaultRates';
import bossLionLogoImg from './assets/images/boss_lion_logo_1791741005749.jpg';
import bossLetterheadCleanImg from './assets/images/boss_letterhead_bg_1791741019302.jpg';
import { usePWAInstall } from './hooks/usePWAInstall';
import { AppLayoutCalculatorScreen } from './components/AppLayoutCalculatorScreen';
import {
  AppThemeConfig,
  BUILT_IN_THEMES,
  enforceReadableContrast,
  ThemeStudioModal,
} from './components/ThemeStudioModal';
import { ClientAuthModal } from './components/ClientAuthModal';
import {
  AccountBlockedLockModal,
  SubscriptionExpiredLockModal,
} from './components/AccountLockModals';
import {
  BossUserRole,
  buildScopedUserQuery,
  clearActiveSessionToken,
  clearAppConfigCache,
  clearAuthSession,
  clearLastActiveAtMs,
  ClientAuthSession,
  collectAndSyncUserTelemetryToSupabase,
  evaluateClientAccessState,
  fetchAppConfigsSmart,
  fetchMultiKeyUserRecords,
  getClientPublicIpAddress,
  getOrCreateClientDeviceId,
  getOrCreateDeviceMacFingerprint,
  isManualLoggedOut,
  isOwnerIdentity,
  isSessionInactiveExpired,
  loadActiveSessionToken,
  loadAuthSession,
  loadCachedMasterEngineConfig,
  markUserOfflineInSupabase,
  performCleanSupabaseAndStorageSignOut,
  requestAndSaveGpsLocation,
  saveAuthSession,
  saveCachedMasterEngineConfig,
  saveLastActiveAtMs,
  setManualLoggedOut,
} from './utils/adminApiConfig';

const STORAGE_KEY = 'boss_aluminium_master_web_state_v1';
const DEVICE_RATES_KEY = 'boss_client_device_rates_v1';
const CLEARED_SUPPORT_MSG_IDS_KEY = 'boss_cleared_support_msg_ids_v1';
const LAST_SEEN_SUPPORT_MS_KEY = 'boss_last_seen_support_ms_v1';
const INITIAL_CLOUD_SYNC_KEY = 'boss_initial_cloud_sync_done_v1';
const USER_LOCKED_TABS_KEY = 'boss_user_locked_tabs_v1';

function hasInitialSyncCompletedForDevice(deviceId: string): boolean {
  if (typeof window === 'undefined' || !deviceId) return false;
  try {
    return localStorage.getItem(INITIAL_CLOUD_SYNC_KEY) === deviceId;
  } catch {
    return false;
  }
}

function markInitialSyncCompletedForDevice(deviceId: string): void {
  if (typeof window === 'undefined' || !deviceId) return;
  try {
    localStorage.setItem(INITIAL_CLOUD_SYNC_KEY, deviceId);
  } catch {
    // ignore storage errors
  }
}

function clearInitialSyncCompletedFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(INITIAL_CLOUD_SYNC_KEY);
  } catch {
    // ignore storage errors
  }
}

const TAB_KEY_ALIASES: Record<string, string> = {
  WINDOWS: 'WINDOWS',
  WINDOW: 'WINDOWS',
  SLIDING_WINDOWS: 'WINDOWS',
  DG_WINDOWS: 'DG_WINDOWS',
  DGWINDOWS: 'DG_WINDOWS',
  DG_WINDOW: 'DG_WINDOWS',
  DGWINDOW: 'DG_WINDOWS',
  DOORS: 'DOORS',
  DOOR: 'DOORS',
  DOORS_FRAMES: 'DOORS',
  DOORS_AND_FRAMES: 'DOORS',
  SLIDING_DOORS: 'DOORS',
  EXTRA_PIECES: 'EXTRA_PIECES',
  EXTRA: 'EXTRA_PIECES',
  EXTRAS: 'EXTRA_PIECES',
  EXTRA_PIECE: 'EXTRA_PIECES',
  CUTTING: 'CUTTING',
  CUTTING_CHART: 'CUTTING',
  LENGTH: 'LENGTH',
  LENGTH_CHART: 'LENGTH',
  GLASS: 'GLASS',
  GLASS_CHART: 'GLASS',
  QUOTATION: 'QUOTATION',
  QUOTE: 'QUOTATION',
  HISTORY: 'HISTORY',
  SAVED_HISTORY: 'HISTORY',
  RATES: 'RATES',
  RATES_SETTINGS: 'RATES',
  SETTINGS: 'RATES',
};

function canonicalizeTabKey(rawKey: string): string {
  const cleaned = String(rawKey || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned) return '';
  return TAB_KEY_ALIASES[cleaned] || cleaned;
}

function parseLockBoolean(val: unknown): boolean {
  if (val === false || val === 0 || val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (
      !s ||
      s === 'false' ||
      s === '0' ||
      s === 'no' ||
      s === 'off' ||
      s === 'unlocked' ||
      s === 'unlock' ||
      s === 'open'
    ) {
      return false;
    }
    return true;
  }
  return Boolean(val);
}

function normalizeLockedTabsMap(...sources: any[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  sources.forEach((rawSrc) => {
    let src = rawSrc;
    if (typeof src === 'string') {
      const trimmed = src.trim();
      if (!trimmed) return;
      try {
        src = JSON.parse(trimmed);
      } catch {
        return;
      }
    }
    if (!src) return;
    if (Array.isArray(src)) {
      src.forEach((item) => {
        const canonical = canonicalizeTabKey(String(item || ''));
        if (canonical) out[canonical] = true;
      });
      return;
    }
    if (typeof src === 'object') {
      Object.entries(src).forEach(([rawKey, val]) => {
        const canonical = canonicalizeTabKey(rawKey);
        if (!canonical) return;
        out[canonical] = parseLockBoolean(val);
      });
    }
  });
  return out;
}

function loadClearedSupportIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(CLEARED_SUPPORT_MSG_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map((x) => String(x))) : new Set();
  } catch {
    return new Set();
  }
}

function addClearedSupportIds(ids: string[]): void {
  if (typeof window === 'undefined' || ids.length === 0) return;
  try {
    const set = loadClearedSupportIds();
    ids.forEach((id) => {
      if (id) set.add(String(id));
    });
    const trimmed = Array.from(set).slice(-500);
    localStorage.setItem(CLEARED_SUPPORT_MSG_IDS_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

function loadLastSeenSupportMs(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = Number(localStorage.getItem(LAST_SEEN_SUPPORT_MS_KEY) || 0);
    return Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

function saveLastSeenSupportMs(ms: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_SEEN_SUPPORT_MS_KEY, String(ms));
  } catch {
    // ignore storage errors
  }
}

function isBundledFallbackLetterhead(url: string, bundledAssetUrl: string): boolean {
  const s = String(url || '').trim();
  if (!s) return true;
  if (s === bundledAssetUrl) return true;
  if (s.includes('boss_letterhead_bg_')) return true;
  return false;
}

function extractAdminLetterheadBgUrl(
  globalCfg: any,
  brandingCfg?: any,
  layoutCfg?: any,
  directRow?: any
): string {
  const directVal =
    typeof directRow === 'string'
      ? directRow
      : directRow?.letterhead_bg_url || directRow?.letterheadBgUrl || directRow?.url || '';
  const candidates = [
    globalCfg?.letterhead_bg_url,
    globalCfg?.letterheadBgUrl,
    globalCfg?.companyBranding?.letterhead_bg_url,
    globalCfg?.companyBranding?.letterheadBgUrl,
    globalCfg?.branding?.letterhead_bg_url,
    globalCfg?.branding?.letterheadBgUrl,
    globalCfg?.layoutConfig?.letterhead_bg_url,
    globalCfg?.layoutConfig?.letterheadBgUrl,
    brandingCfg?.letterhead_bg_url,
    brandingCfg?.letterheadBgUrl,
    brandingCfg?.companyBranding?.letterhead_bg_url,
    brandingCfg?.companyBranding?.letterheadBgUrl,
    brandingCfg?.value?.letterhead_bg_url,
    brandingCfg?.value?.letterheadBgUrl,
    layoutCfg?.letterhead_bg_url,
    layoutCfg?.letterheadBgUrl,
    layoutCfg?.layoutConfig?.letterhead_bg_url,
    layoutCfg?.layoutConfig?.letterheadBgUrl,
    directVal,
  ];
  for (const c of candidates) {
    const s = typeof c === 'string' ? c.trim() : '';
    if (s) return s;
  }
  return '';
}

function resolveLivePackagesAndOfferFromConfigs(
  cfgMap: Record<string, any>,
  timestamps?: Record<string, string>,
  globalCfgMerged?: Record<string, any>
): {
  activeOffer: AppOfferBanner | null;
  hasOfferKeyInCloud: boolean;
  packages: SubscriptionPackage[] | null;
  applyOfferDiscountToPackages: (pkgList: SubscriptionPackage[]) => SubscriptionPackage[];
} {
  const globalConfigOnly =
    cfgMap.global_config && typeof cfgMap.global_config === 'object' ? cfgMap.global_config : {};
  const masterEngineOnly =
    cfgMap.master_engine_config && typeof cfgMap.master_engine_config === 'object'
      ? cfgMap.master_engine_config
      : {};
  const globalTs = Date.parse(timestamps?.global_config || '') || 0;
  const masterTs = Date.parse(timestamps?.master_engine_config || '') || 0;
  const packagesTs = Date.parse(timestamps?.packages_v1 || '') || 0;

  const globalCfg =
    globalCfgMerged ||
    (globalTs > masterTs
      ? { ...masterEngineOnly, ...globalConfigOnly }
      : { ...globalConfigOnly, ...masterEngineOnly });

  const packagesV1Obj =
    cfgMap.packages_v1 && !Array.isArray(cfgMap.packages_v1) && typeof cfgMap.packages_v1 === 'object'
      ? cfgMap.packages_v1
      : null;
  const packagesV1List: any[] | null = Array.isArray(cfgMap.packages_v1)
    ? cfgMap.packages_v1
    : Array.isArray(packagesV1Obj?.packages)
    ? packagesV1Obj.packages
    : Array.isArray(packagesV1Obj?.items)
    ? packagesV1Obj.items
    : Array.isArray(packagesV1Obj?.list)
    ? packagesV1Obj.list
    : null;

  const pricingMetaBase =
    globalTs >= masterTs
      ? {
          ...(masterEngineOnly?.pricingMeta && typeof masterEngineOnly.pricingMeta === 'object'
            ? masterEngineOnly.pricingMeta
            : {}),
          ...(globalConfigOnly?.pricingMeta && typeof globalConfigOnly.pricingMeta === 'object'
            ? globalConfigOnly.pricingMeta
            : {}),
        }
      : {
          ...(globalConfigOnly?.pricingMeta && typeof globalConfigOnly.pricingMeta === 'object'
            ? globalConfigOnly.pricingMeta
            : {}),
          ...(masterEngineOnly?.pricingMeta && typeof masterEngineOnly.pricingMeta === 'object'
            ? masterEngineOnly.pricingMeta
            : {}),
        };
  const pricingMeta: Record<string, any> = {
    ...pricingMetaBase,
    ...(cfgMap.pricing_meta_v1 && typeof cfgMap.pricing_meta_v1 === 'object'
      ? cfgMap.pricing_meta_v1
      : {}),
    ...(packagesV1Obj?.pricingMeta && typeof packagesV1Obj.pricingMeta === 'object'
      ? packagesV1Obj.pricingMeta
      : {}),
  };

  const rawGlobalDiscountPct = Number(
    (pricingMeta.isDiscountActive !== false && pricingMeta.discountEnabled !== false
      ? pricingMeta.discountPct ??
        pricingMeta.globalDiscountPct ??
        pricingMeta.discount_pct ??
        pricingMeta.discountPercent ??
        pricingMeta.discount
      : undefined) ??
      packagesV1Obj?.discountPct ??
      packagesV1Obj?.globalDiscountPct ??
      packagesV1Obj?.discount_pct ??
      (globalTs >= masterTs
        ? globalConfigOnly.discountPct ??
          globalConfigOnly.globalDiscountPct ??
          globalConfigOnly.discount_pct ??
          globalConfigOnly.offerDiscountPct ??
          masterEngineOnly.discountPct ??
          masterEngineOnly.globalDiscountPct ??
          masterEngineOnly.discount_pct
        : masterEngineOnly.discountPct ??
          masterEngineOnly.globalDiscountPct ??
          masterEngineOnly.discount_pct ??
          globalConfigOnly.discountPct ??
          globalConfigOnly.globalDiscountPct ??
          globalConfigOnly.discount_pct ??
          globalConfigOnly.offerDiscountPct) ??
      globalCfg.discountPct ??
      globalCfg.globalDiscountPct ??
      0
  );
  const cleanGlobalDiscountPct =
    Number.isFinite(rawGlobalDiscountPct) && rawGlobalDiscountPct > 0 ? rawGlobalDiscountPct : 0;

  const cloudOfferUpdateTs = Number(
    globalCfg.lastUpdated || globalCfg.lastCloudSyncAt || Date.now()
  );
  const rawOffersList = [
    ...(Array.isArray(globalCfg.offers) ? globalCfg.offers : []),
    ...(Array.isArray(globalCfg.activeOffers) ? globalCfg.activeOffers : []),
    ...(Array.isArray(cfgMap.offers_v1) ? cfgMap.offers_v1 : []),
  ];
  const activeFromList =
    rawOffersList.find(
      (o: any) => o && o.isActive !== false && o.isVisible !== false && o.showBanner !== false
    ) || rawOffersList[0];

  const rawCandidateOffer =
    globalCfg.activeOffer ||
    globalCfg.discountOffer ||
    globalCfg.specialOffer ||
    globalCfg.promoOffer ||
    globalCfg.offerBanner ||
    globalCfg.activeBanner ||
    globalCfg.bannerConfig ||
    globalCfg.offer ||
    pricingMeta.activeOffer ||
    pricingMeta.offer ||
    cfgMap.offer_banner_v1 ||
    cfgMap.active_offer_v1 ||
    cfgMap.discount_offer_v1 ||
    activeFromList ||
    null;

  const normalizeOfferObj = (raw: any): AppOfferBanner | null => {
    if (!raw || typeof raw !== 'object') return null;
    const rawTitle = String(raw.title || raw.name || raw.heading || '').trim();
    const rawMsg = String(raw.message || raw.description || raw.text || '').trim();
    const rawBadge = String(raw.badgeText || raw.badge || 'SPECIAL OFFER').trim();
    let parsedPct = Number(
      raw.discountPct ??
        raw.discount_pct ??
        raw.discountPercent ??
        raw.discount ??
        raw.percentage ??
        cleanGlobalDiscountPct ??
        0
    );
    if (!Number.isFinite(parsedPct) || parsedPct < 0) parsedPct = 0;
    if (parsedPct === 0) {
      const pctMatch = `${rawBadge} ${rawTitle} ${rawMsg}`.match(/(\d{1,2})\s*%/);
      if (pctMatch) parsedPct = Number(pctMatch[1]) || 0;
    }
    return {
      id: String(raw.id || 'admin-offer-1'),
      title: rawTitle || (parsedPct > 0 ? `${parsedPct}% Special Discount Offer` : 'Special Offer'),
      message: rawMsg,
      badgeText: rawBadge,
      isActive: raw.isActive !== false && raw.enabled !== false,
      isVisible: raw.isVisible !== false,
      showBanner: raw.showBanner !== false,
      createdAt: Number(raw.createdAt || raw.created_at || Date.now()),
      updatedAt: Number(
        raw.updatedAt || raw.updated_at || cloudOfferUpdateTs || raw.createdAt || Date.now()
      ),
      createdBy: String(raw.createdBy || 'Admin'),
      discountPct: parsedPct,
      discountCode: raw.discountCode ? String(raw.discountCode) : undefined,
      applyToAllPackages: raw.applyToAllPackages !== false && raw.applyToPackages !== false,
      expiresAt: raw.expiresAt ? Number(raw.expiresAt) : undefined,
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
    };
  };

  let normalizedOffer = normalizeOfferObj(rawCandidateOffer);
  if (!normalizedOffer && cleanGlobalDiscountPct > 0 && pricingMeta.showBanner !== false) {
    normalizedOffer = {
      id: 'pricing-meta-offer',
      title: String(
        pricingMeta.offerTitle ||
          pricingMeta.title ||
          `${cleanGlobalDiscountPct}% Special Discount Offer`
      ),
      message: String(pricingMeta.offerMessage || pricingMeta.message || ''),
      badgeText: String(pricingMeta.badgeText || `${cleanGlobalDiscountPct}% OFF`),
      isActive: true,
      isVisible: true,
      showBanner: true,
      createdAt: Date.now(),
      updatedAt: cloudOfferUpdateTs,
      createdBy: 'Admin',
      discountPct: cleanGlobalDiscountPct,
      applyToAllPackages: true,
    };
  }

  const hasOfferKeyInCloud = Boolean(
    globalCfg.activeOffer !== undefined ||
      globalCfg.discountOffer !== undefined ||
      globalCfg.specialOffer !== undefined ||
      globalCfg.promoOffer !== undefined ||
      globalCfg.offerBanner !== undefined ||
      globalCfg.activeBanner !== undefined ||
      globalCfg.bannerConfig !== undefined ||
      globalCfg.offer !== undefined ||
      globalCfg.discountPct !== undefined ||
      globalCfg.globalDiscountPct !== undefined ||
      globalCfg.pricingMeta !== undefined ||
      packagesV1Obj?.discountPct !== undefined ||
      packagesV1Obj?.pricingMeta !== undefined ||
      cfgMap.offer_banner_v1 !== undefined ||
      cfgMap.active_offer_v1 !== undefined ||
      rawOffersList.length > 0
  );

  const globalOfferPct =
    normalizedOffer &&
    normalizedOffer.isActive !== false &&
    normalizedOffer.isVisible !== false &&
    normalizedOffer.showBanner !== false &&
    normalizedOffer.applyToAllPackages !== false
      ? Number(normalizedOffer.discountPct || cleanGlobalDiscountPct || 0)
      : cleanGlobalDiscountPct;

  const pkgCandidates: { list: any[]; ts: number; rank: number }[] = [];
  if (packagesV1List && packagesV1List.length > 0) {
    pkgCandidates.push({ list: packagesV1List, ts: packagesTs, rank: 4 });
  }
  const gcPkgs =
    (Array.isArray(globalConfigOnly.packages) && globalConfigOnly.packages.length > 0
      ? globalConfigOnly.packages
      : null) ||
    (Array.isArray(globalConfigOnly.subscriptionPackages) &&
    globalConfigOnly.subscriptionPackages.length > 0
      ? globalConfigOnly.subscriptionPackages
      : null);
  if (gcPkgs) {
    pkgCandidates.push({ list: gcPkgs, ts: globalTs, rank: 3 });
  }
  const mcPkgs =
    (Array.isArray(masterEngineOnly.packages) && masterEngineOnly.packages.length > 0
      ? masterEngineOnly.packages
      : null) ||
    (Array.isArray(masterEngineOnly.subscriptionPackages) &&
    masterEngineOnly.subscriptionPackages.length > 0
      ? masterEngineOnly.subscriptionPackages
      : null);
  if (mcPkgs) {
    pkgCandidates.push({ list: mcPkgs, ts: masterTs, rank: 2 });
  }
  if (Array.isArray(cfgMap.subscription_packages_v1) && cfgMap.subscription_packages_v1.length > 0) {
    pkgCandidates.push({
      list: cfgMap.subscription_packages_v1,
      ts: Date.parse(timestamps?.subscription_packages_v1 || '') || 0,
      rank: 1,
    });
  }
  pkgCandidates.sort((a, b) => (b.ts !== a.ts ? b.ts - a.ts : b.rank - a.rank));
  const rawPackagesSource = pkgCandidates[0]?.list || null;

  const resolvePkgPricingMetaOverride = (p: any): Record<string, any> | null => {
    const pid = String(p?.id || '').trim();
    const pcode = String(p?.planCode || '').trim().toUpperCase();
    const fromMap =
      (pid && pricingMeta[pid]) ||
      (pcode && pricingMeta[pcode]) ||
      (pcode && pricingMeta[pcode.toLowerCase()]) ||
      (pid && pricingMeta.packages?.[pid]) ||
      (pcode && pricingMeta.packages?.[pcode]) ||
      (pid && pricingMeta.rates?.[pid]) ||
      (pcode && pricingMeta.rates?.[pcode]) ||
      null;
    if (fromMap && typeof fromMap === 'object') return fromMap;
    if (typeof fromMap === 'number' && Number.isFinite(fromMap) && fromMap > 0) {
      return { priceRs: fromMap };
    }
    const flatByPlan: Record<string, any> = {
      MONTHLY: pricingMeta.monthlyPriceRs ?? pricingMeta.monthlyPrice ?? pricingMeta.monthly,
      QUARTERLY:
        pricingMeta.quarterlyPriceRs ?? pricingMeta.quarterlyPrice ?? pricingMeta.quarterly,
      HALF_YEARLY:
        pricingMeta.halfYearlyPriceRs ?? pricingMeta.halfYearlyPrice ?? pricingMeta.halfYearly,
      YEARLY: pricingMeta.yearlyPriceRs ?? pricingMeta.yearlyPrice ?? pricingMeta.yearly,
      LIFETIME_VIP:
        pricingMeta.lifetimePriceRs ?? pricingMeta.lifetimePrice ?? pricingMeta.lifetime,
    };
    const flatVal = pcode ? Number(flatByPlan[pcode]) : NaN;
    if (Number.isFinite(flatVal) && flatVal > 0) {
      return { priceRs: flatVal };
    }
    return null;
  };

  const applyOfferDiscountToPackages = (
    pkgList: SubscriptionPackage[]
  ): SubscriptionPackage[] =>
    pkgList.map((p: any) => {
      const metaOverride = resolvePkgPricingMetaOverride(p);
      const mergedPkg = metaOverride ? { ...p, ...metaOverride } : p;
      const curRawPrice = Number(mergedPkg.priceRs ?? mergedPkg.price ?? 0);
      const rawOrig = Number(mergedPkg.originalPriceRs || mergedPkg.basePriceRs || 0);
      const baseOrig = rawOrig > curRawPrice ? rawOrig : curRawPrice || rawOrig;
      const ownPct = Number(
        mergedPkg.discountPct ?? mergedPkg.discount_pct ?? mergedPkg.discount ?? 0
      );
      const effPct = ownPct > 0 ? ownPct : globalOfferPct > 0 ? globalOfferPct : 0;

      if (effPct > 0 && baseOrig > 0) {
        const computedDiscounted = Math.max(1, Math.round(baseOrig * (1 - effPct / 100)));
        const finalPrice =
          ownPct > 0 && curRawPrice > 0 && curRawPrice < baseOrig
            ? curRawPrice
            : computedDiscounted;
        return {
          ...mergedPkg,
          originalPriceRs: baseOrig,
          priceRs: finalPrice,
          price: finalPrice,
          discountPct: effPct,
          discountOfferText:
            mergedPkg.discountOfferText ||
            (normalizedOffer?.title
              ? `${effPct}% OFF — ${normalizedOffer.title}`
              : `${effPct}% OFF`),
        };
      }
      return {
        ...mergedPkg,
        originalPriceRs: rawOrig > curRawPrice ? rawOrig : curRawPrice,
        priceRs: curRawPrice,
        price: curRawPrice,
        discountPct: 0,
        discountOfferText: undefined,
      };
    });

  return {
    activeOffer: normalizedOffer,
    hasOfferKeyInCloud,
    packages: rawPackagesSource ? applyOfferDiscountToPackages(rawPackagesSource) : null,
    applyOfferDiscountToPackages,
  };
}

export default function App() {
  const [initialBootAuth] = useState<{
    session: ClientAuthSession | null;
    notice: string | null;
  }>(() => {
    const sess = loadAuthSession();
    if (sess?.verified && isSessionInactiveExpired(sess)) {
      clearAuthSession();
      clearActiveSessionToken();
      clearLastActiveAtMs();
      clearInitialSyncCompletedFlag();
      try {
        localStorage.removeItem(USER_LOCKED_TABS_KEY);
      } catch {}
      return {
        session: null,
        notice: 'Session expired after 3 days of inactivity. Please login again.',
      };
    }
    if (sess?.verified) {
      saveLastActiveAtMs(Date.now());
    }
    return { session: sess, notice: null };
  });
  const [authSession, setAuthSession] = useState<ClientAuthSession | null>(
    initialBootAuth.session
  );
  const [authNotice, setAuthNotice] = useState<string | null>(initialBootAuth.notice);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(false);
  const [currentCalcTab, setCurrentCalcTab] = useState<BossTab>('WINDOWS');

  // Context State
  const [ctxGauge, setCtxGauge] = useState<string>('1.6');
  const [ctxGaugeMode, setCtxGaugeMode] = useState<'ON' | 'OFF'>('ON');
  const [ctxColor, setCtxColor] = useState<string>('DULL');
  const [ctxFrameType, setCtxFrameType] = useState<string>('C');
  const [ctxGlassMode, setCtxGlassMode] = useState<'ON' | 'OFF'>('ON');
  const [ctxGlassGauge, setCtxGlassGauge] = useState<string>('5');
  const [ctxGlassColor, setCtxGlassColor] = useState<string>('CLEAR');
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>('INCH_SUTAR');
  const [glassFittingOption, setGlassFittingOption] = useState<'FIX_RUBBER' | 'U_PVC'>('FIX_RUBBER');

  // Catalog, Rates & Visibility
  const [availableColors, setAvailableColors] = useState<string[]>(() =>
    mergeAvailableColorsWithDefaults(DEFAULT_COLORS)
  );
  const [customSections, setCustomSections] = useState<string[]>([
    'CW50-MULLION',
    'CW50-TRANSOM',
    'TH70-FRAME',
  ]);
  const [rates, setRates] = useState<Record<string, Record<string, Record<string, number>>>>(() =>
    getInitialRates()
  );
  const [glassRates, setGlassRates] = useState<Record<string, Record<string, number>>>(() =>
    getInitialGlassRates()
  );
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);

  // Formulas State
  const [windowFormula, setWindowFormula] = useState<WindowFormulaSettings>(() =>
    getDefaultWindowFormula()
  );
  const [dgWindowFormula, setDgWindowFormula] = useState<WindowFormulaSettings>(() =>
    getDefaultDgWindowFormula()
  );
  const [slidingDoorFormula, setSlidingDoorFormula] = useState<SlidingDoorFormulaSettings>(() =>
    getDefaultSlidingDoorFormula()
  );
  const [doorFormula, setDoorFormula] = useState<FormulaCategorySettings>(() =>
    getDefaultCategoryFormula('door')
  );
  const [fixFormula, setFixFormula] = useState<FormulaCategorySettings>(() =>
    getDefaultCategoryFormula('fix')
  );
  const [openwinFormula, setOpenwinFormula] = useState<FormulaCategorySettings>(() =>
    getDefaultCategoryFormula('openwin')
  );
  const [fSectionFormula, setFSectionFormula] = useState<FSectionFormula>(() =>
    getDefaultFSectionFormula()
  );
  const [glassFormulas, setGlassFormulas] = useState<Record<string, GlassFormula>>(() =>
    getDefaultGlassFormulas()
  );

  // Project Calculator Items (Clean empty workspace on fresh open)
  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [dgWindows, setDgWindows] = useState<DgWindowItem[]>([]);
  const [doors, setDoors] = useState<DoorItem[]>([]);
  const [fixframes, setFixFrames] = useState<FixFrameItem[]>([]);
  const [openableWindows, setOpenableWindows] = useState<OpenableWindowItem[]>([]);
  const [slidingDoors, setSlidingDoors] = useState<SlidingDoorItem[]>([]);
  const [projectExtras, setProjectExtras] = useState<ExtraPiece[]>([]);

  // Company & Quotation Defaults
  const [companyName, setCompanyName] = useState('BOSS ALUMINIUM & GLASS');
  const [companyTagline, setCompanyTagline] = useState(
    'Premium Architectural & Commercial Glazing Solutions'
  );
  const [companyAddress, setCompanyAddress] = useState('Main Market, Pakistan');
  const [companyPhone, setCompanyPhone] = useState('+92 310 5524225');
  const [companyNtn, setCompanyNtn] = useState('1234567-8');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hardwareRate, setHardwareRate] = useState<number>(3000);
  const [markupPct, setMarkupPct] = useState<number>(0);
  const [transportRent, setTransportRent] = useState<number>(0);
  const [labourCost, setLabourCost] = useState<number>(0);
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([]);

  // Packages, Bank Accounts & Layout Config
  const [bankAccounts, setBankAccounts] = useState<BankAccountConfig[]>(() =>
    getStarterBankAccounts()
  );
  const [activeOffer, setActiveOffer] = useState<AppOfferBanner | null>(null);
  const [broadcasts, setBroadcasts] = useState<AppOfferBanner[]>([]);
  const [mobileDownloadConfig, setMobileDownloadConfig] = useState<MobileDownloadConfig | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>(() => getStarterPackages());
  const [layoutConfig, setLayoutConfig] = useState<ClientAppLayoutControlConfig>(() =>
    getDefaultLayoutControlConfig()
  );
  const [userLockedTabs, setUserLockedTabs] = useState<Record<string, boolean>>(() => {
    try {
      const rawUl = localStorage.getItem(USER_LOCKED_TABS_KEY);
      return rawUl ? normalizeLockedTabsMap(JSON.parse(rawUl)) : {};
    } catch {
      return {};
    }
  });
  const [mainLogoUrl, setMainLogoUrl] = useState<string>(bossLionLogoImg);
  const [adminLetterheadBgUrl, setAdminLetterheadBgUrl] = useState<string>(() => {
    const cachedM = loadCachedMasterEngineConfig();
    const fromMaster = extractAdminLetterheadBgUrl(cachedM);
    if (fromMaster) return fromMaster;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.adminLetterheadBgUrl === 'string' && parsed.adminLetterheadBgUrl.trim()) {
          return parsed.adminLetterheadBgUrl.trim();
        }
      }
    } catch {}
    return '';
  });
  const [customLetterheadBgUrl, setCustomLetterheadBgUrl] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.customLetterheadBgUrl === 'string') {
          return parsed.customLetterheadBgUrl.trim();
        }
        const legacyLh = String(parsed?.letterheadBgUrl || '').trim();
        const cachedAdminLh = extractAdminLetterheadBgUrl(loadCachedMasterEngineConfig());
        if (
          legacyLh &&
          !isBundledFallbackLetterhead(legacyLh, bossLetterheadCleanImg) &&
          legacyLh !== cachedAdminLh
        ) {
          return legacyLh;
        }
      }
    } catch {}
    return '';
  });
  const letterheadBgUrl = customLetterheadBgUrl || adminLetterheadBgUrl || bossLetterheadCleanImg;
  const isCustomLetterhead = Boolean(customLetterheadBgUrl);
  const lastAppliedAdminThemeHashRef = useRef<string>('');
  const hasMigratedDbInSessionRef = useRef<boolean>(false);
  const [rateListSavedAt, setRateListSavedAt] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(DEVICE_RATES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return typeof parsed.savedAt === 'number' ? parsed.savedAt : null;
      }
    } catch {}
    return null;
  });

  // Stable Client Device ID for Supabase access & support requests
  const [clientDeviceId, setClientDeviceId] = useState<string>(() =>
    getOrCreateClientDeviceId()
  );

  // Live Supabase Cloud Sync & Access State (Owner auto-recognized synchronously as LIFETIME_VIP)
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudAccessInfo, setCloudAccessInfo] = useState<{
    status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
    tier: string;
    role?: BossUserRole;
    expiresAt: number | null;
    serverNowMs?: number;
    reason: string;
    lastSyncedAt: number | null;
  }>(() => {
    const initialSession = loadAuthSession();
    const cachedMaster = loadCachedMasterEngineConfig();
    if (
      initialSession &&
      isOwnerIdentity({
        email: initialSession.email,
        phone: initialSession.phone,
        cnic: initialSession.cnic,
        masterCfg: cachedMaster,
      })
    ) {
      return {
        status: 'FREE',
        tier: 'LIFETIME_VIP',
        role: 'OWNER',
        expiresAt: null,
        serverNowMs: 0,
        reason: '',
        lastSyncedAt: null,
      };
    }
    return {
      status: 'TRIAL',
      tier: 'CLIENT',
      role: initialSession?.userRole || 'CLIENT',
      expiresAt: null,
      serverNowMs: 0,
      reason: '',
      lastSyncedAt: null,
    };
  });

  // Client Support Team Requests State
  const [supportRequests, setSupportRequests] = useState<ClientSupportRequest[]>([]);
  const [isSubmittingSupportRequest, setIsSubmittingSupportRequest] = useState(false);
  const [lastSeenSupportMs, setLastSeenSupportMs] = useState<number>(() =>
    loadLastSeenSupportMs()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );

  // PWA Install & Mobile Theme Studio State
  const { isInstalled } = usePWAInstall();
  const wasOfflineRef = useRef(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false);
  const [showThemeStudio, setShowThemeStudio] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppThemeConfig>(() => {
    try {
      const raw = localStorage.getItem('boss_active_theme_config');
      if (raw) {
        return enforceReadableContrast(JSON.parse(raw));
      }
    } catch {}
    return BUILT_IN_THEMES[0];
  });
  const [downloadedThemes, setDownloadedThemes] = useState<AppThemeConfig[]>(() => {
    try {
      const raw = localStorage.getItem('boss_downloaded_themes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(enforceReadableContrast);
      }
    } catch {}
    return [];
  });
  const [deletedBackupVault, setDeletedBackupVault] = useState<DeletedBackupItem[]>([]);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  const triggerGlobalToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 3500);
  };

  const normalizePhoneDigits = (p: string = '') => p.replace(/[^0-9]/g, '').slice(-10);

  const syncInFlightRef = useRef<{
    promise: Promise<boolean>;
    forceRates: boolean;
  } | null>(null);
  const hasHydratedCloudConfigsInSessionRef = useRef(false);
  const lastCloudSyncStartedAtRef = useRef(0);

  const syncFromSupabase = async (options?: {
    forceRates?: boolean;
    silent?: boolean;
    sessionOverride?: ClientAuthSession | null;
    bypassSingleFlight?: boolean;
  }): Promise<boolean> => {
    const forceRates = Boolean(options?.forceRates);
    const silent = Boolean(options?.silent);
    const bypassSingleFlight = Boolean(options?.bypassSingleFlight);
    const activeSession =
      options?.sessionOverride !== undefined ? options.sessionOverride : authSession;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (!silent) {
        triggerGlobalToast('📴 Offline Mode — App aapke saved local data par chal rahi hai.');
      }
      return false;
    }

    if (!bypassSingleFlight && syncInFlightRef.current) {
      const existingFlight = syncInFlightRef.current;
      if (!forceRates || existingFlight.forceRates) {
        return existingFlight.promise;
      }
      await existingFlight.promise.catch(() => false);
    }

    lastCloudSyncStartedAtRef.current = Date.now();
    setIsSyncingCloud(true);

    const runPromise: Promise<boolean> = (async (): Promise<boolean> => {
      try {
        const [cfgRes, multiKeyRes, clientIpAddress, serverNowMs] = await Promise.all([
          fetchAppConfigsSmart({
            forceRefresh: forceRates,
            alwaysRefreshIds: ['packages_v1', 'global_config'],
          }),
          fetchMultiKeyUserRecords({
            deviceId: activeSession?.deviceId || clientDeviceId,
            userId: activeSession?.userId,
            email: activeSession?.email,
            phone: activeSession?.phone,
            cnic: activeSession?.cnic,
          }),
          getClientPublicIpAddress(),
          fetchSupabaseServerTimeMs(),
        ]);

        const { usersRes, clientUsersRes, subsRes } = multiKeyRes;

        // Offline / unreachable network guard: NEVER overwrite cached access, offers, packages, or rates when offline!
        const anyCloudSuccess =
          cfgRes.ok || usersRes.ok || subsRes.ok || clientUsersRes.ok;
        if (!anyCloudSuccess) {
          if (!silent) {
            triggerGlobalToast('📴 Offline / Cloud unreachable — Using saved device data.');
          }
          return false;
        }

        const cfgMap: Record<string, any> =
          cfgRes.cfgMap && typeof cfgRes.cfgMap === 'object' ? cfgRes.cfgMap : {};
        const cfgTimestamps = cfgRes.timestamps || {};
        const hasCloudGlobalOrMaster = Boolean(
          (cfgMap.global_config && typeof cfgMap.global_config === 'object') ||
            (cfgMap.master_engine_config && typeof cfgMap.master_engine_config === 'object')
        );
        const cachedMaster = loadCachedMasterEngineConfig();
        const globalTs = Date.parse(cfgTimestamps.global_config || '') || 0;
        const masterTs = Date.parse(cfgTimestamps.master_engine_config || '') || 0;
        const globalCfg =
          cfgRes.ok && hasCloudGlobalOrMaster
            ? globalTs > masterTs
              ? {
                  ...(cfgMap.master_engine_config || {}),
                  ...(cfgMap.global_config || {}),
                }
              : {
                  ...(cfgMap.global_config || {}),
                  ...(cfgMap.master_engine_config || {}),
                }
            : {
                ...cachedMaster,
                ...(cfgMap.global_config || {}),
                ...(cfgMap.master_engine_config || {}),
              };
        if (
          Object.keys(globalCfg).length > 0 &&
          (cfgRes.changed || Object.keys(cachedMaster).length === 0)
        ) {
          saveCachedMasterEngineConfig(globalCfg);
        }
        const ratesCfg = cfgMap.aluminium_rates_v1 || {};
        const sectionsCfg = cfgMap.custom_sections_v1 || {};
        const formulasCfg = cfgMap.formulas_v1 || {};
        const layoutCfg = cfgMap.layout_config_v1 || {};
        const brandingCfg = cfgMap.company_branding_v1 || {};
        const sbMigrationCfg =
          cfgMap.supabase_config_v1 ||
          globalCfg.supabaseMigration ||
          globalCfg.supabaseConfig ||
          {};

        // 0. Auto-Migrate Supabase Database if Admin publishes a new Supabase URL + Key
        const candidateNewUrl = String(
          sbMigrationCfg.url ||
            sbMigrationCfg.supabaseUrl ||
            globalCfg.newSupabaseUrl ||
            ''
        ).trim();
        const candidateNewKey = String(
          sbMigrationCfg.publishableKey ||
            sbMigrationCfg.anonKey ||
            sbMigrationCfg.key ||
            globalCfg.newSupabaseKey ||
            globalCfg.newSupabasePublishableKey ||
            ''
        ).trim();
        if (
          !hasMigratedDbInSessionRef.current &&
          candidateNewUrl.startsWith('https://') &&
          candidateNewKey.length > 16
        ) {
          const switched = reinitializeSupabaseClient(candidateNewUrl, candidateNewKey);
          if (switched) {
            clearAppConfigCache();
            hasHydratedCloudConfigsInSessionRef.current = false;
            hasMigratedDbInSessionRef.current = true;
            triggerGlobalToast('🔄 Switched to updated Admin Supabase Cloud!');
            if (syncInFlightRef.current?.promise === runPromise) {
              syncInFlightRef.current = null;
            }
            setIsSyncingCloud(false);
            return syncFromSupabase({
              ...options,
              silent: true,
              bypassSingleFlight: true,
            });
          }
        }

        const shouldApplyAppConfigSections =
          cfgRes.ok &&
          (cfgRes.changed ||
            forceRates ||
            !hasHydratedCloudConfigsInSessionRef.current);

        if (shouldApplyAppConfigSections) {
          hasHydratedCloudConfigsInSessionRef.current = true;

          // 1. Packages, Bank Accounts, Broadcasts, Offers, Main Logo, Mobile APK/iOS & Themes
          if (Array.isArray(globalCfg.bankAccounts) && globalCfg.bankAccounts.length > 0) {
            setBankAccounts(globalCfg.bankAccounts);
          }

      const {
        activeOffer: normalizedOffer,
        hasOfferKeyInCloud,
        packages: resolvedCloudPackages,
        applyOfferDiscountToPackages,
      } = resolveLivePackagesAndOfferFromConfigs(cfgMap, cfgTimestamps, globalCfg);

      if (hasOfferKeyInCloud) {
        setActiveOffer(normalizedOffer);
      }

      const rawBroadcasts = Array.isArray(globalCfg.broadcasts)
        ? globalCfg.broadcasts
        : Array.isArray(globalCfg.banners)
        ? globalCfg.banners
        : Array.isArray(globalCfg.announcements)
        ? globalCfg.announcements
        : Array.isArray(globalCfg.broadcastBanners)
        ? globalCfg.broadcastBanners
        : null;
      if (rawBroadcasts) {
        setBroadcasts(
          rawBroadcasts
            .map((b: any) =>
              b && typeof b === 'object'
                ? {
                    id: String(b.id || 'admin-broadcast-1'),
                    title: String(b.title || b.name || b.heading || 'Announcement').trim(),
                    message: String(b.message || b.description || b.text || '').trim(),
                    badgeText: String(b.badgeText || b.badge || 'NOTICE').trim(),
                    isActive: b.isActive !== false && b.enabled !== false,
                    isVisible: b.isVisible !== false,
                    showBanner: b.showBanner !== false,
                    createdAt: Number(b.createdAt || b.created_at || Date.now()),
                    updatedAt: Number(b.updatedAt || b.updated_at || b.createdAt || Date.now()),
                    createdBy: String(b.createdBy || 'Admin'),
                    discountPct: Number(b.discountPct ?? b.discount_pct ?? b.discount ?? 0) || 0,
                    discountCode: b.discountCode ? String(b.discountCode) : undefined,
                    applyToAllPackages: b.applyToAllPackages !== false,
                    expiresAt: b.expiresAt ? Number(b.expiresAt) : undefined,
                    imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
                  }
                : null
            )
            .filter(Boolean) as AppOfferBanner[]
        );
      }

      if (resolvedCloudPackages) {
        setPackages(resolvedCloudPackages);
        try {
          const curRaw = localStorage.getItem(STORAGE_KEY);
          const curObj = curRaw ? JSON.parse(curRaw) : {};
          curObj.packages = resolvedCloudPackages;
          if (hasOfferKeyInCloud) curObj.activeOffer = normalizedOffer;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(curObj));
        } catch {
          // ignore storage quota errors
        }
      } else if (hasOfferKeyInCloud) {
        setPackages((prev) => {
          const updated = applyOfferDiscountToPackages(prev);
          try {
            const curRaw = localStorage.getItem(STORAGE_KEY);
            const curObj = curRaw ? JSON.parse(curRaw) : {};
            curObj.packages = updated;
            curObj.activeOffer = normalizedOffer;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(curObj));
          } catch {
            // ignore storage quota errors
          }
          return updated;
        });
      }

      const incomingLogo = String(
        globalCfg.mainLogoUrl ||
          globalCfg.appLogoUrl ||
          globalCfg.branding?.mainLogoUrl ||
          globalCfg.companyBranding?.mainLogoUrl ||
          globalCfg.companyBranding?.logoUrl ||
          globalCfg.layoutConfig?.mainLogoUrl ||
          brandingCfg.mainLogoUrl ||
          ''
      ).trim();
      if (incomingLogo) {
        setMainLogoUrl(incomingLogo);
      }

      const incomingAdminLetterhead = extractAdminLetterheadBgUrl(
        globalCfg,
        cfgMap.company_branding_v1 || cfgMap.company_branding,
        cfgMap.layout_config_v1,
        cfgMap.letterhead_bg_url
      );
      if (incomingAdminLetterhead) {
        setAdminLetterheadBgUrl(incomingAdminLetterhead);
      }

      const rawMob =
        globalCfg.mobileDownloadConfig ||
        globalCfg.mobileAppConfig ||
        globalCfg.appDownloads ||
        {};
      const androidUrl = String(
        rawMob.androidUrl ||
          rawMob.androidApkUrl ||
          rawMob.androidDownloadUrl ||
          rawMob.apkUrl ||
          globalCfg.androidUrl ||
          globalCfg.androidApkUrl ||
          globalCfg.apkUrl ||
          ''
      ).trim();
      const windowsUrl = String(
        rawMob.windowsUrl ||
          rawMob.windowsDownloadUrl ||
          rawMob.windowsExeUrl ||
          rawMob.exeUrl ||
          rawMob.desktopUrl ||
          globalCfg.windowsUrl ||
          globalCfg.windowsExeUrl ||
          globalCfg.exeUrl ||
          ''
      ).trim();
      const iosUrl = String(
        rawMob.iosUrl ||
          rawMob.iosDownloadUrl ||
          rawMob.iosAppUrl ||
          rawMob.ipaUrl ||
          globalCfg.iosUrl ||
          globalCfg.iosDownloadUrl ||
          globalCfg.iosAppUrl ||
          ''
      ).trim();
      if (androidUrl || windowsUrl || iosUrl || rawMob.releaseNotes || globalCfg.releaseNotes) {
        setMobileDownloadConfig({
          androidUrl,
          androidApkUrl: androidUrl,
          windowsUrl,
          iosUrl,
          iosDownloadUrl: iosUrl,
          iosAppUrl: iosUrl,
          androidVersion: String(rawMob.androidVersion || globalCfg.androidVersion || '').trim(),
          windowsVersion: String(rawMob.windowsVersion || globalCfg.windowsVersion || '').trim(),
          iosVersion: String(rawMob.iosVersion || globalCfg.iosVersion || '').trim(),
          releaseNotes: String(rawMob.releaseNotes || globalCfg.releaseNotes || '').trim(),
        });
      } else if (
        globalCfg.mobileAppConfig !== undefined ||
        globalCfg.appDownloads !== undefined ||
        globalCfg.mobileDownloadConfig !== undefined
      ) {
        setMobileDownloadConfig(null);
      }

      const adminThemeObj =
        globalCfg.activeTheme || globalCfg.appTheme || globalCfg.themeConfig;
      if (
        adminThemeObj &&
        typeof adminThemeObj === 'object' &&
        adminThemeObj.bg &&
        adminThemeObj.primary
      ) {
        const themeSig = JSON.stringify({
          id: adminThemeObj.id,
          name: adminThemeObj.name,
          bg: adminThemeObj.bg,
          primary: adminThemeObj.primary,
          accent: adminThemeObj.accent,
        });
        if (themeSig !== lastAppliedAdminThemeHashRef.current) {
          lastAppliedAdminThemeHashRef.current = themeSig;
          setCurrentTheme(enforceReadableContrast(adminThemeObj));
        }
      }
      if (Array.isArray(globalCfg.cloudThemes) && globalCfg.cloudThemes.length > 0) {
        setDownloadedThemes((prev) => {
          const map = new Map<string, AppThemeConfig>();
          [...globalCfg.cloudThemes, ...prev].forEach((t: any) => {
            if (t?.id && t?.bg && t?.primary) {
              map.set(t.id, enforceReadableContrast(t));
            }
          });
          return Array.from(map.values());
        });
      }

      // 2. Complete Formulas Sync (Admin master_engine_config + formulas_v1 aliases)
      const winF = formulasCfg.windowFormula || globalCfg.windowFormula || globalCfg.winFormulas;
      if (winF && typeof winF === 'object') {
        setWindowFormula({ ...getDefaultWindowFormula(), ...winF });
      }
      const dgWinF =
        formulasCfg.dgWindowFormula ||
        formulasCfg.dgWindowsFormula ||
        globalCfg.dgWindowFormula ||
        globalCfg.dgWindowsFormula ||
        globalCfg.dgWinFormulas ||
        globalCfg.dgWindowFormulas;
      if (dgWinF && typeof dgWinF === 'object') {
        setDgWindowFormula({ ...getDefaultDgWindowFormula(), ...dgWinF });
      }
      const sdF =
        formulasCfg.slidingDoorFormula ||
        globalCfg.slidingDoorFormula ||
        globalCfg.slidingDoorFormulas;
      if (sdF && typeof sdF === 'object') {
        setSlidingDoorFormula({ ...getDefaultSlidingDoorFormula(), ...sdF });
      }
      const dF = formulasCfg.doorFormula || globalCfg.doorFormula || globalCfg.doorFormulas;
      if (dF && typeof dF === 'object') setDoorFormula(dF);
      const fF = formulasCfg.fixFormula || globalCfg.fixFormula || globalCfg.fixFormulas;
      if (fF && typeof fF === 'object') setFixFormula(fF);
      const opF =
        formulasCfg.openwinFormula ||
        globalCfg.openwinFormula ||
        globalCfg.openableWinFormulas;
      if (opF && typeof opF === 'object') setOpenwinFormula(opF);
      const fsF =
        formulasCfg.fSectionFormula ||
        formulasCfg.fsectionFormula ||
        globalCfg.fSectionFormula ||
        globalCfg.fsectionFormula;
      if (fsF && typeof fsF === 'object') {
        setFSectionFormula({ ...getDefaultFSectionFormula(), ...fsF });
      }
      const glF = formulasCfg.glassFormulas || globalCfg.glassFormulas;
      if (glF && typeof glF === 'object') {
        const defGl = getDefaultGlassFormulas();
        const mergedGl: Record<string, GlassFormula> = { ...defGl };
        Object.entries(glF).forEach(([k, v]: [string, any]) => {
          if (v && typeof v === 'object') {
            mergedGl[k] = {
              ...(defGl[k] || defGl.window),
              ...v,
            };
          }
        });
        setGlassFormulas(mergedGl);
      }

      // 3. Sections & Colors
      const rawCustomSecs =
        sectionsCfg.customSections || globalCfg.customSections || [];
      if (Array.isArray(rawCustomSecs) && rawCustomSecs.length > 0) {
        const normalizedCodes = Array.from(
          new Set(
            rawCustomSecs
              .map((item: any) =>
                typeof item === 'string'
                  ? item.trim().toUpperCase()
                  : String(item?.code || item?.id || '').trim().toUpperCase()
              )
              .filter(Boolean)
          )
        );
        if (normalizedCodes.length > 0) {
          setCustomSections((prev) => Array.from(new Set([...prev, ...normalizedCodes])));
        }
      }
      const incomingCols = sectionsCfg.availableColors || globalCfg.availableColors;
      if (Array.isArray(incomingCols) && incomingCols.length > 0) {
        setAvailableColors(mergeAvailableColorsWithDefaults(incomingCols));
      }
      const incomingHidden = sectionsCfg.hiddenSections || globalCfg.hiddenSections;
      if (Array.isArray(incomingHidden)) {
        setHiddenSections(incomingHidden);
      }

      // 4. Layout config (merge layout_config_v1 UI controls + master_engine_config lockedTabs & security flags, preserve client shopLogoUrl)
      const incomingLayout = {
        ...((layoutCfg?.layoutConfig || layoutCfg || {}) as Record<string, any>),
        ...((globalCfg?.layoutConfig || {}) as Record<string, any>),
      };
      const hasLockedTabsPayload =
        layoutCfg?.lockedTabs !== undefined ||
        layoutCfg?.layoutConfig?.lockedTabs !== undefined ||
        globalCfg?.tabLocks !== undefined ||
        globalCfg?.lockedPages !== undefined ||
        globalCfg?.lockedTabs !== undefined ||
        globalCfg?.layoutConfig?.lockedTabs !== undefined;
      const incomingLockedTabs = normalizeLockedTabsMap(
        layoutCfg?.lockedTabs,
        layoutCfg?.layoutConfig?.lockedTabs,
        globalCfg?.tabLocks,
        globalCfg?.lockedPages,
        globalCfg?.lockedTabs,
        globalCfg?.layoutConfig?.lockedTabs
      );
      if (
        (incomingLayout && typeof incomingLayout === 'object' && incomingLayout.enabledTabs) ||
        hasLockedTabsPayload ||
        Object.keys(incomingLockedTabs).length > 0
      ) {
        setLayoutConfig((prev) => ({
          ...prev,
          ...incomingLayout,
          enabledTabs: {
            ...(prev.enabledTabs || {}),
            ...(incomingLayout.enabledTabs || {}),
            DG_WINDOWS:
              incomingLayout.enabledTabs && 'DG_WINDOWS' in incomingLayout.enabledTabs
                ? incomingLayout.enabledTabs.DG_WINDOWS
                : prev.enabledTabs?.DG_WINDOWS ?? true,
          },
          tabCustomTitles: {
            ...(prev.tabCustomTitles || {}),
            ...(incomingLayout.tabCustomTitles || {}),
            DG_WINDOWS:
              incomingLayout.tabCustomTitles?.DG_WINDOWS ||
              prev.tabCustomTitles?.DG_WINDOWS ||
              'DG.Windows',
          },
          lockedTabs: hasLockedTabsPayload
            ? {
                ...incomingLockedTabs,
                DG_WINDOWS:
                  'DG_WINDOWS' in incomingLockedTabs ? incomingLockedTabs.DG_WINDOWS : true,
              }
            : {
                DG_WINDOWS: true,
                ...(prev.lockedTabs || {}),
              },
          shopLogoUrl: prev.shopLogoUrl || incomingLayout.shopLogoUrl || '',
        }));
      }

      // 5. Rates & Glass Rates (sync when forceRates, no local device snapshot, or Admin pushed newer cloud update)
      const hasLocalDeviceRates = Boolean(localStorage.getItem(DEVICE_RATES_KEY));
      const cloudUpdatedAt = Number(globalCfg.lastUpdated || globalCfg.lastCloudSyncAt || 0);
      const shouldApplyCloudRates =
        forceRates ||
        !hasLocalDeviceRates ||
        (cloudUpdatedAt > 0 && (!rateListSavedAt || cloudUpdatedAt > rateListSavedAt));

      const cloudRates = ratesCfg.rates || globalCfg.rates;
      const cloudGlassRates = ratesCfg.glassRates || globalCfg.glassRates;
      const nextMergedGlassRates =
        shouldApplyCloudRates && cloudGlassRates && typeof cloudGlassRates === 'object'
          ? mergeGlassRatesWithDefaults(cloudGlassRates)
          : null;

      if (shouldApplyCloudRates && cloudRates && typeof cloudRates === 'object') {
        const mergedRates: Record<string, Record<string, Record<string, number>>> = JSON.parse(
          JSON.stringify(getInitialRates())
        );
        Object.entries(cloudRates).forEach(([g, colObj]: [string, any]) => {
          if (!colObj || typeof colObj !== 'object') return;
          if (!mergedRates[g]) mergedRates[g] = {};
          Object.entries(colObj).forEach(([col, secObj]: [string, any]) => {
            if (!secObj || typeof secObj !== 'object') return;
            mergedRates[g][col] = { ...(mergedRates[g][col] || {}), ...secObj };
            if (col === 'H23') {
              mergedRates[g]['H.23'] = { ...(mergedRates[g]['H.23'] || {}), ...secObj };
            } else if (col === 'H.23') {
              mergedRates[g]['H23'] = { ...(mergedRates[g]['H23'] || {}), ...secObj };
            }
          });
        });
        setRates(mergedRates);
        if (forceRates) {
          persistRatesSnapshotToDevice(mergedRates, nextMergedGlassRates || glassRates);
        }
      }
      if (nextMergedGlassRates) {
        setGlassRates(nextMergedGlassRates);
        if (forceRates && (!cloudRates || typeof cloudRates !== 'object')) {
          persistRatesSnapshotToDevice(rates, nextMergedGlassRates);
        }
      }
        }

      // 6. Live Admin Access Control (Block Account/Device/IP/MAC/CNIC/Email, Remote force_logout_at & RESET_, VIP, Trial/Subscription Expiry)
      const usersList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const clientUsersList = Array.isArray(clientUsersRes.data) ? clientUsersRes.data : [];
      const subsList = Array.isArray(subsRes.data) ? subsRes.data : [];
      const clientMacAddress = getOrCreateDeviceMacFingerprint();

      const evaluated = evaluateClientAccessState({
        session: activeSession,
        clientDeviceId,
        clientIpAddress,
        clientMacAddress,
        usersList,
        clientUsersList,
        subsList,
        masterCfg: globalCfg,
        serverNowMs,
      });

      // Also compute per-user locked_tabs from users / client_users / subscriptions / userAccessControl (without Owner VIP bypass)
      const userLevelLockedTabs = normalizeLockedTabsMap(
        evaluated.matchedSub?.locked_tabs,
        evaluated.matchedSub?.lockedTabs,
        evaluated.matchedUac?.locked_tabs,
        evaluated.matchedUac?.lockedTabs,
        evaluated.matchedUser?.locked_tabs,
        evaluated.matchedUser?.lockedTabs,
        evaluated.matchedClientUser?.locked_tabs,
        evaluated.matchedClientUser?.lockedTabs,
        evaluated.matchedUser?.layout_config?.lockedTabs,
        evaluated.matchedUser?.layout_config?.locked_tabs,
        evaluated.matchedClientUser?.layout_config?.lockedTabs,
        evaluated.matchedClientUser?.layout_config?.locked_tabs
      );
      try {
        localStorage.setItem(USER_LOCKED_TABS_KEY, JSON.stringify(userLevelLockedTabs));
      } catch {
        // ignore storage errors
      }
      setUserLockedTabs(userLevelLockedTabs);

      if (evaluated.sessionConflict) {
        await triggerSessionConflictLogout();
        return false;
      }

      const isOwnerAccount = Boolean(
        activeSession &&
          isOwnerIdentity({
            email: activeSession.email,
            phone: activeSession.phone,
            cnic: activeSession.cnic,
            masterCfg: globalCfg,
          })
      );

      if (evaluated.forceResetLogout && !isOwnerAccount) {
        clearLastActiveAtMs();
        clearInitialSyncCompletedFlag();
        try {
          localStorage.removeItem(USER_LOCKED_TABS_KEY);
        } catch {}
        setUserLockedTabs({});
        markUserOfflineInSupabase(clientDeviceId);
        await performCleanSupabaseAndStorageSignOut(true);
        setAuthSession(null);
        setIsSubscriptionExpired(false);
        setAuthNotice(
          evaluated.forceLogoutReason ||
            'Admin ne aapka Device Reset / Remote Logout kiya hai — dobara Login karein.'
        );
        return true;
      }

      const resolvedRole: BossUserRole = isOwnerAccount ? 'OWNER' : evaluated.userRole || 'CLIENT';
      const nextIsActivated = isOwnerAccount
        ? true
        : evaluated.status === 'ACTIVE' || evaluated.status === 'FREE';
      const nextIsLifetimeFree = isOwnerAccount
        ? true
        : evaluated.tier === 'LIFETIME_VIP' || evaluated.status === 'FREE';
      const nextPackagePlan = isOwnerAccount ? 'LIFETIME_VIP' : evaluated.tier;
      const nextIsBlocked = isOwnerAccount ? false : evaluated.status === 'BLOCKED';
      const nextExpiresAt = isOwnerAccount
        ? 0
        : evaluated.expiresAt !== null
        ? evaluated.expiresAt
        : activeSession?.trialExpiresAt;
      const nextUserId = String(
        evaluated.matchedUser?.id ||
          evaluated.matchedClientUser?.id ||
          activeSession?.userId ||
          activeSession?.deviceId ||
          ''
      );

      if (
        activeSession &&
        (activeSession.userRole !== resolvedRole ||
          activeSession.isActivated !== nextIsActivated ||
          activeSession.isLifetimeFree !== nextIsLifetimeFree ||
          activeSession.packagePlan !== nextPackagePlan ||
          activeSession.isBlocked !== nextIsBlocked ||
          activeSession.trialExpiresAt !== nextExpiresAt ||
          (nextUserId && activeSession.userId !== nextUserId))
      ) {
        const syncedSess: ClientAuthSession = {
          ...activeSession,
          userId: nextUserId || activeSession.userId,
          userRole: resolvedRole,
          isActivated: nextIsActivated,
          isLifetimeFree: nextIsLifetimeFree,
          packagePlan: nextPackagePlan,
          isBlocked: nextIsBlocked,
          trialExpiresAt: nextExpiresAt,
        };
        saveAuthSession(syncedSess);
        setAuthSession(syncedSess);
      }

      const syncStamp = evaluated.serverNowMs > 0 ? evaluated.serverNowMs : Date.now();
      setCloudAccessInfo(
        isOwnerAccount
          ? {
              status: 'FREE',
              tier: 'LIFETIME_VIP',
              role: 'OWNER',
              expiresAt: null,
              serverNowMs: syncStamp,
              reason: '',
              lastSyncedAt: syncStamp,
            }
          : {
              status: evaluated.status,
              tier: evaluated.tier,
              role: resolvedRole,
              expiresAt: evaluated.expiresAt,
              serverNowMs: evaluated.serverNowMs,
              reason: evaluated.reason,
              lastSyncedAt: syncStamp,
            }
      );
      setIsSubscriptionExpired(isOwnerAccount ? false : evaluated.isExpired);

      // Refresh Admin & Support messages alongside Sync
      await loadSupportRequests(globalCfg, activeSession);
      markInitialSyncCompletedForDevice(activeSession?.deviceId || clientDeviceId);

      if (!silent) {
        triggerGlobalToast(
          forceRates
            ? '☁️ Rates, Offers, Messages & Formulas synced from Supabase Cloud!'
            : '☁️ Supabase Cloud sync complete!'
        );
      }
      return true;
      } catch {
        if (!silent) {
          triggerGlobalToast('⚠️ Offline Mode — Running on saved device data.');
        }
        return false;
      } finally {
        if (syncInFlightRef.current?.promise === runPromise) {
          syncInFlightRef.current = null;
        }
        setIsSyncingCloud(false);
      }
    })();

    syncInFlightRef.current = { promise: runPromise, forceRates };
    return runPromise;
  };

  const triggerSessionConflictLogout = async () => {
    clearLastActiveAtMs();
    clearInitialSyncCompletedFlag();
    try {
      localStorage.removeItem(USER_LOCKED_TABS_KEY);
    } catch {}
    setUserLockedTabs({});
    await performCleanSupabaseAndStorageSignOut(true);
    setAuthSession(null);
    setIsSubscriptionExpired(false);
    setCloudAccessInfo({
      status: 'TRIAL',
      tier: 'CLIENT',
      role: 'CLIENT',
      expiresAt: null,
      reason: '',
      lastSyncedAt: null,
    });
    setAuthNotice('Your ID was logged in on another device.');
  };

  const triggerInactivityLogout = async () => {
    markUserOfflineInSupabase(clientDeviceId);
    clearLastActiveAtMs();
    clearInitialSyncCompletedFlag();
    try {
      localStorage.removeItem(USER_LOCKED_TABS_KEY);
    } catch {}
    setUserLockedTabs({});
    await performCleanSupabaseAndStorageSignOut(true);
    setAuthSession(null);
    setIsSubscriptionExpired(false);
    setCloudAccessInfo({
      status: 'TRIAL',
      tier: 'CLIENT',
      role: 'CLIENT',
      expiresAt: null,
      reason: '',
      lastSyncedAt: null,
    });
    setAuthNotice('Session expired after 3 days of inactivity. Please login again.');
  };

  const verifySingleDeviceSessionOnline = async (
    sessionOverride?: ClientAuthSession | null
  ): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    const activeSess = sessionOverride !== undefined ? sessionOverride : authSession;
    if (!activeSess?.verified) return true;
    const localToken = String(
      activeSess.activeSessionToken || loadActiveSessionToken() || ''
    ).trim();
    if (!localToken) return true;

    try {
      const scopedTokenQuery = buildScopedUserQuery({
        deviceId: activeSess.deviceId || clientDeviceId,
        userId: activeSess.userId,
        email: activeSess.email,
        phone: activeSess.phone,
        cnic: activeSess.cnic,
        select: 'id,device_id,email,phone,cnic,active_session_token',
        limit: 5,
      });
      if (!scopedTokenQuery) return true;

      const [usersRes, clientUsersRes] = await Promise.all([
        callSupabaseProxy({
          table: 'users',
          method: 'GET',
          query: scopedTokenQuery,
          timeoutMs: 6000,
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'GET',
          query: scopedTokenQuery,
          timeoutMs: 6000,
        }),
      ]);
      if (!usersRes.ok && !clientUsersRes.ok) return true;

      const evalRes = evaluateClientAccessState({
        session: activeSess,
        clientDeviceId: activeSess.deviceId || clientDeviceId,
        usersList: Array.isArray(usersRes.data) ? usersRes.data : [],
        clientUsersList: Array.isArray(clientUsersRes.data) ? clientUsersRes.data : [],
        subsList: [],
        masterCfg: loadCachedMasterEngineConfig(),
      });
      if (evalRes.sessionConflict) {
        await triggerSessionConflictLogout();
        return false;
      }
    } catch {
      // non-fatal network failure
    }
    return true;
  };

  const loadSupportRequests = async (
    masterCfgOverride?: Record<string, any>,
    sessionOverride?: ClientAuthSession | null
  ) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      const activeSess = sessionOverride !== undefined ? sessionOverride : authSession;
      const myDevice = (activeSess?.deviceId || clientDeviceId || '').trim();
      const myEmail = (activeSess?.email || '').trim().toLowerCase();
      const myPhoneDigits = normalizePhoneDigits(activeSess?.phone || '');
      const clearedIds = loadClearedSupportIds();

      const sbRes = await callSupabaseProxy({
        table: 'messages',
        method: 'GET',
        query: 'select=*&order=created_at.desc&limit=50',
        timeoutMs: 8000,
      });

      const mergedById = new Map<string, ClientSupportRequest>();

      const processRawMsg = (m: any) => {
        if (!m || typeof m !== 'object') return;
        const msgId = String(m.id || m.message_id || '');
        if (!msgId || clearedIds.has(msgId)) return;
        if (m.deleted_by_client === true) return;

        const targetDev = String(
          m.target_device_id ||
            m.recipient_device_id ||
            m.device_id ||
            m.user_id ||
            ''
        ).trim();
        const targetDevUp = targetDev.toUpperCase();
        const mEmail = String(m.user_email || m.email || m.target_email || '').trim().toLowerCase();
        const mPhoneDigits = normalizePhoneDigits(
          String(m.user_phone || m.phone || m.target_phone || '')
        );
        const senderRaw = String(
          m.sender || m.sender_role || m.role || m.direction || ''
        ).toLowerCase();
        const isFromAdmin = Boolean(
          senderRaw.includes('admin') ||
            senderRaw === 'outbound' ||
            m.is_from_admin === true ||
            m.from_admin === true ||
            String(m.category || '').toLowerCase().includes('admin message') ||
            String(m.type || '').toLowerCase() === 'admin_message'
        );
        const isGlobalBroadcast =
          ['ALL', 'BROADCAST', 'PUBLIC', '*'].includes(targetDevUp) ||
          m.is_broadcast === true ||
          (isFromAdmin && !targetDev && !mEmail && !mPhoneDigits);

        const belongsToClient =
          isGlobalBroadcast ||
          (myDevice && (targetDev === myDevice || String(m.device_id || '').trim() === myDevice)) ||
          (myEmail && mEmail && mEmail === myEmail) ||
          (myPhoneDigits.length >= 10 && mPhoneDigits && mPhoneDigits === myPhoneDigits);

        if (!belongsToClient) return;

        const rawReply = String(
          m.admin_reply ||
            m.reply ||
            m.reply_message ||
            m.reply_text ||
            m.admin_response ||
            m.response ||
            m.admin_note ||
            ''
        ).trim();

        const statusLower = String(m.status || '').trim().toLowerCase();
        const isResolvedFlag = Boolean(
          m.is_resolved ||
            statusLower === 'resolved' ||
            statusLower === 'replied' ||
            rawReply
        );

        const createdAt = m.created_at
          ? new Date(m.created_at).getTime() || Date.now()
          : Number(m.createdAt || Date.now());
        const repliedAt =
          m.replied_at || m.reply_at || (rawReply ? m.updated_at : 0)
            ? new Date(m.replied_at || m.reply_at || m.updated_at).getTime() || createdAt
            : rawReply
            ? createdAt
            : 0;

        mergedById.set(msgId, {
          id: msgId,
          deviceId: targetDev || myDevice,
          userName: String(m.user_name || m.userName || (isFromAdmin ? 'Boss Admin' : 'Client')),
          userPhone: String(m.user_phone || m.phone || m.userPhone || ''),
          userEmail: String(m.user_email || m.email || m.userEmail || ''),
          requestType: String(
            m.category ||
              m.subject ||
              m.requestType ||
              (isFromAdmin ? 'Admin Message' : 'Support Message')
          ),
          message: String(m.message || m.text || m.body || ''),
          createdAt,
          isResolved: isResolvedFlag,
          resolvedBy: String(m.resolved_by || (rawReply ? 'Admin' : '')),
          resolvedAt: repliedAt || undefined,
          sender: isFromAdmin ? 'ADMIN' : 'CLIENT',
          adminReply: rawReply ? rawReply : undefined,
          repliedAt: repliedAt || undefined,
          isBroadcast: isGlobalBroadcast,
        });
      };

      if (sbRes.ok && Array.isArray(sbRes.data)) {
        sbRes.data.forEach(processRawMsg);
      }

      // Also check master_engine_config for any Admin-pushed direct/broadcast messages
      const masterCfg =
        masterCfgOverride && Object.keys(masterCfgOverride).length > 0
          ? masterCfgOverride
          : loadCachedMasterEngineConfig();
      const cfgMsgArrays = [
        masterCfg?.adminMessages,
        masterCfg?.clientMessages,
        masterCfg?.supportReplies,
        masterCfg?.directMessages,
      ];
      cfgMsgArrays.forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((item) =>
            processRawMsg({
              ...item,
              sender: item?.sender || 'admin',
            })
          );
        }
      });

      const sorted = Array.from(mergedById.values()).sort((a, b) => b.createdAt - a.createdAt);
      if (sbRes.ok || sorted.length > 0) {
        setSupportRequests(sorted);
      }
    } catch (err) {
      console.error('[SupportRequest] Supabase messages load error:', err);
    }
  };

  const handleDeleteSupportRequest = async (id: string) => {
    addClearedSupportIds([id]);
    const target = supportRequests.find((r) => r.id === id);
    setSupportRequests((prev) => prev.filter((r) => r.id !== id));
    if (
      typeof navigator !== 'undefined' &&
      navigator.onLine !== false &&
      target &&
      !target.isBroadcast &&
      !id.startsWith('local-')
    ) {
      try {
        const delRes = await callSupabaseProxy({
          table: 'messages',
          method: 'DELETE',
          query: `id=eq.${encodeURIComponent(id)}`,
          timeoutMs: 6000,
        });
        if (!delRes.ok) {
          await callSupabaseProxy({
            table: 'messages',
            method: 'PATCH',
            query: `id=eq.${encodeURIComponent(id)}`,
            payload: { deleted_by_client: true },
            timeoutMs: 6000,
          }).catch(() => {});
        }
      } catch {
        // non-fatal; local clearedIds keeps it removed
      }
    }
    triggerGlobalToast('🗑️ Message cleared!');
  };

  const handleClearAllSupportRequests = async () => {
    const ids = supportRequests.map((r) => r.id);
    addClearedSupportIds(ids);
    setSupportRequests([]);
    saveLastSeenSupportMs(Date.now());
    setLastSeenSupportMs(Date.now());
    if (typeof navigator !== 'undefined' && navigator.onLine !== false && clientDeviceId) {
      try {
        await callSupabaseProxy({
          table: 'messages',
          method: 'DELETE',
          query: `device_id=eq.${encodeURIComponent(clientDeviceId)}`,
          timeoutMs: 6000,
        });
      } catch {
        // non-fatal
      }
    }
    triggerGlobalToast('🧹 All support messages cleared!');
  };

  const handleMarkSupportMessagesRead = () => {
    const now = Date.now();
    saveLastSeenSupportMs(now);
    setLastSeenSupportMs(now);
  };

  const handleSubmitSupportRequest = async (payload: {
    userName: string;
    userPhone: string;
    userEmail: string;
    requestType: string;
    message: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        ok: false,
        error: 'Internet band hai (Offline). Support message send karne ke liye internet ON karein.',
      };
    }
    const isSessionValid = await verifySingleDeviceSessionOnline();
    if (!isSessionValid) {
      return {
        ok: false,
        error: 'Your ID was logged in on another device.',
      };
    }
    setIsSubmittingSupportRequest(true);
    try {
      const nowIso = new Date().toISOString();
      const messagePayload = {
        device_id: clientDeviceId,
        user_name: payload.userName || authSession?.name || 'Client',
        user_phone: payload.userPhone || authSession?.phone || '',
        user_email: payload.userEmail || authSession?.email || '',
        subject: payload.requestType || 'Support Request',
        message: payload.message,
        status: 'pending',
        created_at: nowIso,
      };

      // Insert directly into Supabase "messages" table with verified columns (no /api/ or extra column fallback)
      const sbMsgRes = await callSupabaseProxy({
        table: 'messages',
        method: 'POST',
        upsert: false,
        payload: messagePayload,
        timeoutMs: 10000,
      });

      if (!sbMsgRes.ok) {
        const detailParts = [
          sbMsgRes.error || `Supabase Error (${sbMsgRes.status})`,
          typeof sbMsgRes.data === 'object' && sbMsgRes.data?.details ? sbMsgRes.data.details : '',
          typeof sbMsgRes.data === 'object' && sbMsgRes.data?.hint ? sbMsgRes.data.hint : '',
          typeof sbMsgRes.data === 'object' && sbMsgRes.data?.code ? `[${sbMsgRes.data.code}]` : '',
        ].filter(Boolean);
        const exactErr = detailParts.join(' — ');
        console.error('[SupportRequest] Supabase messages insert error:', {
          status: sbMsgRes.status,
          error: sbMsgRes.error,
          data: sbMsgRes.data,
          payload: messagePayload,
        });
        triggerGlobalToast(`❌ Supabase Error: ${exactErr}`);
        return { ok: false, error: exactErr };
      }

      const insertedRow = Array.isArray(sbMsgRes.data) ? sbMsgRes.data[0] : sbMsgRes.data;
      const createdReq: ClientSupportRequest = {
        id: String(insertedRow?.id || `msg-${Date.now()}`),
        deviceId: clientDeviceId,
        userName: messagePayload.user_name,
        userPhone: messagePayload.user_phone,
        userCnic: authSession?.cnic || '',
        userEmail: String(messagePayload.user_email || ''),
        requestType: messagePayload.subject,
        message: payload.message,
        createdAt: insertedRow?.created_at
          ? new Date(insertedRow.created_at).getTime() || Date.now()
          : Date.now(),
        isResolved: String(insertedRow?.status || '').toLowerCase() === 'resolved',
        resolvedBy: '',
        resolvedAt: 0,
        sender: 'CLIENT',
      };

      setSupportRequests((prev) => [createdReq, ...prev]);
      triggerGlobalToast('✅ Message sent to Support Team (Supabase)!');
      return { ok: true };
    } catch (err: any) {
      const exactErr = err?.message || 'Unexpected network error sending request';
      console.error('[SupportRequest] Exception:', err);
      triggerGlobalToast(`❌ Request sending error: ${exactErr}`);
      return { ok: false, error: exactErr };
    } finally {
      setIsSubmittingSupportRequest(false);
    }
  };

  const handleSyncUserProfileToCloud = async (profilePatch: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyNtn?: string;
    tagline?: string;
    selfieUrl?: string;
    shopPhotoUrl?: string;
    cnicFrontUrl?: string;
    cnicBackUrl?: string;
  }) => {
    if (!authSession?.verified) return;
    const isSessionValid = await verifySingleDeviceSessionOnline();
    if (!isSessionValid) return;

    if (profilePatch.companyName !== undefined) setCompanyName(profilePatch.companyName);
    if (profilePatch.companyAddress !== undefined) setCompanyAddress(profilePatch.companyAddress);
    if (profilePatch.companyPhone !== undefined) setCompanyPhone(profilePatch.companyPhone);
    if (profilePatch.companyNtn !== undefined) setCompanyNtn(profilePatch.companyNtn);
    if (profilePatch.tagline !== undefined) setCompanyTagline(profilePatch.tagline);

    const updatedSession: ClientAuthSession = {
      ...authSession,
      ...(profilePatch.companyName !== undefined
        ? { companyName: profilePatch.companyName }
        : {}),
      ...(profilePatch.companyAddress !== undefined
        ? { shopAddress: profilePatch.companyAddress }
        : {}),
      ...(profilePatch.selfieUrl !== undefined ? { selfieUrl: profilePatch.selfieUrl } : {}),
      ...(profilePatch.shopPhotoUrl !== undefined
        ? { shopPhotoUrl: profilePatch.shopPhotoUrl }
        : {}),
      ...(profilePatch.cnicFrontUrl !== undefined
        ? { cnicFrontUrl: profilePatch.cnicFrontUrl }
        : {}),
      ...(profilePatch.cnicBackUrl !== undefined
        ? { cnicBackUrl: profilePatch.cnicBackUrl }
        : {}),
    };
    saveAuthSession(updatedSession);
    setAuthSession(updatedSession);

    const cnicFields = {
      ...(profilePatch.cnicFrontUrl !== undefined
        ? {
            cnic_front: profilePatch.cnicFrontUrl,
            cnic_front_url: profilePatch.cnicFrontUrl,
          }
        : {}),
      ...(profilePatch.cnicBackUrl !== undefined
        ? {
            cnic_back: profilePatch.cnicBackUrl,
            cnic_back_url: profilePatch.cnicBackUrl,
          }
        : {}),
    };

    await collectAndSyncUserTelemetryToSupabase({
      deviceId: updatedSession.deviceId,
      session: updatedSession,
      companyName: updatedSession.companyName || companyName,
      selfieUrl: updatedSession.selfieUrl,
      shopPhotoUrl: updatedSession.shopPhotoUrl,
      isOnline: true,
      extraFields: {
        ...(profilePatch.companyNtn !== undefined ? { ntn: profilePatch.companyNtn } : {}),
        ...(profilePatch.tagline !== undefined ? { tagline: profilePatch.tagline } : {}),
        ...(profilePatch.companyPhone !== undefined ? { company_phone: profilePatch.companyPhone } : {}),
        ...cnicFields,
      },
    });

    const cleanDev = String(updatedSession.deviceId || '').trim();
    if (cleanDev && !cleanDev.startsWith('RESET_')) {
      await Promise.allSettled([
        callSupabaseProxy({
          table: 'client_users',
          method: 'PATCH',
          query: `device_id=eq.${encodeURIComponent(cleanDev)}`,
          payload: {
            company_name: updatedSession.companyName || companyName,
            shop_address: updatedSession.shopAddress || companyAddress,
            ...(profilePatch.companyNtn !== undefined ? { ntn: profilePatch.companyNtn } : {}),
            ...cnicFields,
            last_seen: new Date().toISOString(),
          },
          timeoutMs: 6000,
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'PATCH',
          query: `device_id=eq.${encodeURIComponent(cleanDev)}`,
          payload: {
            company_name: updatedSession.companyName || companyName,
            shop_address: updatedSession.shopAddress || companyAddress,
            ...cnicFields,
            updated_at: new Date().toISOString(),
          },
          timeoutMs: 6000,
        }),
      ]);
    }
  };

  const handleAuthenticated = async (session: ClientAuthSession) => {
    setManualLoggedOut(false);
    setClientDeviceId(session.deviceId);
    saveAuthSession(session);
    saveLastActiveAtMs(Date.now());
    setAuthSession(session);
    setAuthNotice(null);
    setIsSubscriptionExpired(false);
    const isOwner = isOwnerIdentity({
      email: session.email,
      phone: session.phone,
      cnic: session.cnic,
      masterCfg: loadCachedMasterEngineConfig(),
    });
    if (isOwner) {
      setCloudAccessInfo({
        status: 'FREE',
        tier: 'LIFETIME_VIP',
        role: 'OWNER',
        expiresAt: null,
        reason: '',
        lastSyncedAt: Date.now(),
      });
    } else {
      setCloudAccessInfo((prev) => ({
        ...prev,
        role: session.userRole || 'CLIENT',
      }));
    }
    if (session.companyName && session.companyName.trim()) {
      setCompanyName(session.companyName.trim());
    }
    requestAndSaveGpsLocation(session.deviceId);
    collectAndSyncUserTelemetryToSupabase({
      deviceId: session.deviceId,
      session,
      companyName: session.companyName || companyName,
      selfieUrl: session.selfieUrl,
      shopPhotoUrl: session.shopPhotoUrl,
      isOnline: true,
    });
    const syncedOk = await syncFromSupabase({
      forceRates: false,
      silent: true,
      sessionOverride: session,
    });
    if (!syncedOk) {
      loadSupportRequests(undefined, session);
    }
    markInitialSyncCompletedForDevice(session.deviceId);
  };

  const handleLogout = async () => {
    markUserOfflineInSupabase(clientDeviceId);
    clearLastActiveAtMs();
    clearInitialSyncCompletedFlag();
    try {
      localStorage.removeItem(USER_LOCKED_TABS_KEY);
    } catch {}
    setUserLockedTabs({});
    await performCleanSupabaseAndStorageSignOut(true);
    setAuthSession(null);
    setIsSubscriptionExpired(false);
    setCloudAccessInfo({
      status: 'TRIAL',
      tier: 'CLIENT',
      role: 'CLIENT',
      expiresAt: null,
      reason: '',
      lastSyncedAt: null,
    });
    setAuthNotice('Aap logout ho chuke hain. Dobara Login karein.');
  };

  const handleAccountDeletedLogout = async () => {
    clearLastActiveAtMs();
    clearInitialSyncCompletedFlag();
    try {
      localStorage.removeItem(USER_LOCKED_TABS_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DEVICE_RATES_KEY);
    } catch {}
    setUserLockedTabs({});
    setCustomLetterheadBgUrl('');
    setWindows([]);
    setDgWindows([]);
    setDoors([]);
    setFixFrames([]);
    setOpenableWindows([]);
    setSlidingDoors([]);
    setProjectExtras([]);
    setCustomerName('');
    setCustomerPhone('');
    await performCleanSupabaseAndStorageSignOut(true);
    setAuthSession(null);
    setIsSubscriptionExpired(false);
    setCloudAccessInfo({
      status: 'TRIAL',
      tier: 'CLIENT',
      role: 'CLIENT',
      expiresAt: null,
      reason: '',
      lastSyncedAt: null,
    });
    setAuthNotice('Aapka account permanently delete ho chuka hai.');
  };

  // Apply Complete Theme Engine across the entire app
  useEffect(() => {
    const safe = enforceReadableContrast(currentTheme);
    const root = document.documentElement;
    root.style.setProperty('--boss-bg', safe.bg);
    root.style.setProperty('--boss-panel', safe.panel);
    root.style.setProperty('--boss-panel2', safe.panel2);
    root.style.setProperty('--boss-border', safe.border);
    root.style.setProperty('--boss-primary', safe.primary);
    root.style.setProperty('--boss-accent', safe.accent);
    root.style.setProperty('--boss-text', safe.textPrimary);
    root.style.setProperty('--boss-text-muted', safe.textSecondary);
    root.style.fontSize = `${Math.round((safe.fontScale || 1) * 100)}%`;

    root.setAttribute('data-font-family', safe.fontFamily || 'PLUS_JAKARTA');
    root.setAttribute('data-btn-shape', safe.buttonShape || 'PILL_3D');
    root.setAttribute('data-btn-style', safe.buttonShape || safe.buttonStyle || 'PILL_3D');
    root.setAttribute('data-table-style', safe.tableStyle || 'COMPACT_WORKSHOP');
    root.setAttribute('data-icon-pack', safe.iconPack || 'BOLD_DUOTONE');
    root.setAttribute('data-template', safe.templateLayout || 'CLASSIC_GOLD');

    document.body.setAttribute('data-font-family', safe.fontFamily || 'PLUS_JAKARTA');
    document.body.setAttribute('data-btn-shape', safe.buttonShape || 'PILL_3D');
    document.body.setAttribute('data-table-style', safe.tableStyle || 'COMPACT_WORKSHOP');
    document.body.setAttribute('data-icon-pack', safe.iconPack || 'BOLD_DUOTONE');

    if (safe.isLight) {
      root.classList.add('boss-theme-light');
      document.body.classList.add('boss-theme-light');
    } else {
      root.classList.remove('boss-theme-light');
      document.body.classList.remove('boss-theme-light');
    }

    try {
      localStorage.setItem('boss_active_theme_config', JSON.stringify(safe));
    } catch {}
  }, [currentTheme]);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const cachedM = loadCachedMasterEngineConfig();
    const cachedMobSrc =
      cachedM?.mobileDownloadConfig ||
      cachedM?.mobileAppConfig ||
      cachedM?.appDownloads;
    let hasLocalSyncEvidence = false;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) {
        hasLocalSyncEvidence = Boolean(
          parsed?.cloudAccessInfo?.lastSyncedAt ||
            (cachedM && Object.keys(cachedM).length > 0)
        );
        const winSrc = cachedM?.windowFormula || cachedM?.winFormulas || parsed.windowFormula;
        if (winSrc) setWindowFormula({ ...getDefaultWindowFormula(), ...winSrc });
        const dgWinSrc =
          cachedM?.dgWindowFormula ||
          cachedM?.dgWindowsFormula ||
          cachedM?.dgWinFormulas ||
          cachedM?.dgWindowFormulas ||
          parsed.dgWindowFormula;
        if (dgWinSrc) setDgWindowFormula({ ...getDefaultDgWindowFormula(), ...dgWinSrc });
        const sdSrc =
          cachedM?.slidingDoorFormula || cachedM?.slidingDoorFormulas || parsed.slidingDoorFormula;
        if (sdSrc) setSlidingDoorFormula({ ...getDefaultSlidingDoorFormula(), ...sdSrc });
        const glSrc = cachedM?.glassFormulas || parsed.glassFormulas;
        if (glSrc && typeof glSrc === 'object') {
          const defGl = getDefaultGlassFormulas();
          const mergedGl: Record<string, GlassFormula> = { ...defGl };
          Object.entries(glSrc).forEach(([k, v]: [string, any]) => {
            if (v && typeof v === 'object') {
              mergedGl[k] = { ...(defGl[k] || defGl.window), ...v };
            }
          });
          setGlassFormulas(mergedGl);
        }
        if (parsed.doorFormula) {
          const df = parsed.doorFormula as FormulaCategorySettings;
          if (df.acc?.D46 && df.acc.D46.qtyW === 2 && df.acc.D46.qtyH === 2) {
            df.acc.D46 = { ...df.acc.D46, applyTo: 'W', qty: 1, qtyH: 0, qtyW: 1 };
          }
          if (df.acc?.D52 && df.acc.D52.qtyH === 2 && df.acc.D52.qtyW === 2) {
            df.acc.D52 = { ...df.acc.D52, enabled: false, applyTo: 'W', qty: 1, qtyH: 0, qtyW: 1 };
          }
          if (df.acc?.D59 && df.acc.D59.qtyH === 2 && df.acc.D59.qtyW === 2) {
            df.acc.D59 = { ...df.acc.D59, enabled: false, applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 };
          }
          setDoorFormula(df);
        }
        if (parsed.fixFormula) setFixFormula(parsed.fixFormula);
        if (parsed.openwinFormula) setOpenwinFormula(parsed.openwinFormula);
        const fsSrc =
          cachedM?.fSectionFormula || cachedM?.fsectionFormula || parsed.fSectionFormula;
        if (fsSrc) setFSectionFormula({ ...getDefaultFSectionFormula(), ...fsSrc });
        if (parsed.savedQuotations) setSavedQuotations(parsed.savedQuotations);
        if (parsed.rates) {
          setRates(parsed.rates);
        } else {
          setRates(getInitialRates());
        }
        if (parsed.packages?.length) setPackages(parsed.packages);
        if (parsed.bankAccounts?.length) setBankAccounts(parsed.bankAccounts);
        if (parsed.activeOffer !== undefined) setActiveOffer(parsed.activeOffer);
        if (Array.isArray(parsed.broadcasts)) setBroadcasts(parsed.broadcasts);
        if (parsed.mainLogoUrl) setMainLogoUrl(parsed.mainLogoUrl);
        if (cachedMobSrc && typeof cachedMobSrc === 'object') {
          const cAnd = String(
            cachedMobSrc.androidUrl ||
              cachedMobSrc.androidApkUrl ||
              cachedMobSrc.androidDownloadUrl ||
              cachedMobSrc.apkUrl ||
              ''
          ).trim();
          const cWin = String(
            cachedMobSrc.windowsUrl ||
              cachedMobSrc.windowsDownloadUrl ||
              cachedMobSrc.windowsExeUrl ||
              cachedMobSrc.exeUrl ||
              ''
          ).trim();
          const cIos = String(
            cachedMobSrc.iosUrl ||
              cachedMobSrc.iosDownloadUrl ||
              cachedMobSrc.iosAppUrl ||
              cachedMobSrc.ipaUrl ||
              ''
          ).trim();
          if (cAnd || cWin || cIos || parsed.mobileDownloadConfig) {
            setMobileDownloadConfig({
              ...(parsed.mobileDownloadConfig || {}),
              androidUrl: cAnd || parsed.mobileDownloadConfig?.androidUrl || parsed.mobileDownloadConfig?.androidApkUrl || '',
              androidApkUrl: cAnd || parsed.mobileDownloadConfig?.androidApkUrl || parsed.mobileDownloadConfig?.androidUrl || '',
              windowsUrl: cWin || parsed.mobileDownloadConfig?.windowsUrl || '',
              iosUrl: cIos || parsed.mobileDownloadConfig?.iosUrl || parsed.mobileDownloadConfig?.iosDownloadUrl || parsed.mobileDownloadConfig?.iosAppUrl || '',
              iosDownloadUrl: cIos || parsed.mobileDownloadConfig?.iosDownloadUrl || parsed.mobileDownloadConfig?.iosUrl || parsed.mobileDownloadConfig?.iosAppUrl || '',
              iosAppUrl: cIos || parsed.mobileDownloadConfig?.iosAppUrl || parsed.mobileDownloadConfig?.iosUrl || '',
              androidVersion: String(cachedMobSrc.androidVersion || parsed.mobileDownloadConfig?.androidVersion || '').trim(),
              windowsVersion: String(cachedMobSrc.windowsVersion || parsed.mobileDownloadConfig?.windowsVersion || '').trim(),
              iosVersion: String(cachedMobSrc.iosVersion || parsed.mobileDownloadConfig?.iosVersion || '').trim(),
              releaseNotes: String(cachedMobSrc.releaseNotes || parsed.mobileDownloadConfig?.releaseNotes || '').trim(),
            });
          }
        } else if (parsed.mobileDownloadConfig !== undefined) {
          setMobileDownloadConfig(parsed.mobileDownloadConfig);
        }
        if (Array.isArray(parsed.supportRequests)) setSupportRequests(parsed.supportRequests);
        if (parsed.layoutConfig || cachedM?.layoutConfig || cachedM?.lockedTabs || cachedM?.tabLocks || cachedM?.lockedPages) {
          const cachedLockedMerged = normalizeLockedTabsMap(
            parsed.layoutConfig?.lockedTabs,
            cachedM?.tabLocks,
            cachedM?.lockedPages,
            cachedM?.lockedTabs,
            cachedM?.layoutConfig?.lockedTabs
          );
          setLayoutConfig((prev) => ({
            ...prev,
            ...(parsed.layoutConfig || {}),
            ...(cachedM?.layoutConfig || {}),
            enabledTabs: {
              ...(prev.enabledTabs || {}),
              ...(parsed.layoutConfig?.enabledTabs || {}),
              ...(cachedM?.layoutConfig?.enabledTabs || {}),
              DG_WINDOWS:
                cachedM?.layoutConfig?.enabledTabs?.DG_WINDOWS ??
                parsed.layoutConfig?.enabledTabs?.DG_WINDOWS ??
                true,
            },
            tabCustomTitles: {
              ...(prev.tabCustomTitles || {}),
              ...(parsed.layoutConfig?.tabCustomTitles || {}),
              ...(cachedM?.layoutConfig?.tabCustomTitles || {}),
              DG_WINDOWS:
                cachedM?.layoutConfig?.tabCustomTitles?.DG_WINDOWS ||
                parsed.layoutConfig?.tabCustomTitles?.DG_WINDOWS ||
                'DG.Windows',
            },
            lockedTabs: {
              ...cachedLockedMerged,
              DG_WINDOWS:
                'DG_WINDOWS' in cachedLockedMerged ? cachedLockedMerged.DG_WINDOWS : true,
            },
          }));
        }
        if (typeof parsed.adminLetterheadBgUrl === 'string' && parsed.adminLetterheadBgUrl.trim()) {
          setAdminLetterheadBgUrl((prev) => prev || parsed.adminLetterheadBgUrl.trim());
        }
        if (typeof parsed.customLetterheadBgUrl === 'string') {
          setCustomLetterheadBgUrl(parsed.customLetterheadBgUrl.trim());
        } else if (typeof parsed.letterheadBgUrl === 'string') {
          const legacyLh = parsed.letterheadBgUrl.trim();
          const cachedAdminLh = extractAdminLetterheadBgUrl(cachedM);
          if (
            legacyLh &&
            !isBundledFallbackLetterhead(legacyLh, bossLetterheadCleanImg) &&
            legacyLh !== cachedAdminLh
          ) {
            setCustomLetterheadBgUrl(legacyLh);
          }
        }
        if (parsed.currentTheme) setCurrentTheme(enforceReadableContrast(parsed.currentTheme));
        if (parsed.downloadedThemes) setDownloadedThemes(parsed.downloadedThemes);
        setDeletedBackupVault([]);
        if (parsed.glassRates) setGlassRates(mergeGlassRatesWithDefaults(parsed.glassRates));
        if (parsed.availableColors?.length) {
          setAvailableColors(mergeAvailableColorsWithDefaults(parsed.availableColors));
        }
        if (parsed.customSections) setCustomSections(parsed.customSections);
        if (parsed.hiddenSections) setHiddenSections(parsed.hiddenSections);
        if (typeof parsed.companyName === 'string') setCompanyName(parsed.companyName);
        if (typeof parsed.companyTagline === 'string') setCompanyTagline(parsed.companyTagline);
        if (typeof parsed.companyAddress === 'string') setCompanyAddress(parsed.companyAddress);
        if (typeof parsed.companyPhone === 'string') setCompanyPhone(parsed.companyPhone);
        if (typeof parsed.companyNtn === 'string') setCompanyNtn(parsed.companyNtn);
        if (typeof parsed.hardwareRate === 'number') setHardwareRate(parsed.hardwareRate);
        if (typeof parsed.markupPct === 'number') setMarkupPct(parsed.markupPct);
        if (typeof parsed.transportRent === 'number') setTransportRent(parsed.transportRent);
        if (typeof parsed.labourCost === 'number') setLabourCost(parsed.labourCost);

        const initialSess = loadAuthSession();
        const isOwner = Boolean(
          initialSess &&
            isOwnerIdentity({
              email: initialSess.email,
              phone: initialSess.phone,
              cnic: initialSess.cnic,
              masterCfg: cachedM,
            })
        );
        if (isOwner) {
          setCloudAccessInfo({
            status: 'FREE',
            tier: 'LIFETIME_VIP',
            role: 'OWNER',
            expiresAt: null,
            serverNowMs: getEffectiveServerNowMs(),
            reason: '',
            lastSyncedAt: null,
          });
          setIsSubscriptionExpired(false);
        } else if (parsed.cloudAccessInfo && initialSess) {
          setCloudAccessInfo({
            ...parsed.cloudAccessInfo,
            role: parsed.cloudAccessInfo.role || initialSess.userRole || 'CLIENT',
          });
          const knownServerNow = getEffectiveServerNowMs() || Number(parsed.cloudAccessInfo.serverNowMs || 0);
          const cachedExp = Number(parsed.cloudAccessInfo.expiresAt || 0);
          const isCachedNonFree =
            parsed.cloudAccessInfo.status !== 'FREE' &&
            parsed.cloudAccessInfo.status !== 'BLOCKED';
          if (
            isCachedNonFree &&
            (isLocalClockRolledBack() ||
              (cachedExp > 0 && knownServerNow > 0 && knownServerNow > cachedExp))
          ) {
            setIsSubscriptionExpired(true);
          }
        }
      } else if (cachedM && Object.keys(cachedM).length > 0) {
        hasLocalSyncEvidence = true;
        if (cachedM.layoutConfig || cachedM.lockedTabs || cachedM.tabLocks || cachedM.lockedPages) {
          const cachedLockedMerged = normalizeLockedTabsMap(
            cachedM.tabLocks,
            cachedM.lockedPages,
            cachedM.lockedTabs,
            cachedM.layoutConfig?.lockedTabs
          );
          setLayoutConfig((prev) => ({
            ...prev,
            ...(cachedM.layoutConfig || {}),
            enabledTabs: {
              ...(prev.enabledTabs || {}),
              ...(cachedM.layoutConfig?.enabledTabs || {}),
              DG_WINDOWS: cachedM.layoutConfig?.enabledTabs?.DG_WINDOWS ?? true,
            },
            tabCustomTitles: {
              ...(prev.tabCustomTitles || {}),
              ...(cachedM.layoutConfig?.tabCustomTitles || {}),
              DG_WINDOWS: cachedM.layoutConfig?.tabCustomTitles?.DG_WINDOWS || 'DG.Windows',
            },
            lockedTabs: {
              ...cachedLockedMerged,
              DG_WINDOWS:
                'DG_WINDOWS' in cachedLockedMerged ? cachedLockedMerged.DG_WINDOWS : true,
            },
          }));
        }
        if (cachedMobSrc && typeof cachedMobSrc === 'object') {
          const cAnd = String(
            cachedMobSrc.androidUrl ||
              cachedMobSrc.androidApkUrl ||
              cachedMobSrc.androidDownloadUrl ||
              cachedMobSrc.apkUrl ||
              ''
          ).trim();
          const cWin = String(
            cachedMobSrc.windowsUrl ||
              cachedMobSrc.windowsDownloadUrl ||
              cachedMobSrc.windowsExeUrl ||
              cachedMobSrc.exeUrl ||
              ''
          ).trim();
          const cIos = String(
            cachedMobSrc.iosUrl ||
              cachedMobSrc.iosDownloadUrl ||
              cachedMobSrc.iosAppUrl ||
              cachedMobSrc.ipaUrl ||
              ''
          ).trim();
          if (cAnd || cWin || cIos) {
            setMobileDownloadConfig({
              androidUrl: cAnd,
              androidApkUrl: cAnd,
              windowsUrl: cWin,
              iosUrl: cIos,
              iosDownloadUrl: cIos,
              iosAppUrl: cIos,
              androidVersion: String(cachedMobSrc.androidVersion || '').trim(),
              windowsVersion: String(cachedMobSrc.windowsVersion || '').trim(),
              iosVersion: String(cachedMobSrc.iosVersion || '').trim(),
              releaseNotes: String(cachedMobSrc.releaseNotes || '').trim(),
            });
          }
        }
      }

      // Also check dedicated device rate list snapshot if main storage lacked rates
      const devRaw = localStorage.getItem(DEVICE_RATES_KEY);
      if (devRaw) {
        const devParsed = JSON.parse(devRaw);
        if (!raw && devParsed.rates) setRates(devParsed.rates);
        if (!raw && devParsed.glassRates) {
          setGlassRates(mergeGlassRatesWithDefaults(devParsed.glassRates));
        }
        if (!raw && devParsed.availableColors?.length) {
          setAvailableColors(mergeAvailableColorsWithDefaults(devParsed.availableColors));
        }
        if (!raw && devParsed.customSections) setCustomSections(devParsed.customSections);
        if (!raw && devParsed.hiddenSections) setHiddenSections(devParsed.hiddenSections);
        if (typeof devParsed.savedAt === 'number') setRateListSavedAt(devParsed.savedAt);
      }
    } catch {
      // ignore storage errors
    }

    // Multi-key auto-sync on app open whenever an authenticated session exists (unless manually logged out)
    const existingSession = loadAuthSession();
    const alreadySyncedForSession = Boolean(
      existingSession &&
        (hasInitialSyncCompletedForDevice(existingSession.deviceId) || hasLocalSyncEvidence)
    );
    if (existingSession?.verified && !isManualLoggedOut()) {
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        if (!alreadySyncedForSession) {
          requestAndSaveGpsLocation(existingSession.deviceId, {
            email: existingSession.email,
            phone: existingSession.phone,
          });
          collectAndSyncUserTelemetryToSupabase({
            deviceId: existingSession.deviceId,
            session: existingSession,
            companyName: existingSession.companyName || companyName,
            selfieUrl: existingSession.selfieUrl,
            shopPhotoUrl: existingSession.shopPhotoUrl,
            isOnline: true,
          });
        }
        syncFromSupabase({ forceRates: false, silent: true, sessionOverride: existingSession });
      }
    } else {
      // Auto-detect real GPS location immediately on app launch and sync cleanly when online
      requestAndSaveGpsLocation(
        existingSession?.deviceId,
        existingSession ? { email: existingSession.email, phone: existingSession.phone } : undefined
      );
      // Lightweight branding/letterhead check using updated_at cache when online so Admin Panel's synced letterhead_bg_url always shows
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        fetchAppConfigsSmart({
          idsFilter: [
            'master_engine_config',
            'global_config',
            'packages_v1',
            'company_branding_v1',
            'company_branding',
            'layout_config_v1',
            'letterhead_bg_url',
          ],
          alwaysRefreshIds: ['packages_v1', 'global_config'],
          timeoutMs: 6000,
        })
          .then((cfgOnlyRes) => {
            if (!cfgOnlyRes.ok) return;
            const mapOnly = cfgOnlyRes.cfgMap || {};
            const tsOnly = cfgOnlyRes.timestamps || {};
            const gTs = Date.parse(tsOnly.global_config || '') || 0;
            const mTs = Date.parse(tsOnly.master_engine_config || '') || 0;
            const mergedCfg =
              gTs > mTs
                ? {
                    ...(mapOnly.master_engine_config || {}),
                    ...(mapOnly.global_config || {}),
                  }
                : {
                    ...(mapOnly.global_config || {}),
                    ...(mapOnly.master_engine_config || {}),
                  };
            if (Object.keys(mergedCfg).length > 0 && cfgOnlyRes.changed) {
              saveCachedMasterEngineConfig(mergedCfg);
            }
            const resolvedPre = resolveLivePackagesAndOfferFromConfigs(mapOnly, tsOnly, mergedCfg);
            if (resolvedPre.hasOfferKeyInCloud) {
              setActiveOffer(resolvedPre.activeOffer);
            }
            if (resolvedPre.packages) {
              setPackages(resolvedPre.packages);
            }
            const foundLh = extractAdminLetterheadBgUrl(
              mergedCfg,
              mapOnly.company_branding_v1 || mapOnly.company_branding,
              mapOnly.layout_config_v1,
              mapOnly.letterhead_bg_url
            );
            if (foundLh) {
              setAdminLetterheadBgUrl(foundLh);
            }
            const foundLogo = String(
              mergedCfg.mainLogoUrl ||
                mergedCfg.appLogoUrl ||
                mergedCfg.branding?.mainLogoUrl ||
                mergedCfg.companyBranding?.mainLogoUrl ||
                mergedCfg.companyBranding?.logoUrl ||
                mapOnly.company_branding_v1?.mainLogoUrl ||
                ''
            ).trim();
            if (foundLogo) {
              setMainLogoUrl(foundLogo);
            }
          })
          .catch(() => {});
      }
    }

    const handleGoOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        const curSess = loadAuthSession();
        if (curSess?.verified) {
          syncFromSupabase({ forceRates: false, silent: true, sessionOverride: curSess });
        }
      }
    };
    const handleGoOffline = () => {
      wasOfflineRef.current = true;
      setIsOnline(false);
    };
    window.addEventListener('online', handleGoOnline);
    window.addEventListener('offline', handleGoOffline);
    return () => {
      window.removeEventListener('online', handleGoOnline);
      window.removeEventListener('offline', handleGoOffline);
    };
  }, []);

  // Keep latest syncFromSupabase reference for Realtime & Focus auto-sync listeners
  const syncFromSupabaseRef = useRef(syncFromSupabase);
  syncFromSupabaseRef.current = syncFromSupabase;

  // Live Supabase Realtime Listener + Focus/Periodic Auto-Sync for immediate Admin updates
  useEffect(() => {
    if (!authSession?.verified || isManualLoggedOut()) return;

    const myEmail = String(authSession.email || '').trim().toLowerCase();
    const myPhoneDigits = normalizePhoneDigits(authSession.phone || '');
    const myDevId = String(authSession.deviceId || clientDeviceId || '').trim();
    const myUserId = String(authSession.userId || '').trim();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastAutoSyncMs = 0;

    const triggerDebouncedSync = (delayMs = 450) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (isManualLoggedOut()) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        lastAutoSyncMs = Date.now();
        syncFromSupabaseRef.current?.({ forceRates: false, silent: true });
      }, delayMs);
    };

    const matchesCurrentUserPayload = (payload: any): boolean => {
      const candidates = [payload?.new, payload?.old].filter(
        (r) => r && typeof r === 'object'
      );
      if (candidates.length === 0) return true;
      return candidates.some((r: any) => {
        const em = String(r.email || '').trim().toLowerCase();
        if (myEmail && em && em === myEmail) return true;
        const ph = normalizePhoneDigits(String(r.phone || ''));
        if (myPhoneDigits.length >= 10 && ph && ph === myPhoneDigits) return true;
        const dev = String(r.device_id || r.deviceId || '').trim();
        if (myDevId && dev && dev === myDevId) return true;
        const rid = String(r.id || '').trim();
        if (myUserId && rid && rid === myUserId) return true;
        return false;
      });
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`boss-client-sync-${myDevId || 'user'}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          (payload) => {
            if (matchesCurrentUserPayload(payload)) triggerDebouncedSync(350);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'client_users' },
          (payload) => {
            if (matchesCurrentUserPayload(payload)) triggerDebouncedSync(350);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions' },
          (payload) => {
            if (matchesCurrentUserPayload(payload)) triggerDebouncedSync(350);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_configs' },
          () => {
            triggerDebouncedSync(600);
          }
        )
        .subscribe();
    } catch {
      // non-fatal if WebSocket realtime is unavailable
    }

    const handleVisibleOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (
        now - lastAutoSyncMs < 30_000 ||
        now - lastCloudSyncStartedAtRef.current < 30_000
      ) {
        return;
      }
      triggerDebouncedSync(250);
    };

    window.addEventListener('focus', handleVisibleOrFocus);
    document.addEventListener('visibilitychange', handleVisibleOrFocus);

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      lastAutoSyncMs = Date.now();
      syncFromSupabaseRef.current?.({ forceRates: false, silent: true });
    }, 60_000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('focus', handleVisibleOrFocus);
      document.removeEventListener('visibilitychange', handleVisibleOrFocus);
      clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [authSession?.verified, authSession?.email, authSession?.phone, authSession?.deviceId, authSession?.userId, clientDeviceId]);

  // Anti-Theft, Anti-Inspect & Formula/Rate Copy Protection (Right-click, DevTools shortcuts & Protected Copy Guard)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyLower = String(e.key || '').toLowerCase();
      const isCtrlOrMeta = Boolean(e.ctrlKey || e.metaKey);

      // Block F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (and Cmd+Option+I/J/C on macOS)
      if (
        (isCtrlOrMeta && e.shiftKey && (keyLower === 'i' || keyLower === 'j' || keyLower === 'c')) ||
        (e.metaKey && e.altKey && (keyLower === 'i' || keyLower === 'j' || keyLower === 'c'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Ctrl+U (View Source) & Ctrl+S (Save Page)
      if (isCtrlOrMeta && (keyLower === 'u' || keyLower === 's')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleCopyOrCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('.boss-protected-content') ||
          target.closest('table') ||
          target.tagName === 'TABLE') &&
        !target.closest('input, textarea, select')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopyOrCut, true);
    document.addEventListener('cut', handleCopyOrCut, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopyOrCut, true);
      document.removeEventListener('cut', handleCopyOrCut, true);
    };
  }, []);

  // 3-Day (72-hour) inactivity tracking & auto-logout (updates throttled last_active_at in localStorage)
  useEffect(() => {
    if (!authSession?.verified) return;

    if (isSessionInactiveExpired(authSession)) {
      triggerInactivityLogout();
      return;
    }

    let lastSavedAt = Date.now();
    saveLastActiveAtMs(lastSavedAt);

    const recordUserActivity = () => {
      if (isSessionInactiveExpired(authSession)) {
        triggerInactivityLogout();
        return;
      }
      const now = Date.now();
      if (now - lastSavedAt >= 15000) {
        lastSavedAt = now;
        saveLastActiveAtMs(now);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (isSessionInactiveExpired(authSession)) {
          triggerInactivityLogout();
          return;
        }
        const now = Date.now();
        lastSavedAt = now;
        saveLastActiveAtMs(now);
      }
    };

    window.addEventListener('pointerdown', recordUserActivity, true);
    window.addEventListener('keydown', recordUserActivity, true);
    window.addEventListener('touchstart', recordUserActivity, { passive: true, capture: true });
    window.addEventListener('scroll', recordUserActivity, { passive: true, capture: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pointerdown', recordUserActivity, true);
      window.removeEventListener('keydown', recordUserActivity, true);
      window.removeEventListener('touchstart', recordUserActivity, true);
      window.removeEventListener('scroll', recordUserActivity, true);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authSession?.verified, authSession?.loggedInAt]);

  // Mark user offline on browser/tab close (no background polling or focus/visibility loops)
  useEffect(() => {
    if (!authSession?.verified) return;
    const handlePageHide = () => {
      try {
        const { url, key } = getActiveSupabaseCredentials();
        fetch(
          `${url}/rest/v1/users?device_id=eq.${encodeURIComponent(clientDeviceId)}`,
          {
            method: 'PATCH',
            keepalive: true,
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              is_online: false,
              last_seen: new Date().toISOString(),
            }),
          }
        ).catch(() => {});
      } catch {
        // ignore keepalive failure
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [authSession?.verified, clientDeviceId]);

  // Sync Main Logo to Browser Favicon (keep Golden Lion PNG icons intact by default)
  useEffect(() => {
    if (!mainLogoUrl || mainLogoUrl === bossLionLogoImg) return;
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
      .forEach((link) => {
        link.href = mainLogoUrl;
      });
  }, [mainLogoUrl]);

  // Global Mouse Drag-to-Scroll
  useEffect(() => {
    let isDown = false;
    let hasDragged = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let scrollElX: HTMLElement | null = null;
    let scrollElY: HTMLElement | null = null;

    const findScrollParents = (
      el: HTMLElement | null
    ): { x: HTMLElement | null; y: HTMLElement } => {
      let cur = el;
      let foundX: HTMLElement | null = null;
      let foundY: HTMLElement | null = null;

      while (cur && cur !== document.body && cur !== document.documentElement) {
        const style = window.getComputedStyle(cur);
        if (
          !foundX &&
          (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
          cur.scrollWidth > cur.clientWidth + 1
        ) {
          foundX = cur;
        }
        if (
          !foundY &&
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          cur.scrollHeight > cur.clientHeight + 1
        ) {
          foundY = cur;
        }
        cur = cur.parentElement;
      }

      const rootScroller =
        (document.scrollingElement as HTMLElement) || document.documentElement;
      return {
        x: foundX || (rootScroller.scrollWidth > rootScroller.clientWidth + 1 ? rootScroller : null),
        y: foundY || rootScroller,
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('input, select, textarea, [draggable="true"]')) {
        return;
      }
      const parents = findScrollParents(target);
      scrollElX = parents.x;
      scrollElY = parents.y;
      isDown = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = scrollElX ? scrollElX.scrollLeft : 0;
      startScrollTop = scrollElY ? scrollElY.scrollTop : 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!hasDragged && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        hasDragged = true;
        document.body.style.userSelect = 'none';
      }
      if (hasDragged) {
        if (scrollElX) {
          scrollElX.scrollLeft = startScrollLeft - dx;
        }
        if (scrollElY) {
          scrollElY.scrollTop = startScrollTop - dy;
        }
      }
    };

    const onMouseUp = () => {
      if (isDown) {
        isDown = false;
        document.body.style.userSelect = '';
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      }
    };

    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    window.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  // Persist key state & master_engine_config outputs to localStorage so app runs offline without hitting Supabase
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          windowFormula,
          dgWindowFormula,
          slidingDoorFormula,
          doorFormula,
          fixFormula,
          openwinFormula,
          fSectionFormula,
          glassFormulas,
          savedQuotations,
          rates,
          packages,
          bankAccounts,
          activeOffer,
          broadcasts,
          mainLogoUrl,
          mobileDownloadConfig,
          cloudAccessInfo,
          supportRequests,
          layoutConfig,
          letterheadBgUrl,
          adminLetterheadBgUrl,
          customLetterheadBgUrl,
          currentTheme,
          downloadedThemes,
          deletedBackupVault,
          glassRates,
          availableColors,
          customSections,
          hiddenSections,
          companyName,
          companyTagline,
          companyAddress,
          companyPhone,
          companyNtn,
          hardwareRate,
          markupPct,
          transportRent,
          labourCost,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [
    windowFormula,
    dgWindowFormula,
    slidingDoorFormula,
    doorFormula,
    fixFormula,
    openwinFormula,
    fSectionFormula,
    glassFormulas,
    savedQuotations,
    rates,
    packages,
    bankAccounts,
    activeOffer,
    broadcasts,
    mainLogoUrl,
    mobileDownloadConfig,
    cloudAccessInfo,
    supportRequests,
    layoutConfig,
    adminLetterheadBgUrl,
    customLetterheadBgUrl,
    currentTheme,
    downloadedThemes,
    deletedBackupVault,
    glassRates,
    availableColors,
    customSections,
    hiddenSections,
    companyName,
    companyTagline,
    companyAddress,
    companyPhone,
    companyNtn,
    hardwareRate,
    markupPct,
    transportRent,
    labourCost,
  ]);

  const persistRatesSnapshotToDevice = (
    nextRates = rates,
    nextGlassRates = glassRates,
    nextColors = availableColors,
    nextCustomSections = customSections,
    nextHiddenSections = hiddenSections
  ) => {
    const savedAt = Date.now();
    try {
      localStorage.setItem(
        DEVICE_RATES_KEY,
        JSON.stringify({
          rates: nextRates,
          glassRates: nextGlassRates,
          availableColors: nextColors,
          customSections: nextCustomSections,
          hiddenSections: nextHiddenSections,
          savedAt,
        })
      );
      const curRaw = localStorage.getItem(STORAGE_KEY);
      const curObj = curRaw ? JSON.parse(curRaw) : {};
      curObj.rates = nextRates;
      curObj.glassRates = nextGlassRates;
      curObj.availableColors = nextColors;
      curObj.customSections = nextCustomSections;
      curObj.hiddenSections = nextHiddenSections;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(curObj));
      setRateListSavedAt(savedAt);
    } catch {
      // ignore storage errors
    }
    return savedAt;
  };

  const handleSaveRatesToDevice = () => {
    persistRatesSnapshotToDevice();
    triggerGlobalToast('✅ Rate List saved permanently on this device!');
  };

  const handleApplyRateListRows = (
    rows: {
      sectionTitle: string;
      sectionCode: string;
      gauge: string;
      color: string;
      rate: number;
    }[]
  ) => {
    const nextRates = JSON.parse(JSON.stringify(rates || {}));
    const nextColors = [...availableColors];
    const nextCustomSecs = [...customSections];
    let updated = 0;
    let inserted = 0;

    rows.forEach((r) => {
      const g = (r.gauge || '1.6').replace(/mm/i, '').trim() || '1.6';
      const col = (r.color || 'DULL').trim().toUpperCase();
      const sec = (r.sectionCode || '').trim().toUpperCase();
      if (!sec || !(r.rate > 0)) return;

      if (!nextColors.includes(col)) nextColors.push(col);
      if (!nextRates[g]) nextRates[g] = {};
      if (!nextRates[g][col]) nextRates[g][col] = {};

      const allSecCodes = Array.from(
        new Set([
          sec,
          sec.replace(/\s+(1\.6M|2MM|1\.6MM|1\.2|1\.4|1\.5|1\.6|2\.0)$/i, '').trim(),
          sec.replace(/\./g, ''),
        ])
      ).filter(Boolean);

      allSecCodes.forEach((code) => {
        const existingMatchedKeys = Object.keys(nextRates[g][col] || {}).filter((k) =>
          isSectionCodeMatch(k, code)
        );
        const alreadyKnown =
          DEFAULT_SECTIONS.some((s) => isSectionCodeMatch(s, code)) ||
          nextCustomSecs.some((s) => isSectionCodeMatch(s, code));
        if (!alreadyKnown) {
          nextCustomSecs.push(code);
        }
        if (nextRates[g][col][code] !== undefined || existingMatchedKeys.length > 0) {
          updated++;
        } else {
          inserted++;
        }
        nextRates[g][col][code] = Math.round(r.rate);
        existingMatchedKeys.forEach((mk) => {
          nextRates[g][col][mk] = Math.round(r.rate);
        });

        if (col === 'H23' || col === 'H.23' || col === 'PC-RAL') {
          if (!nextRates[g]['H23/PC-RAL']) nextRates[g]['H23/PC-RAL'] = {};
          nextRates[g]['H23/PC-RAL'][code] = Math.round(r.rate);
          if (col === 'H23') {
            if (!nextRates[g]['H.23']) nextRates[g]['H.23'] = {};
            nextRates[g]['H.23'][code] = Math.round(r.rate);
          } else if (col === 'H.23') {
            if (!nextRates[g]['H23']) nextRates[g]['H23'] = {};
            nextRates[g]['H23'][code] = Math.round(r.rate);
          }
        }
        if (col === 'SAHARA' || col === 'BROWN') {
          if (!nextRates[g]['SAHARA/BROWN']) nextRates[g]['SAHARA/BROWN'] = {};
          nextRates[g]['SAHARA/BROWN'][code] = Math.round(r.rate);
        }
        if (col === 'BLACK' || col === 'MULTI') {
          if (!nextRates[g]['BLACK/MULTI']) nextRates[g]['BLACK/MULTI'] = {};
          nextRates[g]['BLACK/MULTI'][code] = Math.round(r.rate);
        }
      });
    });

    const uniqueColors = Array.from(new Set(nextColors));
    const uniqueCustom = Array.from(new Set(nextCustomSecs));
    setRates(nextRates);
    setAvailableColors(uniqueColors);
    setCustomSections(uniqueCustom);
    persistRatesSnapshotToDevice(nextRates, glassRates, uniqueColors, uniqueCustom, hiddenSections);
    triggerGlobalToast(`✅ Updated ${updated} & added ${inserted} rates — saved to your device!`);
    return { updated, inserted };
  };

  const handleBulkAdjustRatesPct = (pct: number, gaugeFilter?: string, colorFilter?: string) => {
    if (!pct || Number.isNaN(pct)) return;
    const factor = 1 + pct / 100;
    const nextRates: Record<string, Record<string, Record<string, number>>> = JSON.parse(
      JSON.stringify(rates || {})
    );
    Object.keys(nextRates).forEach((g) => {
      if (gaugeFilter && gaugeFilter !== 'ALL' && g !== gaugeFilter) return;
      Object.keys(nextRates[g] || {}).forEach((c) => {
        if (colorFilter && colorFilter !== 'ALL' && c !== colorFilter) return;
        Object.keys(nextRates[g][c] || {}).forEach((sec) => {
          const cur = Number(nextRates[g][c][sec]) || 0;
          if (cur > 0) {
            nextRates[g][c][sec] = Math.max(1, Math.round(cur * factor));
          }
        });
      });
    });
    setRates(nextRates);
    persistRatesSnapshotToDevice(nextRates);
    triggerGlobalToast(
      `✅ Adjusted rates by ${pct > 0 ? '+' : ''}${pct}% & saved on your device!`
    );
  };

  const handleClearAllRates = () => {
    const allSecs = Array.from(new Set([...DEFAULT_SECTIONS, ...customSections]));
    const zeroed = getClearedZeroRates(allSecs, availableColors);
    setRates(zeroed);
    persistRatesSnapshotToDevice(zeroed);
    triggerGlobalToast('All Rate List prices have been cleared to 0!');
  };

  const handleRestoreDefaultRates = () => {
    const def = getInitialRates();
    setRates(def);
    persistRatesSnapshotToDevice(def);
    triggerGlobalToast('Factory Default Rate List restored & saved!');
  };

  // Backup Vault disabled in Client App (Client should not see Deleted Backup Restore vault)
  const handlePushBackupItem = (
    _item: Omit<DeletedBackupItem, 'id' | 'deletedAt'>
  ) => {
    return;
  };

  // Delete Section
  const handleDeleteSection = (sec: string) => {
    const clean = sec.trim();
    if (!clean) return;

    const nextRates = { ...rates };
    GAUGES.forEach((g) => {
      if (nextRates[g]) {
        availableColors.forEach((c) => {
          if (nextRates[g][c]) {
            Object.keys(nextRates[g][c]).forEach((k) => {
              if (isSectionCodeMatch(k, clean)) {
                delete nextRates[g][c][k];
              }
            });
          }
        });
      }
    });
    setRates(nextRates);

    const nextCustom = customSections.filter((s) => !isSectionCodeMatch(s, clean));
    setCustomSections(nextCustom);

    const nextHidden = !hiddenSections.some((s) => isSectionCodeMatch(s, clean))
      ? [...hiddenSections, clean]
      : hiddenSections;
    setHiddenSections(nextHidden);

    const curDeleted = layoutConfig.deletedSections || [];
    const nextDeleted = curDeleted.includes(clean) ? curDeleted : [...curDeleted, clean];
    const nextLayout = {
      ...layoutConfig,
      deletedSections: nextDeleted,
    };
    setLayoutConfig(nextLayout);

    triggerGlobalToast(`Deleted Section "${clean}"`);
  };

  // Edit Finish Color
  const handleEditColor = (oldCol: string, newCol: string) => {
    const oldClean = oldCol.trim().toUpperCase();
    const newClean = newCol.trim().toUpperCase();
    if (!oldClean || !newClean || oldClean === newClean) return;

    setAvailableColors((prev) =>
      prev.map((c) => (c === oldClean ? newClean : c))
    );
    setRates((prev) => {
      const next = { ...prev };
      GAUGES.forEach((g) => {
        if (next[g] && next[g][oldClean]) {
          next[g] = { ...next[g] };
          next[g][newClean] = { ...next[g][oldClean] };
          delete next[g][oldClean];
        }
      });
      return next;
    });
    if (ctxColor === oldClean) {
      setCtxColor(newClean);
    }
  };

  // Delete Finish Color + Save to Backup Vault
  const handleDeleteColor = (col: string) => {
    const clean = col.trim().toUpperCase();
    if (!clean) return;
    if (availableColors.length <= 1) {
      triggerGlobalToast('At least 1 finish color must remain active.');
      return;
    }
    const savedColorRates: Record<string, Record<string, number>> = {};
    GAUGES.forEach((g) => {
      savedColorRates[g] = { ...(rates[g]?.[clean] || {}) };
    });
    handlePushBackupItem({
      category: 'COLOR',
      title: `Finish Color: ${clean}`,
      codeOrKey: clean,
      payload: {
        colorName: clean,
        savedColorRates,
      },
    });
    const nextCols = availableColors.filter((c) => c !== clean);
    setAvailableColors(nextCols);
    if (ctxColor === clean && nextCols.length > 0) {
      setCtxColor(nextCols[0]);
    }
    triggerGlobalToast(`Deleted Color "${clean}"`);
  };

  // Add Separate 5mm or 8mm Glass Color
  const handleAddGlassColor = (gauge: string, colorName: string, rate: number) => {
    const clean = colorName.trim().toUpperCase();
    if (!clean) return;
    setGlassRates((prev) => ({
      ...prev,
      [gauge]: {
        ...(prev[gauge] || {}),
        [clean]: rate >= 0 ? rate : 0,
      },
    }));
    triggerGlobalToast(`Added ${gauge}mm Glass Color "${clean}" (Rs. ${rate}/sq.ft)`);
  };

  // Delete Separate 5mm or 8mm Glass Color
  const handleDeleteGlassColor = (gauge: string, colorName: string) => {
    const clean = colorName.trim();
    const curMap = { ...(glassRates[gauge] || {}) };
    if (Object.keys(curMap).length <= 1) {
      triggerGlobalToast(`At least 1 glass color must remain in ${gauge}mm Glass.`);
      return;
    }
    delete curMap[clean];
    setGlassRates((prev) => ({
      ...prev,
      [gauge]: curMap,
    }));
    const remainingKeys = Object.keys(curMap);
    if (ctxGlassGauge === gauge && ctxGlassColor === clean && remainingKeys.length > 0) {
      setCtxGlassColor(remainingKeys[0]);
    }
    triggerGlobalToast(`Deleted ${gauge}mm Glass "${clean}"`);
  };

  // Restore any Deleted Item from Backup Vault
  const handleRestoreBackupItem = (itemOrId: DeletedBackupItem | string) => {
    const item =
      typeof itemOrId === 'string'
        ? deletedBackupVault.find((x) => x.id === itemOrId)
        : itemOrId;
    if (!item) return;
    const p = item.payload || {};
    if (item.category === 'SECTION') {
      const secCode = p.sectionCode || item.codeOrKey;
      if (p.wasCustom && !customSections.includes(secCode)) {
        setCustomSections([...customSections, secCode]);
      }
      setHiddenSections(hiddenSections.filter((s) => s !== secCode));
      setLayoutConfig({
        ...layoutConfig,
        deletedSections: (layoutConfig.deletedSections || []).filter((s) => s !== secCode),
      });
      if (p.savedRates) {
        const nextRates = { ...rates };
        GAUGES.forEach((g) => {
          if (!nextRates[g]) nextRates[g] = {};
          availableColors.forEach((c) => {
            if (!nextRates[g][c]) nextRates[g][c] = {};
            if (p.savedRates[g]?.[c] !== undefined) {
              nextRates[g][c][secCode] = p.savedRates[g][c];
            }
          });
        });
        setRates(nextRates);
      }
    } else if (item.category === 'COLOR') {
      const colName = p.colorName || item.codeOrKey;
      if (!availableColors.includes(colName)) {
        setAvailableColors([...availableColors, colName]);
      }
      if (p.savedColorRates) {
        const nextRates = { ...rates };
        GAUGES.forEach((g) => {
          if (!nextRates[g]) nextRates[g] = {};
          if (p.savedColorRates[g]) {
            nextRates[g][colName] = { ...p.savedColorRates[g] };
          }
        });
        setRates(nextRates);
      }
    } else if (item.category === 'GLASS_5MM' || item.category === 'GLASS_8MM') {
      const g: '5' | '8' = item.category === 'GLASS_5MM' ? '5' : '8';
      const colName = p.colorName || item.codeOrKey;
      const r = typeof p.rate === 'number' ? p.rate : 220;
      setGlassRates((prev) => ({
        ...prev,
        [g]: {
          ...(prev[g] || {}),
          [colName]: r,
        },
      }));
    } else if (item.category === 'CALC_TAB') {
      const tabKey = item.codeOrKey as BossTab;
      const rawTitle =
        p.tabTitle ||
        item.title?.replace(/^App Tab:\s*/, '').replace(/\s*\([^)]*\)$/, '') ||
        tabKey;

      setLayoutConfig((prevCfg) => ({
        ...prevCfg,
        deletedTabs: (prevCfg.deletedTabs || []).filter((t) => t !== tabKey),
        enabledTabs: {
          ...(prevCfg.enabledTabs || {}),
          [tabKey]: true,
        },
        tabCustomTitles: {
          ...(prevCfg.tabCustomTitles || {}),
          [tabKey]: prevCfg.tabCustomTitles?.[tabKey] || rawTitle,
        },
      }));
    } else if (item.category === 'UI_CONTROL') {
      const ctrlKey = item.codeOrKey as keyof ClientAppLayoutControlConfig;
      setLayoutConfig((prev) => ({
        ...prev,
        [ctrlKey]: true,
      }));
    } else if (item.category === 'CALC_ITEM') {
      const kind = p.kind;
      const data = p.item;
      if (data) {
        if (kind === 'WINDOW') setWindows([data, ...windows]);
        else if (kind === 'SLIDING_DOOR') setSlidingDoors([data, ...slidingDoors]);
        else if (kind === 'DOOR') setDoors([data, ...doors]);
        else if (kind === 'FIX') setFixFrames([data, ...fixframes]);
        else if (kind === 'OPENWIN') setOpenableWindows([data, ...openableWindows]);
        else if (kind === 'EXTRA') setProjectExtras([data, ...projectExtras]);
      }
    }

    setDeletedBackupVault((prev) => prev.filter((x) => x.id !== item.id));
    triggerGlobalToast(`Restored "${item.title}" back to Calculator!`);
  };

  return (
    <div
      data-font-family={currentTheme.fontFamily || 'PLUS_JAKARTA'}
      data-btn-shape={currentTheme.buttonShape || 'PILL_3D'}
      data-btn-style={currentTheme.buttonShape || currentTheme.buttonStyle || 'PILL_3D'}
      data-table-style={currentTheme.tableStyle || 'COMPACT_WORKSHOP'}
      data-icon-pack={currentTheme.iconPack || 'BOLD_DUOTONE'}
      data-template={currentTheme.templateLayout || 'CLASSIC_GOLD'}
      className={`min-h-screen w-full max-w-full overflow-x-hidden bg-[#0F172A] text-[#F1F5F9] flex flex-col boss-theme-root ${
        currentTheme.isLight ? 'boss-theme-light' : ''
      }`}
    >
      {/* Global Toast Notification */}
      {globalToast && (
        <div className="max-w-[1440px] w-full mx-auto px-2.5 md:px-4 pt-2 no-print">
          <div className="px-3.5 py-2.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{globalToast}</span>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STRICT STARTUP & CLOUD ACCESS GATES (NO DIRECT DASHBOARD WHEN LOCKED)*/}
      {/* =================================================================== */}
      {(() => {
        const isOwnerBypass = Boolean(
          authSession &&
            isOwnerIdentity({
              email: authSession.email,
              phone: authSession.phone,
              cnic: authSession.cnic,
              masterCfg: loadCachedMasterEngineConfig(),
            })
        );
        if (!authSession?.verified) {
          return (
            <ClientAuthModal
              clientDeviceId={clientDeviceId}
              onAuthenticated={handleAuthenticated}
              externalNotice={authNotice}
              mainLogoUrl={mainLogoUrl}
            />
          );
        }
        if (!isOwnerBypass && cloudAccessInfo.status === 'BLOCKED') {
          return (
            <AccountBlockedLockModal
              authSession={authSession}
              clientDeviceId={clientDeviceId}
              blockReason={cloudAccessInfo.reason}
              isSyncing={isSyncingCloud}
              onRefreshStatus={() => syncFromSupabase({ forceRates: false, silent: false })}
              onLogout={handleLogout}
            />
          );
        }
        if (!isOwnerBypass && isSubscriptionExpired) {
          return (
            <SubscriptionExpiredLockModal
              authSession={authSession}
              clientDeviceId={clientDeviceId}
              packages={packages}
              bankAccounts={bankAccounts}
              activeOffer={activeOffer}
              expiresAt={cloudAccessInfo.expiresAt}
              isSyncing={isSyncingCloud}
              onRefreshCloudStatus={() => syncFromSupabase({ forceRates: false, silent: false })}
              onRefreshPackagesOnOpen={() => syncFromSupabase({ forceRates: false, silent: true })}
              onLogout={handleLogout}
              mainLogoUrl={mainLogoUrl}
            />
          );
        }
        return (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-2 pb-4 pt-1.5 md:p-4 overflow-x-hidden">
          <AppLayoutCalculatorScreen
          isInstalled={isInstalled}
          currentThemeName={currentTheme.name}
          onTriggerInstall={() => {
            setShowIosInstallGuide(false);
            setShowInstallModal(true);
          }}
          currentTab={currentCalcTab}
          onSelectTab={setCurrentCalcTab}
          ctxGauge={ctxGauge}
          ctxGaugeMode={ctxGaugeMode}
          onSetCtxGauge={(g, m) => {
            setCtxGauge(g);
            setCtxGaugeMode(m);
          }}
          ctxColor={ctxColor}
          onSetCtxColor={setCtxColor}
          ctxFrameType={ctxFrameType}
          onSetCtxFrameType={setCtxFrameType}
          ctxGlassMode={ctxGlassMode}
          ctxGlassGauge={ctxGlassGauge}
          ctxGlassColor={ctxGlassColor}
          onSetCtxGlass={(g, c, m) => {
            if (m === 'ON') {
              setCtxGlassGauge(g);
              setCtxGlassColor(c);
              setCtxGlassMode('ON');
            } else {
              setCtxGlassMode('OFF');
            }
          }}
          availableColors={availableColors}
          onAddColor={(col) => {
            const up = col.trim().toUpperCase();
            if (up && !availableColors.includes(up)) {
              setAvailableColors([...availableColors, up]);
            }
          }}
          onEditColor={handleEditColor}
          onDeleteColor={handleDeleteColor}
          customSections={customSections}
          onDeleteSection={handleDeleteSection}
          onAddCustomSection={(sec, rate) => {
            const clean = sec.trim().toUpperCase();
            if (!clean) return;
            const norm = normalizeSectionCode(clean);
            if (!customSections.some((s) => isSectionCodeMatch(s, clean))) {
              setCustomSections([...customSections, clean]);
            }
            if (rate > 0) {
              const next = { ...rates };
              GAUGES.forEach((g) => {
                if (!next[g]) next[g] = {};
                availableColors.forEach((c) => {
                  if (!next[g][c]) next[g][c] = {};
                  next[g][c][clean] = rate;
                  if (norm) {
                    Object.keys(next[g][c]).forEach((k) => {
                      if (normalizeSectionCode(k) === norm) {
                        next[g][c][k] = rate;
                      }
                    });
                  }
                });
              });
              setRates(next);
            }
          }}
          onAddCustomSectionPair={(s1, r1, s2, r2) => {
            const pairName = s2 && s2 !== s1 ? `${s1} / ${s2}` : s1;
            if (!customSections.includes(pairName)) {
              setCustomSections([...customSections, pairName]);
            }
            const next = { ...rates };
            GAUGES.forEach((g) => {
              if (!next[g]) next[g] = {};
              availableColors.forEach((c) => {
                if (!next[g][c]) next[g][c] = {};
                if (r1 > 0) next[g][c][s1] = r1;
                if (s2 && r2 > 0) next[g][c][s2] = r2;
              });
            });
            setRates(next);
            return pairName;
          }}
          windows={windows}
          onUpdateWindows={setWindows}
          dgWindows={dgWindows}
          onUpdateDgWindows={setDgWindows}
          doors={doors}
          onUpdateDoors={setDoors}
          fixframes={fixframes}
          onUpdateFixFrames={setFixFrames}
          openableWindows={openableWindows}
          onUpdateOpenableWindows={setOpenableWindows}
          slidingDoors={slidingDoors}
          onUpdateSlidingDoors={setSlidingDoors}
          projectExtras={projectExtras}
          onUpdateProjectExtras={setProjectExtras}
          rates={rates}
          onUpdateSectionRate={(g, c, sec, r) => {
            const normSec = normalizeSectionCode(sec);
            const updatedColorMap: Record<string, number> = {
              ...(rates[g]?.[c] || {}),
              [sec]: r,
            };
            if (normSec) {
              Object.keys(updatedColorMap).forEach((k) => {
                if (normalizeSectionCode(k) === normSec) {
                  updatedColorMap[k] = r;
                }
              });
            }
            const nextG = {
              ...(rates[g] || {}),
              [c]: updatedColorMap,
            };
            if (c === 'H.23') {
              nextG['H23'] = { ...(nextG['H23'] || {}), [sec]: r };
            } else if (c === 'H23') {
              nextG['H.23'] = { ...(nextG['H.23'] || {}), [sec]: r };
            }
            setRates({
              ...rates,
              [g]: nextG,
            });
          }}
          glassRates={glassRates}
          onUpdateGlassRate={(g, c, r) => {
            setGlassRates({
              ...glassRates,
              [g]: {
                ...(glassRates[g] || {}),
                [c]: r,
              },
            });
          }}
          onAddGlassColor={handleAddGlassColor}
          onDeleteGlassColor={handleDeleteGlassColor}
          onAddGlassGauge={(gm: string) => {
            const rawUpper = gm.trim().toUpperCase();
            const clean = rawUpper === 'DG' ? 'DG' : gm.replace(/[^0-9.]/g, '').trim();
            if (!clean) return;
            setGlassRates((prev) => {
              if (prev[clean]) return prev;
              return {
                ...prev,
                [clean]:
                  clean === 'DG'
                    ? { CLEAR: 450, GREEN: 480, BLUE: 500, FROSTED: 650 }
                    : { CLEAR: 260, GREEN: 290, BLUE: 300 },
              };
            });
            triggerGlobalToast(
              clean === 'DG' ? 'Added DG Glass Gauge!' : `Added ${clean}mm Glass Gauge!`
            );
          }}
          onDeleteGlassGauge={(gm: string) => {
            setGlassRates((prev) => {
              const keys = Object.keys(prev || {});
              if (keys.length <= 1) {
                triggerGlobalToast('At least 1 glass gauge must remain.');
                return prev;
              }
              const next = { ...prev };
              delete next[gm];
              return next;
            });
          }}
          deletedBackupVault={deletedBackupVault}
          onAddBackupItem={handlePushBackupItem}
          onRestoreBackupItem={handleRestoreBackupItem}
          hiddenSections={hiddenSections}
          onToggleHideSection={(sec) => {
            setHiddenSections(
              hiddenSections.some((s) => isSectionCodeMatch(s, sec))
                ? hiddenSections.filter((s) => !isSectionCodeMatch(s, sec))
                : [...hiddenSections, sec]
            );
          }}
          onUnhideAllSections={() => setHiddenSections([])}
          windowFormula={windowFormula}
          dgWindowFormula={dgWindowFormula}
          slidingDoorFormula={slidingDoorFormula}
          doorFormula={doorFormula}
          fixFormula={fixFormula}
          openwinFormula={openwinFormula}
          fSectionFormula={fSectionFormula}
          glassFormulas={glassFormulas}
          measurementUnit={measurementUnit}
          onSetMeasurementUnit={setMeasurementUnit}
          glassFittingOption={glassFittingOption}
          onSetGlassFittingOption={setGlassFittingOption}
          companyName={companyName}
          companyTagline={companyTagline}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          companyNtn={companyNtn}
          onUpdateCompanyInfo={(info) => {
            setCompanyName(info.name);
            setCompanyTagline(info.tagline);
            setCompanyAddress(info.address);
            setCompanyPhone(info.phone);
            setCompanyNtn(info.ntn);
          }}
          customerName={customerName}
          customerPhone={customerPhone}
          onSetCustomerInfo={(n, p) => {
            setCustomerName(n);
            setCustomerPhone(p);
          }}
          hardwareRate={hardwareRate}
          markupPct={markupPct}
          transportRent={transportRent}
          labourCost={labourCost}
          onUpdateDefaults={(hw, mp, tr, lc) => {
            setHardwareRate(hw);
            setMarkupPct(mp);
            setTransportRent(tr);
            setLabourCost(lc);
          }}
          savedQuotations={savedQuotations}
          onSaveQuotationHistory={(q) => {
            setSavedQuotations([q, ...savedQuotations]);
            triggerGlobalToast('Quotation saved to History!');
          }}
          onDeleteQuotationHistory={(id) =>
            setSavedQuotations(savedQuotations.filter((q) => q.id !== id))
          }
          onRestoreQuotation={(q) => {
            try {
              if (q.windowsJson) setWindows(JSON.parse(q.windowsJson));
              if (q.dgWindowsJson) setDgWindows(JSON.parse(q.dgWindowsJson));
              else setDgWindows([]);
              if (q.doorsJson) setDoors(JSON.parse(q.doorsJson));
              if (q.fixframesJson) setFixFrames(JSON.parse(q.fixframesJson));
              if (q.openableWindowsJson) setOpenableWindows(JSON.parse(q.openableWindowsJson));
              if (q.slidingDoorsJson) setSlidingDoors(JSON.parse(q.slidingDoorsJson));
              setCustomerName(q.customerName);
              setCustomerPhone(q.customerPhone);
              setCurrentCalcTab('QUOTATION');
              triggerGlobalToast(`Restored "${q.label}" into Calculator!`);
            } catch {
              // ignore parse error
            }
          }}
          onClearAllRates={handleClearAllRates}
          onRestoreDefaultRates={handleRestoreDefaultRates}
          onOpenThemeStudio={() => setShowThemeStudio(true)}
          mainLogoUrl={mainLogoUrl}
          letterheadBgUrl={letterheadBgUrl}
          isCustomLetterhead={isCustomLetterhead}
          onUpdateLetterheadBgUrl={(url) => {
            setCustomLetterheadBgUrl(String(url || '').trim());
          }}
          onRestoreDefaultBrandingAssets={() => {
            setCustomLetterheadBgUrl('');
            setLayoutConfig((prev) => ({
              ...prev,
              showLetterheadBackground: true,
              backgroundFitStyle: 'FILL',
              letterheadFitMode: 'STRETCH',
            }));
          }}
          rateListSavedAt={rateListSavedAt}
          onSaveRatesToDevice={handleSaveRatesToDevice}
          onApplyRateListRows={handleApplyRateListRows}
          onBulkAdjustRatesPct={handleBulkAdjustRatesPct}
          layoutConfig={layoutConfig}
          userLockedTabs={userLockedTabs}
          onUpdateLayoutConfig={setLayoutConfig}
          onExportFullBackup={() => {
            const raw = localStorage.getItem(STORAGE_KEY) || '{}';
            const blob = new Blob([raw], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `boss_aluminium_backup_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImportFullBackup={(jsonStr) => {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.windowFormula) setWindowFormula(parsed.windowFormula);
              if (parsed.dgWindowFormula) setDgWindowFormula(parsed.dgWindowFormula);
              if (parsed.rates) setRates(parsed.rates);
              if (parsed.packages) setPackages(parsed.packages);
              if (parsed.layoutConfig) setLayoutConfig(parsed.layoutConfig);
              if (typeof parsed.customLetterheadBgUrl === 'string') {
                setCustomLetterheadBgUrl(parsed.customLetterheadBgUrl.trim());
              }
              if (typeof parsed.adminLetterheadBgUrl === 'string' && parsed.adminLetterheadBgUrl.trim()) {
                setAdminLetterheadBgUrl(parsed.adminLetterheadBgUrl.trim());
              }
              return true;
            } catch {
              return false;
            }
          }}
          activeOffer={activeOffer}
          broadcasts={broadcasts}
          mobileDownloadConfig={mobileDownloadConfig}
          onSaveOffer={setActiveOffer}
          packages={packages}
          onUpdatePackages={setPackages}
          bankAccounts={bankAccounts}
          clientDeviceId={clientDeviceId}
          isSyncingCloud={isSyncingCloud}
          cloudAccessInfo={cloudAccessInfo}
          authSession={authSession}
          onLogout={handleLogout}
          onAccountDeletedLogout={handleAccountDeletedLogout}
          onSyncFromSupabase={syncFromSupabase}
          onSyncUserProfileToCloud={handleSyncUserProfileToCloud}
          supportRequests={supportRequests}
          isSubmittingSupportRequest={isSubmittingSupportRequest}
          onSubmitSupportRequest={handleSubmitSupportRequest}
          onRefreshSupportRequests={() => loadSupportRequests()}
          onDeleteSupportRequest={handleDeleteSupportRequest}
          onClearAllSupportRequests={handleClearAllSupportRequests}
          lastSeenSupportMs={lastSeenSupportMs}
          onMarkSupportMessagesRead={handleMarkSupportMessagesRead}
          isOnline={isOnline}
        />
        </main>
        );
      })()}

      {/* Mobile Theme Studio & Online Cloud Theme Store Modal */}
      {showThemeStudio && (
        <ThemeStudioModal
          currentTheme={currentTheme}
          downloadedThemes={downloadedThemes}
          onApplyTheme={(thm) => {
            const safe = enforceReadableContrast(thm);
            setCurrentTheme(safe);
            triggerGlobalToast(
              `Theme Engine Applied: "${safe.name}" [Font: ${safe.fontFamily} · Buttons: ${safe.buttonShape} · Tables: ${safe.tableStyle} · Icons: ${safe.iconPack}]`
            );
          }}
          onDownloadTheme={(thm) => {
            if (!downloadedThemes.some((d) => d.id === thm.id)) {
              const updated = [thm, ...downloadedThemes];
              setDownloadedThemes(updated);
              try {
                localStorage.setItem('boss_downloaded_themes', JSON.stringify(updated));
              } catch {}
              triggerGlobalToast(`Downloaded & Saved Theme: "${thm.name}"`);
            }
          }}
          onClose={() => setShowThemeStudio(false)}
        />
      )}

      {/* Download / Install App Modal (Desktop, Android, iPhone & Frame Breakout) */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto no-print">
          <div className="bg-[#0C1017] border-2 border-[#F5B738] rounded-2xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#F5B738] text-black flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-[#F5B738] truncate">
                    Download &amp; Install Boss App
                  </h3>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    Windows PC · Android Mobile · Apple iPhone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="boss-flat-btn w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close install dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons: Android APK / Windows EXE / Apple iPhone iPad (iOS) Guide */}
            {(() => {
              const androidDownloadUrl =
                mobileDownloadConfig?.androidUrl || mobileDownloadConfig?.androidApkUrl || '';
              const windowsDownloadUrl = mobileDownloadConfig?.windowsUrl || '';

              return (
                <div className="space-y-2">
                  {/* Android APK Download Button */}
                  {androidDownloadUrl ? (
                    <a
                      href={androidDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>
                        Download Android App (.apk)
                        {mobileDownloadConfig?.androidVersion
                          ? ` · v${mobileDownloadConfig.androidVersion}`
                          : ''}
                      </span>
                    </a>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-[#14181F] border border-emerald-500/30 text-emerald-300/80 font-bold text-[11px] flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Download Android App (.apk)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Admin Sync Pending</span>
                    </div>
                  )}

                  {/* Windows Setup (.exe) Download Button */}
                  {windowsDownloadUrl ? (
                    <a
                      href={windowsDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Monitor className="w-4 h-4" />
                      <span>
                        Download Windows Setup (.exe)
                        {mobileDownloadConfig?.windowsVersion
                          ? ` · v${mobileDownloadConfig.windowsVersion}`
                          : ''}
                      </span>
                    </a>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-[#14181F] border border-indigo-500/30 text-indigo-300/80 font-bold text-[11px] flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Download Windows Setup (.exe)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Admin Sync Pending</span>
                    </div>
                  )}

                  {/* Apple iPhone / iPad (iOS) Inline Visual Guide Button (Never opens new tab) */}
                  <button
                    type="button"
                    onClick={() => setShowIosInstallGuide((prev) => !prev)}
                    className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      Apple iPhone / iPad (iOS)
                      {mobileDownloadConfig?.iosVersion
                        ? ` · v${mobileDownloadConfig.iosVersion}`
                        : ''}
                    </span>
                  </button>

                  {showIosInstallGuide && (
                    <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-400/70 text-sky-100 text-[11.5px] leading-relaxed space-y-1.5">
                      <div className="font-black text-sky-300 text-xs">
                        iPhone / iPad Par App Install Karne Ka Tarika:
                      </div>
                      <p>
                        Browser ke Share (⬆️) icon par tap karein → &apos;Add to Home Screen&apos; chunein → &apos;Add&apos; dabayein.
                      </p>
                    </div>
                  )}

                  {mobileDownloadConfig?.releaseNotes && (
                    <div className="p-2 rounded-lg bg-[#14181F] border border-slate-800 text-[10.5px] text-slate-300">
                      <strong className="text-[#F5B738]">Update Notes:</strong>{' '}
                      {mobileDownloadConfig.releaseNotes}
                    </div>
                  )}
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="boss-flat-btn w-full py-2 rounded-xl bg-[#1C222B] hover:bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
