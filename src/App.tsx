import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
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
  DoorItem,
  DragDropBlueprint,
  ExtraPiece,
  FixFrameItem,
  FormulaCategorySettings,
  FSectionFormula,
  GlassFormula,
  MeasurementUnit,
  OpenableWindowItem,
  SavedQuotation,
  SlidingDoorFormulaSettings,
  SlidingDoorItem,
  SubscriptionPackage,
  WindowFormulaSettings,
  WindowItem,
} from './types/bossModels';
import { callSupabaseProxy } from './utils/supabaseClientConfig';
import {
  DEFAULT_COLORS,
  DEFAULT_SECTIONS,
  GAUGES,
  getClearedZeroRates,
  getDefaultCategoryFormula,
  getDefaultFSectionFormula,
  getDefaultGlassFormulas,
  getDefaultLayoutControlConfig,
  getDefaultSlidingDoorFormula,
  getDefaultWindowFormula,
  getInitialGlassRates,
  getInitialRates,
  getStarterBankAccounts,
  getStarterBlueprints,
  getStarterPackages,
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
  clearAuthSession,
  ClientAuthSession,
  evaluateClientAccessState,
  getOrCreateClientDeviceId,
  loadAuthSession,
  saveAuthSession,
} from './utils/adminApiConfig';

const STORAGE_KEY = 'boss_aluminium_master_web_state_v1';
const DEVICE_RATES_KEY = 'boss_client_device_rates_v1';

export default function App() {
  const [authSession, setAuthSession] = useState<ClientAuthSession | null>(() =>
    loadAuthSession()
  );
  const [authNotice, setAuthNotice] = useState<string | null>(null);
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
  const [availableColors, setAvailableColors] = useState<string[]>(DEFAULT_COLORS);
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

  // Project Calculator Items
  const [windows, setWindows] = useState<WindowItem[]>([
    {
      id: 'win-starter-1',
      width: 48,
      height: 60,
      qty: 1,
      frameType: 'C',
      sectionGauge: '1.6',
      glassGauge: '5',
      glassColor: 'CLEAR',
      glassEnabled: true,
      m24Qty: 4,
      m24aQty: 0,
      d29HeightQty: 2,
      d29WidthQty: 2,
      extras: [],
      outerSection: 'DC30C',
      panelCount: 2,
      lockType: 'LATCH',
    },
  ]);
  const [doors, setDoors] = useState<DoorItem[]>([
    {
      id: 'door-starter-1',
      width: 36,
      height: 84,
      qty: 1,
      outer: 'D54A',
      sectionGauge: '1.6',
      glassGauge: '5',
      glassColor: 'CLEAR',
      glassEnabled: true,
      d59Qty: 0,
      d59aQty: 0,
      d52Qty: 1,
      extras: [],
    },
  ]);
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
  const [customerName, setCustomerName] = useState('Tariq Mehmood');
  const [customerPhone, setCustomerPhone] = useState('0300-4419283');
  const [hardwareRate, setHardwareRate] = useState<number>(3000);
  const [markupPct, setMarkupPct] = useState<number>(0);
  const [transportRent, setTransportRent] = useState<number>(0);
  const [labourCost, setLabourCost] = useState<number>(0);
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([]);

  // Blueprints, Packages, Bank Accounts & Layout Config
  const [blueprints, setBlueprints] = useState<DragDropBlueprint[]>(() =>
    getStarterBlueprints()
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccountConfig[]>(() =>
    getStarterBankAccounts()
  );
  const [activeOffer, setActiveOffer] = useState<AppOfferBanner | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>(() => getStarterPackages());
  const [layoutConfig, setLayoutConfig] = useState<ClientAppLayoutControlConfig>(() =>
    getDefaultLayoutControlConfig()
  );
  const mainLogoUrl = bossLionLogoImg;
  const [letterheadBgUrl, setLetterheadBgUrl] = useState<string>(bossLetterheadCleanImg);
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

  // Live Supabase Cloud Sync & Access State
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudAccessInfo, setCloudAccessInfo] = useState<{
    status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
    tier: string;
    expiresAt: number | null;
    reason: string;
    lastSyncedAt: number | null;
  }>({
    status: 'TRIAL',
    tier: 'CLIENT',
    expiresAt: null,
    reason: '',
    lastSyncedAt: null,
  });

  // Client Support Team Requests State
  const [supportRequests, setSupportRequests] = useState<ClientSupportRequest[]>([]);
  const [isSubmittingSupportRequest, setIsSubmittingSupportRequest] = useState(false);

  // PWA Install & Mobile Theme Studio State
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isPromptingInstallRef = useRef(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
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

  const syncFromSupabase = async (options?: {
    forceRates?: boolean;
    silent?: boolean;
    sessionOverride?: ClientAuthSession | null;
  }) => {
    const forceRates = Boolean(options?.forceRates);
    const silent = Boolean(options?.silent);
    const activeSession =
      options?.sessionOverride !== undefined ? options.sessionOverride : authSession;
    setIsSyncingCloud(true);
    try {
      const [cfgRes, usersRes, clientUsersRes, subsRes] = await Promise.all([
        callSupabaseProxy({
          table: 'app_configs',
          method: 'GET',
          query:
            'id=in.(global_config,master_engine_config,aluminium_rates_v1,custom_sections_v1,formulas_v1,blueprints_v1,layout_config_v1,company_branding_v1)&select=id,value',
        }),
        callSupabaseProxy({
          table: 'users',
          method: 'GET',
          query: 'select=*&limit=250',
        }),
        callSupabaseProxy({
          table: 'client_users',
          method: 'GET',
          query: 'select=*&limit=250',
        }),
        callSupabaseProxy({
          table: 'subscriptions',
          method: 'GET',
          query: 'select=*&limit=250',
        }),
      ]);

      const cfgMap: Record<string, any> = {};
      if (cfgRes.ok && Array.isArray(cfgRes.data)) {
        cfgRes.data.forEach((row: any) => {
          if (row?.id && row?.value) {
            cfgMap[row.id] = row.value;
          }
        });
      }

      const globalCfg = {
        ...(cfgMap.global_config || {}),
        ...(cfgMap.master_engine_config || {}),
      };
      const ratesCfg = cfgMap.aluminium_rates_v1 || {};
      const sectionsCfg = cfgMap.custom_sections_v1 || {};
      const formulasCfg = cfgMap.formulas_v1 || {};
      const blueprintsCfg = cfgMap.blueprints_v1 || {};
      const layoutCfg = cfgMap.layout_config_v1 || {};

      // 1. Packages, Bank Accounts & Active Offer/Banner
      if (Array.isArray(globalCfg.packages) && globalCfg.packages.length > 0) {
        setPackages(globalCfg.packages);
      }
      if (Array.isArray(globalCfg.bankAccounts) && globalCfg.bankAccounts.length > 0) {
        setBankAccounts(globalCfg.bankAccounts);
      }
      if (globalCfg.activeOffer || globalCfg.activeBanner) {
        setActiveOffer(globalCfg.activeOffer || globalCfg.activeBanner);
      }

      // 2. Complete Formulas Sync (Admin master_engine_config + formulas_v1 aliases)
      const winF = formulasCfg.windowFormula || globalCfg.windowFormula || globalCfg.winFormulas;
      if (winF) setWindowFormula(winF);
      const sdF =
        formulasCfg.slidingDoorFormula ||
        globalCfg.slidingDoorFormula ||
        globalCfg.slidingDoorFormulas;
      if (sdF) setSlidingDoorFormula(sdF);
      const dF = formulasCfg.doorFormula || globalCfg.doorFormula || globalCfg.doorFormulas;
      if (dF) setDoorFormula(dF);
      const fF = formulasCfg.fixFormula || globalCfg.fixFormula || globalCfg.fixFormulas;
      if (fF) setFixFormula(fF);
      const opF =
        formulasCfg.openwinFormula ||
        globalCfg.openwinFormula ||
        globalCfg.openableWinFormulas;
      if (opF) setOpenwinFormula(opF);
      const fsF = formulasCfg.fSectionFormula || globalCfg.fSectionFormula;
      if (fsF) setFSectionFormula(fsF);
      const glF = formulasCfg.glassFormulas || globalCfg.glassFormulas;
      if (glF && typeof glF === 'object') setGlassFormulas(glF);

      // 3. Sections, Colors & Blueprints
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
        setAvailableColors(incomingCols);
      }
      const incomingHidden = sectionsCfg.hiddenSections || globalCfg.hiddenSections;
      if (Array.isArray(incomingHidden)) {
        setHiddenSections(incomingHidden);
      }
      const rawBps =
        (Array.isArray(blueprintsCfg) ? blueprintsCfg : blueprintsCfg.blueprints) ||
        globalCfg.dragDropBlueprints ||
        globalCfg.blueprints;
      if (Array.isArray(rawBps) && rawBps.length > 0) {
        setBlueprints(rawBps);
      }

      // 4. Layout config (merge layout_config_v1 UI controls + master_engine_config security flags, preserve client shopLogoUrl)
      const incomingLayout = {
        ...((layoutCfg?.layoutConfig || layoutCfg || {}) as Record<string, any>),
        ...((globalCfg?.layoutConfig || {}) as Record<string, any>),
      };
      if (incomingLayout && typeof incomingLayout === 'object' && incomingLayout.enabledTabs) {
        setLayoutConfig((prev) => ({
          ...prev,
          ...incomingLayout,
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
          });
        });
        setRates(mergedRates);
        if (forceRates) {
          persistRatesSnapshotToDevice(mergedRates, cloudGlassRates || glassRates);
        }
      }
      if (shouldApplyCloudRates && cloudGlassRates && typeof cloudGlassRates === 'object') {
        setGlassRates((prev) => ({ ...prev, ...cloudGlassRates }));
      }

      // 6. Live Admin Access Control (Block, RESET_ Device Logout, VIP, Trial Extension, Expiry Lock)
      const usersList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const clientUsersList = Array.isArray(clientUsersRes.data) ? clientUsersRes.data : [];
      const subsList = Array.isArray(subsRes.data) ? subsRes.data : [];

      const evaluated = evaluateClientAccessState({
        session: activeSession,
        clientDeviceId,
        usersList,
        clientUsersList,
        subsList,
        masterCfg: globalCfg,
      });

      if (evaluated.forceResetLogout) {
        clearAuthSession();
        setAuthSession(null);
        setIsSubscriptionExpired(false);
        setAuthNotice('Admin ne aapka Device Reset kiya hai — dobara Login karein.');
        return true;
      }

      setCloudAccessInfo({
        status: evaluated.status,
        tier: evaluated.tier,
        expiresAt: evaluated.expiresAt,
        reason: evaluated.reason,
        lastSyncedAt: Date.now(),
      });
      setIsSubscriptionExpired(evaluated.isExpired);

      if (!silent) {
        triggerGlobalToast(
          forceRates
            ? '☁️ Rates, Plans & Formulas synced from Supabase Cloud!'
            : '☁️ Supabase Cloud sync complete!'
        );
      }
      return true;
    } catch {
      if (!silent) {
        triggerGlobalToast('⚠️ Could not reach Supabase Cloud (using local/device data).');
      }
      return false;
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const loadSupportRequests = async () => {
    try {
      const resp = await fetch(
        `/api/support-requests?deviceId=${encodeURIComponent(clientDeviceId)}`
      );
      const data = await resp.json();
      if (data?.ok && Array.isArray(data.requests)) {
        setSupportRequests(data.requests);
      }
    } catch {
      // ignore offline load error
    }
  };

  const handleSubmitSupportRequest = async (payload: {
    userName: string;
    userPhone: string;
    userEmail: string;
    requestType: string;
    message: string;
  }) => {
    setIsSubmittingSupportRequest(true);
    try {
      const resp = await fetch('/api/support-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: clientDeviceId,
          ...payload,
        }),
      });
      const data = await resp.json();
      const createdReq: ClientSupportRequest =
        resp.ok && data?.ok && data.request
          ? data.request
          : {
              id: `req-${Date.now()}`,
              deviceId: clientDeviceId,
              userName: payload.userName,
              userPhone: payload.userPhone,
              userEmail: payload.userEmail,
              requestType: payload.requestType,
              message: payload.message,
              createdAt: Date.now(),
              isResolved: false,
            };

      // Also sync request to Supabase app_configs.client_support_requests_v1 for Admin visibility
      try {
        const existingCfg = await callSupabaseProxy({
          table: 'app_configs',
          method: 'GET',
          query: 'id=eq.client_support_requests_v1&select=value',
          timeoutMs: 6000,
        });
        const curRequests =
          Array.isArray(existingCfg.data) && Array.isArray(existingCfg.data[0]?.value?.requests)
            ? existingCfg.data[0].value.requests
            : [];
        await callSupabaseProxy({
          table: 'app_configs',
          method: 'POST',
          upsert: true,
          payload: {
            id: 'client_support_requests_v1',
            value: {
              requests: [createdReq, ...curRequests].slice(0, 200),
              updatedAt: Date.now(),
            },
          },
          timeoutMs: 6000,
        });
      } catch {
        // ignore cloud support mirror failure
      }

      setSupportRequests((prev) => [createdReq, ...prev]);
      triggerGlobalToast('✅ Request sent to Support Team!');
      return true;
    } catch {
      triggerGlobalToast('Network error sending request. Try WhatsApp support.');
      return false;
    } finally {
      setIsSubmittingSupportRequest(false);
    }
  };

  const handleAuthenticated = async (session: ClientAuthSession) => {
    setClientDeviceId(session.deviceId);
    saveAuthSession(session);
    setAuthSession(session);
    setAuthNotice(null);
    setIsSubscriptionExpired(false);
    await syncFromSupabase({ forceRates: false, silent: true, sessionOverride: session });
    loadSupportRequests();
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
    setIsSubscriptionExpired(false);
    setCloudAccessInfo({
      status: 'TRIAL',
      tier: 'CLIENT',
      expiresAt: null,
      reason: '',
      lastSyncedAt: null,
    });
    setAuthNotice('Aap logout ho chuke hain. Dobara Login karein.');
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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.windowFormula) setWindowFormula(parsed.windowFormula);
        if (parsed.slidingDoorFormula) setSlidingDoorFormula(parsed.slidingDoorFormula);
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
        if (parsed.fSectionFormula) setFSectionFormula(parsed.fSectionFormula);
        if (parsed.blueprints?.length) setBlueprints(parsed.blueprints);
        if (parsed.savedQuotations) setSavedQuotations(parsed.savedQuotations);
        if (parsed.rates) {
          setRates(parsed.rates);
        } else {
          setRates(getInitialRates());
        }
        if (parsed.packages?.length) setPackages(parsed.packages);
        if (parsed.layoutConfig) setLayoutConfig(parsed.layoutConfig);
        if (parsed.letterheadBgUrl) setLetterheadBgUrl(parsed.letterheadBgUrl);
        if (parsed.currentTheme) setCurrentTheme(enforceReadableContrast(parsed.currentTheme));
        if (parsed.downloadedThemes) setDownloadedThemes(parsed.downloadedThemes);
        if (parsed.deletedBackupVault) setDeletedBackupVault(parsed.deletedBackupVault);
        if (parsed.glassRates) setGlassRates(parsed.glassRates);
        if (parsed.availableColors?.length) setAvailableColors(parsed.availableColors);
        if (parsed.customSections) setCustomSections(parsed.customSections);
        if (parsed.hiddenSections) setHiddenSections(parsed.hiddenSections);
        if (typeof parsed.hardwareRate === 'number') setHardwareRate(parsed.hardwareRate);
        if (typeof parsed.markupPct === 'number') setMarkupPct(parsed.markupPct);
        if (typeof parsed.transportRent === 'number') setTransportRent(parsed.transportRent);
        if (typeof parsed.labourCost === 'number') setLabourCost(parsed.labourCost);
      }

      // Also check dedicated device rate list snapshot if main storage lacked rates
      const devRaw = localStorage.getItem(DEVICE_RATES_KEY);
      if (devRaw) {
        const devParsed = JSON.parse(devRaw);
        if (!raw && devParsed.rates) setRates(devParsed.rates);
        if (!raw && devParsed.glassRates) setGlassRates(devParsed.glassRates);
        if (!raw && devParsed.availableColors?.length) setAvailableColors(devParsed.availableColors);
        if (!raw && devParsed.customSections) setCustomSections(devParsed.customSections);
        if (!raw && devParsed.hiddenSections) setHiddenSections(devParsed.hiddenSections);
        if (typeof devParsed.savedAt === 'number') setRateListSavedAt(devParsed.savedAt);
      }
    } catch {
      // ignore storage errors
    }

    // Sync cloud configs & access status only if verified session exists
    if (loadAuthSession()) {
      syncFromSupabase({ forceRates: false, silent: true });
      loadSupportRequests();
    }
  }, []);

  // Live 45-second background polling of Admin Panel Cloud Status (Block, RESET_ Logout, VIP, Expiry Lock, Formulas)
  useEffect(() => {
    if (!authSession?.verified) return;
    const pollId = setInterval(() => {
      syncFromSupabase({ forceRates: false, silent: true });
    }, 45000);
    return () => clearInterval(pollId);
  }, [authSession?.verified, authSession?.phone, clientDeviceId]);

  // Sync Main Logo to Browser Favicon (keep PNG apple-touch-icon intact for iOS Safari)
  useEffect(() => {
    if (!mainLogoUrl) return;
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

  // Persist key state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          windowFormula,
          slidingDoorFormula,
          doorFormula,
          fixFormula,
          openwinFormula,
          fSectionFormula,
          glassFormulas,
          blueprints,
          savedQuotations,
          rates,
          packages,
          layoutConfig,
          letterheadBgUrl,
          currentTheme,
          downloadedThemes,
          deletedBackupVault,
          glassRates,
          availableColors,
          customSections,
          hiddenSections,
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
    slidingDoorFormula,
    doorFormula,
    fixFormula,
    openwinFormula,
    fSectionFormula,
    glassFormulas,
    blueprints,
    savedQuotations,
    rates,
    packages,
    layoutConfig,
    letterheadBgUrl,
    currentTheme,
    downloadedThemes,
    deletedBackupVault,
    glassRates,
    availableColors,
    customSections,
    hiddenSections,
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
        if (!DEFAULT_SECTIONS.includes(code) && !nextCustomSecs.includes(code)) {
          nextCustomSecs.push(code);
        }
        if (nextRates[g][col][code] !== undefined) {
          updated++;
        } else {
          inserted++;
        }
        nextRates[g][col][code] = Math.round(r.rate);

        if (col === 'H23' || col === 'PC-RAL') {
          if (!nextRates[g]['H23/PC-RAL']) nextRates[g]['H23/PC-RAL'] = {};
          nextRates[g]['H23/PC-RAL'][code] = Math.round(r.rate);
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

  // Backup Vault Helper
  const handlePushBackupItem = (
    item: Omit<DeletedBackupItem, 'id' | 'deletedAt'>
  ) => {
    const entry: DeletedBackupItem = {
      ...item,
      id: `bkp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deletedAt: Date.now(),
    };
    setDeletedBackupVault((prev) => [entry, ...prev]);
  };

  // Delete Section + Save to Backup Vault
  const handleDeleteSection = (sec: string) => {
    const clean = sec.trim();
    if (!clean) return;
    const savedRates: Record<string, Record<string, number>> = {};
    GAUGES.forEach((g) => {
      savedRates[g] = {};
      availableColors.forEach((c) => {
        savedRates[g][c] = rates[g]?.[c]?.[clean] || 0;
      });
    });
    handlePushBackupItem({
      category: 'SECTION',
      title: `Aluminium Section: ${clean}`,
      codeOrKey: clean,
      payload: {
        sectionCode: clean,
        wasCustom: customSections.includes(clean),
        savedRates,
      },
    });

    const nextRates = { ...rates };
    GAUGES.forEach((g) => {
      if (nextRates[g]) {
        availableColors.forEach((c) => {
          if (nextRates[g][c] && clean in nextRates[g][c]) {
            delete nextRates[g][c][clean];
          }
        });
      }
    });
    setRates(nextRates);

    const nextCustom = customSections.filter((s) => s !== clean);
    setCustomSections(nextCustom);

    const nextHidden = !hiddenSections.includes(clean) ? [...hiddenSections, clean] : hiddenSections;
    setHiddenSections(nextHidden);

    const curDeleted = layoutConfig.deletedSections || [];
    const nextDeleted = curDeleted.includes(clean) ? curDeleted : [...curDeleted, clean];
    const nextLayout = {
      ...layoutConfig,
      deletedSections: nextDeleted,
    };
    setLayoutConfig(nextLayout);

    triggerGlobalToast(`Deleted Section "${clean}" (Saved in Backup Vault)`);
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
    triggerGlobalToast(`Deleted Color "${clean}" (Saved in Backup Vault for Restore)`);
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

  // Delete Separate 5mm or 8mm Glass Color + Save to Backup Vault
  const handleDeleteGlassColor = (gauge: string, colorName: string) => {
    const clean = colorName.trim();
    const curMap = { ...(glassRates[gauge] || {}) };
    if (Object.keys(curMap).length <= 1) {
      triggerGlobalToast(`At least 1 glass color must remain in ${gauge}mm Glass.`);
      return;
    }
    const oldRate = curMap[clean] ?? 0;
    handlePushBackupItem({
      category: gauge === '5' ? 'GLASS_5MM' : 'GLASS_8MM',
      title: `${gauge}mm Glass Color: ${clean} (Rs. ${oldRate}/sq.ft)`,
      codeOrKey: clean,
      payload: {
        gauge,
        colorName: clean,
        rate: oldRate,
      },
    });
    delete curMap[clean];
    setGlassRates((prev) => ({
      ...prev,
      [gauge]: curMap,
    }));
    const remainingKeys = Object.keys(curMap);
    if (ctxGlassGauge === gauge && ctxGlassColor === clean && remainingKeys.length > 0) {
      setCtxGlassColor(remainingKeys[0]);
    }
    triggerGlobalToast(
      `Deleted ${gauge}mm Glass "${clean}" (Saved in Backup Vault for Restore)`
    );
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

      if (tabKey.startsWith('BP:') || p.blueprint) {
        const bpId = tabKey.startsWith('BP:') ? tabKey.slice(3) : p.blueprint?.id;
        const bpName = p.blueprint?.name || rawTitle;
        const bpToRestore: DragDropBlueprint = p.blueprint || {
          id: bpId,
          name: bpName,
          category: 'CUSTOM',
          outerSectionCode: 'DC30C',
          panelCount: 2,
          hasNetJali: false,
          lockType: 'LATCH',
          layers: [],
          formulaRules: [],
          unit: 'INCH',
          createdAt: Date.now(),
        };
        setBlueprints((prevBps) => {
          if (prevBps.some((b) => b.id === bpToRestore.id)) return prevBps;
          return [bpToRestore, ...prevBps];
        });
      }

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
    } else if (item.category === 'BLUEPRINT') {
      const bpData = p.blueprint || p;
      if (bpData?.id) {
        setBlueprints((prevBps) => {
          if (prevBps.some((b) => b.id === bpData.id)) return prevBps;
          return [bpData, ...prevBps];
        });
      }
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
      {!authSession?.verified ? (
        <ClientAuthModal
          clientDeviceId={clientDeviceId}
          onAuthenticated={handleAuthenticated}
          externalNotice={authNotice}
        />
      ) : cloudAccessInfo.status === 'BLOCKED' ? (
        <AccountBlockedLockModal
          authSession={authSession}
          clientDeviceId={clientDeviceId}
          blockReason={cloudAccessInfo.reason}
          isSyncing={isSyncingCloud}
          onRefreshStatus={() => syncFromSupabase({ forceRates: false, silent: false })}
          onLogout={handleLogout}
        />
      ) : isSubscriptionExpired ? (
        <SubscriptionExpiredLockModal
          authSession={authSession}
          clientDeviceId={clientDeviceId}
          packages={packages}
          bankAccounts={bankAccounts}
          expiresAt={cloudAccessInfo.expiresAt}
          isSyncing={isSyncingCloud}
          onRefreshCloudStatus={() => syncFromSupabase({ forceRates: false, silent: false })}
          onLogout={handleLogout}
        />
      ) : (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-2 pb-4 pt-1.5 md:p-4 overflow-x-hidden">
          <AppLayoutCalculatorScreen
          isInstalled={isInstalled}
          currentThemeName={currentTheme.name}
          onTriggerInstall={async () => {
            if (isPromptingInstallRef.current) return;
            isPromptingInstallRef.current = true;
            try {
              if (isInstallable) {
                const outcome = await install();
                if (outcome === 'installed') {
                  triggerGlobalToast('✅ App installed on your device!');
                  return;
                }
              }
              setShowInstallModal(true);
            } finally {
              setTimeout(() => {
                isPromptingInstallRef.current = false;
              }, 350);
            }
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
            if (!customSections.includes(clean)) {
              setCustomSections([...customSections, clean]);
            }
            if (rate > 0) {
              const next = { ...rates };
              GAUGES.forEach((g) => {
                if (!next[g]) next[g] = {};
                availableColors.forEach((c) => {
                  if (!next[g][c]) next[g][c] = {};
                  next[g][c][clean] = rate;
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
            setRates({
              ...rates,
              [g]: {
                ...(rates[g] || {}),
                [c]: {
                  ...(rates[g]?.[c] || {}),
                  [sec]: r,
                },
              },
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
            const clean = gm.replace(/[^0-9.]/g, '').trim();
            if (!clean) return;
            setGlassRates((prev) => {
              if (prev[clean]) return prev;
              return {
                ...prev,
                [clean]: { CLEAR: 260, GREEN: 290, BLUE: 300 },
              };
            });
            triggerGlobalToast(`Added ${clean}mm Glass Gauge!`);
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
              hiddenSections.includes(sec)
                ? hiddenSections.filter((s) => s !== sec)
                : [...hiddenSections, sec]
            );
          }}
          onUnhideAllSections={() => setHiddenSections([])}
          windowFormula={windowFormula}
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
          blueprints={blueprints}
          onDeleteBlueprint={(id) => {
            const bp = blueprints.find((b) => b.id === id);
            setBlueprints((prev) => prev.filter((b) => b.id !== id));
            triggerGlobalToast(`Preset "${bp?.name || id}" removed successfully!`);
          }}
          onClearAllRates={handleClearAllRates}
          onRestoreDefaultRates={handleRestoreDefaultRates}
          onOpenThemeStudio={() => setShowThemeStudio(true)}
          mainLogoUrl={mainLogoUrl}
          letterheadBgUrl={letterheadBgUrl}
          onUpdateLetterheadBgUrl={setLetterheadBgUrl}
          onRestoreDefaultBrandingAssets={() => {
            setLetterheadBgUrl(bossLetterheadCleanImg);
          }}
          rateListSavedAt={rateListSavedAt}
          onSaveRatesToDevice={handleSaveRatesToDevice}
          onApplyRateListRows={handleApplyRateListRows}
          onBulkAdjustRatesPct={handleBulkAdjustRatesPct}
          layoutConfig={layoutConfig}
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
              if (parsed.rates) setRates(parsed.rates);
              if (parsed.packages) setPackages(parsed.packages);
              if (parsed.layoutConfig) setLayoutConfig(parsed.layoutConfig);
              return true;
            } catch {
              return false;
            }
          }}
          activeOffer={activeOffer}
          onSaveOffer={setActiveOffer}
          packages={packages}
          onUpdatePackages={setPackages}
          bankAccounts={bankAccounts}
          clientDeviceId={clientDeviceId}
          isSyncingCloud={isSyncingCloud}
          cloudAccessInfo={cloudAccessInfo}
          authSession={authSession}
          onLogout={handleLogout}
          onSyncFromSupabase={syncFromSupabase}
          supportRequests={supportRequests}
          isSubmittingSupportRequest={isSubmittingSupportRequest}
          onSubmitSupportRequest={handleSubmitSupportRequest}
        />
        </main>
      )}

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

            {/* Action Buttons: Native Install / Open Full-Screen Browser Tab / Download Quick Shortcut */}
            <div className="space-y-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const out = await install();
                    if (out === 'installed') {
                      setShowInstallModal(false);
                      triggerGlobalToast('✅ App installed on your device!');
                    }
                  }}
                  className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Now on This Device</span>
                </button>
              )}

              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boss-flat-btn w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Full Screen in Browser to Install</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const launcherHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Boss Aluminium & Glass App</title>
<meta http-equiv="refresh" content="0;url=${appUrl}" />
<style>body{margin:0;background:#0C0F14;color:#F5B738;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}a{color:#000;background:#F5B738;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:12px}</style>
</head>
<body>
<div>
<h2>Boss Aluminium &amp; Glass</h2>
<p>Opening application...</p>
<a href="${appUrl}">Launch App</a>
</div>
<script>location.replace(${JSON.stringify(appUrl)});</script>
</body>
</html>`;
                  const blob = new Blob([launcherHtml], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Boss-Aluminium-App-Launcher.html';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                  triggerGlobalToast('✅ App Launcher downloaded! Double-click file to open App anytime.');
                }}
                className="boss-flat-btn w-full py-2 px-3 rounded-xl bg-[#14181F] border border-[#F5B738]/70 text-[#F5B738] hover:bg-[#F5B738] hover:text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Quick App Launcher File (.html)</span>
              </button>
            </div>

            {/* Clear Device Instructions */}
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-0.5">
                <div className="font-bold text-[#F5B738] flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Windows PC / Laptop (Chrome ya Edge)</span>
                </div>
                <p className="text-slate-300 leading-snug">
                  New tab mein open karein aur address bar ke right side par <strong>Install App</strong> icon par click karein — bilkul software ki tarah Desktop par install ho jaye gi.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-0.5">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android Mobile (Chrome)</span>
                </div>
                <p className="text-slate-300 leading-snug">
                  Browser menu (<strong>⋮</strong>) par tap karke <strong>&quot;Install App&quot;</strong> / <strong>&quot;Add to Home Screen&quot;</strong> select karein.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#14181F] border border-slate-800 space-y-0.5">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Apple iPhone / iPad (Safari)</span>
                </div>
                <p className="text-slate-300 leading-snug">
                  Safari mein neechay <strong>Share</strong> button dabain aur <strong>&quot;Add to Home Screen&quot;</strong> par tap karein.
                </p>
              </div>
            </div>

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
