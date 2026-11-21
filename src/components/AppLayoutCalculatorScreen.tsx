import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Bookmark,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  History,
  Layers,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Ruler,
  Search,
  Settings,
  Share2,
  Sliders,
  Table2,
  Trash2,
  Unlock,
  Upload,
  Camera,
  Save,
  Sparkles,
  Edit2,
  X,
  Check,
  Zap,
  Tag,
  Percent,
  Copy,
  Phone,
  Radio,
  Bot,
  Clock,
  Send,
  ShieldCheck,
  CheckSquare,
  Palette,
  Scissors,
  LayoutGrid,
  DoorOpen,
  Puzzle,
  Award,
  Image as ImageIcon,
  Wrench,
  Crown,
  Calculator,
  Cloud,
  LogOut,
  MessageSquarePlus,
  WifiOff,
} from 'lucide-react';
import {
  BossUserRole,
  ClientAuthSession,
  isOwnerIdentity,
  loadCachedMasterEngineConfig,
  upsertClientSubscriptionOrder,
} from '../utils/adminApiConfig';
import {
  callSupabaseProxy,
  compressFileToJpegDataUrl,
  getEffectiveServerNowMs,
  uploadImageToUserUploadsBucket,
} from '../utils/supabaseClientConfig';

import {
  AluminiumCostRow,
  BossTab,
  ClientAppLayoutControlConfig,
  ClientSupportRequest,
  CutPiece,
  DgWindowItem,
  DoorItem,
  ExtraPiece,
  FixFrameItem,
  FormulaCategorySettings,
  FSectionFormula,
  GlassCostLine,
  GlassCutResult,
  GlassFormula,
  MeasurementUnit,
  MobileDownloadConfig,
  OpenableWindowItem,
  QuotationResult,
  SavedQuotation,
  SlidingDoorFormulaSettings,
  SlidingDoorItem,
  WindowFormulaSettings,
  WindowItem,
  DeletedBackupItem,
  AppOfferBanner,
  SubscriptionPackageConfig,
  BankAccountConfig,
} from '../types/bossModels';
import {
  barLengthsFor,
  computeDgWindowPieces,
  computeGlassCutsForState,
  computeOpenablePieces,
  computeSlidingDoorPieces,
  computeSlidingWindowPieces,
  formatDim,
  formatDimValueOnly,
  packSection,
  parseDimToInches,
  pricingGaugeForSection,
  toDotSutar,
  unitLabel,
} from '../utils/bossCalculationEngine';
import {
  DEFAULT_GLASS_COLORS_5MM,
  DEFAULT_GLASS_COLORS_8MM,
  DEFAULT_GLASS_COLORS_DG,
  DEFAULT_SECTIONS,
  GAUGES,
  SECTION_LABELS,
  DG_SERIES_SCANNED_RATES,
  mergeDgSeriesRates,
  resolveSectionRate,
} from '../utils/bossDefaultRates';
import {
  canvasToPdfBlob,
  downloadBlobFile,
  shareOrDownloadFile,
} from '../utils/bossPdfExporter';

interface AppLayoutCalculatorScreenProps {
  currentTab: BossTab;
  onSelectTab: (tab: BossTab) => void;
  ctxGauge: string;
  ctxGaugeMode: 'ON' | 'OFF';
  onSetCtxGauge: (g: string, mode: 'ON' | 'OFF') => void;
  ctxColor: string;
  onSetCtxColor: (c: string) => void;
  ctxFrameType: string;
  onSetCtxFrameType: (ft: string) => void;
  ctxGlassMode: 'ON' | 'OFF';
  ctxGlassGauge: string;
  ctxGlassColor: string;
  onSetCtxGlass: (g: string, c: string, mode: 'ON' | 'OFF') => void;
  availableColors: string[];
  onAddColor: (c: string) => void;
  onDeleteColor?: (c: string) => void;
  onEditColor?: (oldCol: string, newCol: string) => void;
  customSections: string[];
  onAddCustomSection: (sec: string, rate: number) => void;
  onDeleteSection?: (sec: string) => void;
  onAddCustomSectionPair: (s1: string, r1: number, s2: string, r2: number) => string;
  onAddGlassColor?: (gauge: string, color: string, rate: number) => void;
  onDeleteGlassColor?: (gauge: string, color: string) => void;
  onAddGlassGauge?: (gauge: string) => void;
  onDeleteGlassGauge?: (gauge: string) => void;
  isInstalled?: boolean;
  currentThemeName?: string;
  onTriggerInstall?: () => void;
  deletedBackupVault?: DeletedBackupItem[];
  onAddBackupItem?: (item: any) => void;
  onRestoreBackupItem?: (id: string | any) => void;
  windows: WindowItem[];
  onUpdateWindows: (list: WindowItem[]) => void;
  dgWindows: DgWindowItem[];
  onUpdateDgWindows: (list: DgWindowItem[]) => void;
  doors: DoorItem[];
  onUpdateDoors: (list: DoorItem[]) => void;
  fixframes: FixFrameItem[];
  onUpdateFixFrames: (list: FixFrameItem[]) => void;
  openableWindows: OpenableWindowItem[];
  onUpdateOpenableWindows: (list: OpenableWindowItem[]) => void;
  slidingDoors: SlidingDoorItem[];
  onUpdateSlidingDoors: (list: SlidingDoorItem[]) => void;
  projectExtras: ExtraPiece[];
  onUpdateProjectExtras: (list: ExtraPiece[]) => void;
  rates: Record<string, Record<string, Record<string, number>>>;
  onUpdateSectionRate: (gauge: string, color: string, sec: string, rate: number) => void;
  glassRates: Record<string, Record<string, number>>;
  onUpdateGlassRate: (gauge: string, color: string, rate: number) => void;
  hiddenSections: string[];
  onToggleHideSection: (sec: string) => void;
  onUnhideAllSections: () => void;
  windowFormula: WindowFormulaSettings;
  dgWindowFormula: WindowFormulaSettings;
  slidingDoorFormula: SlidingDoorFormulaSettings;
  doorFormula: FormulaCategorySettings;
  fixFormula: FormulaCategorySettings;
  openwinFormula: FormulaCategorySettings;
  fSectionFormula: FSectionFormula;
  glassFormulas: Record<string, GlassFormula>;
  measurementUnit: MeasurementUnit;
  onSetMeasurementUnit: (u: MeasurementUnit) => void;
  glassFittingOption: 'FIX_RUBBER' | 'U_PVC';
  onSetGlassFittingOption: (opt: 'FIX_RUBBER' | 'U_PVC') => void;
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
    ntn: string;
  }) => void;
  customerName: string;
  customerPhone: string;
  onSetCustomerInfo: (name: string, phone: string) => void;
  hardwareRate: number;
  markupPct: number;
  transportRent: number;
  labourCost: number;
  onUpdateDefaults: (hw: number, mp: number, tr: number, lc: number) => void;
  savedQuotations: SavedQuotation[];
  onSaveQuotationHistory: (q: SavedQuotation) => void;
  onDeleteQuotationHistory: (id: number) => void;
  onRestoreQuotation: (q: SavedQuotation) => void;
  onClearAllRates: () => void;
  onRestoreDefaultRates: () => void;
  onOpenThemeStudio: () => void;
  mainLogoUrl: string;
  letterheadBgUrl: string;
  onUpdateLetterheadBgUrl?: (url: string) => void;
  onRestoreDefaultBrandingAssets?: () => void;
  rateListSavedAt?: number | null;
  onSaveRatesToDevice?: () => void;
  onApplyRateListRows?: (
    rows: { sectionTitle: string; sectionCode: string; gauge: string; color: string; rate: number }[]
  ) => { updated: number; inserted: number };
  onBulkAdjustRatesPct?: (pct: number, gaugeFilter?: string, colorFilter?: string) => void;
  layoutConfig: ClientAppLayoutControlConfig;
  userLockedTabs?: Record<string, boolean>;
  onUpdateLayoutConfig?: (cfg: ClientAppLayoutControlConfig) => void;
  onExportFullBackup?: () => void;
  onImportFullBackup?: (jsonStr: string) => boolean;
  activeOffer?: AppOfferBanner | null;
  broadcasts?: AppOfferBanner[];
  mobileDownloadConfig?: MobileDownloadConfig | null;
  onSaveOffer?: (offer: AppOfferBanner | null) => void;
  packages?: SubscriptionPackageConfig[];
  onUpdatePackages?: (pkgs: SubscriptionPackageConfig[]) => void;
  bankAccounts?: BankAccountConfig[];
  clientDeviceId?: string;
  isSyncingCloud?: boolean;
  cloudAccessInfo?: {
    status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'FREE';
    tier: string;
    role?: BossUserRole;
    expiresAt: number | null;
    serverNowMs?: number;
    reason: string;
    lastSyncedAt: number | null;
  };
  authSession?: ClientAuthSession | null;
  onLogout?: () => void;
  onSyncFromSupabase?: (options?: { forceRates?: boolean; silent?: boolean }) => Promise<boolean>;
  onSyncUserProfileToCloud?: (profilePatch: {
    companyName?: string;
    selfieUrl?: string;
    shopPhotoUrl?: string;
  }) => Promise<void> | void;
  supportRequests?: ClientSupportRequest[];
  isSubmittingSupportRequest?: boolean;
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
  lastSeenSupportMs?: number;
  onMarkSupportMessagesRead?: () => void;
  isOnline?: boolean;
}

export const AppLayoutCalculatorScreen: React.FC<AppLayoutCalculatorScreenProps> = (props) => {
  const {
    currentTab,
    onSelectTab,
    ctxGauge,
    ctxGaugeMode,
    onSetCtxGauge,
    ctxColor,
    onSetCtxColor,
    ctxFrameType,
    onSetCtxFrameType,
    ctxGlassMode,
    ctxGlassGauge,
    ctxGlassColor,
    onSetCtxGlass,
    availableColors,
    onAddColor,
    onDeleteColor = () => {},
    onEditColor = () => {},
    customSections,
    onAddCustomSection,
    onDeleteSection = () => {},
    onAddCustomSectionPair,
    onAddGlassColor = () => {},
    onDeleteGlassColor = () => {},
    onAddGlassGauge = () => {},
    onDeleteGlassGauge = () => {},
    isInstalled = false,
    currentThemeName = 'Obsidian',
    onTriggerInstall = () => {},
    deletedBackupVault = [],
    onAddBackupItem = () => {},
    onRestoreBackupItem = () => {},
    windows,
    onUpdateWindows,
    dgWindows,
    onUpdateDgWindows,
    doors,
    onUpdateDoors,
    fixframes,
    onUpdateFixFrames,
    openableWindows,
    onUpdateOpenableWindows,
    slidingDoors,
    onUpdateSlidingDoors,
    projectExtras,
    onUpdateProjectExtras,
    rates,
    onUpdateSectionRate,
    glassRates,
    onUpdateGlassRate,
    hiddenSections,
    onToggleHideSection,
    onUnhideAllSections,
    windowFormula,
    dgWindowFormula,
    slidingDoorFormula,
    doorFormula,
    fixFormula,
    openwinFormula,
    fSectionFormula,
    glassFormulas,
    measurementUnit,
    onSetMeasurementUnit,
    glassFittingOption,
    onSetGlassFittingOption,
    companyName,
    companyTagline,
    companyAddress,
    companyPhone,
    companyNtn,
    onUpdateCompanyInfo,
    customerName,
    customerPhone,
    onSetCustomerInfo,
    hardwareRate,
    markupPct,
    transportRent,
    labourCost,
    onUpdateDefaults,
    savedQuotations,
    onSaveQuotationHistory,
    onDeleteQuotationHistory,
    onRestoreQuotation,
    onClearAllRates,
    onRestoreDefaultRates,
    onOpenThemeStudio,
    mainLogoUrl,
    letterheadBgUrl,
    onUpdateLetterheadBgUrl = () => {},
    onRestoreDefaultBrandingAssets = () => {},
    rateListSavedAt = null,
    onSaveRatesToDevice = () => {},
    onApplyRateListRows,
    onBulkAdjustRatesPct,
    layoutConfig,
    userLockedTabs = {},
    onUpdateLayoutConfig = () => {},
    onExportFullBackup = () => {},
    onImportFullBackup = () => false,
    activeOffer,
    broadcasts = [],
    mobileDownloadConfig = null,
    onSaveOffer,
    packages = [],
    onUpdatePackages,
    bankAccounts = [],
    clientDeviceId: propDeviceId,
    isSyncingCloud = false,
    cloudAccessInfo,
    authSession = null,
    onLogout,
    onSyncFromSupabase,
    onSyncUserProfileToCloud,
    supportRequests = [],
    isSubmittingSupportRequest = false,
    onSubmitSupportRequest,
    onRefreshSupportRequests,
    onDeleteSupportRequest,
    onClearAllSupportRequests,
    lastSeenSupportMs = 0,
    onMarkSupportMessagesRead,
    isOnline = true,
  } = props;

  const [doorSubTab, setDoorSubTab] = useState<'DOORS' | 'FIX' | 'OP_WIN' | 'SLIDING'>('DOORS');
  const [ratesSubTab, setRatesSubTab] = useState<'RATES' | 'LOGO_BG' | 'HARDWARE' | 'PACKAGES'>('RATES');
  const [rateCategoryTab, setRateCategoryTab] = useState<'ALUMINIUM' | 'GLASS'>('ALUMINIUM');
  const [rateViewMode, setRateViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [rateMultiDeleteMode, setRateMultiDeleteMode] = useState(false);
  const [showAddColorForm, setShowAddColorForm] = useState(false);
  const [showAddSectionForm, setShowAddSectionForm] = useState(false);
  const [showAddGlassGaugeForm, setShowAddGlassGaugeForm] = useState(false);
  const [newGlassGaugeInput, setNewGlassGaugeInput] = useState('10');
  const [showAddGlassColorForm, setShowAddGlassColorForm] = useState(false);
  const [addGlassTargetGauge, setAddGlassTargetGauge] = useState('5');
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isRefreshingSupport, setIsRefreshingSupport] = useState(false);
  const [reqUserName, setReqUserName] = useState(authSession?.name || customerName || '');
  const [reqUserPhone, setReqUserPhone] = useState(authSession?.phone || customerPhone || '');
  const [reqUserEmail, setReqUserEmail] = useState(authSession?.email || '');
  const [reqType, setReqType] = useState('Rate List / Section Request');
  const [reqMessage, setReqMessage] = useState('');
  const [supportSubmitError, setSupportSubmitError] = useState<string | null>(null);
  const [supportSubmitSuccess, setSupportSubmitSuccess] = useState<string | null>(null);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [dismissedBannerSignatures, setDismissedBannerSignatures] = useState<string[]>([]);

  const getBannerDismissKey = (b: AppOfferBanner) =>
    `${b.id}|${b.updatedAt || b.createdAt || ''}|${b.title}|${b.message}|${b.discountPct || ''}|${b.badgeText || ''}|${b.isActive}`;

  const unreadAdminSupportCount = supportRequests.filter((r) => {
    const hasAdmin = r.sender === 'ADMIN' || Boolean(r.adminReply);
    if (!hasAdmin) return false;
    const msgTs = Math.max(Number(r.repliedAt || 0), Number(r.createdAt || 0));
    return msgTs > lastSeenSupportMs;
  }).length;

  const openSupportModal = () => {
    setShowSupportModal(true);
    onMarkSupportMessagesRead?.();
    if (onRefreshSupportRequests) {
      setIsRefreshingSupport(true);
      Promise.resolve(onRefreshSupportRequests()).finally(() => setIsRefreshingSupport(false));
    }
  };
  const [showBackgroundAdjustments, setShowBackgroundAdjustments] = useState(false);
  const [draftHardwareStr, setDraftHardwareStr] = useState<string>(() =>
    hardwareRate > 0 ? String(hardwareRate) : ''
  );
  const [draftDiscountStr, setDraftDiscountStr] = useState<string>(() =>
    markupPct > 0 ? String(markupPct) : ''
  );
  const [draftLabourStr, setDraftLabourStr] = useState<string>(() =>
    labourCost > 0 ? String(labourCost) : ''
  );
  const [draftTransportStr, setDraftTransportStr] = useState<string>(() =>
    transportRent > 0 ? String(transportRent) : ''
  );

  useEffect(() => {
    setDraftHardwareStr((prev) => {
      const parsed = parseFloat(prev);
      if ((prev === '' && hardwareRate === 0) || (!Number.isNaN(parsed) && parsed === hardwareRate)) {
        return prev;
      }
      return hardwareRate > 0 ? String(hardwareRate) : '';
    });
  }, [hardwareRate]);

  useEffect(() => {
    setDraftDiscountStr((prev) => {
      const parsed = parseFloat(prev);
      if ((prev === '' && markupPct === 0) || (!Number.isNaN(parsed) && parsed === markupPct)) {
        return prev;
      }
      return markupPct > 0 ? String(markupPct) : '';
    });
  }, [markupPct]);

  useEffect(() => {
    setDraftLabourStr((prev) => {
      const parsed = parseFloat(prev);
      if ((prev === '' && labourCost === 0) || (!Number.isNaN(parsed) && parsed === labourCost)) {
        return prev;
      }
      return labourCost > 0 ? String(labourCost) : '';
    });
  }, [labourCost]);

  useEffect(() => {
    setDraftTransportStr((prev) => {
      const parsed = parseFloat(prev);
      if (
        (prev === '' && transportRent === 0) ||
        (!Number.isNaN(parsed) && parsed === transportRent)
      ) {
        return prev;
      }
      return transportRent > 0 ? String(transportRent) : '';
    });
  }, [transportRent]);

  const sanitizeDecimalText = (raw: string) =>
    raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

  const handleDiscountTextChange = (raw: string) => {
    const cleaned = sanitizeDecimalText(raw);
    if (cleaned === '') {
      setDraftDiscountStr('');
      onUpdateDefaults(hardwareRate, 0, transportRent, labourCost);
      return;
    }
    const num = parseFloat(cleaned);
    const clamped = Number.isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
    setDraftDiscountStr(!Number.isNaN(num) && num > 100 ? '100' : cleaned);
    onUpdateDefaults(hardwareRate, clamped, transportRent, labourCost);
  };

  const handleHardwareTextChange = (raw: string) => {
    const cleaned = sanitizeDecimalText(raw);
    setDraftHardwareStr(cleaned);
    const num = parseFloat(cleaned);
    onUpdateDefaults(Number.isNaN(num) ? 0 : Math.max(0, num), markupPct, transportRent, labourCost);
  };

  const handleLabourTextChange = (raw: string) => {
    const cleaned = sanitizeDecimalText(raw);
    setDraftLabourStr(cleaned);
    const num = parseFloat(cleaned);
    onUpdateDefaults(hardwareRate, markupPct, transportRent, Number.isNaN(num) ? 0 : Math.max(0, num));
  };

  const handleTransportTextChange = (raw: string) => {
    const cleaned = sanitizeDecimalText(raw);
    setDraftTransportStr(cleaned);
    const num = parseFloat(cleaned);
    onUpdateDefaults(hardwareRate, markupPct, Number.isNaN(num) ? 0 : Math.max(0, num), labourCost);
  };

  const [shareModalTarget, setShareModalTarget] = useState<
    | { kind: 'CHART'; chartType: 'CUTTING' | 'LENGTH' | 'GLASS' | 'QUOTATION' }
    | { kind: 'HISTORY'; item: SavedQuotation }
    | null
  >(null);
  const [isGeneratingExport, setIsGeneratingExport] = useState<'PNG' | 'PDF' | null>(null);
  const [printPreviewState, setPrintPreviewState] = useState<{
    title: string;
    previewImageUrl: string;
    pdfUrl: string;
    fileName: string;
  } | null>(null);
  const a4WrapperRef = useRef<HTMLDivElement | null>(null);
  const [a4Scale, setA4Scale] = useState<number>(1);

  useEffect(() => {
    const updateA4Scale = () => {
      if (!a4WrapperRef.current) return;
      const avail = a4WrapperRef.current.clientWidth;
      if (avail > 0) {
        setA4Scale(Math.min(1, avail / 794));
      }
    };
    updateA4Scale();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && a4WrapperRef.current) {
      ro = new ResizeObserver(updateA4Scale);
      ro.observe(a4WrapperRef.current);
    }
    window.addEventListener('resize', updateA4Scale);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateA4Scale);
    };
  }, [currentTab]);

  // Step 1: Client Order & Auto-Approval State
  const [clientDeviceId] = useState<string>(() => {
    if (propDeviceId) return propDeviceId;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('boss_client_device_id');
      if (stored) return stored;
      const gen = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('boss_client_device_id', gen);
      return gen;
    }
    return 'DEV-CLIENT-DEFAULT';
  });

  const [orderSelectedPackage, setOrderSelectedPackage] = useState<SubscriptionPackageConfig | null>(null);
  const [orderBankName, setOrderBankName] = useState<string>(
    bankAccounts.find((b) => b.isActive !== false)?.bankName || 'Easypaisa Wallet'
  );
  const [orderAmountInput, setOrderAmountInput] = useState<string>(() =>
    String(packages[0]?.priceRs ?? packages[0]?.price ?? 3000)
  );
  const [orderTidInput, setOrderTidInput] = useState<string>('');
  const [orderReceiptUrl, setOrderReceiptUrl] = useState<string>('');
  const [orderReceiptBase64, setOrderReceiptBase64] = useState<string>('');
  const [isUploadingOrderReceipt, setIsUploadingOrderReceipt] = useState<boolean>(false);
  const [orderClientName, setOrderClientName] = useState<string>(authSession?.name || customerName || 'Client');
  const [orderClientPhone, setOrderClientPhone] = useState<string>(authSession?.phone || customerPhone || '');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [activeClientOrder, setActiveClientOrder] = useState<any>(null);
  const [isOrderAutoApproved, setIsOrderAutoApproved] = useState<boolean>(false);
  const [isCheckingOrderStatus, setIsCheckingOrderStatus] = useState<boolean>(false);

  useEffect(() => {
    const pkg = orderSelectedPackage || packages[0];
    if (pkg) {
      setOrderAmountInput(String(pkg.priceRs ?? pkg.price ?? 3000));
    }
  }, [orderSelectedPackage, packages]);

  useEffect(() => {
    const activeBanks = bankAccounts.filter((b) => b.isActive !== false);
    if (activeBanks.length > 0 && !activeBanks.some((b) => b.bankName === orderBankName)) {
      setOrderBankName(activeBanks[0].bankName);
    }
  }, [bankAccounts, orderBankName]);

  // Check Supabase subscriptions table directly for order status (no broken /api/ calls)
  const checkClientOrderStatus = async () => {
    if (!clientDeviceId) return;
    try {
      setIsCheckingOrderStatus(true);
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
          setActiveClientOrder({
            tid: subRow.last_payment_tid || 'CLOUD-SUB',
            status: isApproved ? 'APPROVED_MANUAL' : st,
            packageName: subRow.package_name || 'Subscription Plan',
            amount: subRow.amount,
            bankName: subRow.payment_method,
            receiptUrl: subRow.receipt_url,
          });
        }
        if (isApproved) {
          setIsOrderAutoApproved(true);
          onSyncFromSupabase?.({ forceRates: false, silent: true });
        }
      }
    } catch {
      // ignore offline error
    } finally {
      setIsCheckingOrderStatus(false);
    }
  };

  useEffect(() => {
    if (showPackagesModal) {
      checkClientOrderStatus();
    }
  }, [showPackagesModal]);

  const handleOrderReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingOrderReceipt(true);
    try {
      const uploaded = await uploadImageToUserUploadsBucket({
        fileOrDataUrl: file,
        folder: 'receipts',
        deviceId: clientDeviceId,
        tag: 'payment_receipt',
      });
      setOrderReceiptUrl(uploaded.url);
      setOrderReceiptBase64(uploaded.base64DataUrl);
      showSettingsToast('✅ Payment screenshot uploaded!');
    } catch {
      showSettingsToast('Could not read receipt screenshot. Try again.');
    } finally {
      setIsUploadingOrderReceipt(false);
    }
  };

  const handleSubmitClientOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTid = orderTidInput.trim().toUpperCase();
    if (!cleanTid) {
      showSettingsToast('Please enter the Transaction ID (TID) from your bank receipt!');
      return;
    }
    const pkgToOrder = orderSelectedPackage || packages[0];
    if (!pkgToOrder) {
      showSettingsToast('Please select a subscription package!');
      return;
    }

    const amountVal = Number(orderAmountInput) || pkgToOrder.priceRs || pkgToOrder.price || 500;
    const cleanClientName = orderClientName.trim() || authSession?.name || customerName || 'Client User';
    const cleanClientPhone = orderClientPhone.trim() || authSession?.phone || customerPhone || '';

    try {
      setIsSubmittingOrder(true);

      const sbSubRes = await upsertClientSubscriptionOrder({
        deviceId: clientDeviceId,
        userName: cleanClientName,
        phone: cleanClientPhone,
        email: authSession?.email || '',
        cnic: authSession?.cnic || '',
        packageName: pkgToOrder.name,
        subscriptionTier: pkgToOrder.planCode || 'MONTHLY',
        amount: amountVal,
        paymentMethod: orderBankName,
        lastPaymentTid: cleanTid,
        receiptUrl: orderReceiptUrl,
        receiptBase64: orderReceiptBase64,
      });

      if (!sbSubRes.ok) {
        showSettingsToast(sbSubRes.error || 'Could not save payment to Supabase. Try again.');
        return;
      }

      setActiveClientOrder({
        tid: cleanTid,
        status: 'PENDING',
        packageName: pkgToOrder.name,
        amount: amountVal,
        bankName: orderBankName,
        receiptUrl: orderReceiptUrl,
      });
      showSettingsToast('✅ Payment TID & Receipt sent directly to Admin Panel (Supabase)!');
    } catch (err: any) {
      showSettingsToast('Error submitting order: ' + err?.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const showSettingsToast = (msg: string) => {
    setSettingsNotice(msg);
    setTimeout(() => setSettingsNotice(null), 3200);
  };

  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    cb: (dataUrl: string) => void,
    label: string
  ) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const compressedDataUrl = await compressFileToJpegDataUrl(f, 800, 0.65, 120 * 1024);
      cb(compressedDataUrl);
      showSettingsToast(`${label} updated!`);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          cb(reader.result);
          showSettingsToast(`${label} updated!`);
        }
      };
      reader.readAsDataURL(f);
    }
  };

  // Active Shop Logo for Quotation & Charts (falls back to Official Golden Lion Main Icon if no custom Shop Logo is set)
  const activeShopLogoUrl =
    layoutConfig.shopLogoUrl && layoutConfig.shopLogoUrl.trim().length > 0
      ? layoutConfig.shopLogoUrl
      : mainLogoUrl;

  // Dynamic 5mm & 8mm Glass Colors from live glassRates (supports separate Add & Delete for 5mm and 8mm!)
  const glassColors5mm =
    Object.keys(glassRates['5'] || {}).length > 0
      ? Object.keys(glassRates['5'])
      : DEFAULT_GLASS_COLORS_5MM;
  const glassColors8mm =
    Object.keys(glassRates['8'] || {}).length > 0
      ? Object.keys(glassRates['8'])
      : DEFAULT_GLASS_COLORS_8MM;
  const glassColorsDg =
    Object.keys(glassRates['DG'] || {}).length > 0
      ? Object.keys(glassRates['DG'])
      : DEFAULT_GLASS_COLORS_DG;
  const deletedSecs = layoutConfig.deletedSections || [];

  // Compact 3-Chip Per-Frame Spec Strip ([Sec: 1.6mm] [Glass: 5mm] [CLEAR]) matching Mobile UI
  const renderFrameGaugeAndGlassControls = (params: {
    sectionGauge: string;
    onChangeGauge: (g: string) => void;
    glassEnabled: boolean;
    onChangeGlassEnabled: (en: boolean) => void;
    glassGauge: string;
    glassColor: string;
    onChangeGlassSpec: (g: string, col: string) => void;
    isDgMode?: boolean;
  }) => {
    const isDgMode = Boolean(params.isDgMode);
    const isGaugeLocked = ctxGaugeMode === 'ON';
    const isGlassLocked = !isDgMode && ctxGlassMode === 'ON';
    const activeGauge = isGaugeLocked ? ctxGauge : params.sectionGauge || '1.6';
    const activeGlassGauge = isDgMode
      ? 'DG'
      : isGlassLocked
      ? ctxGlassGauge
      : params.glassGauge && params.glassGauge.toUpperCase() !== 'DG'
      ? params.glassGauge
      : '5';
    const rawAvailableGlassGauges = Object.keys(glassRates || {}).filter(
      (g) => g.toUpperCase() !== 'DG'
    );
    const availableGlassGauges =
      rawAvailableGlassGauges.length > 0 ? rawAvailableGlassGauges : ['5', '8'];
    const glassColorList = isDgMode
      ? glassColorsDg
      : Object.keys(glassRates[activeGlassGauge] || {}).length > 0
      ? Object.keys(glassRates[activeGlassGauge])
      : activeGlassGauge === '8'
      ? glassColors8mm
      : glassColors5mm;
    const rawGlassColor = isDgMode
      ? params.glassColor || glassColorList[0] || 'CLEAR'
      : isGlassLocked
      ? ctxGlassColor
      : params.glassColor || 'CLEAR';
    const activeGlassColor = glassColorList.includes(rawGlassColor)
      ? rawGlassColor
      : glassColorList[0] || 'CLEAR';

    return (
      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        {/* Chip 1: Section Gauge */}
        <div
          className={`px-2 py-1 rounded-full border text-[11px] flex items-center justify-between gap-1 min-w-0 ${
            isGaugeLocked
              ? 'bg-[#0C0F14] border-slate-700/80 text-slate-200'
              : 'bg-[#0C0F14] border-amber-500/80 text-amber-300'
          }`}
        >
          {isGaugeLocked ? (
            <button
              type="button"
              onClick={() => onSetCtxGauge(ctxGauge, 'OFF')}
              className="boss-flat-btn w-full flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-200 truncate cursor-pointer"
              title="Tap to unlock separate Gauge for this frame"
            >
              <span className="truncate">Sec: {activeGauge}mm</span>
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          ) : (
            <div className="w-full flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => onSetCtxGauge(ctxGauge, 'ON')}
                className="boss-flat-btn text-amber-400 shrink-0"
                title="Lock back to Master Gauge"
              >
                <Unlock className="w-3 h-3" />
              </button>
              <select
                value={activeGauge}
                onChange={(e) => params.onChangeGauge(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-[#F5B738] focus:outline-none cursor-pointer truncate"
              >
                {GAUGES.map((g) => (
                  <option key={g} value={g} className="bg-[#14181F] text-white">
                    {g}mm
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chip 2: Glass Gauge */}
        <div
          className={`px-2 py-1 rounded-full border text-[11px] flex items-center justify-between gap-1 min-w-0 ${
            !params.glassEnabled
              ? 'bg-[#0C0F14]/60 border-rose-900/60 text-rose-400'
              : isDgMode
              ? 'bg-[#0C0F14] border-[#F5B738]/70 text-[#F5B738]'
              : isGlassLocked
              ? 'bg-[#0C0F14] border-slate-700/80 text-slate-200'
              : 'bg-[#0C0F14] border-sky-500/80 text-sky-300'
          }`}
        >
          {!params.glassEnabled ? (
            <button
              type="button"
              onClick={() => params.onChangeGlassEnabled(true)}
              className="boss-flat-btn w-full text-center text-[10px] font-bold text-rose-400 truncate cursor-pointer"
            >
              No Glass
            </button>
          ) : isDgMode ? (
            <div className="w-full text-center text-[11px] font-extrabold text-[#F5B738] truncate">
              DG Glass
            </div>
          ) : isGlassLocked ? (
            <button
              type="button"
              onClick={() => onSetCtxGlass(ctxGlassGauge, ctxGlassColor, 'OFF')}
              className="boss-flat-btn w-full flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-200 truncate cursor-pointer"
              title="Tap to unlock separate Glass Gauge & Color"
            >
              <span className="truncate">Glass: {activeGlassGauge}mm</span>
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          ) : (
            <div className="w-full flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => onSetCtxGlass(ctxGlassGauge, ctxGlassColor, 'ON')}
                className="boss-flat-btn text-sky-400 shrink-0"
                title="Lock back to Master Glass"
              >
                <Unlock className="w-3 h-3" />
              </button>
              <select
                value={activeGlassGauge}
                onChange={(e) => {
                  const gm = e.target.value;
                  const nextColors =
                    Object.keys(glassRates[gm] || {}).length > 0
                      ? Object.keys(glassRates[gm])
                      : gm === '8'
                      ? glassColors8mm
                      : glassColors5mm;
                  const validColor = nextColors.includes(activeGlassColor)
                    ? activeGlassColor
                    : nextColors[0] || 'CLEAR';
                  params.onChangeGlassSpec(gm, validColor);
                }}
                className="w-full bg-transparent text-[11px] font-bold text-sky-300 focus:outline-none cursor-pointer"
              >
                {availableGlassGauges.map((gm) => (
                  <option key={gm} value={gm} className="bg-[#14181F] text-white">
                    {gm}mm
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chip 3: Glass Color */}
        <div
          className={`px-2 py-1 rounded-full border text-[11px] flex items-center justify-between gap-1 min-w-0 ${
            !params.glassEnabled
              ? 'bg-[#0C0F14]/60 border-rose-900/60 text-rose-400'
              : isGlassLocked
              ? 'bg-[#0C0F14] border-slate-700/80 text-slate-200'
              : 'bg-[#0C0F14] border-emerald-500/80 text-emerald-300'
          }`}
        >
          {!params.glassEnabled ? (
            <span className="w-full text-center text-[10px] font-bold text-rose-400 truncate">
              Disabled
            </span>
          ) : isGlassLocked ? (
            <button
              type="button"
              onClick={() => onSetCtxGlass(ctxGlassGauge, ctxGlassColor, 'OFF')}
              className="boss-flat-btn w-full flex items-center justify-between gap-1 text-[11px] font-bold text-slate-200 truncate cursor-pointer"
              title="Tap to unlock separate Glass Color"
            >
              <span className="truncate">{activeGlassColor}</span>
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          ) : (
            <select
              value={activeGlassColor}
              onChange={(e) => params.onChangeGlassSpec(activeGlassGauge, e.target.value)}
              className="w-full bg-transparent text-[11px] font-bold text-emerald-300 focus:outline-none cursor-pointer truncate"
            >
              {glassColorList.map((gc) => (
                <option key={gc} value={gc} className="bg-[#14181F] text-white">
                  {gc}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };
  const [showCompareCF, setShowCompareCF] = useState(false);
  const [showAddPairModal, setShowAddPairModal] = useState(false);
  const [confirmClearRates, setConfirmClearRates] = useState(false);
  const [pairSec1, setPairSec1] = useState('');
  const [pairRate1, setPairRate1] = useState('750');
  const [pairSec2, setPairSec2] = useState('');
  const [pairRate2, setPairRate2] = useState('850');

  // Extra Piece Form State
  const [extraSec, setExtraSec] = useState('M23');
  const [extraLenFt, setExtraLenFt] = useState('10');
  const [extraQty, setExtraQty] = useState('1');
  const [extraGauge, setExtraGauge] = useState(ctxGauge);

  // Rates & Settings Sub-State
  const [rateGaugeTab, setRateGaugeTab] = useState(ctxGauge || '1.6');
  const [rateColorTab, setRateColorTab] = useState(ctxColor || 'DULL');
  const [rateSearch, setRateSearch] = useState('');
  const [newSecCodeInput, setNewSecCodeInput] = useState('');
  const [newSecRateInput, setNewSecRateInput] = useState('750');
  const [newColorInput, setNewColorInput] = useState('');
  const [editingColorName, setEditingColorName] = useState<string | null>(null);
  const [editingColorVal, setEditingColorVal] = useState('');
  const [newGlass5Color, setNewGlass5Color] = useState('');
  const [newGlass5Rate, setNewGlass5Rate] = useState('210');
  const [newGlass8Color, setNewGlass8Color] = useState('');
  const [newGlass8Rate, setNewGlass8Rate] = useState('340');
  const [historySearch, setHistorySearch] = useState('');
  const [showRateUpdater, setShowRateUpdater] = useState(false);
  const [ratePasteText, setRatePasteText] = useState('');
  const [rateScanLoading, setRateScanLoading] = useState(false);
  const [rateScanRows, setRateScanRows] = useState<
    { sectionTitle: string; sectionCode: string; gauge: string; color: string; rate: number }[]
  >([]);
  const [rateBulkPct, setRateBulkPct] = useState('5');
  const [rateBulkScope, setRateBulkScope] = useState<'CURRENT' | 'ALL'>('ALL');

  const parseClientRateListText = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: {
      sectionTitle: string;
      sectionCode: string;
      gauge: string;
      color: string;
      rate: number;
    }[] = [];

    const knownColors = [
      'DULL',
      'BROWN',
      'H23',
      'PC-RAL',
      'BLACK',
      'SAHARA',
      'WOOD COAT',
      'MULTI',
      'NATURAL',
      'D.SHINE',
      'ANODIZED',
    ];
    let detectedHeaderCols: string[] = [];

    lines.forEach((line) => {
      const upper = line.toUpperCase();
      // Detect table header row
      if (
        (upper.includes('DULL') && (upper.includes('BROWN') || upper.includes('BLACK') || upper.includes('H23'))) ||
        upper.startsWith('SEC')
      ) {
        const cols = upper
          .split(/\t|\||,| {2,}/)
          .map((c) => c.trim())
          .filter(Boolean);
        const foundCols = cols.filter((c) => knownColors.some((kc) => c.includes(kc)));
        if (foundCols.length >= 2) {
          detectedHeaderCols = cols;
          return;
        }
      }

      // Format 1: Delimited 4 columns -> SECTION | GAUGE | COLOR | RATE
      const parts = line
        .split(/\t|\||,|=/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length >= 4 && !Number.isNaN(Number(parts[parts.length - 1].replace(/[^0-9.]/g, '')))) {
        // Check if multi-column mill row matching header
        if (detectedHeaderCols.length >= 3 && parts.length >= detectedHeaderCols.length) {
          const secRaw = parts[0].toUpperCase();
          const gMatch = secRaw.match(/(1\.2|1\.4|1\.5|1\.6|2\.0|2MM|1\.6M)/i);
          const gauge = gMatch ? gMatch[1].replace(/mm|m/i, '').replace('2.0', '2') : rateGaugeTab || '1.6';
          const cleanCode = secRaw.replace(/\s+(1\.6M|2MM|1\.6MM|1\.2|1\.4|1\.5|1\.6|2\.0)$/i, '').trim();
          for (let i = 1; i < Math.min(parts.length, detectedHeaderCols.length); i++) {
            const num = parseFloat(parts[i].replace(/[^0-9.]/g, ''));
            const colHeader = detectedHeaderCols[i];
            const mappedCol =
              knownColors.find((kc) => colHeader.includes(kc)) || colHeader;
            if (cleanCode && num > 0) {
              parsed.push({
                sectionTitle: secRaw,
                sectionCode: cleanCode,
                gauge,
                color: mappedCol,
                rate: Math.round(num),
              });
            }
          }
          return;
        }

        const secCode = (parts.length >= 5 ? parts[1] : parts[0]).toUpperCase();
        const gaugeRaw = (parts.length >= 5 ? parts[2] : parts[1]).replace(/mm/i, '').trim();
        const colorRaw = (parts.length >= 5 ? parts[3] : parts[2]).toUpperCase();
        const rateNum = parseFloat(parts[parts.length - 1].replace(/[^0-9.]/g, ''));
        if (secCode && rateNum > 0) {
          parsed.push({
            sectionTitle: parts[0],
            sectionCode: secCode,
            gauge: gaugeRaw || rateGaugeTab || '1.6',
            color: colorRaw || rateColorTab || 'DULL',
            rate: Math.round(rateNum),
          });
        }
        return;
      }

      // Format 2: Simple "SECTION = RATE" or "SECTION 950"
      if (parts.length === 2) {
        const num = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
        if (parts[0] && num > 0) {
          parsed.push({
            sectionTitle: parts[0].toUpperCase(),
            sectionCode: parts[0].toUpperCase(),
            gauge: rateGaugeTab || '1.6',
            color: rateColorTab || 'DULL',
            rate: Math.round(num),
          });
          return;
        }
      }

      // Format 3: Space-separated single line e.g. "DC30C 1.6 DULL 950" or "DC30C 950"
      const tokens = line.split(/\s+/).filter(Boolean);
      if (tokens.length === 2) {
        const num = parseFloat(tokens[1].replace(/[^0-9.]/g, ''));
        if (num > 0) {
          parsed.push({
            sectionTitle: tokens[0].toUpperCase(),
            sectionCode: tokens[0].toUpperCase(),
            gauge: rateGaugeTab || '1.6',
            color: rateColorTab || 'DULL',
            rate: Math.round(num),
          });
        }
      } else if (tokens.length >= 4) {
        const lastNum = parseFloat(tokens[tokens.length - 1].replace(/[^0-9.]/g, ''));
        if (lastNum > 0) {
          const maybeGauge = tokens[1].replace(/mm/i, '');
          const isGauge = /^(1\.2|1\.4|1\.5|1\.6|2|2\.0|3|4|6)$/.test(maybeGauge);
          if (isGauge) {
            parsed.push({
              sectionTitle: tokens[0].toUpperCase(),
              sectionCode: tokens[0].toUpperCase(),
              gauge: maybeGauge === '2.0' ? '2' : maybeGauge,
              color: tokens.slice(2, -1).join(' ').toUpperCase() || rateColorTab,
              rate: Math.round(lastNum),
            });
          }
        }
      }
    });

    return parsed;
  };

  const handleClientScanRateImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setRateScanLoading(true);
    try {
      const filesPayload: { imageBase64: string; mimeType: string }[] = [];
      for (let i = 0; i < Math.min(fileList.length, 3); i++) {
        const f = fileList[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = String(reader.result || '');
            const idx = res.indexOf(',');
            resolve(idx >= 0 ? res.slice(idx + 1) : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        filesPayload.push({ imageBase64: base64, mimeType: f.type || 'image/jpeg' });
      }

      const resp = await fetch('/api/scan-rate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload, rawTextInput: ratePasteText }),
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data?.rows) && data.rows.length > 0) {
        setRateScanRows(data.rows);
        showSettingsToast(`✅ Extracted ${data.rows.length} rates! Review below and click Save to Device.`);
      } else {
        showSettingsToast(data?.error || 'Could not extract rates from image.');
      }
    } catch (err: any) {
      showSettingsToast(err?.message || 'Error scanning rate list image.');
    } finally {
      setRateScanLoading(false);
    }
  };

  // Compute all cut pieces for current state (or override frameType C vs F)
  const resolveOuterFrameSection = (
    currentOuter: string,
    targetFrameType: string | null = ctxFrameType !== 'OFF' ? ctxFrameType : null
  ) => {
    const pairMapF: Record<string, string> = {
      D54A: 'D54F',
      D54: 'D54F',
      D51: 'D51F',
      D51A: 'D51F',
      D42: 'D42F',
      D45: 'D45F',
      D45A: 'D45F',
    };
    const pairMapC: Record<string, string> = {
      D54F: 'D54A',
      D51F: 'D51A',
      D42F: 'D42',
      D45F: 'D45A',
    };
    if (targetFrameType) {
      const up = currentOuter.toUpperCase();
      if (targetFrameType === 'F') {
        return pairMapF[up] || (up.endsWith('F') ? currentOuter : `${currentOuter}F`);
      }
      if (targetFrameType === 'C') {
        if (!up.endsWith('F')) {
          return currentOuter;
        }
        return pairMapC[up] || currentOuter.replace(/f$/i, '');
      }
      return targetFrameType;
    }
    return currentOuter;
  };

  const getAllCutPieces = (overrideFrameType: string | null = null): CutPiece[] => {
    const all: CutPiece[] = [];
    const targetFt =
      overrideFrameType === 'OFF'
        ? null
        : overrideFrameType !== null
        ? overrideFrameType
        : ctxFrameType !== 'OFF'
        ? ctxFrameType
        : null;

    const masterGaugeActive = ctxGaugeMode === 'ON';

    const resolveOuter = (currentOuter: string) =>
      resolveOuterFrameSection(currentOuter, targetFt);

    windows.forEach((w, idx) => {
      const effFt = targetFt || (w.frameType ? w.frameType : 'C');
      const effGauge = masterGaugeActive ? ctxGauge : w.sectionGauge;
      const winWithEff = { ...w, frameType: effFt, sectionGauge: effGauge };
      const src = `Window #${idx + 1} (${w.panelCount} Palay)`;
      computeSlidingWindowPieces(winWithEff, effFt, windowFormula, fSectionFormula).forEach((p) => {
        all.push({ ...p, source: src, gauge: p.section === 'D29' || p.section === 'D31' ? '1.2' : effGauge });
      });
    });

    dgWindows.forEach((dw, idx) => {
      const effFt =
        targetFt === 'F' || targetFt === 'C'
          ? targetFt
          : dw.frameType === 'F'
          ? 'F'
          : 'C';
      const effGauge = masterGaugeActive ? ctxGauge : dw.sectionGauge;
      const dwWithEff: DgWindowItem = { ...dw, frameType: effFt, sectionGauge: effGauge };
      const src = `DG.Window #${idx + 1} (${dw.panelCount} Palay)`;
      computeDgWindowPieces(dwWithEff, effFt, dgWindowFormula, fSectionFormula).forEach((p) => {
        all.push({
          ...p,
          source: src,
          gauge: p.section === 'DG.29' || p.section === 'DG.31' ? '1.2' : effGauge,
        });
      });
    });

    doors.forEach((d, idx) => {
      const src = `Door #${idx + 1}`;
      const effOuter = resolveOuter(d.outer);
      const effGauge = masterGaugeActive ? ctxGauge : d.sectionGauge;
      computeOpenablePieces(
        d.width,
        d.height,
        d.qty,
        effOuter,
        'door',
        doorFormula,
        d.extras,
        effGauge,
        fSectionFormula,
        d.d59Qty,
        d.d59aQty,
        d.d52Qty
      ).forEach((p) => all.push({ ...p, source: src, gauge: effGauge }));
    });

    fixframes.forEach((f, idx) => {
      const src = `Fix Frame #${idx + 1}`;
      const effOuter = resolveOuter(f.outer);
      const effGauge = masterGaugeActive ? ctxGauge : f.sectionGauge;
      computeOpenablePieces(
        f.width,
        f.height,
        f.qty,
        effOuter,
        'fix',
        fixFormula,
        f.extras,
        effGauge,
        fSectionFormula,
        f.d59Qty,
        f.d59aQty,
        f.d52Qty
      ).forEach((p) => all.push({ ...p, source: src, gauge: effGauge }));
    });

    openableWindows.forEach((op, idx) => {
      const src = `Openable Window #${idx + 1}`;
      const effOuter = resolveOuter(op.outer);
      const effGauge = masterGaugeActive ? ctxGauge : op.sectionGauge;
      computeOpenablePieces(
        op.width,
        op.height,
        op.qty,
        effOuter,
        'openwin',
        openwinFormula,
        op.extras,
        effGauge,
        fSectionFormula,
        op.d59Qty,
        op.d59aQty,
        op.d52Qty
      ).forEach((p) => all.push({ ...p, source: src, gauge: effGauge }));
    });

    slidingDoors.forEach((sd, idx) => {
      const src = `Sliding Door #${idx + 1} (${sd.panelCount} Palay)`;
      const effOuter = targetFt ? (targetFt === 'F' ? 'F' : targetFt === 'C' ? 'NORMAL' : targetFt) : sd.outer;
      const effGauge = masterGaugeActive ? ctxGauge : sd.sectionGauge;
      computeSlidingDoorPieces(
        { ...sd, outer: effOuter, sectionGauge: effGauge },
        slidingDoorFormula,
        fSectionFormula
      ).forEach((p) => all.push({ ...p, source: src, gauge: p.section === 'D31' ? '1.2' : effGauge }));
    });

    projectExtras.forEach((ex, idx) => {
      if (ex.lengthFt > 0 && ex.qty > 0) {
        const effGauge = masterGaugeActive ? ctxGauge : ex.gauge || ctxGauge;
        all.push({
          section: ex.section,
          length: ex.lengthFt * 12.0,
          qty: ex.qty,
          source: `Extra Piece #${idx + 1}`,
          label: `${ex.section} Extra profile (${ex.lengthFt} ft)`,
          gauge: effGauge,
        });
      }
    });

    return all;
  };

  const glassCuts = computeGlassCutsForState({
    windows,
    dgWindows,
    doors,
    fixframes,
    openableWindows,
    slidingDoors,
    glassFormulas,
    windowFormula,
    dgWindowFormula,
    slidingDoorFormula,
    glassFittingOption,
    measurementUnit,
    ctxGlassMode,
    ctxGlassGauge,
    ctxGlassColor,
  });

  const calculateQuotation = (overrideFt: string = ctxFrameType): QuotationResult => {
    const visiblePieces = getAllCutPieces(overrideFt).filter(
      (p) => !hiddenSections.includes(p.section) && !deletedSecs.includes(p.section)
    );
    const buckets: Record<string, CutPiece[]> = {};
    visiblePieces.forEach((p) => {
      const effectiveGauge = p.gauge || ctxGauge;
      const pGauge = pricingGaugeForSection(p.section, effectiveGauge);
      const key = `${p.section}|${pGauge}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(p);
    });

    const alumRows: AluminiumCostRow[] = [];
    let alumSubtotal = 0;

    Object.entries(buckets).forEach(([key, pieces]) => {
      const [sec, g] = key.split('|');
      const packed = packSection(pieces, barLengthsFor(sec));
      let totalBars = 0;
      let totalFt = 0;
      Object.entries(packed.tally).forEach(([lenStr, info]) => {
        totalBars += info.count;
        totalFt += info.count * Number(lenStr);
      });
      const rate = resolveSectionRate(rates, g, ctxColor, sec);
      const cost = totalFt * rate;
      if (totalBars > 0) {
        alumRows.push({
          section: sec,
          gauge: g,
          bars: totalBars,
          totalFt,
          ratePerFt: rate,
          cost,
        });
        alumSubtotal += cost;
      }
    });

    // Discount (%) deduction from Aluminium Subtotal (Replaces Markup %)
    const discountAmount = alumSubtotal * (Math.max(0, markupPct) / 100.0);
    const alumWithMarkup = Math.max(0, alumSubtotal - discountAmount);

    const totalUnits =
      windows.reduce((s, i) => s + i.qty, 0) +
      dgWindows.reduce((s, i) => s + i.qty, 0) +
      doors.reduce((s, i) => s + i.qty, 0) +
      fixframes.reduce((s, i) => s + i.qty, 0) +
      openableWindows.reduce((s, i) => s + i.qty, 0) +
      slidingDoors.reduce((s, i) => s + i.qty, 0);

    const hardwareTotal = layoutConfig.showHardwareRow ? totalUnits * hardwareRate : 0;

    const glassGroupMap: Record<string, { sqft: number; rate: number }> = {};
    glassCuts.forEach((cut) => {
      const key =
        cut.glassGauge === 'DG'
          ? `DG Glass ${cut.glassColor}`
          : `${cut.glassGauge}mm ${cut.glassColor}`;
      const rate =
        glassRates[cut.glassGauge]?.[cut.glassColor] ??
        (cut.glassGauge === 'DG' ? glassRates['DG']?.['CLEAR'] ?? 450 : 240);
      const cur = glassGroupMap[key] || { sqft: 0, rate };
      glassGroupMap[key] = { sqft: cur.sqft + cut.sqft, rate };
    });

    const glassLines: GlassCostLine[] = Object.entries(glassGroupMap).map(([key, val]) => ({
      description: `Glass ${key}`,
      sqft: val.sqft,
      rate: val.rate,
      total: val.sqft * val.rate,
    }));

    const glassTotal = glassLines.reduce((s, l) => s + l.total, 0);
    const effTransport = layoutConfig.showTransportRow ? transportRent : 0;
    const effLabour = layoutConfig.showLabourRow ? labourCost : 0;
    const grandTotal = alumWithMarkup + hardwareTotal + glassTotal + effTransport + effLabour;

    return {
      aluminiumRows: alumRows,
      alumTotal: alumSubtotal,
      alumWithMarkup,
      markupPct,
      totalUnits,
      hardwareTotal,
      glassTotal,
      glassLines,
      transportRent: effTransport,
      labourCost: effLabour,
      grandTotal,
    };
  };

  const allPiecesVisible = getAllCutPieces().filter((p) => !hiddenSections.includes(p.section));
  const sectionPiecesMap: Record<string, CutPiece[]> = {};
  allPiecesVisible.forEach((p) => {
    if (!sectionPiecesMap[p.section]) sectionPiecesMap[p.section] = [];
    sectionPiecesMap[p.section].push(p);
  });

  const activeQuote = calculateQuotation(ctxFrameType);
  const quoteC = calculateQuotation('C');
  const quoteF = calculateQuotation('F');

  const totalGlassPieces = glassCuts.reduce((sum, g) => sum + g.pieces, 0);
  const totalGlassSqFt = glassCuts.reduce((sum, g) => sum + g.sqft, 0);

  const drawTruncatedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    align: CanvasTextAlign = 'left'
  ) => {
    ctx.save();
    ctx.textAlign = align;
    let output = String(text || '');
    if (ctx.measureText(output).width > maxWidth) {
      while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
        output = output.slice(0, -1);
      }
      output = `${output}...`;
    }
    ctx.fillText(output, x, y);
    ctx.restore();
  };

  // High-Resolution Canvas Builder for Quotation & All Charts (used for both PNG & PDF)
  const buildChartExportCanvas = async (
    chartType: 'CUTTING' | 'LENGTH' | 'GLASS' | 'QUOTATION'
  ): Promise<{ canvas: HTMLCanvasElement; title: string } | null> => {
    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise((resolve) => {
        if (!src) return resolve(null);
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => resolve(im);
        im.onerror = () => resolve(null);
        im.src = src;
      });

    const lines: { left: string; mid?: string; right: string; highlight?: boolean }[] = [];
    let title = 'OFFICIAL QUOTATION';

    if (chartType === 'CUTTING') {
      title = 'WORKSHOP CUTTING CHART & BAR OPTIMIZATION';
      Object.entries(sectionPiecesMap).forEach(([sec, pcs]) => {
        const packed = packSection(pcs, barLengthsFor(sec));
        lines.push({
          left: `SECTION: ${SECTION_LABELS[sec] || sec} (${sec})`,
          right: `${packed.bins.length} Bar(s)`,
          highlight: true,
        });
        packed.bins.forEach((bar, bIdx) => {
          lines.push({
            left: `  BAR #${bIdx + 1} (${bar.lenFt} FT ${bar.isCustom ? 'OFFCUT' : 'BAR'})`,
            right: `Waste: ${formatDim(Math.max(0, bar.remainInches), measurementUnit)}`,
          });
          bar.pieces.forEach((p) => {
            lines.push({
              left: `    • ${p.source} — ${p.label}`,
              right: formatDim(p.length, measurementUnit),
            });
          });
        });
      });
    } else if (chartType === 'LENGTH') {
      title = 'STOCK BAR LENGTH CHART & ORDER TALLY';
      let grandBars = 0;
      let grandFt = 0;
      Object.entries(sectionPiecesMap).forEach(([sec, pcs]) => {
        const packed = packSection(pcs, barLengthsFor(sec));
        let tBars = 0;
        let tFt = 0;
        const bd = Object.entries(packed.tally)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([len, info]) => {
            tBars += info.count;
            tFt += Number(len) * info.count;
            return `${len}FT x ${info.count}`;
          })
          .join(' · ');
        grandBars += tBars;
        grandFt += tFt;
        lines.push({
          left: `${SECTION_LABELS[sec] || sec} (${sec})`,
          mid: bd,
          right: `${tBars} Bars (${tFt} ft)`,
        });
      });
      lines.push({
        left: 'GRAND TOTAL STOCK BARS & FEET',
        right: `${grandBars} Bars · ${grandFt} Feet`,
        highlight: true,
      });
    } else if (chartType === 'GLASS') {
      title = 'GLASS CUTTING SCHEDULE & TOTAL BILL';
      glassCuts.forEach((g) => {
        lines.push({
          left: `${g.frameLabel} (${
            g.glassGauge === 'DG' ? `DG Glass ${g.glassColor}` : `${g.glassGauge}mm ${g.glassColor}`
          })`,
          mid: `Cut: ${formatDim(g.gWpanel, measurementUnit)} x ${formatDim(g.gH, measurementUnit)} | Bill: ${g.billedWFt}x${g.billedHFt}ft`,
          right: `${g.pieces} Pcs · ${g.sqft.toFixed(2)} Sq.Ft`,
        });
      });
      activeQuote.glassLines.forEach((gl) => {
        lines.push({
          left: `${gl.description}`,
          mid: `${gl.sqft.toFixed(2)} Sq.Ft @ Rs ${gl.rate}/sq.ft`,
          right: `Rs ${Math.round(gl.total).toLocaleString()}`,
        });
      });
      lines.push({
        left: `GRAND TOTAL GLASS (${totalGlassPieces} Pcs · ${totalGlassSqFt.toFixed(2)} Sq.Ft)`,
        right: `Rs ${Math.round(activeQuote.glassTotal).toLocaleString()}`,
        highlight: true,
      });
    } else {
      title = 'OFFICIAL QUOTATION & COST SUMMARY';
      activeQuote.aluminiumRows.forEach((row) => {
        lines.push({
          left: `${SECTION_LABELS[row.section] || row.section} (${row.gauge}mm)`,
          mid: `${row.bars} Bars · ${row.totalFt} ft @ Rs ${Math.round(row.ratePerFt)}`,
          right: `Rs ${Math.round(row.cost).toLocaleString()}`,
        });
      });
      lines.push({
        left: 'Aluminium Gross Total',
        right: `Rs ${Math.round(activeQuote.alumTotal).toLocaleString()}`,
      });
      if (layoutConfig.showDiscountRow) {
        lines.push({
          left: `Discount (${markupPct}%)`,
          right: `- Rs ${Math.round(Math.max(0, activeQuote.alumTotal - activeQuote.alumWithMarkup)).toLocaleString()}`,
        });
      }
      lines.push({
        left: 'Aluminium Net Total (After Discount)',
        right: `Rs ${Math.round(activeQuote.alumWithMarkup).toLocaleString()}`,
        highlight: true,
      });
      if (layoutConfig.showHardwareRow) {
        lines.push({
          left: `Hardware (${activeQuote.totalUnits} units x Rs ${hardwareRate})`,
          right: `Rs ${Math.round(activeQuote.hardwareTotal).toLocaleString()}`,
        });
      }
      activeQuote.glassLines.forEach((gl) => {
        lines.push({
          left: `${gl.description} (${gl.sqft.toFixed(1)} sq.ft @ Rs ${gl.rate})`,
          right: `Rs ${Math.round(gl.total).toLocaleString()}`,
        });
      });
      if (layoutConfig.showTransportRow && activeQuote.transportRent > 0) {
        lines.push({
          left: 'Transport Rent',
          right: `Rs ${Math.round(activeQuote.transportRent).toLocaleString()}`,
        });
      }
      if (layoutConfig.showLabourRow && activeQuote.labourCost > 0) {
        lines.push({
          left: 'Labour / Installation',
          right: `Rs ${Math.round(activeQuote.labourCost).toLocaleString()}`,
        });
      }
      lines.push({
        left: 'NET GRAND TOTAL',
        right: `Rs ${Math.round(activeQuote.grandTotal).toLocaleString()}`,
        highlight: true,
      });
    }

    const width = 1100;
    const a4PageHeight = 1556; // Exact 210:297 A4 Portrait aspect ratio (1100 * 297 / 210)
    const rowH = chartType === 'QUOTATION' ? 42 : 38;
    const contentNeededH = 290 + lines.length * rowH + 130;
    const height =
      chartType === 'QUOTATION'
        ? Math.max(a4PageHeight, Math.ceil(contentNeededH / a4PageHeight) * a4PageHeight)
        : Math.max(760, contentNeededH);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0D1118';
    ctx.fillRect(0, 0, width, height);

    if (layoutConfig.showLetterheadBackground && letterheadBgUrl) {
      const bgImg = await loadImg(letterheadBgUrl);
      if (bgImg) {
        ctx.save();
        ctx.globalAlpha =
          layoutConfig.watermarkOpacity != null
            ? layoutConfig.watermarkOpacity / 100
            : layoutConfig.letterheadOpacity || 0.28;
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.restore();

        if ((layoutConfig.backgroundDarkness ?? 32) > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${(layoutConfig.backgroundDarkness ?? 32) / 100})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }
    }

    ctx.strokeStyle = '#F5B738';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    const logoImg = await loadImg(activeShopLogoUrl);
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(82, 82, 42, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 40, 40, 84, 84);
      ctx.restore();
      ctx.strokeStyle = '#F5B738';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(82, 82, 42, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#F5B738';
    ctx.font = 'bold 26px sans-serif';
    drawTruncatedText(ctx, companyName || 'BOSS ALUMINIUM & GLASS', 142, 66, 480);
    ctx.fillStyle = '#FDE68A';
    ctx.font = '600 14px sans-serif';
    drawTruncatedText(ctx, companyTagline || 'STRONGER · SMARTER · BETTER', 142, 92, 480);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '13px sans-serif';
    drawTruncatedText(ctx, `Phone: ${companyPhone} · ${companyAddress}`, 142, 116, 480);

    ctx.fillStyle = '#F5B738';
    ctx.font = 'bold 18px monospace';
    drawTruncatedText(ctx, title, width - 44, 68, 430, 'right');
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '13px monospace';
    drawTruncatedText(ctx, `Date: ${new Date().toLocaleDateString('en-GB')}`, width - 44, 94, 430, 'right');
    drawTruncatedText(
      ctx,
      `Customer: ${customerName || 'Valued Client'} ${customerPhone ? `(${customerPhone})` : ''}`,
      width - 44,
      118,
      430,
      'right'
    );

    ctx.strokeStyle = '#F5B738';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 142);
    ctx.lineTo(width - 40, 142);
    ctx.stroke();

    let y = 182;
    lines.forEach((ln) => {
      ctx.fillStyle = ln.highlight ? 'rgba(245, 183, 56, 0.16)' : 'rgba(12, 15, 20, 0.72)';
      ctx.fillRect(40, y - 24, width - 80, 32);

      ctx.fillStyle = ln.highlight ? '#F5B738' : '#F8FAFC';
      ctx.font = ln.highlight ? 'bold 15px sans-serif' : '14px sans-serif';
      drawTruncatedText(ctx, ln.left, 52, y - 3, ln.mid ? 375 : 700, 'left');

      if (ln.mid) {
        ctx.fillStyle = '#FDE68A';
        ctx.font = '13px monospace';
        drawTruncatedText(ctx, ln.mid, 438, y - 3, 390, 'left');
      }

      ctx.fillStyle = ln.highlight ? '#F5B738' : '#34D399';
      ctx.font = ln.highlight ? 'bold 16px monospace' : 'bold 14px monospace';
      drawTruncatedText(ctx, ln.right, width - 52, y - 3, 240, 'right');
      y += rowH;
    });

    ctx.strokeStyle = 'rgba(245, 183, 56, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 74);
    ctx.lineTo(width - 40, height - 74);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    drawTruncatedText(
      ctx,
      `Terms & Conditions: ${layoutConfig.quotationFooterTerms || ''}`,
      44,
      height - 44,
      width - 280,
      'left'
    );
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 12px sans-serif';
    drawTruncatedText(
      ctx,
      layoutConfig.quotationSignatureLabel || 'Authorized Signature',
      width - 44,
      height - 44,
      220,
      'right'
    );

    return { canvas, title };
  };

  // High-Resolution Canvas Builder for Saved History Quotation Item
  const buildHistoryExportCanvas = async (
    item: SavedQuotation
  ): Promise<{ canvas: HTMLCanvasElement; title: string } | null> => {
    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise((resolve) => {
        if (!src) return resolve(null);
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => resolve(im);
        im.onerror = () => resolve(null);
        im.src = src;
      });

    const lines: { left: string; mid?: string; right: string; highlight?: boolean }[] = [
      {
        left: 'Project Items Summary',
        mid: `${item.totalUnits} Total Units (${item.gauge}mm · ${item.color})`,
        right: item.itemsSummary,
      },
      {
        left: 'Aluminium Net Total',
        right: `Rs ${Math.round(item.alumTotal).toLocaleString()}`,
      },
      {
        left: 'Hardware Total',
        right: `Rs ${Math.round(item.hardwareTotal).toLocaleString()}`,
      },
      {
        left: 'Glass Total Bill',
        right: `Rs ${Math.round(item.glassTotal).toLocaleString()}`,
      },
    ];
    if (item.transportRent > 0) {
      lines.push({
        left: 'Transport Rent',
        right: `Rs ${Math.round(item.transportRent).toLocaleString()}`,
      });
    }
    if (item.labourCost > 0) {
      lines.push({
        left: 'Labour / Installation',
        right: `Rs ${Math.round(item.labourCost).toLocaleString()}`,
      });
    }
    lines.push({
      left: 'NET GRAND TOTAL',
      right: `Rs ${Math.round(item.grandTotal).toLocaleString()}`,
      highlight: true,
    });

    const width = 1100;
    const height = 1556; // Exact 210:297 A4 Portrait aspect ratio
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0D1118';
    ctx.fillRect(0, 0, width, height);

    if (layoutConfig.showLetterheadBackground && letterheadBgUrl) {
      const bgImg = await loadImg(letterheadBgUrl);
      if (bgImg) {
        ctx.save();
        ctx.globalAlpha =
          layoutConfig.watermarkOpacity != null
            ? layoutConfig.watermarkOpacity / 100
            : layoutConfig.letterheadOpacity || 0.28;
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.restore();

        if ((layoutConfig.backgroundDarkness ?? 32) > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${(layoutConfig.backgroundDarkness ?? 32) / 100})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }
    }

    ctx.strokeStyle = '#F5B738';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    const logoImg = await loadImg(activeShopLogoUrl);
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(82, 82, 42, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 40, 40, 84, 84);
      ctx.restore();
      ctx.strokeStyle = '#F5B738';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(82, 82, 42, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#F5B738';
    ctx.font = 'bold 26px sans-serif';
    drawTruncatedText(ctx, companyName || 'BOSS ALUMINIUM & GLASS', 142, 66, 480);
    ctx.fillStyle = '#FDE68A';
    ctx.font = '600 14px sans-serif';
    drawTruncatedText(ctx, companyTagline || 'STRONGER · SMARTER · BETTER', 142, 92, 480);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '13px sans-serif';
    drawTruncatedText(ctx, `Phone: ${companyPhone} · ${companyAddress}`, 142, 116, 480);

    const title = 'SAVED OFFICIAL QUOTATION';
    ctx.fillStyle = '#F5B738';
    ctx.font = 'bold 18px monospace';
    drawTruncatedText(ctx, title, width - 44, 68, 430, 'right');
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '13px monospace';
    drawTruncatedText(ctx, `Saved Date: ${item.timestamp}`, width - 44, 94, 430, 'right');
    drawTruncatedText(
      ctx,
      `Customer: ${item.customerName || item.label} ${item.customerPhone ? `(${item.customerPhone})` : ''}`,
      width - 44,
      118,
      430,
      'right'
    );

    ctx.strokeStyle = '#F5B738';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 142);
    ctx.lineTo(width - 40, 142);
    ctx.stroke();

    let y = 190;
    lines.forEach((ln) => {
      ctx.fillStyle = ln.highlight ? 'rgba(245, 183, 56, 0.18)' : 'rgba(12, 15, 20, 0.75)';
      ctx.fillRect(40, y - 26, width - 80, 38);

      ctx.fillStyle = ln.highlight ? '#F5B738' : '#F8FAFC';
      ctx.font = ln.highlight ? 'bold 16px sans-serif' : '15px sans-serif';
      drawTruncatedText(ctx, ln.left, 52, y - 2, ln.mid ? 270 : 700, 'left');

      if (ln.mid) {
        ctx.fillStyle = '#FDE68A';
        ctx.font = '13px monospace';
        drawTruncatedText(ctx, ln.mid, 330, y - 2, 460, 'left');
      }

      ctx.fillStyle = ln.highlight ? '#F5B738' : '#34D399';
      ctx.font = ln.highlight ? 'bold 17px monospace' : 'bold 15px monospace';
      drawTruncatedText(ctx, ln.right, width - 52, y - 2, 260, 'right');
      y += 46;
    });

    ctx.strokeStyle = 'rgba(245, 183, 56, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 74);
    ctx.lineTo(width - 40, height - 74);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    drawTruncatedText(
      ctx,
      `Terms & Conditions: ${layoutConfig.quotationFooterTerms || ''}`,
      44,
      height - 44,
      width - 280,
      'left'
    );
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 12px sans-serif';
    drawTruncatedText(
      ctx,
      layoutConfig.quotationSignatureLabel || 'Authorized Signature',
      width - 44,
      height - 44,
      220,
      'right'
    );

    return { canvas, title };
  };

  // Unified Export / Share Executor (PNG Picture OR Real Binary A4 PDF)
  const executeExportTarget = async (
    target:
      | { kind: 'CHART'; chartType: 'CUTTING' | 'LENGTH' | 'GLASS' | 'QUOTATION' }
      | { kind: 'HISTORY'; item: SavedQuotation },
    format: 'PNG' | 'PDF',
    action: 'SHARE' | 'DOWNLOAD',
    customToastMsg?: string
  ) => {
    setIsGeneratingExport(format);
    try {
      const built =
        target.kind === 'HISTORY'
          ? await buildHistoryExportCanvas(target.item)
          : await buildChartExportCanvas(target.chartType);
      if (!built) {
        showSettingsToast('Unable to render document for export.');
        return;
      }

      const { canvas, title } = built;
      const baseSlug =
        target.kind === 'HISTORY'
          ? `Boss-Quotation-${(target.item.customerName || 'Client').replace(/\s+/g, '-')}-${target.item.id}`
          : `Boss-${target.chartType.toLowerCase()}-${Date.now()}`;

      let fileToExport: File;
      if (format === 'PDF') {
        const pdfBlob = canvasToPdfBlob(canvas);
        fileToExport = new File([pdfBlob], `${baseSlug}.pdf`, { type: 'application/pdf' });
      } else {
        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (!pngBlob) {
          showSettingsToast('Unable to encode Picture (PNG).');
          return;
        }
        fileToExport = new File([pngBlob], `${baseSlug}.png`, { type: 'image/png' });
      }

      if (action === 'DOWNLOAD') {
        downloadBlobFile(fileToExport, fileToExport.name);
        showSettingsToast(
          customToastMsg ||
            `✅ ${format === 'PDF' ? 'PDF Document' : 'Picture (PNG)'} downloaded: ${fileToExport.name}`
        );
      } else {
        const shareResult = await shareOrDownloadFile({
          file: fileToExport,
          title: `${companyName} - ${title}`,
          text:
            target.kind === 'HISTORY'
              ? `${companyName} — Official Quotation for ${target.item.customerName || target.item.label} (Rs ${Math.round(
                  target.item.grandTotal
                ).toLocaleString()})`
              : `${companyName} — ${title} for ${customerName || 'Valued Client'}`,
          alsoDownloadOnFallback: true,
        });
        if (shareResult === 'shared') {
          showSettingsToast(`✅ ${format === 'PDF' ? 'PDF Document' : 'Picture (PNG)'} shared!`);
        } else if (shareResult === 'downloaded') {
          showSettingsToast(
            `✅ ${format === 'PDF' ? 'PDF Document' : 'Picture (PNG)'} saved — ready to share on WhatsApp!`
          );
        }
      }
      setShareModalTarget(null);
    } finally {
      setIsGeneratingExport(null);
    }
  };

  // Smart Print Handler: runs native window.print() first; if blocked inside iframe/WebView, opens interactive Print Preview Page (NO forced download!)
  const handlePrintDocument = async (
    target:
      | { kind: 'CHART'; chartType: 'CUTTING' | 'LENGTH' | 'GLASS' | 'QUOTATION' }
      | { kind: 'HISTORY'; item: SavedQuotation }
  ) => {
    const t0 = Date.now();
    let printErrored = false;
    try {
      window.print();
    } catch {
      printErrored = true;
    }
    const elapsed = Date.now() - t0;
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    // If native print dialog paused (>140ms) outside a blocked iframe, print dialog opened natively!
    if (!printErrored && !isIframe && elapsed >= 140) {
      return;
    }
    // Even in iframe, if native dialog blocked for >= 250ms it actually opened!
    if (!printErrored && elapsed >= 250) {
      return;
    }

    // Native print was blocked or non-blocking inside frame -> open visual Print Page Preview (NOT auto-download!)
    const built =
      target.kind === 'HISTORY'
        ? await buildHistoryExportCanvas(target.item)
        : await buildChartExportCanvas(target.chartType);
    if (!built) {
      showSettingsToast('Unable to prepare print page.');
      return;
    }

    const { canvas, title } = built;
    const previewImageUrl = canvas.toDataURL('image/png');
    const pdfBlob = canvasToPdfBlob(canvas);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const baseSlug =
      target.kind === 'HISTORY'
        ? `Boss-Quotation-${(target.item.customerName || 'Client').replace(/\s+/g, '-')}-${target.item.id}`
        : `Boss-${target.chartType.toLowerCase()}-${Date.now()}`;

    setPrintPreviewState((prev) => {
      if (prev?.pdfUrl) URL.revokeObjectURL(prev.pdfUrl);
      return {
        title,
        previewImageUrl,
        pdfUrl,
        fileName: `${baseSlug}.pdf`,
      };
    });
  };

  const getWhatsAppShareUrl = (
    target:
      | { kind: 'CHART'; chartType: 'CUTTING' | 'LENGTH' | 'GLASS' | 'QUOTATION' }
      | { kind: 'HISTORY'; item: SavedQuotation }
  ): string => {
    let msg = `*${companyName || 'BOSS ALUMINIUM & GLASS'}*\n`;
    if (target.kind === 'HISTORY') {
      const it = target.item;
      msg += `Saved Quotation: *${it.customerName || it.label}*\nColor: ${it.color} | Gauge: ${it.gauge}mm | Frame: ${it.frameType}\nItems: ${it.itemsSummary}\n*Net Grand Total: Rs ${Math.round(it.grandTotal).toLocaleString()}*`;
    } else if (target.chartType === 'QUOTATION') {
      msg += `Customer: *${customerName || 'Valued Client'}*${customerPhone ? ` (${customerPhone})` : ''}\nColor: ${ctxColor} | Gauge: ${ctxGauge}mm | Frame: ${ctxFrameType}\nAluminium (After ${markupPct}% Discount): Rs ${Math.round(activeQuote.alumWithMarkup).toLocaleString()}\nHardware: Rs ${Math.round(activeQuote.hardwareTotal).toLocaleString()}\nGlass: Rs ${Math.round(activeQuote.glassTotal).toLocaleString()}\n*NET GRAND TOTAL: Rs ${Math.round(activeQuote.grandTotal).toLocaleString()}*`;
    } else if (target.chartType === 'GLASS') {
      msg += `Glass Schedule (${totalGlassPieces} Pcs · ${totalGlassSqFt.toFixed(2)} Sq.Ft)\n*Total Glass Bill: Rs ${Math.round(activeQuote.glassTotal).toLocaleString()}*`;
    } else {
      msg += `${target.chartType} Chart for ${customerName || 'Valued Client'} (${ctxColor}, ${ctxGauge}mm, Frame ${ctxFrameType})`;
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const isTabLocked = (tabId: BossTab): boolean => {
    const keyAliases: Record<string, string> = {
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
      EXTRA: 'EXTRA_PIECES',
      EXTRA_PIECES: 'EXTRA_PIECES',
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
    const toLockBool = (val: unknown): boolean => {
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
    };
    const normalizeMap = (src: unknown): Record<string, boolean> => {
      const out: Record<string, boolean> = {};
      if (!src || typeof src !== 'object') return out;
      Object.entries(src as Record<string, unknown>).forEach(([k, v]) => {
        const cleaned = String(k || '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        const canon = keyAliases[cleaned] || cleaned;
        if (canon) out[canon] = toLockBool(v);
      });
      return out;
    };

    const normUserMap = normalizeMap(userLockedTabs);
    const normGlobalMap = normalizeMap(layoutConfig.lockedTabs || {});
    const reqCleaned = String(tabId || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const reqCanon = keyAliases[reqCleaned] || reqCleaned;

    // 1. Per-user locked_tabs strictly overrides Admin global layoutConfig.lockedTabs
    if (reqCanon in normUserMap) {
      return normUserMap[reqCanon];
    }

    // 2. Fallback to Admin global layoutConfig.lockedTabs (DG_WINDOWS defaults locked if unset)
    if (reqCanon === 'DG_WINDOWS') {
      return 'DG_WINDOWS' in normGlobalMap ? normGlobalMap.DG_WINDOWS : true;
    }
    return Boolean(normGlobalMap[reqCanon]);
  };

  const TABS: { id: BossTab; title: string; iconKey: string; isLocked?: boolean }[] = (
    [
      {
        id: 'WINDOWS' as BossTab,
        title: layoutConfig.tabCustomTitles.WINDOWS || 'Windows',
        iconKey: 'WINDOWS',
      },
      {
        id: 'DG_WINDOWS' as BossTab,
        title: layoutConfig.tabCustomTitles.DG_WINDOWS || 'DG.Windows',
        iconKey: 'DG_WINDOWS',
      },
      {
        id: 'DOORS' as BossTab,
        title: layoutConfig.tabCustomTitles.DOORS || 'Doors & Frames',
        iconKey: 'DOORS',
      },
      {
        id: 'EXTRA_PIECES' as BossTab,
        title: layoutConfig.tabCustomTitles.EXTRA_PIECES || 'Extra',
        iconKey: 'EXTRA',
      },
      { id: 'CUTTING' as BossTab, title: layoutConfig.tabCustomTitles.CUTTING || 'Cutting Chart', iconKey: 'CUTTING' },
      { id: 'LENGTH' as BossTab, title: layoutConfig.tabCustomTitles.LENGTH || 'Length Chart', iconKey: 'LENGTH' },
      { id: 'GLASS' as BossTab, title: layoutConfig.tabCustomTitles.GLASS || 'Glass Chart', iconKey: 'GLASS' },
      { id: 'QUOTATION' as BossTab, title: layoutConfig.tabCustomTitles.QUOTATION || 'Quotation', iconKey: 'QUOTATION' },
      {
        id: 'HISTORY' as BossTab,
        title: layoutConfig.tabCustomTitles.HISTORY || 'History',
        iconKey: 'HISTORY',
      },
      { id: 'RATES' as BossTab, title: layoutConfig.tabCustomTitles.RATES || 'Rates & Settings', iconKey: 'RATES' },
    ]
  )
    .map((t) => ({ ...t, isLocked: isTabLocked(t.id) }))
    .filter(
      (t) =>
        !(layoutConfig.deletedTabs || []).includes(t.id) &&
        layoutConfig.enabledTabs[t.id] !== false
    );

  const renderTabIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'WINDOWS':
        return <LayoutGrid className="w-3.5 h-3.5 shrink-0" />;
      case 'DG_WINDOWS':
        return <LayoutGrid className="w-3.5 h-3.5 shrink-0" />;
      case 'DOORS':
        return <DoorOpen className="w-3.5 h-3.5 shrink-0" />;
      case 'EXTRA':
        return <Puzzle className="w-3.5 h-3.5 shrink-0" />;
      case 'CUTTING':
        return <Scissors className="w-3.5 h-3.5 shrink-0" />;
      case 'LENGTH':
        return <Ruler className="w-3.5 h-3.5 shrink-0" />;
      case 'GLASS':
        return <Layers className="w-3.5 h-3.5 shrink-0" />;
      case 'QUOTATION':
        return <FileText className="w-3.5 h-3.5 shrink-0" />;
      case 'HISTORY':
        return <History className="w-3.5 h-3.5 shrink-0" />;
      case 'RATES':
        return <Settings className="w-3.5 h-3.5 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  const visibleBanners: AppOfferBanner[] = (() => {
    const list: AppOfferBanner[] = [];
    const seen = new Set<string>();
    const serverNow =
      (cloudAccessInfo?.serverNowMs && cloudAccessInfo.serverNowMs > 0
        ? cloudAccessInfo.serverNowMs
        : getEffectiveServerNowMs()) || Date.now();
    [activeOffer, ...(broadcasts || [])].forEach((b) => {
      if (!b || !b.id) return;
      if (seen.has(b.id)) return;
      seen.add(b.id);
      if (b.isActive === false || b.isVisible === false || b.showBanner === false) return;
      if (b.expiresAt && Number(b.expiresAt) > 0 && serverNow > Number(b.expiresAt)) return;
      if (dismissedBannerSignatures.includes(getBannerDismissKey(b))) return;
      list.push(b);
    });
    return list;
  })();

  return (
    <div className="space-y-2.5 sm:space-y-3 w-full max-w-full overflow-x-hidden">
      {/* =================================================================== */}
      {/* LIVE BROADCASTS, OFFERS & ANNOUNCEMENT BANNERS (SHOW/HIDE SYNCED)   */}
      {/* =================================================================== */}
      {visibleBanners.map((banner) => (
        <div
          key={getBannerDismissKey(banner)}
          className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-400 shadow-lg flex items-center justify-between gap-2 flex-wrap no-print"
        >
          <div className="flex items-center gap-2 min-w-0">
            {banner.imageUrl ? (
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-9 h-9 rounded-lg object-cover border border-[#F5B738] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#F5B738] text-black flex items-center justify-center font-black shrink-0">
                <Zap className="w-4 h-4 text-black" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase">
                  {banner.badgeText || 'OFFER'}
                </span>
                <span className="text-xs font-black text-white truncate">{banner.title}</span>
                {banner.discountPct && banner.discountPct > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300">
                    Save {banner.discountPct}% OFF!
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 truncate">{banner.message}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPackagesModal(true)}
              className="px-2.5 py-1 rounded-lg bg-[#F5B738] text-black text-[11px] font-black cursor-pointer"
            >
              👑 View Subscription Packages
            </button>
            <button
              type="button"
              onClick={() =>
                setDismissedBannerSignatures((prev) =>
                  Array.from(new Set([...prev, getBannerDismissKey(banner)]))
                )
              }
              className="boss-flat-btn p-1 rounded bg-black/40 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* =================================================================== */}
      {/* UNIFIED STICKY COMPACT MOBILE & DESKTOP HEADER BAR                  */}
      {/* =================================================================== */}
      <div className="sticky top-0 z-40 rounded-xl bg-[#0C0F14]/95 backdrop-blur border border-[#2B3441] p-1.5 sm:p-2.5 space-y-1 sm:space-y-1.5 shadow-lg no-print">
        {/* Row 1: Brand + Compact Action Pills (Done, Theme, Download/Install) */}
        <div className="flex items-center justify-between gap-1.5">
          <div
            onClick={() => onSelectTab('WINDOWS')}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 cursor-pointer flex-1"
          >
            <img
              src={mainLogoUrl}
              alt="Boss Aluminium Lion Emblem"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-[#F5B738] shrink-0 shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-[#F5B738] tracking-wide truncate leading-tight">
                {companyName || 'BOSS ALUMINIUM & GLASS'}
              </div>
              <div className="text-[9px] sm:text-[10px] text-amber-200/80 font-medium truncate leading-tight">
                {companyTagline || 'Aluminium & Glass Fabrication Works'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {layoutConfig.showDoneQuotationButton && (
              <button
                type="button"
                onClick={() => onSelectTab('QUOTATION')}
                className="w-7 h-7 rounded-full bg-[#F5B738] text-black hover:bg-amber-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="View Official Quotation"
                aria-label="View Official Quotation"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}

            {layoutConfig.showThemeStudioButton && (
              <button
                type="button"
                onClick={onOpenThemeStudio}
                className="w-7 h-7 rounded-full bg-[#1C222B] border border-[#F5B738]/70 text-[#F5B738] hover:bg-[#F5B738] hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title={`Theme Studio (${currentThemeName})`}
                aria-label={`Theme Studio (${currentThemeName})`}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            )}

            {(!isInstalled ||
              Boolean(
                mobileDownloadConfig?.androidUrl ||
                  mobileDownloadConfig?.androidApkUrl ||
                  mobileDownloadConfig?.windowsUrl ||
                  mobileDownloadConfig?.iosUrl ||
                  mobileDownloadConfig?.iosDownloadUrl ||
                  mobileDownloadConfig?.iosAppUrl
              )) && (
              <button
                type="button"
                onClick={onTriggerInstall}
                onDoubleClick={onTriggerInstall}
                className="w-7 h-7 rounded-full bg-[#1C222B] border border-[#F5B738]/70 text-[#F5B738] hover:bg-[#F5B738] hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Install Mobile App (Android / iOS / PC)"
                aria-label="Install Mobile App"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: 4 Compact Master Context Pills in ONE 4-Column Horizontal Row on Mobile */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {layoutConfig.showMasterGaugeSelector && (
            <div
              className={`px-1 sm:px-2 py-0.5 rounded-full border text-center min-w-0 flex items-center justify-center ${
                ctxGaugeMode === 'OFF'
                  ? 'bg-rose-950/60 border-rose-500/70'
                  : 'bg-[#14181F] border-slate-700/80'
              }`}
            >
              <select
                value={ctxGaugeMode === 'OFF' ? 'OFF' : ctxGauge}
                onChange={(e) => {
                  if (e.target.value === 'OFF') {
                    onSetCtxGauge(ctxGauge, 'OFF');
                  } else {
                    onSetCtxGauge(e.target.value, 'ON');
                  }
                }}
                className={`w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-center focus:outline-none cursor-pointer truncate ${
                  ctxGaugeMode === 'OFF' ? 'text-rose-300' : 'text-white'
                }`}
              >
                {GAUGES.map((g) => (
                  <option key={g} value={g} className="bg-[#14181F] text-white">
                    {g}mm
                  </option>
                ))}
                <option value="OFF" className="bg-[#14181F] text-rose-300">
                  Sep Gauge
                </option>
              </select>
            </div>
          )}

          {layoutConfig.showMasterColorSelector && (
            <div className="px-1 sm:px-2 py-0.5 rounded-full bg-[#14181F] border border-slate-700/80 text-center min-w-0 flex items-center justify-center">
              <select
                value={ctxColor}
                onChange={(e) => onSetCtxColor(e.target.value)}
                className="w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-[#F5B738] text-center focus:outline-none cursor-pointer truncate"
              >
                {availableColors.map((c) => (
                  <option key={c} value={c} className="bg-[#14181F] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {layoutConfig.showMasterFrameSelector && (
            <div
              className={`px-1 sm:px-2 py-0.5 rounded-full border text-center min-w-0 flex items-center justify-center ${
                ctxFrameType === 'OFF'
                  ? 'bg-rose-950/60 border-rose-500/70'
                  : 'bg-[#14181F] border-slate-700/80'
              }`}
            >
              <select
                value={ctxFrameType === 'F' || ctxFrameType === 'OFF' ? ctxFrameType : 'C'}
                onChange={(e) => onSetCtxFrameType(e.target.value)}
                className={`w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-center focus:outline-none cursor-pointer truncate ${
                  ctxFrameType === 'OFF' ? 'text-rose-300' : 'text-sky-400'
                }`}
              >
                <option value="C" className="bg-[#14181F] text-white">
                  Frame C
                </option>
                <option value="F" className="bg-[#14181F] text-white">
                  Frame F
                </option>
                {ctxFrameType === 'OFF' && (
                  <option value="OFF" hidden className="bg-[#14181F] text-rose-300">
                    Sep Frame
                  </option>
                )}
              </select>
            </div>
          )}

          {layoutConfig.showMasterGlassSelector && (
            <div
              className={`px-1 sm:px-2 py-0.5 rounded-full border text-center min-w-0 flex items-center justify-center ${
                ctxGlassMode === 'OFF'
                  ? 'bg-rose-950/60 border-rose-500/70'
                  : 'bg-[#14181F] border-slate-700/80'
              }`}
            >
              <select
                value={ctxGlassMode === 'OFF' ? 'OFF' : `${ctxGlassGauge}|${ctxGlassColor}`}
                onChange={(e) => {
                  if (e.target.value === 'OFF') {
                    onSetCtxGlass(ctxGlassGauge, ctxGlassColor, 'OFF');
                  } else {
                    const [g, c] = e.target.value.split('|');
                    onSetCtxGlass(g, c, 'ON');
                  }
                }}
                className={`w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-center focus:outline-none cursor-pointer truncate ${
                  ctxGlassMode === 'OFF' ? 'text-rose-300' : 'text-emerald-400'
                }`}
              >
                {Object.keys(glassRates || { '5': {}, '8': {} })
                  .filter((g) => g.toUpperCase() !== 'DG')
                  .flatMap((g) => {
                    const cols =
                      Object.keys(glassRates[g] || {}).length > 0
                        ? Object.keys(glassRates[g])
                        : g === '8'
                        ? glassColors8mm
                        : glassColors5mm;
                    return cols.map((gc) => (
                      <option key={`${g}|${gc}`} value={`${g}|${gc}`} className="bg-[#14181F] text-white">
                        {g}m {gc}
                      </option>
                    ));
                  })}
                <option value="OFF" className="bg-[#14181F] text-rose-300">
                  Sep Glass
                </option>
              </select>
            </div>
          )}
        </div>

        {/* Row 3: Slim Client Utility Strip (Unit Switcher + Plan Badge + Request + Rates + Logout) */}
        <div className="flex items-center justify-between gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-[#14181F] border border-[#2B3441] text-[10px]">
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'INCH_SUTAR', label: 'Inch & Sutar' },
                { id: 'CM', label: 'Centimeter' },
                { id: 'MM', label: 'Millimeter' },
              ] as const
            ).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSetMeasurementUnit(u.id)}
                className={`boss-flat-btn h-6 px-1.5 sm:px-2 rounded-md text-[9.5px] sm:text-[10px] font-extrabold whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                  measurementUnit === u.id
                    ? 'bg-[#F5B738] text-black'
                    : 'bg-[#0C0F14] border border-slate-700 text-slate-200 hover:border-[#F5B738]'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Exact Role Badge (OWNER VIP / ADMIN / CLIENT) + Active Plan Badge */}
            {(() => {
              const effectiveNow =
                (cloudAccessInfo?.serverNowMs && cloudAccessInfo.serverNowMs > 0
                  ? cloudAccessInfo.serverNowMs
                  : getEffectiveServerNowMs()) || Date.now();
              const daysLeft =
                cloudAccessInfo?.expiresAt && cloudAccessInfo.expiresAt > effectiveNow
                  ? Math.max(1, Math.ceil((cloudAccessInfo.expiresAt - effectiveNow) / 86400000))
                  : null;
              const isOwnerAccount = Boolean(
                authSession &&
                  isOwnerIdentity({
                    email: authSession.email,
                    phone: authSession.phone,
                    cnic: authSession.cnic,
                    masterCfg: loadCachedMasterEngineConfig(),
                  })
              );
              const detectedRole: BossUserRole = isOwnerAccount
                ? 'OWNER'
                : cloudAccessInfo?.role || authSession?.userRole || 'CLIENT';
              const roleLabel =
                detectedRole === 'OWNER'
                  ? 'OWNER VIP'
                  : detectedRole === 'ADMIN'
                  ? 'ADMIN'
                  : 'CLIENT';
              const isVip = detectedRole === 'OWNER' || cloudAccessInfo?.status === 'FREE';
              const isPro = !isVip && cloudAccessInfo?.status === 'ACTIVE';
              const planBadgeText = isVip
                ? 'VIP'
                : isPro
                ? `PRO${daysLeft ? ` ${daysLeft}d` : ''}`
                : `TRIAL${daysLeft ? ` ${daysLeft}d` : ''}`;
              return (
                <>
                  <span
                    className={`h-6 px-1.5 sm:px-2 rounded-full border text-[9px] font-black flex items-center gap-1 shrink-0 ${
                      detectedRole === 'OWNER'
                        ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-300'
                        : detectedRole === 'ADMIN'
                        ? 'bg-purple-500/20 border-purple-400/70 text-purple-300'
                        : 'bg-slate-700/50 border-slate-500/70 text-slate-200'
                    }`}
                    title={
                      authSession
                        ? `${authSession.name} (${authSession.phone || authSession.email}) · Role: ${roleLabel}`
                        : `Role: ${roleLabel}`
                    }
                  >
                    {detectedRole === 'OWNER' ? (
                      <Crown className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <span>{roleLabel}</span>
                  </span>
                  {detectedRole !== 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => setShowPackagesModal(true)}
                      className={`boss-flat-btn h-6 px-1.5 sm:px-2 rounded-full border text-[9px] font-black flex items-center gap-1 cursor-pointer shrink-0 ${
                        isVip
                          ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                          : isPro
                          ? 'bg-amber-500/15 border-[#F5B738]/70 text-[#F5B738]'
                          : 'bg-sky-500/15 border-sky-500/60 text-sky-300'
                      }`}
                      title={
                        authSession
                          ? `${authSession.name} (${authSession.phone}) — Click to view Plans`
                          : 'Subscription Plans'
                      }
                    >
                      <Crown className="w-2.5 h-2.5 shrink-0" />
                      <span>{planBadgeText}</span>
                    </button>
                  )}
                </>
              );
            })()}

            {!isOnline && (
              <span
                className="h-6 px-1.5 sm:px-2 rounded-full bg-amber-500/20 border border-amber-500/70 text-amber-300 text-[9px] font-black flex items-center gap-1 shrink-0"
                title="Offline Mode — Calculator & Local Saved Data Active"
              >
                <WifiOff className="w-2.5 h-2.5 shrink-0" />
                <span>Offline</span>
              </span>
            )}

            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={() => onSyncFromSupabase?.({ forceRates: true, silent: false })}
              className="boss-flat-btn h-6 px-2 rounded-full bg-sky-500/15 border border-sky-500/50 text-sky-300 hover:bg-sky-500 hover:text-black flex items-center gap-1 cursor-pointer text-[9px] font-black shrink-0"
              title="Sync / Check Updates from Admin Cloud"
              aria-label="Sync / Check Updates"
            >
              <RefreshCw className={`w-2.5 h-2.5 shrink-0 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isSyncingCloud ? 'Syncing...' : 'Sync / Check Updates'}
              </span>
            </button>
            <button
              type="button"
              onClick={openSupportModal}
              className="boss-flat-btn relative w-6 h-6 rounded-full bg-sky-500/15 border border-sky-500/50 text-sky-300 hover:bg-sky-500 hover:text-black flex items-center justify-center cursor-pointer"
              title="Support Team Request & Messages Box"
              aria-label="Support Team Request Box"
            >
              <MessageSquarePlus className="w-3 h-3" />
              {unreadAdminSupportCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black flex items-center justify-center leading-none border border-[#0C0F14]">
                  {unreadAdminSupportCount > 9 ? '9+' : unreadAdminSupportCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('RATES')}
              className="boss-flat-btn w-6 h-6 rounded-full bg-[#1C222B] border border-slate-700 text-[#F5B738] hover:border-[#F5B738] flex items-center justify-center cursor-pointer"
              title="Rates & Settings"
              aria-label="Rates & Settings"
            >
              <Settings className="w-3 h-3" />
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="boss-flat-btn w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/50 text-rose-300 hover:bg-rose-500 hover:text-white flex items-center justify-center cursor-pointer"
                title={`Logout (${authSession?.name || 'Account'})`}
                aria-label="Logout"
              >
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Row 4: Compact Horizontal Tab Strip */}
        <div className="w-full max-w-full flex items-center gap-1 overflow-x-auto pt-0.5 custom-scrollbar">
          {TABS.map((tab) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-[#F5B738] text-black shadow-sm'
                    : 'text-slate-300 hover:bg-[#1C222B] hover:text-white'
                }`}
              >
                {renderTabIcon(tab.iconKey)}
                <span>{tab.title}</span>
                {tab.isLocked && (
                  <Lock
                    className={`w-3 h-3 shrink-0 ${
                      isSelected ? 'text-black' : 'text-amber-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isTabLocked(currentTab) ? (
        <div className="p-6 sm:p-10 rounded-2xl bg-[#14181F] border border-amber-500/40 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/50 text-[#F5B738] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-[#F5B738]">
              {TABS.find((t) => t.id === currentTab)?.title ||
                layoutConfig.tabCustomTitles[currentTab] ||
                currentTab}{' '}
              Locked
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              This module is currently locked from the Admin Panel. Once the Admin unlocks it, tap Sync to activate it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSyncFromSupabase?.({ forceRates: false, silent: false })}
            disabled={isSyncingCloud}
            className="boss-flat-btn px-4 py-2 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Syncing...' : 'Sync / Check Updates'}</span>
          </button>
        </div>
      ) : (
        <>
      {/* =================================================================== */}
      {/* TAB 1: SLIDING WINDOWS SCREEN                                       */}
      {/* =================================================================== */}
      {currentTab === 'WINDOWS' && (() => {
        const standardWindows = windows;
        const handleAddStandardWindow = () => {
          const ft = ctxFrameType === 'F' ? 'F' : 'C';
          const newWin: WindowItem = {
            id: `win-${Date.now()}`,
            width: 48,
            height: 60,
            qty: 1,
            frameType: ft,
            sectionGauge: ctxGaugeMode === 'ON' ? ctxGauge : '1.6',
            glassGauge: ctxGlassMode === 'ON' ? ctxGlassGauge : '5',
            glassColor: ctxGlassMode === 'ON' ? ctxGlassColor : 'CLEAR',
            glassEnabled: true,
            m24Qty: windowFormula.m24Qty ?? 4,
            m24aQty: 0,
            d29HeightQty: windowFormula.d29HeightQty ?? 2,
            d29WidthQty: windowFormula.d29WidthQty ?? 2,
            extras: [],
            outerSection: ft === 'F' ? 'DC30F' : 'DC30C',
            panelCount: 2,
            lockType: 'LATCH',
          };
          onUpdateWindows([...windows, newWin]);
        };

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-[#F5B738] truncate">
                  Sliding Windows ({standardWindows.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddStandardWindow}
                className="boss-flat-btn w-7 h-7 rounded-lg bg-[#F5B738] text-black hover:bg-amber-400 flex items-center justify-center shrink-0 cursor-pointer shadow"
                title="Add Window"
                aria-label="Add Window"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {standardWindows.length === 0 ? (
              <div className="p-6 sm:p-10 rounded-xl bg-[#14181F] border border-[#2B3441] text-center text-xs text-slate-400">
                No windows added yet. Tap &quot;+ Add Window&quot; above to start calculating.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {standardWindows.map((win, idx) => {
                  const isFrameLocked = ctxFrameType !== 'OFF';
                  const isLastWin = idx === standardWindows.length - 1;

                  return (
                    <div
                      key={win.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-extrabold text-[#F5B738] truncate">
                            Window #{idx + 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full border border-[#F5B738]/60 bg-[#0C0F14] text-[9.5px] font-mono font-bold text-[#F5B738] shrink-0">
                            {((win.width * win.height) / 144).toFixed(2)} sq.ft
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isLastWin && (
                            <button
                              type="button"
                              onClick={handleAddStandardWindow}
                              className="boss-flat-btn w-6 h-6 rounded-full bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center shadow cursor-pointer"
                              title="Add next window"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateWindows(windows.filter((w) => w.id !== win.id))
                            }
                            className="boss-flat-btn text-rose-400 hover:text-rose-300 p-1 shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Panels Selector (2 / 3 / 4 Palay) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-semibold shrink-0">Panels:</span>
                        <div className="flex items-center gap-1.5">
                          {[2, 3, 4].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() =>
                                onUpdateWindows(
                                  windows.map((w) =>
                                    w.id === win.id
                                      ? {
                                          ...w,
                                          panelCount: count,
                                          m24Qty:
                                            count === 3
                                              ? (windowFormula.m24Qty3 ?? 6)
                                              : count === 4
                                              ? (windowFormula.m24Qty4 ?? 8)
                                              : (windowFormula.m24Qty ?? 4),
                                          d29HeightQty:
                                            count === 3
                                              ? (windowFormula.d29HeightQty3 ?? 4)
                                              : count === 4
                                              ? (windowFormula.d29HeightQty4 ?? 4)
                                              : (windowFormula.d29HeightQty ?? 2),
                                          d29WidthQty:
                                            count === 3
                                              ? (windowFormula.d29WidthQty3 ?? 4)
                                              : count === 4
                                              ? (windowFormula.d29WidthQty4 ?? 4)
                                              : (windowFormula.d29WidthQty ?? 2),
                                        }
                                      : w
                                  )
                                )
                              }
                              className={`boss-flat-btn px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                win.panelCount === count
                                  ? 'bg-[#F5B738] text-black'
                                  : 'bg-[#0C0F14] text-slate-300 border border-slate-700'
                              }`}
                            >
                              {count} Palay
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lock / Handle Selector */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-semibold shrink-0">
                          Lock / Handle:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(['LATCH', 'PUSH_HANDLE'] as const).map((lk) => (
                            <button
                              key={lk}
                              type="button"
                              onClick={() =>
                                onUpdateWindows(
                                  windows.map((w) =>
                                    w.id === win.id ? { ...w, lockType: lk } : w
                                  )
                                )
                              }
                              className={`boss-flat-btn px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                win.lockType === lk
                                  ? lk === 'PUSH_HANDLE'
                                    ? 'bg-sky-500 text-black'
                                    : 'bg-[#F5B738] text-black'
                                  : 'bg-[#0C0F14] text-slate-300 border border-slate-700'
                              }`}
                            >
                              {lk === 'LATCH' ? 'Latch' : 'Push Handle'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Width, Height, Qty Inputs — 3 Columns Side-by-Side on Mobile */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                            Width ({unitLabel(measurementUnit)})
                          </label>
                          <input
                            type="text"
                            defaultValue={formatDimValueOnly(win.width, measurementUnit)}
                            onBlur={(e) => {
                              const parsed = parseDimToInches(e.target.value, measurementUnit);
                              if (parsed > 0) {
                                onUpdateWindows(
                                  windows.map((w) =>
                                    w.id === win.id ? { ...w, width: parsed } : w
                                  )
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                            Height ({unitLabel(measurementUnit)})
                          </label>
                          <input
                            type="text"
                            defaultValue={formatDimValueOnly(win.height, measurementUnit)}
                            onBlur={(e) => {
                              const parsed = parseDimToInches(e.target.value, measurementUnit);
                              if (parsed > 0) {
                                onUpdateWindows(
                                  windows.map((w) =>
                                    w.id === win.id ? { ...w, height: parsed } : w
                                  )
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Qty</label>
                          <input
                            type="number"
                            value={win.qty}
                            onChange={(e) =>
                              onUpdateWindows(
                                windows.map((w) =>
                                  w.id === win.id
                                    ? { ...w, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                    : w
                                )
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                      </div>

                      {/* Section Pill + Glass Checkbox Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="px-2.5 py-1.5 rounded-full bg-[#0C0F14] border border-slate-700/80 flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[11px] text-slate-400 shrink-0">Section:</span>
                          <select
                            disabled={isFrameLocked}
                            value={isFrameLocked ? (ctxFrameType === 'F' ? 'F' : 'C') : win.frameType}
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateWindows(
                                windows.map((w) =>
                                  w.id === win.id
                                    ? {
                                        ...w,
                                        frameType: val,
                                        outerSection: val === 'F' ? 'DC30F' : val === 'C' ? 'DC30C' : val,
                                      }
                                    : w
                                )
                              );
                            }}
                            className="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-slate-200 disabled:text-slate-300 focus:outline-none cursor-pointer truncate"
                          >
                            <option value="C" className="bg-[#14181F] text-white">
                              Frame C (DC30C / DC26C)
                            </option>
                            <option value="F" className="bg-[#14181F] text-white">
                              Frame F (DC30F / DC26F)
                            </option>
                            <optgroup label="DG.SERIES" className="bg-[#14181F]">
                              {DEFAULT_SECTIONS.filter((s) => s.startsWith('DG') || s.startsWith('GSPR')).map(
                                (sec) => (
                                  <option key={sec} value={sec} className="bg-[#14181F] text-white">
                                    {sec} {SECTION_LABELS[sec] ? `· ${SECTION_LABELS[sec]}` : ''}
                                  </option>
                                )
                              )}
                            </optgroup>
                            <optgroup label="Standard & Custom" className="bg-[#14181F]">
                              {Array.from(new Set([...customSections, ...DEFAULT_SECTIONS.filter((s) => !s.startsWith('DG') && !s.startsWith('GSPR'))])).map(
                                (sec) => (
                                  <option key={sec} value={sec} className="bg-[#14181F] text-white">
                                    {sec} {SECTION_LABELS[sec] ? `· ${SECTION_LABELS[sec]}` : ''}
                                  </option>
                                )
                              )}
                            </optgroup>
                          </select>
                          <button
                            type="button"
                            onClick={() => onSetCtxFrameType(isFrameLocked ? 'OFF' : 'C')}
                            className={`boss-flat-btn p-0.5 rounded shrink-0 cursor-pointer ${
                              isFrameLocked ? 'text-slate-400 hover:text-[#F5B738]' : 'text-[#F5B738]'
                            }`}
                            title={
                              isFrameLocked
                                ? 'Main Frame Locked — Tap to Unlock Separate Frame'
                                : 'Separate Frame Unlocked — Tap to Lock'
                            }
                          >
                            {isFrameLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        </div>

                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={win.glassEnabled}
                            onChange={(e) =>
                              onUpdateWindows(
                                windows.map((w) =>
                                  w.id === win.id ? { ...w, glassEnabled: e.target.checked } : w
                                )
                              )
                            }
                            className="w-4 h-4 rounded accent-[#F5B738] cursor-pointer"
                          />
                          <span>Glass</span>
                        </label>
                      </div>

                      {/* Per-Frame Gauge & Glass 3-Chip Strip */}
                      {renderFrameGaugeAndGlassControls({
                        sectionGauge: win.sectionGauge,
                        onChangeGauge: (g) =>
                          onUpdateWindows(
                            windows.map((w) =>
                              w.id === win.id ? { ...w, sectionGauge: g } : w
                            )
                          ),
                        glassEnabled: win.glassEnabled,
                        onChangeGlassEnabled: (en) =>
                          onUpdateWindows(
                            windows.map((w) =>
                              w.id === win.id ? { ...w, glassEnabled: en } : w
                            )
                          ),
                        glassGauge: win.glassGauge,
                        glassColor: win.glassColor,
                        onChangeGlassSpec: (g, col) =>
                          onUpdateWindows(
                            windows.map((w) =>
                              w.id === win.id
                                ? { ...w, glassGauge: g, glassColor: col }
                                : w
                            )
                          ),
                      })}

                      {/* Piece Steppers Row: M24 Pcs, M24A Pcs, D29 (H), D29 (W) */}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        {[
                          {
                            label: 'M24 Pcs',
                            val: win.m24Qty,
                            set: (v: number) =>
                              onUpdateWindows(
                                windows.map((w) => (w.id === win.id ? { ...w, m24Qty: v } : w))
                              ),
                          },
                          {
                            label: 'M24A Pcs',
                            val: win.m24aQty,
                            set: (v: number) =>
                              onUpdateWindows(
                                windows.map((w) => (w.id === win.id ? { ...w, m24aQty: v } : w))
                              ),
                          },
                          {
                            label: 'D29 (H)',
                            val: win.d29HeightQty,
                            set: (v: number) =>
                              onUpdateWindows(
                                windows.map((w) =>
                                  w.id === win.id ? { ...w, d29HeightQty: v } : w
                                )
                              ),
                          },
                          {
                            label: 'D29 (W)',
                            val: win.d29WidthQty,
                            set: (v: number) =>
                              onUpdateWindows(
                                windows.map((w) =>
                                  w.id === win.id ? { ...w, d29WidthQty: v } : w
                                )
                              ),
                          },
                        ].map((cnt, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-1 rounded-lg bg-[#0C0F14] border border-slate-800 text-center"
                          >
                            <div className="text-[9px] text-slate-400 truncate">{cnt.label}</div>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5 font-mono text-[11px]">
                              <button
                                type="button"
                                onClick={() => cnt.set(Math.max(0, cnt.val - 1))}
                                className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-bold text-white tabular-nums">{cnt.val}</span>
                              <button
                                type="button"
                                onClick={() => cnt.set(cnt.val + 1)}
                                className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isLastWin && (
                        <button
                          type="button"
                          onClick={handleAddStandardWindow}
                          className="boss-flat-btn w-full py-1.5 rounded-lg bg-[#0C0F14] hover:bg-[#F5B738] border border-dashed border-[#F5B738]/60 text-[#F5B738] hover:text-black text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Next Window</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* TAB 1B: DG.WINDOWS SCREEN (ADMIN LOCK / UNLOCK CONTROLLED)          */}
      {/* =================================================================== */}
      {currentTab === 'DG_WINDOWS' && (() => {
        const handleAddDgWindow = () => {
          const ft = ctxFrameType === 'F' ? 'F' : 'C';
          const dgCols =
            Object.keys(glassRates['DG'] || {}).length > 0
              ? Object.keys(glassRates['DG'])
              : DEFAULT_GLASS_COLORS_DG;
          const newDw: DgWindowItem = {
            id: `dgwin-${Date.now()}`,
            width: 48,
            height: 60,
            qty: 1,
            frameType: ft,
            sectionGauge: ctxGaugeMode === 'ON' ? ctxGauge : '1.6',
            glassGauge: 'DG',
            glassColor: dgCols[0] || 'CLEAR',
            glassEnabled: true,
            panelCount: 2,
            lockType: 'LATCH',
            dg23aHQty: 0,
            dg23aWQty: 0,
            dg24aHQty: 0,
            dg24aWQty: 0,
            extras: [],
          };
          onUpdateDgWindows([...dgWindows, newDw]);
        };

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-[#F5B738] truncate">
                  DG.Windows ({dgWindows.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddDgWindow}
                className="boss-flat-btn w-7 h-7 rounded-lg bg-[#F5B738] text-black hover:bg-amber-400 flex items-center justify-center shrink-0 cursor-pointer shadow"
                title="Add DG.Window"
                aria-label="Add DG.Window"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {dgWindows.length === 0 ? (
              <div className="p-6 sm:p-10 rounded-xl bg-[#14181F] border border-[#2B3441] text-center space-y-2.5">
                <div className="text-xs text-slate-400">
                  No DG.Windows added yet. Tap &quot;+&quot; above to start calculating.
                </div>
                <button
                  type="button"
                  onClick={handleAddDgWindow}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F5B738] text-black text-[11px] font-extrabold hover:bg-amber-400 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First DG.Window</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {dgWindows.map((dw, idx) => {
                  const isFrameLocked = ctxFrameType !== 'OFF';
                  const activeFrame = isFrameLocked
                    ? ctxFrameType === 'F'
                      ? 'F'
                      : 'C'
                    : dw.frameType === 'F'
                    ? 'F'
                    : 'C';
                  const isLastDw = idx === dgWindows.length - 1;

                  return (
                    <div
                      key={dw.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-extrabold text-[#F5B738] truncate">
                            DG.Window #{idx + 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full border border-[#F5B738]/60 bg-[#0C0F14] text-[9.5px] font-mono font-bold text-[#F5B738] shrink-0">
                            {((dw.width * dw.height) / 144).toFixed(2)} sq.ft
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isLastDw && (
                            <button
                              type="button"
                              onClick={handleAddDgWindow}
                              className="boss-flat-btn w-6 h-6 rounded-full bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center shadow cursor-pointer"
                              title="Add next DG.Window"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateDgWindows(dgWindows.filter((item) => item.id !== dw.id))
                            }
                            className="boss-flat-btn text-rose-400 hover:text-rose-300 p-1 shrink-0 cursor-pointer"
                            title="Remove DG.Window"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Panels Selector (2 / 3 / 4 Palay) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-semibold shrink-0">Panels:</span>
                        <div className="flex items-center gap-1.5">
                          {[2, 3, 4].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() =>
                                onUpdateDgWindows(
                                  dgWindows.map((item) =>
                                    item.id === dw.id ? { ...item, panelCount: count } : item
                                  )
                                )
                              }
                              className={`boss-flat-btn px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                dw.panelCount === count
                                  ? 'bg-[#F5B738] text-black'
                                  : 'bg-[#0C0F14] text-slate-300 border border-slate-700'
                              }`}
                            >
                              {count} Palay
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lock / Handle Selector */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-semibold shrink-0">
                          Lock / Handle:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(['LATCH', 'PUSH_HANDLE'] as const).map((lk) => (
                            <button
                              key={lk}
                              type="button"
                              onClick={() =>
                                onUpdateDgWindows(
                                  dgWindows.map((item) =>
                                    item.id === dw.id ? { ...item, lockType: lk } : item
                                  )
                                )
                              }
                              className={`boss-flat-btn px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                dw.lockType === lk
                                  ? lk === 'PUSH_HANDLE'
                                    ? 'bg-sky-500 text-black'
                                    : 'bg-[#F5B738] text-black'
                                  : 'bg-[#0C0F14] text-slate-300 border border-slate-700'
                              }`}
                            >
                              {lk === 'LATCH' ? 'Latch' : 'Push Handle'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Width, Height, Qty Inputs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                            Width ({unitLabel(measurementUnit)})
                          </label>
                          <input
                            key={`${dw.id}-w-${dw.width}-${measurementUnit}`}
                            type="text"
                            defaultValue={formatDimValueOnly(dw.width, measurementUnit)}
                            onBlur={(e) => {
                              const parsed = parseDimToInches(e.target.value, measurementUnit);
                              if (parsed > 0) {
                                onUpdateDgWindows(
                                  dgWindows.map((item) =>
                                    item.id === dw.id ? { ...item, width: parsed } : item
                                  )
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                            Height ({unitLabel(measurementUnit)})
                          </label>
                          <input
                            key={`${dw.id}-h-${dw.height}-${measurementUnit}`}
                            type="text"
                            defaultValue={formatDimValueOnly(dw.height, measurementUnit)}
                            onBlur={(e) => {
                              const parsed = parseDimToInches(e.target.value, measurementUnit);
                              if (parsed > 0) {
                                onUpdateDgWindows(
                                  dgWindows.map((item) =>
                                    item.id === dw.id ? { ...item, height: parsed } : item
                                  )
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Qty</label>
                          <input
                            type="number"
                            value={dw.qty}
                            onChange={(e) =>
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id
                                    ? { ...item, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                    : item
                                )
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                      </div>

                      {/* Frame (C / F) + Glass Checkbox Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="px-2.5 py-1.5 rounded-full bg-[#0C0F14] border border-slate-700/80 flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[11px] text-slate-400 shrink-0">Frame:</span>
                          <select
                            disabled={isFrameLocked}
                            value={activeFrame}
                            onChange={(e) => {
                              const val = e.target.value === 'F' ? 'F' : 'C';
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id ? { ...item, frameType: val } : item
                                )
                              );
                            }}
                            className="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-slate-200 disabled:text-slate-300 focus:outline-none cursor-pointer truncate"
                          >
                            <option value="C" className="bg-[#14181F] text-white">
                              Frame C
                            </option>
                            <option value="F" className="bg-[#14181F] text-white">
                              Frame F
                            </option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onSetCtxFrameType(isFrameLocked ? 'OFF' : 'C')}
                            className={`boss-flat-btn p-0.5 rounded shrink-0 cursor-pointer ${
                              isFrameLocked ? 'text-slate-400 hover:text-[#F5B738]' : 'text-[#F5B738]'
                            }`}
                            title={
                              isFrameLocked
                                ? 'Main Frame Locked — Tap to Unlock Separate Frame'
                                : 'Separate Frame Unlocked — Tap to Lock'
                            }
                          >
                            {isFrameLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        </div>

                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dw.glassEnabled}
                            onChange={(e) =>
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id
                                    ? { ...item, glassEnabled: e.target.checked }
                                    : item
                                )
                              )
                            }
                            className="w-4 h-4 rounded accent-[#F5B738] cursor-pointer"
                          />
                          <span>Glass</span>
                        </label>
                      </div>

                      {/* Per-Frame Gauge & Glass 3-Chip Strip */}
                      {renderFrameGaugeAndGlassControls({
                        sectionGauge: dw.sectionGauge,
                        onChangeGauge: (g) =>
                          onUpdateDgWindows(
                            dgWindows.map((item) =>
                              item.id === dw.id ? { ...item, sectionGauge: g } : item
                            )
                          ),
                        glassEnabled: dw.glassEnabled,
                        onChangeGlassEnabled: (en) =>
                          onUpdateDgWindows(
                            dgWindows.map((item) =>
                              item.id === dw.id ? { ...item, glassEnabled: en } : item
                            )
                          ),
                        glassGauge: 'DG',
                        glassColor: dw.glassColor,
                        isDgMode: true,
                        onChangeGlassSpec: (_g, col) =>
                          onUpdateDgWindows(
                            dgWindows.map((item) =>
                              item.id === dw.id
                                ? { ...item, glassGauge: 'DG', glassColor: col }
                                : item
                            )
                          ),
                      })}

                      {/* Optional Piece Steppers (Start at 0): DG.23A H, DG.23A W, DG.24A H, DG.24A W */}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        {[
                          {
                            label: 'DG.23A H',
                            val: dw.dg23aHQty || 0,
                            set: (v: number) =>
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id ? { ...item, dg23aHQty: v } : item
                                )
                              ),
                          },
                          {
                            label: 'DG.23A W',
                            val: dw.dg23aWQty || 0,
                            set: (v: number) =>
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id ? { ...item, dg23aWQty: v } : item
                                )
                              ),
                          },
                          {
                            label: 'DG.24A H',
                            val: dw.dg24aHQty || 0,
                            set: (v: number) =>
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id ? { ...item, dg24aHQty: v } : item
                                )
                              ),
                          },
                          {
                            label: 'DG.24A W',
                            val: dw.dg24aWQty || 0,
                            set: (v: number) =>
                              onUpdateDgWindows(
                                dgWindows.map((item) =>
                                  item.id === dw.id ? { ...item, dg24aWQty: v } : item
                                )
                              ),
                          },
                        ].map((cnt, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-1 rounded-lg bg-[#0C0F14] border border-slate-800 text-center"
                          >
                            <div className="text-[9px] text-slate-400 truncate">{cnt.label}</div>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5 font-mono text-[11px]">
                              <button
                                type="button"
                                onClick={() => cnt.set(Math.max(0, cnt.val - 1))}
                                className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-bold text-white tabular-nums">{cnt.val}</span>
                              <button
                                type="button"
                                onClick={() => cnt.set(cnt.val + 1)}
                                className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isLastDw && (
                        <button
                          type="button"
                          onClick={handleAddDgWindow}
                          className="boss-flat-btn w-full py-1.5 rounded-lg bg-[#0C0F14] hover:bg-[#F5B738] border border-dashed border-[#F5B738]/60 text-[#F5B738] hover:text-black text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Next DG.Window</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* TAB 2: DOORS & FRAMES SCREEN (4 UNDERLINE SUB-TABS)                 */}
      {/* =================================================================== */}
      {currentTab === 'DOORS' && (() => {
        const subMeta = {
          DOORS: { title: `Openable Doors (${doors.length})` },
          FIX: { title: `Fix Frames (${fixframes.length})` },
          OP_WIN: { title: `Openable Windows (${openableWindows.length})` },
          SLIDING: { title: `Sliding Doors (${slidingDoors.length})` },
        }[doorSubTab];

        const handleAddDoorTabItem = () => {
          if (doorSubTab === 'DOORS') {
            onUpdateDoors([
              ...doors,
              {
                id: `door-${Date.now()}`,
                width: 36,
                height: 84,
                qty: 1,
                outer: 'D54A',
                sectionGauge: ctxGauge,
                glassGauge: ctxGlassGauge,
                glassColor: ctxGlassColor,
                glassEnabled: true,
                d59Qty: 0,
                d59aQty: 0,
                d52Qty: 0,
                extras: [],
              },
            ]);
          } else if (doorSubTab === 'FIX') {
            onUpdateFixFrames([
              ...fixframes,
              {
                id: `fix-${Date.now()}`,
                width: 48,
                height: 48,
                qty: 1,
                outer: 'D54A',
                sectionGauge: ctxGauge,
                glassGauge: ctxGlassGauge,
                glassColor: ctxGlassColor,
                glassEnabled: true,
                d59Qty: 0,
                d59aQty: 0,
                d52Qty: 0,
                extras: [],
              },
            ]);
          } else if (doorSubTab === 'OP_WIN') {
            onUpdateOpenableWindows([
              ...openableWindows,
              {
                id: `opwin-${Date.now()}`,
                width: 36,
                height: 48,
                qty: 1,
                outer: 'D54A',
                sectionGauge: ctxGauge,
                glassGauge: ctxGlassGauge,
                glassColor: ctxGlassColor,
                glassEnabled: true,
                d59Qty: 0,
                d59aQty: 0,
                d52Qty: 0,
                extras: [],
              },
            ]);
          } else {
            onUpdateSlidingDoors([
              ...slidingDoors,
              {
                id: `sd-${Date.now()}`,
                width: 72,
                height: 84,
                qty: 1,
                outer: ctxFrameType === 'F' ? 'F' : 'NORMAL',
                m24Qty: 4,
                m24aQty: 0,
                d59Qty: 0,
                d59aQty: 0,
                d52Qty: 0,
                sectionGauge: ctxGauge,
                glassGauge: ctxGlassGauge,
                glassColor: ctxGlassColor,
                glassEnabled: true,
                extras: [],
                panelCount: 2,
                lockType: 'LATCH',
              },
            ]);
          }
        };

        return (
          <div className="space-y-2">
            {/* Underline Sub-Tab Strip */}
            <div className="flex items-center overflow-x-auto border-b border-[#2B3441] bg-[#14181F]/60 rounded-t-xl">
              {[
                { id: 'DOORS', label: 'Openable Doors' },
                { id: 'FIX', label: 'Fix Frames' },
                { id: 'OP_WIN', label: 'Openable Windows' },
                { id: 'SLIDING', label: 'Sliding Doors' },
              ].map((st) => {
                const isActive = doorSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setDoorSubTab(st.id as any)}
                    className={`boss-flat-btn px-2.5 py-2 text-[11px] font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'border-[#F5B738] text-[#F5B738]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Section Header Row: Title Left + Add Item Right */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-[#F5B738] truncate">
                {subMeta.title}
              </h3>

              <button
                type="button"
                onClick={handleAddDoorTabItem}
                className="boss-flat-btn w-7 h-7 rounded-lg bg-[#F5B738] text-black hover:bg-amber-400 flex items-center justify-center shrink-0 cursor-pointer shadow"
                title="Add Item"
                aria-label="Add Item"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Render items for active Door sub-tab */}
            {doorSubTab !== 'SLIDING' ? (
              (() => {
                const currentList =
                  doorSubTab === 'DOORS'
                    ? doors
                    : doorSubTab === 'FIX'
                    ? fixframes
                    : openableWindows;
                const updateFn =
                  doorSubTab === 'DOORS'
                    ? onUpdateDoors
                    : doorSubTab === 'FIX'
                    ? onUpdateFixFrames
                    : onUpdateOpenableWindows;
                const labelPrefix =
                  doorSubTab === 'DOORS'
                    ? 'Door'
                    : doorSubTab === 'FIX'
                    ? 'Fix Frame'
                    : 'Openable Window';
                const outerOptions = Array.from(
                  new Set([
                    'D54A',
                    'D51',
                    'D51A',
                    'D45',
                    'D45A',
                    'D42',
                    'D42F',
                    'D54F',
                    'D51F',
                    'D50',
                    'D50A',
                    'D50B',
                    'D41',
                    'D46',
                    ...customSections,
                    ...DEFAULT_SECTIONS,
                  ])
                );

                if (currentList.length === 0) {
                  return (
                    <div className="p-8 rounded-xl bg-[#14181F] border border-[#2B3441] text-center text-xs text-slate-400">
                      No {labelPrefix.toLowerCase()}s added yet. Tap &quot;+ Add Item&quot; above.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {currentList.map((item, idx) => {
                      const isLastItem = idx === currentList.length - 1;
                      return (
                      <div
                        key={item.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#F5B738] truncate">
                            {labelPrefix} #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded-full border border-[#F5B738]/60 bg-[#0C0F14] text-[9.5px] font-mono font-bold text-[#F5B738]">
                              {((item.width * item.height) / 144).toFixed(2)} sq.ft
                            </span>
                            {isLastItem && (
                              <button
                                type="button"
                                onClick={handleAddDoorTabItem}
                                className="boss-flat-btn w-6 h-6 rounded-full bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center shadow cursor-pointer"
                                title={`Add next ${labelPrefix}`}
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                updateFn(currentList.filter((i) => i.id !== item.id) as any)
                              }
                              className="boss-flat-btn text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Top 3-Col Counters Strip: D59, D59A, D52 */}
                        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-lg bg-[#0C0F14] border border-slate-800">
                          {[
                            {
                              label: 'D59 (Pcs)',
                              val: item.d59Qty,
                              set: (v: number) =>
                                updateFn(
                                  currentList.map((i) =>
                                    i.id === item.id ? { ...i, d59Qty: v } : i
                                  ) as any
                                ),
                            },
                            {
                              label: 'D59A (Pcs)',
                              val: item.d59aQty,
                              set: (v: number) =>
                                updateFn(
                                  currentList.map((i) =>
                                    i.id === item.id ? { ...i, d59aQty: v } : i
                                  ) as any
                                ),
                            },
                            {
                              label: 'D52 (Pcs)',
                              val: item.d52Qty,
                              set: (v: number) =>
                                updateFn(
                                  currentList.map((i) =>
                                    i.id === item.id ? { ...i, d52Qty: v } : i
                                  ) as any
                                ),
                            },
                          ].map((cnt, cIdx) => (
                            <div key={cIdx} className="text-center">
                              <div className="text-[9px] text-slate-400 truncate">{cnt.label}</div>
                              <div className="flex items-center justify-center gap-2 mt-0.5 font-mono text-xs">
                                <button
                                  type="button"
                                  onClick={() => cnt.set(Math.max(0, cnt.val - 1))}
                                  className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-bold text-white tabular-nums">{cnt.val}</span>
                                <button
                                  type="button"
                                  onClick={() => cnt.set(cnt.val + 1)}
                                  className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Width, Height, Qty — 3 Columns Side-by-Side */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                              Width ({unitLabel(measurementUnit)})
                            </label>
                            <input
                              type="text"
                              defaultValue={formatDimValueOnly(item.width, measurementUnit)}
                              onBlur={(e) => {
                                const parsed = parseDimToInches(e.target.value, measurementUnit);
                                if (parsed > 0) {
                                  updateFn(
                                    currentList.map((i) =>
                                      i.id === item.id ? { ...i, width: parsed } : i
                                    ) as any
                                  );
                                }
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                              Height ({unitLabel(measurementUnit)})
                            </label>
                            <input
                              type="text"
                              defaultValue={formatDimValueOnly(item.height, measurementUnit)}
                              onBlur={(e) => {
                                const parsed = parseDimToInches(e.target.value, measurementUnit);
                                if (parsed > 0) {
                                  updateFn(
                                    currentList.map((i) =>
                                      i.id === item.id ? { ...i, height: parsed } : i
                                    ) as any
                                  );
                                }
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">Qty</label>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) =>
                                updateFn(
                                  currentList.map((i) =>
                                    i.id === item.id
                                      ? { ...i, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                      : i
                                  ) as any
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                            />
                          </div>
                        </div>

                        {/* Outer Section Dropdown Left + Glass Checkbox Right */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <select
                              value={item.outer}
                              onChange={(e) =>
                                updateFn(
                                  currentList.map((i) =>
                                    i.id === item.id ? { ...i, outer: e.target.value } : i
                                  ) as any
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs text-slate-200 font-bold cursor-pointer focus:outline-none"
                            >
                              {outerOptions.map((o) => {
                                const resolvedLabel =
                                  ctxFrameType === 'F'
                                    ? `${o} → ${resolveOuterFrameSection(o)} (F)`
                                    : o;
                                return (
                                  <option key={o} value={o} className="bg-[#14181F] text-amber-300">
                                    {resolvedLabel}
                                  </option>
                                );
                              })}
                            </select>
                            {ctxFrameType === 'F' && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/50 text-[10px] font-bold text-sky-300 truncate">
                                F: {resolveOuterFrameSection(item.outer)}
                              </span>
                            )}
                          </div>

                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.glassEnabled}
                              onChange={(e) =>
                                updateFn(
                                  currentList.map((i) =>
                                    i.id === item.id ? { ...i, glassEnabled: e.target.checked } : i
                                  ) as any
                                )
                              }
                              className="w-4 h-4 rounded accent-[#F5B738] cursor-pointer"
                            />
                            <span>Glass</span>
                          </label>
                        </div>

                        {/* Per-Frame Gauge & Glass 3-Chip Strip */}
                        {renderFrameGaugeAndGlassControls({
                          sectionGauge: item.sectionGauge,
                          onChangeGauge: (g) =>
                            updateFn(
                              currentList.map((i) =>
                                i.id === item.id ? { ...i, sectionGauge: g } : i
                              ) as any
                            ),
                          glassEnabled: item.glassEnabled,
                          onChangeGlassEnabled: (en) =>
                            updateFn(
                              currentList.map((i) =>
                                i.id === item.id ? { ...i, glassEnabled: en } : i
                              ) as any
                            ),
                          glassGauge: item.glassGauge,
                          glassColor: item.glassColor,
                          onChangeGlassSpec: (g, col) =>
                            updateFn(
                              currentList.map((i) =>
                                i.id === item.id
                                  ? { ...i, glassGauge: g, glassColor: col }
                                  : i
                              ) as any
                            ),
                        })}

                        {isLastItem && (
                          <button
                            type="button"
                            onClick={handleAddDoorTabItem}
                            className="boss-flat-btn w-full py-1.5 rounded-lg bg-[#0C0F14] hover:bg-[#F5B738] border border-dashed border-[#F5B738]/60 text-[#F5B738] hover:text-black text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Next {labelPrefix}</span>
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : slidingDoors.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#14181F] border border-[#2B3441] text-center text-xs text-slate-400">
                No sliding doors added yet. Tap &quot;+ Add Item&quot; above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {slidingDoors.map((sd, idx) => {
                  const isLastSd = idx === slidingDoors.length - 1;
                  const isFrameLocked = ctxFrameType !== 'OFF';
                  const effOuter = isFrameLocked
                    ? ctxFrameType === 'F'
                      ? 'F'
                      : ctxFrameType === 'C'
                      ? 'NORMAL'
                      : ctxFrameType
                    : sd.outer || 'NORMAL';

                  return (
                    <div
                      key={sd.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#F5B738] truncate">
                          Sliding Door #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded-full border border-[#F5B738]/60 bg-[#0C0F14] text-[9.5px] font-mono font-bold text-[#F5B738]">
                            {((sd.width * sd.height) / 144).toFixed(2)} sq.ft
                          </span>
                          {isLastSd && (
                            <button
                              type="button"
                              onClick={handleAddDoorTabItem}
                              className="boss-flat-btn w-6 h-6 rounded-full bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center shadow cursor-pointer"
                              title="Add next sliding door"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSlidingDoors(slidingDoors.filter((i) => i.id !== sd.id))
                            }
                            className="boss-flat-btn text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 1. Panels Selector: 2 / 3 / 4 Palay */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-semibold shrink-0">Panels:</span>
                        <div className="flex items-center gap-1.5">
                          {[2, 3, 4].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() =>
                                onUpdateSlidingDoors(
                                  slidingDoors.map((i) =>
                                    i.id === sd.id
                                      ? {
                                          ...i,
                                          panelCount: count,
                                          m24Qty: count * 2,
                                          d29HeightQty:
                                            (i.d29HeightQty ?? 0) > 0
                                              ? count >= 3
                                                ? 4
                                                : 2
                                              : i.d29HeightQty ?? 0,
                                          d29WidthQty:
                                            (i.d29WidthQty ?? 0) > 0
                                              ? count >= 3
                                                ? 4
                                                : 2
                                              : i.d29WidthQty ?? 0,
                                        }
                                      : i
                                  )
                                )
                              }
                              className={`boss-flat-btn px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                (sd.panelCount || 2) === count
                                  ? 'bg-[#F5B738] text-black'
                                  : 'bg-[#0C0F14] text-slate-300 border border-slate-700'
                              }`}
                            >
                              {count} Palay
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Lock / Handle Selector: Latch Lock vs Push Handle */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-semibold shrink-0">
                          Lock / Handle:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(['LATCH', 'PUSH_HANDLE'] as const).map((lk) => (
                            <button
                              key={lk}
                              type="button"
                              onClick={() =>
                                onUpdateSlidingDoors(
                                  slidingDoors.map((i) =>
                                    i.id === sd.id ? { ...i, lockType: lk } : i
                                  )
                                )
                              }
                              className={`boss-flat-btn px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                (sd.lockType || 'LATCH') === lk
                                  ? lk === 'PUSH_HANDLE'
                                    ? 'bg-sky-500 text-black'
                                    : 'bg-[#F5B738] text-black'
                                  : 'bg-[#0C0F14] text-slate-300 border border-slate-700'
                              }`}
                            >
                              {lk === 'LATCH' ? 'Latch Lock' : 'Push Handle'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Piece Count Steppers Strip */}
                      <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-lg bg-[#0C0F14] border border-slate-800">
                        {[
                          {
                            label: 'M24 (Pcs)',
                            val: sd.m24Qty,
                            set: (v: number) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id ? { ...i, m24Qty: v } : i
                                )
                              ),
                          },
                          {
                            label: 'M24A (Pcs)',
                            val: sd.m24aQty,
                            set: (v: number) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id ? { ...i, m24aQty: v } : i
                                )
                              ),
                          },
                          {
                            label: 'D29 H',
                            val: sd.d29HeightQty ?? 0,
                            set: (v: number) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id ? { ...i, d29HeightQty: v } : i
                                )
                              ),
                          },
                          {
                            label: 'D29 W',
                            val: sd.d29WidthQty ?? 0,
                            set: (v: number) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id ? { ...i, d29WidthQty: v } : i
                                )
                              ),
                          },
                        ].map((cnt, cIdx) => (
                          <div key={cIdx} className="text-center">
                            <div className="text-[9px] text-slate-400 truncate">{cnt.label}</div>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5 font-mono text-xs">
                              <button
                                type="button"
                                onClick={() => cnt.set(Math.max(0, cnt.val - 1))}
                                className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-bold text-white tabular-nums">{cnt.val}</span>
                              <button
                                type="button"
                                onClick={() => cnt.set(cnt.val + 1)}
                                className="boss-flat-btn text-[#F5B738] font-black px-1 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 4. Width, Height, Qty — 3 Columns Side-by-Side */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                            Width ({unitLabel(measurementUnit)})
                          </label>
                          <input
                            type="text"
                            defaultValue={formatDimValueOnly(sd.width, measurementUnit)}
                            onBlur={(e) => {
                              const p = parseDimToInches(e.target.value, measurementUnit);
                              if (p > 0)
                                onUpdateSlidingDoors(
                                  slidingDoors.map((i) =>
                                    i.id === sd.id ? { ...i, width: p } : i
                                  )
                                );
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                            Height ({unitLabel(measurementUnit)})
                          </label>
                          <input
                            type="text"
                            defaultValue={formatDimValueOnly(sd.height, measurementUnit)}
                            onBlur={(e) => {
                              const p = parseDimToInches(e.target.value, measurementUnit);
                              if (p > 0)
                                onUpdateSlidingDoors(
                                  slidingDoors.map((i) =>
                                    i.id === sd.id ? { ...i, height: p } : i
                                  )
                                );
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Qty</label>
                          <input
                            type="number"
                            value={sd.qty}
                            onChange={(e) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id
                                    ? {
                                        ...i,
                                        qty: Math.max(1, parseInt(e.target.value, 10) || 1),
                                      }
                                    : i
                                )
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs sm:text-sm font-mono font-semibold text-white"
                          />
                        </div>
                      </div>

                      {/* 5. Outer Frame Pair Pill + Glass Checkbox Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="px-2.5 py-1.5 rounded-full bg-[#0C0F14] border border-slate-700/80 flex items-center gap-1.5 min-w-0 flex-1">
                          <select
                            disabled={isFrameLocked}
                            value={effOuter}
                            onChange={(e) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id ? { ...i, outer: e.target.value } : i
                                )
                              )
                            }
                            className="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-slate-200 disabled:text-slate-300 focus:outline-none cursor-pointer truncate"
                          >
                            <option value="NORMAL" className="bg-[#14181F] text-white">
                              Normal (Frame C)
                            </option>
                            <option value="F" className="bg-[#14181F] text-white">
                              F-Series (M30F / M26F)
                            </option>
                            <option value="DC30C / DC26C" className="bg-[#14181F] text-white">
                              Pair: DC30C / DC26C
                            </option>
                            <option value="DC30F / DC26F" className="bg-[#14181F] text-white">
                              Pair: DC30F / DC26F
                            </option>
                            <optgroup label="DG.SERIES" className="bg-[#14181F]">
                              <option value="DG.26 / DG.23" className="bg-[#14181F] text-white">
                                Pair: DG.26 / DG.23
                              </option>
                              <option value="DG.26F / DG.23" className="bg-[#14181F] text-white">
                                Pair: DG.26F / DG.23
                              </option>
                              <option value="DG.26 / DG.23L" className="bg-[#14181F] text-white">
                                Pair: DG.26 / DG.23L
                              </option>
                              {DEFAULT_SECTIONS.filter((s) => s.startsWith('DG') || s.startsWith('GSPR')).map(
                                (sec) => (
                                  <option key={sec} value={sec} className="bg-[#14181F] text-white">
                                    {sec} {SECTION_LABELS[sec] ? `· ${SECTION_LABELS[sec]}` : ''}
                                  </option>
                                )
                              )}
                            </optgroup>
                            {customSections.length > 0 && (
                              <optgroup label="Custom Sections" className="bg-[#14181F]">
                                {customSections.map((sec) => (
                                  <option key={sec} value={sec} className="bg-[#14181F] text-white">
                                    {sec} {SECTION_LABELS[sec] ? `· ${SECTION_LABELS[sec]}` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() => onSetCtxFrameType(isFrameLocked ? 'OFF' : 'C')}
                            className={`boss-flat-btn p-0.5 rounded shrink-0 cursor-pointer ${
                              isFrameLocked ? 'text-slate-400 hover:text-[#F5B738]' : 'text-[#F5B738]'
                            }`}
                            title={
                              isFrameLocked
                                ? 'Main Frame ON — Tap to Unlock Separate Pair'
                                : 'Separate Pair Unlocked — Tap to Lock'
                            }
                          >
                            {isFrameLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        </div>

                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sd.glassEnabled}
                            onChange={(e) =>
                              onUpdateSlidingDoors(
                                slidingDoors.map((i) =>
                                  i.id === sd.id ? { ...i, glassEnabled: e.target.checked } : i
                                )
                              )
                            }
                            className="w-4 h-4 rounded accent-[#F5B738] cursor-pointer"
                          />
                          <span>Glass</span>
                        </label>
                      </div>

                      {/* 6. Per-Frame Gauge & Glass 3-Chip Strip */}
                      {renderFrameGaugeAndGlassControls({
                        sectionGauge: sd.sectionGauge,
                        onChangeGauge: (g) =>
                          onUpdateSlidingDoors(
                            slidingDoors.map((i) =>
                              i.id === sd.id ? { ...i, sectionGauge: g } : i
                            )
                          ),
                        glassEnabled: sd.glassEnabled,
                        onChangeGlassEnabled: (en) =>
                          onUpdateSlidingDoors(
                            slidingDoors.map((i) =>
                              i.id === sd.id ? { ...i, glassEnabled: en } : i
                            )
                          ),
                        glassGauge: sd.glassGauge,
                        glassColor: sd.glassColor,
                        onChangeGlassSpec: (g, col) =>
                          onUpdateSlidingDoors(
                            slidingDoors.map((i) =>
                              i.id === sd.id
                                ? { ...i, glassGauge: g, glassColor: col }
                                : i
                            )
                          ),
                      })}

                      {isLastSd && (
                        <button
                          type="button"
                          onClick={handleAddDoorTabItem}
                          className="boss-flat-btn w-full py-1.5 rounded-lg bg-[#0C0F14] hover:bg-[#F5B738] border border-dashed border-[#F5B738]/60 text-[#F5B738] hover:text-black text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Next Sliding Door</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* TAB 3: EXTRA PIECES SCREEN                                          */}
      {/* =================================================================== */}
      {currentTab === 'EXTRA_PIECES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          <div className="lg:col-span-5 p-3.5 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-3 text-xs">
            <h3 className="text-sm font-extrabold text-[#F5B738]">
              Add Extra Aluminium Piece / Pipe
            </h3>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Section Code (e.g. D54A, M23, PIPE12, ANGLE1)
              </label>
              <input
                type="text"
                value={extraSec}
                onChange={(e) => setExtraSec(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 font-mono text-amber-300"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 truncate">Length (Ft)</label>
                <input
                  type="number"
                  value={extraLenFt}
                  onChange={(e) => setExtraLenFt(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Qty</label>
                <input
                  type="number"
                  value={extraQty}
                  onChange={(e) => setExtraQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Gauge</label>
                <select
                  value={extraGauge}
                  onChange={(e) => setExtraGauge(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-white"
                >
                  {GAUGES.slice(0, 6).map((g) => (
                    <option key={g} value={g}>
                      {g}mm
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Quick Ft:</span>
              {['8', '10', '12', '14', '16', '18', '20'].map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setExtraLenFt(ft)}
                  className={`boss-flat-btn px-2 py-0.5 rounded text-[11px] font-mono ${
                    extraLenFt === ft
                      ? 'bg-[#F5B738] text-black font-bold'
                      : 'bg-[#0C0F14] border border-slate-700 text-slate-300'
                  }`}
                >
                  {ft}&apos;
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!extraSec.trim()) return;
                onUpdateProjectExtras([
                  ...projectExtras,
                  {
                    id: `ex-${Date.now()}`,
                    section: extraSec.trim().toUpperCase(),
                    lengthFt: Math.max(0.5, parseFloat(extraLenFt) || 10),
                    qty: Math.max(1, parseInt(extraQty, 10) || 1),
                    gauge: extraGauge,
                  },
                ]);
              }}
              className="w-full py-2.5 rounded-xl bg-[#F5B738] text-black font-extrabold cursor-pointer"
            >
              + Add Extra Piece
            </button>
          </div>

          <div className="lg:col-span-7 p-3.5 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2.5">
            <h3 className="text-sm font-extrabold text-white">
              Project Extra Pieces ({projectExtras.length})
            </h3>
            {projectExtras.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No extra pieces added yet.
              </div>
            ) : (
              projectExtras.map((ex, i) => {
                const isLastExtra = i === projectExtras.length - 1;
                return (
                <div
                  key={ex.id}
                  className="p-2.5 rounded-lg bg-[#0C0F14] border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-[#F5B738] font-mono">{ex.section}</span> ·{' '}
                    <span className="text-white font-mono">
                      {ex.lengthFt} ft × {ex.qty} pcs = {(ex.lengthFt * ex.qty).toFixed(1)} ft
                    </span>{' '}
                    <span className="text-slate-400">({ex.gauge}mm)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLastExtra && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProjectExtras([
                            ...projectExtras,
                            {
                              id: `ex-${Date.now()}`,
                              section: extraSec.trim().toUpperCase() || ex.section,
                              lengthFt: Math.max(0.5, parseFloat(extraLenFt) || ex.lengthFt || 10),
                              qty: Math.max(1, parseInt(extraQty, 10) || 1),
                              gauge: extraGauge || ex.gauge,
                            },
                          ])
                        }
                        className="boss-flat-btn w-6 h-6 rounded-full bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center shadow cursor-pointer"
                        title="Add another extra piece"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProjectExtras(projectExtras.filter((_, idx) => idx !== i))
                      }
                      className="boss-flat-btn text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: CUTTING CHART SCREEN                                         */}
      {/* =================================================================== */}
      {currentTab === 'CUTTING' && (
        <div
          className="space-y-3 boss-printable-chart select-none boss-protected-content"
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#14181F] border border-[#2B3441] flex items-center justify-between gap-2 no-print">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#F5B738] truncate">
                Cutting Chart - Easy Reading
              </h3>
              <p className="text-[10.5px] sm:text-xs text-slate-400 truncate">
                Stock bars &amp; Window/Door cut references
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintDocument({ kind: 'CHART', chartType: 'CUTTING' })}
                className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                title="Print Cutting Chart"
                aria-label="Print Cutting Chart"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  executeExportTarget({ kind: 'CHART', chartType: 'CUTTING' }, 'PDF', 'DOWNLOAD')
                }
                className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-slate-700 hover:border-[#F5B738] text-[#F5B738] flex items-center justify-center cursor-pointer"
                title="Download PDF"
                aria-label="Download PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShareModalTarget({ kind: 'CHART', chartType: 'CUTTING' })}
                className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-colors cursor-pointer"
                title="Share (Pic or PDF)"
                aria-label="Share (Pic or PDF)"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {hiddenSections.length > 0 && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/35 border border-amber-500/50 flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0">
                  <EyeOff className="w-3.5 h-3.5" />
                  Hidden ({hiddenSections.length}):
                </span>
                {hiddenSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onToggleHideSection(sec)}
                    className="boss-flat-btn px-2 py-0.5 rounded-md bg-[#0C0F14] border border-amber-500/60 hover:bg-[#F5B738] hover:text-black text-amber-200 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Unhide ${sec}`}
                  >
                    <Eye className="w-3 h-3 shrink-0" />
                    <span>{sec}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onUnhideAllSections}
                className="boss-flat-btn px-2.5 py-1 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black text-[10.5px] font-black flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Unhide All</span>
              </button>
            </div>
          )}

          {Object.keys(sectionPiecesMap).length === 0 ? (
            <div className="p-10 rounded-xl bg-[#14181F] border border-[#2B3441] text-center text-xs text-slate-400">
              {hiddenSections.length > 0
                ? 'All sections are currently hidden. Click any section above or "Unhide All" to show them.'
                : 'Add windows or doors first to generate the cutting chart.'}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(sectionPiecesMap).map(([section, pieces]) => {
                const packed = packSection(pieces, barLengthsFor(section));
                return (
                  <div
                    key={section}
                    className="p-3 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-[#F5B738] truncate">
                        {section} - {SECTION_LABELS[section] || section}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">
                          {packed.bins.length} bar(s)
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleHideSection(section)}
                          className="boss-flat-btn text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer"
                          title="Hide section from Cutting & Quotation"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                      {packed.bins.map((bar, bIdx) => (
                        <div
                          key={bIdx}
                          className="rounded-lg bg-[#0C0F14] border border-slate-800 overflow-hidden"
                        >
                          <div className="px-2.5 py-1.5 bg-[#12161E] border-b border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono">
                            <span className="font-extrabold text-slate-200 truncate">
                              {bar.isCustom
                                ? `${formatDim(Math.max(0, bar.pieces[0]?.length || bar.lenFt * 12), measurementUnit)} OFFCUT`
                                : `${bar.lenFt} FT BAR`}{' '}
                              - BAR #{bIdx + 1}
                            </span>
                            <span className="text-[#F5B738] font-bold shrink-0">
                              Waste: {formatDim(Math.max(0, bar.remainInches), measurementUnit)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-px bg-slate-800/70">
                            {bar.pieces.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="bg-[#0C0F14] px-2 py-2 flex items-center justify-between gap-1.5 min-w-0"
                              >
                                <div className="min-w-0">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-[#F5B738] truncate max-w-full">
                                    #{pIdx + 1} · {p.source.split('(')[0].trim()}
                                  </span>
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {p.label}
                                  </div>
                                </div>
                                <span className="text-xs sm:text-sm font-mono font-extrabold text-[#F5B738] tabular-nums shrink-0">
                                  {formatDim(p.length, measurementUnit)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: LENGTH CHART & STOCK TALLY SCREEN                            */}
      {/* =================================================================== */}
      {currentTab === 'LENGTH' && (
        <div
          className="space-y-3 boss-printable-chart select-none boss-protected-content"
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#14181F] border border-[#2B3441] flex items-center justify-between gap-2 no-print">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#F5B738] truncate">
                Bar Length Chart &amp; Stock Tally
              </h3>
              <p className="text-[10.5px] sm:text-xs text-slate-400 truncate">
                Total stock bars &amp; offcuts required
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintDocument({ kind: 'CHART', chartType: 'LENGTH' })}
                className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                title="Print Length Chart"
                aria-label="Print Length Chart"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  executeExportTarget({ kind: 'CHART', chartType: 'LENGTH' }, 'PDF', 'DOWNLOAD')
                }
                className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-slate-700 hover:border-[#F5B738] text-[#F5B738] flex items-center justify-center cursor-pointer"
                title="Download PDF"
                aria-label="Download PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShareModalTarget({ kind: 'CHART', chartType: 'LENGTH' })}
                className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-colors cursor-pointer"
                title="Share (Pic or PDF)"
                aria-label="Share (Pic or PDF)"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {hiddenSections.length > 0 && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/35 border border-amber-500/50 flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0">
                  <EyeOff className="w-3.5 h-3.5" />
                  Hidden ({hiddenSections.length}):
                </span>
                {hiddenSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onToggleHideSection(sec)}
                    className="boss-flat-btn px-2 py-0.5 rounded-md bg-[#0C0F14] border border-amber-500/60 hover:bg-[#F5B738] hover:text-black text-amber-200 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Unhide ${sec}`}
                  >
                    <Eye className="w-3 h-3 shrink-0" />
                    <span>{sec}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onUnhideAllSections}
                className="boss-flat-btn px-2.5 py-1 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black text-[10.5px] font-black flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Unhide All</span>
              </button>
            </div>
          )}

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2.5">
            <div className="text-xs font-extrabold text-[#F5B738] tracking-wide uppercase">
              TOTAL BARS SUMMARY
            </div>

            {Object.keys(sectionPiecesMap).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {hiddenSections.length > 0
                  ? 'All sections are currently hidden. Click any section above or "Unhide All" to show them.'
                  : 'Add windows or doors first to see total stock bars.'}
              </div>
            ) : (
              <>
                {/* Mobile Single-Row Pill List */}
                <div className="md:hidden space-y-1.5">
                  {Object.entries(sectionPiecesMap).map(([section, pieces]) => {
                    const packed = packSection(pieces, barLengthsFor(section));
                    const entries = Object.entries(packed.tally).sort(
                      (a, b) => Number(b[0]) - Number(a[0])
                    );
                    return (
                      <div
                        key={section}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#0C0F14] border border-slate-800"
                      >
                        <span className="text-xs font-bold text-slate-100 truncate min-w-0">
                          {section} - {SECTION_LABELS[section] || section}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                          {entries.map(([len, info]) => (
                            <span
                              key={len}
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold whitespace-nowrap ${
                                info.isCustom
                                  ? 'bg-[#14181F] border-slate-600 text-slate-200'
                                  : 'bg-amber-500/10 border-[#F5B738]/60 text-[#F5B738]'
                              }`}
                            >
                              {len}FT x {info.count}
                              {info.isCustom ? ' (offcut)' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block w-full max-w-full border border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-xs">
                    <thead className="bg-[#1C222B] text-slate-300">
                      <tr>
                        <th className="py-2 px-3">Section Profile</th>
                        <th className="py-2 px-3">Stock Length Breakdown</th>
                        <th className="py-2 px-3 text-center">Total Bars</th>
                        <th className="py-2 px-3 text-right">Total Feet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {Object.entries(sectionPiecesMap).map(([section, pieces]) => {
                        const packed = packSection(pieces, barLengthsFor(section));
                        let totalBars = 0;
                        let totalFt = 0;
                        const breakdown = Object.entries(packed.tally)
                          .sort((a, b) => Number(b[0]) - Number(a[0]))
                          .map(([len, info]) => {
                            totalBars += info.count;
                            totalFt += Number(len) * info.count;
                            return `${len}FT × ${info.count}${info.isCustom ? ' (offcut)' : ''}`;
                          })
                          .join(' · ');

                        return (
                          <tr key={section} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3 font-bold text-[#F5B738]">
                              {section} - {SECTION_LABELS[section] || section}
                            </td>
                            <td className="py-2 px-3 text-amber-200">{breakdown}</td>
                            <td className="py-2 px-3 text-center text-white font-bold">
                              {totalBars}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-bold tabular-nums">
                              {totalFt} ft
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: GLASS CHART SCREEN (MOBILE KPI + TABLE + GRAND TOTAL)        */}
      {/* =================================================================== */}
      {currentTab === 'GLASS' && (() => {
        const actualCutGlassSqFt = glassCuts.reduce(
          (sum, g) => sum + (g.gWpanel * g.gH * g.pieces) / 144,
          0
        );
        return (
          <div
            className="space-y-3 boss-printable-chart select-none boss-protected-content"
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Header, 3 Actions, Glass Fitting Type & 3-Col KPI Strip */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-3 no-print">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#F5B738] truncate">
                    Glass Cutting &amp; Billed Chart
                  </h3>
                  <p className="text-[10.5px] sm:text-xs text-slate-400 truncate">
                    Billed size rounds UP to next 6-inch step
                  </p>
                </div>

                {/* 3 Compact Icon Smart Action Buttons: Print | PDF | Share */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePrintDocument({ kind: 'CHART', chartType: 'GLASS' })}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                    title="Print Glass Chart"
                    aria-label="Print Glass Chart"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      executeExportTarget({ kind: 'CHART', chartType: 'GLASS' }, 'PDF', 'DOWNLOAD')
                    }
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#60A5FA] hover:bg-sky-400 text-black flex items-center justify-center cursor-pointer"
                    title="Download PDF"
                    aria-label="Download PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareModalTarget({ kind: 'CHART', chartType: 'GLASS' })}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center cursor-pointer"
                    title="Share (Pic or PDF)"
                    aria-label="Share (Pic or PDF)"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Glass Fitting Type Selector */}
              <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F5B738]">Glass Fitting Type</span>
                  <span className="text-[11px] text-slate-400">
                    {glassFittingOption === 'FIX_RUBBER'
                      ? 'Fix Rubber: Standard'
                      : 'U(PVC): -2 Sutar'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['FIX_RUBBER', 'U_PVC'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSetGlassFittingOption(opt)}
                      className={`boss-flat-btn py-2 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        glassFittingOption === opt
                          ? 'bg-[#F5B738] text-black'
                          : 'bg-[#14181F] text-slate-300 border border-slate-700'
                      }`}
                    >
                      {opt === 'FIX_RUBBER' ? 'Fix Rubber (Same)' : 'U(PVC)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column KPI Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 truncate">Total Glass Sq.ft</div>
                  <div className="text-sm sm:text-base font-mono font-black text-[#F5B738] tabular-nums mt-0.5">
                    {totalGlassSqFt.toFixed(2)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 truncate">Total Pieces</div>
                  <div className="text-sm sm:text-base font-mono font-black text-sky-400 tabular-nums mt-0.5">
                    {totalGlassPieces}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 truncate">Frames with Glass</div>
                  <div className="text-sm sm:text-base font-mono font-black text-amber-300 tabular-nums mt-0.5">
                    {glassCuts.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Responsive Table */}
            <div className="w-full max-w-full border border-slate-800 rounded-xl overflow-x-auto bg-[#14181F]">
              <table className="w-full min-w-[460px] text-left text-[11px] sm:text-xs">
                <thead className="bg-[#0C0F14] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2.5">Window / Frame</th>
                    <th className="py-2.5 px-2">Glass Type</th>
                    <th className="py-2.5 px-2">Cut Size (W×H)</th>
                    <th className="py-2.5 px-2">Billed (Ft)</th>
                    <th className="py-2.5 px-2 text-center">Pcs</th>
                    <th className="py-2.5 px-2.5 text-right">Sq.Ft</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {glassCuts.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="py-2.5 px-2.5 font-sans">
                        <div className="font-bold text-white leading-tight">{g.frameLabel}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{g.frameDim}</div>
                      </td>
                      <td className="py-2.5 px-2 text-sky-400 font-bold font-sans whitespace-nowrap">
                        {g.glassGauge === 'DG' ? `DG Glass ${g.glassColor}` : `${g.glassGauge}mm ${g.glassColor}`}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-[#F5B738] tabular-nums whitespace-nowrap">
                        {formatDim(g.gWpanel, measurementUnit)} ×{' '}
                        {formatDim(g.gH, measurementUnit)}
                      </td>
                      <td className="py-2.5 px-2 text-slate-300 tabular-nums whitespace-nowrap">
                        {g.billedWFt.toFixed(1)}&apos; × {g.billedHFt.toFixed(1)}&apos;
                      </td>
                      <td className="py-2.5 px-2 text-center text-white font-bold">{g.pieces}</td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-emerald-400 tabular-nums">
                        {g.sqft.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#0C0F14] border-t border-slate-700 font-mono text-[11px]">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-2.5 font-bold text-[#F5B738]">
                      TOTAL ({glassCuts.length} Frames)
                    </td>
                    <td colSpan={2} className="py-2.5 px-2 text-sky-400 font-semibold">
                      {actualCutGlassSqFt.toFixed(2)} sq.ft cut
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-[#F5B738] whitespace-nowrap">
                      {totalGlassPieces} Pcs
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-emerald-400 tabular-nums whitespace-nowrap">
                      {totalGlassSqFt.toFixed(2)} Sq.Ft
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Grand Total Gold-Bordered Summary Card */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0C0F14] border border-[#F5B738]/70 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-[#F5B738] font-sans uppercase tracking-wide">
                  GLASS CHART GRAND TOTAL SUMMARY
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold shrink-0">
                  {totalGlassPieces} Total Pcs
                </span>
              </div>

              {activeQuote.glassLines.map((gl, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80"
                >
                  <div>
                    <div className="text-slate-100 font-sans font-bold">{gl.description}</div>
                    <div className="text-[10px] text-slate-400">Rate: Rs. {gl.rate}/Sq.Ft</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sky-400 font-bold">
                      {gl.sqft.toFixed(2)} Sq.Ft
                    </div>
                    <div className="text-[#F5B738] font-bold">
                      Rs. {Math.round(gl.total).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Total Actual Cut Glass Area:</span>
                  <span className="text-sky-400 font-bold">
                    {actualCutGlassSqFt.toFixed(2)} Sq.Ft
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-100 font-bold">
                  <span>Total Billed Glass Area:</span>
                  <span className="text-emerald-400 font-black">
                    {totalGlassSqFt.toFixed(2)} Sq.Ft
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#14181F] border border-[#F5B738]/60 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#F5B738] font-sans">
                  ESTIMATED TOTAL GLASS AMOUNT:
                </span>
                <span className="text-base sm:text-lg font-black text-[#F5B738] tabular-nums">
                  Rs. {Math.round(activeQuote.glassTotal).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* TAB 7: QUOTATION SCREEN (WITH BACKGROUND SETTINGS & SHARE PIC/PDF)  */}
      {/* =================================================================== */}
      {currentTab === 'QUOTATION' && (
        <div className="space-y-4">
          {/* Customer, Discount, Hardware, Labour, Transport (Compact Single-Line Grid) & Single-Line Icon Toolbar */}
          <div className="p-2 sm:p-3 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2 no-print">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
              <div className="min-w-0">
                <label className="block text-[9px] sm:text-[9.5px] font-semibold text-slate-400 mb-0.5 truncate">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onSetCustomerInfo(e.target.value, customerPhone)}
                  placeholder="Tariq Mehmood"
                  className="w-full h-7 px-1.5 sm:px-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none text-[10.5px] sm:text-[11px] text-white"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[9px] sm:text-[9.5px] font-semibold text-slate-400 mb-0.5 truncate">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => onSetCustomerInfo(customerName, e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full h-7 px-1.5 sm:px-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none text-[10.5px] sm:text-[11px] font-mono text-white"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[9px] sm:text-[9.5px] font-bold text-emerald-400 mb-0.5 truncate">
                  Discount (%)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftDiscountStr}
                    onChange={(e) => handleDiscountTextChange(e.target.value)}
                    placeholder="0"
                    title="Discount (%)"
                    aria-label="Discount (%)"
                    className="w-full h-7 pl-1.5 sm:pl-2 pr-4 sm:pr-5 rounded-lg bg-[#0C0F14] border border-emerald-500/70 focus:border-emerald-400 outline-none text-[10.5px] sm:text-[11px] font-mono font-bold text-emerald-300"
                  />
                  <span className="absolute right-1.5 text-[10px] font-bold text-emerald-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-[9px] sm:text-[9.5px] font-semibold text-slate-400 mb-0.5 truncate">
                  Hardware (Rs)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftHardwareStr}
                  onChange={(e) => handleHardwareTextChange(e.target.value)}
                  placeholder="0"
                  title="Hardware Rate / Unit (Rs)"
                  aria-label="Hardware (Rs)"
                  className="w-full h-7 px-1.5 sm:px-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none text-[10.5px] sm:text-[11px] font-mono text-white"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[9px] sm:text-[9.5px] font-semibold text-slate-400 mb-0.5 truncate">
                  Labour (Rs)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftLabourStr}
                  onChange={(e) => handleLabourTextChange(e.target.value)}
                  placeholder="0"
                  title="Labour Charges (Rs)"
                  aria-label="Labour (Rs)"
                  className="w-full h-7 px-1.5 sm:px-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none text-[10.5px] sm:text-[11px] font-mono text-white"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[9px] sm:text-[9.5px] font-semibold text-slate-400 mb-0.5 truncate">
                  Transport (Rs)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftTransportStr}
                  onChange={(e) => handleTransportTextChange(e.target.value)}
                  placeholder="0"
                  title="Transport Rent (Rs)"
                  aria-label="Transport (Rs)"
                  className="w-full h-7 px-1.5 sm:px-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none text-[10.5px] sm:text-[11px] font-mono text-white"
                />
              </div>
            </div>

            {/* Single-Line Compact Icon-Only Smart Action Toolbar */}
            <div className="flex items-center justify-between gap-1.5 flex-nowrap pt-0.5">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <button
                  type="button"
                  onClick={() => handlePrintDocument({ kind: 'CHART', chartType: 'QUOTATION' })}
                  className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer shrink-0"
                  title="Print Quotation"
                  aria-label="Print Quotation"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    executeExportTarget({ kind: 'CHART', chartType: 'QUOTATION' }, 'PDF', 'DOWNLOAD')
                  }
                  className="boss-flat-btn w-8 h-8 rounded-lg bg-[#60A5FA] hover:bg-sky-400 text-black flex items-center justify-center cursor-pointer shrink-0"
                  title="Download PDF"
                  aria-label="Download PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalTarget({ kind: 'CHART', chartType: 'QUOTATION' })}
                  className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Share (Pic or PDF)"
                  aria-label="Share (Pic or PDF)"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const summary = `${windows.length} Win${dgWindows.length > 0 ? `, ${dgWindows.length} DG.Win` : ''}, ${doors.length} Doors, ${fixframes.length} Fix`;
                    onSaveQuotationHistory({
                      id: Date.now(),
                      timestamp: new Date().toLocaleString('en-GB'),
                      label: `Quotation - ${customerName || 'Valued Client'}`,
                      customerName,
                      customerPhone,
                      gauge: ctxGauge,
                      color: ctxColor,
                      frameType: ctxFrameType,
                      grandTotal: activeQuote.grandTotal,
                      alumTotal: activeQuote.alumWithMarkup,
                      hardwareTotal: activeQuote.hardwareTotal,
                      glassTotal: activeQuote.glassTotal,
                      transportRent: activeQuote.transportRent,
                      labourCost: activeQuote.labourCost,
                      totalUnits: activeQuote.totalUnits,
                      itemsSummary: summary,
                      windowsJson: JSON.stringify(windows),
                      dgWindowsJson: JSON.stringify(dgWindows),
                      doorsJson: JSON.stringify(doors),
                      fixframesJson: JSON.stringify(fixframes),
                      openableWindowsJson: JSON.stringify(openableWindows),
                      slidingDoorsJson: JSON.stringify(slidingDoors),
                      projectExtrasJson: JSON.stringify(projectExtras),
                    });
                  }}
                  className="boss-flat-btn w-8 h-8 rounded-lg bg-[#1C222B] border border-slate-700 hover:border-[#F5B738] text-[#F5B738] flex items-center justify-center cursor-pointer shrink-0"
                  title="Save History"
                  aria-label="Save History"
                >
                  <Bookmark className="w-4 h-4" />
                </button>

                {layoutConfig.showCompareCFButton && (
                  <button
                    type="button"
                    onClick={() => setShowCompareCF(!showCompareCF)}
                    className={`boss-flat-btn w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 ${
                      showCompareCF
                        ? 'bg-sky-500 border-sky-400 text-black'
                        : 'bg-[#1C222B] border-sky-500/60 text-sky-400 hover:bg-sky-500 hover:text-black'
                    }`}
                    title="Compare C vs F"
                    aria-label="Compare C vs F"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowBackgroundAdjustments((prev) => !prev)}
                  className={`boss-flat-btn w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    showBackgroundAdjustments
                      ? 'bg-[#F5B738] border-[#F5B738] text-black'
                      : 'bg-[#1C222B] border-[#F5B738]/60 text-[#F5B738] hover:bg-[#F5B738] hover:text-black'
                  }`}
                  title={
                    showBackgroundAdjustments
                      ? 'Hide Background & Sheet Adjustments'
                      : 'Background & Sheet Adjustments'
                  }
                  aria-label="Background & Sheet Adjustments"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[11px] font-mono font-black text-[#F5B738] truncate shrink-0">
                Rs {Math.round(activeQuote.grandTotal).toLocaleString()}
              </div>
            </div>

            {hiddenSections.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/35 border border-amber-500/50 flex flex-wrap items-center justify-between gap-2 no-print">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0">
                    <EyeOff className="w-3.5 h-3.5" />
                    Hidden ({hiddenSections.length}):
                  </span>
                  {hiddenSections.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onToggleHideSection(sec)}
                      className="boss-flat-btn px-2 py-0.5 rounded-md bg-[#0C0F14] border border-amber-500/60 hover:bg-[#F5B738] hover:text-black text-amber-200 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Unhide ${sec}`}
                    >
                      <Eye className="w-3 h-3 shrink-0" />
                      <span>{sec}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onUnhideAllSections}
                  className="boss-flat-btn px-2.5 py-1 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black text-[10.5px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Unhide All</span>
                </button>
              </div>
            )}

            {/* Background & Sheet Adjustments (Collapsible via button above) */}
            {showBackgroundAdjustments && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0C1017] border border-[#F5B738]/60 space-y-4 text-xs shadow-xl no-print">
              {/* Header Title Row */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#F5B738]">
                    Background & Sheet Adjustments
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Settings are automatically saved as default
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        sheetFitPreset: 'BEST_FIT',
                      })
                    }
                    className={`text-xs font-bold transition-colors cursor-pointer ${
                      (layoutConfig.sheetFitPreset || 'BEST_FIT') === 'BEST_FIT'
                        ? 'text-[#F5B738] underline underline-offset-4'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Best Fit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        sheetFitPreset: 'DIGITAL',
                      })
                    }
                    className={`text-xs font-bold transition-colors cursor-pointer ${
                      layoutConfig.sheetFitPreset === 'DIGITAL'
                        ? 'text-[#3B82F6] underline underline-offset-4'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBackgroundAdjustments(false)}
                    className="boss-flat-btn w-7 h-7 rounded-lg bg-[#141A24] border border-slate-700 text-slate-300 hover:text-white hover:border-[#F5B738] flex items-center justify-center cursor-pointer"
                    title="Hide Background & Sheet Adjustments"
                    aria-label="Hide Background & Sheet Adjustments"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact Icon Smart Action Strip: Upload Background | Save Default | Reset Logo | Reset BG */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#141A24] border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 truncate">
                  Sheet BG &amp; Actions
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer shadow-sm transition-all"
                    title="Upload Background"
                    aria-label="Upload Background"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageFileUpload(
                          e,
                          onUpdateLetterheadBgUrl,
                          'Quotation Letterhead Background'
                        )
                      }
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateLayoutConfig) {
                        onUpdateLayoutConfig({ ...layoutConfig });
                      }
                      showSettingsToast('Background & Sheet Adjustments saved as permanent default!');
                    }}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center cursor-pointer shadow-sm transition-all"
                    title="Save as Default"
                    aria-label="Save as Default"
                  >
                    <Save className="w-4 h-4" />
                  </button>

                  {layoutConfig.shopLogoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayoutConfig?.({
                          ...layoutConfig,
                          shopLogoUrl: '',
                        })
                      }
                      className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-slate-700 text-amber-300 hover:border-[#F5B738] flex items-center justify-center cursor-pointer"
                      title="Reset Shop Logo"
                      aria-label="Reset Shop Logo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onRestoreDefaultBrandingAssets();
                      showSettingsToast('Restored default Letterhead Background!');
                    }}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-slate-700 text-slate-300 hover:text-white hover:border-[#F5B738] flex items-center justify-center cursor-pointer"
                    title="Reset Default Letterhead"
                    aria-label="Reset Default Letterhead"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row: Picture Background Toggle + Fill / Crop / Fit */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <div
                  onClick={() =>
                    onUpdateLayoutConfig?.({
                      ...layoutConfig,
                      showLetterheadBackground: !layoutConfig.showLetterheadBackground,
                    })
                  }
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                >
                  <div
                    className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors ${
                      layoutConfig.showLetterheadBackground
                        ? 'bg-[#F5B738]'
                        : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-black shadow-md transform transition-transform ${
                        layoutConfig.showLetterheadBackground ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white">Picture Background</span>
                </div>

                <div className="flex items-center gap-1.5 bg-[#141A24] p-1 rounded-xl border border-slate-800">
                  {(['FILL', 'CROP', 'FIT'] as const).map((mode) => {
                    const isSel = (layoutConfig.backgroundFitStyle || 'FILL') === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          onUpdateLayoutConfig?.({
                            ...layoutConfig,
                            backgroundFitStyle: mode,
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#1E2633] text-white border border-slate-600 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode === 'FILL' ? 'Fill' : mode === 'CROP' ? 'Crop' : 'Fit'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row: Header Style */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <span className="text-xs text-slate-300 font-semibold">Header Style:</span>
                <div className="flex items-center gap-1.5 bg-[#141A24] p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        headerStyle: 'USE_PIC_HEADER',
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (layoutConfig.headerStyle || 'USE_PIC_HEADER') === 'USE_PIC_HEADER'
                        ? 'bg-[#1E2633] text-white border border-slate-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Use Pic Header
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        headerStyle: 'DIGITAL_HEADER',
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      layoutConfig.headerStyle === 'DIGITAL_HEADER'
                        ? 'bg-[#1E2633] text-white border border-slate-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Digital Header
                  </button>
                </div>
              </div>

              {/* 4 Golden Sliders (Exact Match to Screenshot) */}
              <div className="space-y-3 pt-2">
                {/* 1. Top Header Offset */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Top Header Offset:</span>
                    <span className="text-[#F5B738] font-mono font-bold">
                      {layoutConfig.topHeaderOffset ?? 26} dp
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={1}
                    value={layoutConfig.topHeaderOffset ?? 26}
                    onChange={(e) =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        topHeaderOffset: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-[#F5B738] bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 2. Background Darkness (Contrast) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Background Darkness (Contrast):
                    </span>
                    <span className="text-[#F5B738] font-mono font-bold">
                      {layoutConfig.backgroundDarkness ?? 32}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    step={1}
                    value={layoutConfig.backgroundDarkness ?? 32}
                    onChange={(e) =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        backgroundDarkness: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-[#F5B738] bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 3. Picture / Watermark Opacity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Picture / Watermark Opacity:
                    </span>
                    <span className="text-[#F5B738] font-mono font-bold">
                      {layoutConfig.watermarkOpacity ?? 95}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={layoutConfig.watermarkOpacity ?? 95}
                    onChange={(e) =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        watermarkOpacity: parseInt(e.target.value, 10) || 95,
                        letterheadOpacity: (parseInt(e.target.value, 10) || 95) / 100,
                      })
                    }
                    className="w-full accent-[#F5B738] bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 4. Inner Frame Margin */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Inner Frame Margin:</span>
                    <span className="text-[#F5B738] font-mono font-bold">
                      {layoutConfig.innerFrameMargin ?? 14} dp
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={1}
                    value={layoutConfig.innerFrameMargin ?? 14}
                    onChange={(e) =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        innerFrameMargin: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-[#F5B738] bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 5. Header & Details Row Spacing */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Header & Details Gap:</span>
                    <span className="text-[#F5B738] font-mono font-bold">
                      {layoutConfig.contentRowSpacing ?? 10} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={36}
                    step={1}
                    value={layoutConfig.contentRowSpacing ?? 10}
                    onChange={(e) =>
                      onUpdateLayoutConfig?.({
                        ...layoutConfig,
                        contentRowSpacing: parseInt(e.target.value, 10) || 10,
                      })
                    }
                    className="w-full accent-[#F5B738] bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Keep Full Letterhead Proportions */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300 font-medium">
                  Keep Full Letterhead Proportions:
                </span>
                <div
                  onClick={() =>
                    onUpdateLayoutConfig?.({
                      ...layoutConfig,
                      keepFullLetterheadProportions:
                        layoutConfig.keepFullLetterheadProportions === false ? true : false,
                    })
                  }
                  className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors cursor-pointer select-none ${
                    layoutConfig.keepFullLetterheadProportions !== false
                      ? 'bg-[#F5B738]'
                      : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-black shadow-md transform transition-transform ${
                      layoutConfig.keepFullLetterheadProportions !== false
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Footer space cleaned up — Save & Reset controls are compact icon buttons above */}
            </div>
            )}
          </div>

          {/* C vs F Comparison Box */}
          {showCompareCF && (
            <div className="p-4 rounded-xl bg-[#14181F] border border-sky-500/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0C0F14] border border-slate-800 space-y-1">
                <div className="font-bold text-[#F5B738]">FRAME C (DC30C / DC26C)</div>
                <div className="text-slate-300 font-mono">
                  Aluminium (After Discount): Rs {Math.round(quoteC.alumWithMarkup).toLocaleString()}
                </div>
                <div className="text-slate-300 font-mono">
                  Glass + Hardware: Rs {Math.round(quoteC.glassTotal + quoteC.hardwareTotal).toLocaleString()}
                </div>
                <div className="text-sm font-bold text-white font-mono pt-1">
                  Total Frame C: Rs {Math.round(quoteC.grandTotal).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0C0F14] border border-slate-800 space-y-1">
                <div className="font-bold text-sky-400">FRAME F (DC30F / DC26F)</div>
                <div className="text-slate-300 font-mono">
                  Aluminium (After Discount): Rs {Math.round(quoteF.alumWithMarkup).toLocaleString()}
                </div>
                <div className="text-slate-300 font-mono">
                  Glass + Hardware: Rs {Math.round(quoteF.glassTotal + quoteF.hardwareTotal).toLocaleString()}
                </div>
                <div className="text-sm font-bold text-sky-300 font-mono pt-1">
                  Total Frame F: Rs {Math.round(quoteF.grandTotal).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Official Printable Quotation Sheet - STRICTLY LOCKED ALWAYS TO AUTHENTIC A4 PORTRAIT (210mm x 297mm / 794x1123 scaled cleanly for any screen) */}
          <div ref={a4WrapperRef} className="w-full max-w-full flex justify-center py-2 sm:py-3 overflow-hidden">
            <div
              className="boss-a4-scale-outer relative shrink-0 overflow-hidden rounded-2xl shadow-2xl"
              style={{
                width: `${Math.round(794 * a4Scale)}px`,
                height: `${Math.round(1123 * a4Scale)}px`,
              }}
            >
              <div
                id="boss-official-a4-quotation-sheet"
                className="relative overflow-hidden rounded-2xl bg-[#0D1118] border-2 border-[#F5B738] flex flex-col justify-between"
                style={{
                  width: '794px',
                  height: '1123px',
                  transform: `scale(${a4Scale})`,
                  transformOrigin: 'top left',
                  aspectRatio: '210 / 297',
                  padding: 0,
                }}
              >
              {layoutConfig.showLetterheadBackground && letterheadBgUrl && (
                <>
                  <img
                    src={letterheadBgUrl}
                    alt="Official Letterhead Background"
                    style={{
                      opacity: (layoutConfig.watermarkOpacity ?? 95) / 100,
                      width: '100%',
                      height: '100%',
                      objectFit: layoutConfig.backgroundFitStyle === 'CROP' ? 'cover' : 'fill',
                      objectPosition: layoutConfig.backgroundFitStyle === 'CROP' ? 'top center' : 'center',
                    }}
                    className="pointer-events-none select-none absolute inset-0 w-full h-full z-0 transition-opacity"
                  />
                  {/* Background Darkness (Contrast) Overlay */}
                  {(layoutConfig.backgroundDarkness ?? 32) > 0 && (
                    <div
                      className="pointer-events-none absolute inset-0 z-0 bg-black transition-opacity"
                      style={{ opacity: (layoutConfig.backgroundDarkness ?? 32) / 100 }}
                    />
                  )}
                </>
              )}

              <div
                className="relative z-10 flex-1 flex flex-col justify-between"
                style={{
                  paddingTop: `${layoutConfig.topHeaderOffset ?? 26}px`,
                  paddingLeft: `${layoutConfig.innerFrameMargin ?? 14}px`,
                  paddingRight: `${layoutConfig.innerFrameMargin ?? 14}px`,
                  paddingBottom: `${layoutConfig.innerFrameMargin ?? 14}px`,
                }}
              >
                {/* Content Block: Header, Customer Details, Cost Table, and Summary Totals grouped together with compact custom gap */}
                <div
                  className="w-full flex flex-col"
                  style={{
                    gap: `${layoutConfig.contentRowSpacing ?? 10}px`,
                  }}
                >
                  {/* Header Style: USE_PIC_HEADER vs DIGITAL_HEADER */}
                  {layoutConfig.headerStyle === 'USE_PIC_HEADER' ? (
                    /* Picture Header: Printed letterhead has branding. Show sleek estimate badge with date & quote ID */
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#F5B738]/60 pb-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-[#F5B738] tracking-widest uppercase">
                          FABRICATION & GLAZING ESTIMATE
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded bg-[#0C1017]/90 border border-amber-500/40 text-amber-300 font-bold">
                          Date: {new Date().toLocaleDateString('en-GB')}
                        </span>
                        <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-[#F5B738] font-black">
                          #BOSS-{Math.floor(Date.now() / 1000).toString().slice(-4)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Digital Header: Full company logo and contact info */
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#F5B738]/60 pb-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={activeShopLogoUrl}
                          alt="Shop / Company Logo"
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#F5B738] shadow-md shrink-0"
                        />
                        <div>
                          <h2 className="text-lg sm:text-xl font-black text-[#F5B738] tracking-wide">
                            {companyName || 'BOSS ALUMINIUM & GLASS'}
                          </h2>
                          <p className="text-xs text-amber-100 font-semibold">{companyTagline}</p>
                          <p className="text-[11px] text-slate-200">
                            Phone: {companyPhone} · Factory: {companyAddress} · NTN: {companyNtn}
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <div className="text-[#F5B738] font-black text-sm">OFFICIAL QUOTATION</div>
                        <div className="text-slate-200">
                          Date: {new Date().toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Details Box */}
                  <div className="p-3 rounded-lg bg-[#0C0F14]/70 backdrop-blur-[1px] border border-slate-700/80 flex flex-wrap items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-300">Customer:</span>{' '}
                      <strong className="text-white">{customerName || 'Valued Client'}</strong>{' '}
                      {customerPhone && `(${customerPhone})`}
                    </div>
                    <div className="font-mono text-amber-300">
                      Color: {ctxColor} · Gauge: {ctxGauge}mm · Frame: {ctxFrameType}
                    </div>
                  </div>

                  {/* Cost Breakdown Table */}
                  <div className="w-full max-w-full border border-slate-700/80 rounded-xl overflow-x-auto bg-[#0C0F14]/70 backdrop-blur-[1px]">
                    <table className="w-full min-w-[420px] text-left text-[11px] sm:text-xs">
                      <thead className="bg-[#1C222B]/85 text-amber-300">
                        <tr>
                          <th className="py-2 px-3">Section / Item</th>
                          <th className="py-2 px-3 text-center">Bars</th>
                          <th className="py-2 px-3 text-center">Feet</th>
                          <th className="py-2 px-3 text-right">Rate/ft</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        {activeQuote.aluminiumRows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-white font-sans">
                              {SECTION_LABELS[row.section] || row.section}{' '}
                              <span className="text-slate-300 font-mono">({row.gauge}mm)</span>
                            </td>
                            <td className="py-2 px-3 text-center text-slate-200">{row.bars}</td>
                            <td className="py-2 px-3 text-center text-slate-200">{row.totalFt}</td>
                            <td className="py-2 px-3 text-right text-slate-200 tabular-nums">
                              Rs {Math.round(row.ratePerFt).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#F5B738] tabular-nums">
                              Rs {Math.round(row.cost).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals with Discount (%) instead of Markup (%) */}
                  <div className="p-4 rounded-xl bg-[#0C0F14]/75 backdrop-blur-[1px] border border-slate-700/80 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Aluminium Gross Total:</span>
                      <span className="text-white font-bold">
                        Rs {Math.round(activeQuote.alumTotal).toLocaleString()}
                      </span>
                    </div>
                    {layoutConfig.showDiscountRow && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount ({markupPct}%):</span>
                        <span className="font-bold">
                          - Rs{' '}
                          {Math.round(
                            Math.max(0, activeQuote.alumTotal - activeQuote.alumWithMarkup)
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800 pt-1">
                      <span className="text-amber-300 font-semibold">
                        Aluminium Net Total (After Discount):
                      </span>
                      <span className="text-[#F5B738] font-bold">
                        Rs {Math.round(activeQuote.alumWithMarkup).toLocaleString()}
                      </span>
                    </div>
                    {layoutConfig.showHardwareRow && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">
                          Hardware ({activeQuote.totalUnits} units × Rs {hardwareRate}):
                        </span>
                        <span className="text-white">
                          Rs {Math.round(activeQuote.hardwareTotal).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {activeQuote.glassLines.map((gl, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-slate-300">
                          {gl.description} ({gl.sqft.toFixed(1)} sq.ft @ Rs {gl.rate}):
                        </span>
                        <span className="text-white">
                          Rs {Math.round(gl.total).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {layoutConfig.showTransportRow && activeQuote.transportRent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Transport Rent:</span>
                        <span className="text-white">
                          Rs {Math.round(activeQuote.transportRent).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {layoutConfig.showLabourRow && activeQuote.labourCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Labour / Installation:</span>
                        <span className="text-white">
                          Rs {Math.round(activeQuote.labourCost).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[#F5B738]/60 pt-2.5 flex items-center justify-between text-base font-black text-[#F5B738]">
                      <span>NET GRAND TOTAL:</span>
                      <span className="tabular-nums">
                        Rs {Math.round(activeQuote.grandTotal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official Letterhead Footer Terms & Signature pinned to bottom */}
                <div className="mt-auto pt-3 border-t border-[#F5B738]/30 flex flex-wrap items-end justify-between gap-4 text-[11px] text-slate-300">
                  <div className="max-w-lg">
                    <strong className="text-[#F5B738]">Terms & Conditions:</strong>{' '}
                    {layoutConfig.quotationFooterTerms}
                  </div>
                  <div className="text-right font-semibold text-amber-200 border-t border-amber-400/50 pt-1">
                    {layoutConfig.quotationSignatureLabel}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8: HISTORY SCREEN                                               */}
      {/* =================================================================== */}
      {currentTab === 'HISTORY' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#F5B738]">
                Saved Quotations History
              </h3>
              <p className="text-xs text-slate-400">
                {savedQuotations.length} saved quotation{savedQuotations.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#F5B738] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by name, customer, phone..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 text-xs text-white focus:border-[#F5B738] outline-none"
              />
            </div>
          </div>

          {savedQuotations.length === 0 ? (
            <div className="p-10 sm:p-12 rounded-xl bg-[#14181F] border border-[#2B3441] text-center text-xs text-slate-400">
              No saved quotations in history yet. Click &quot;Save History&quot; on the Quotation tab.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedQuotations
                .filter(
                  (q) =>
                    !historySearch.trim() ||
                    q.label.toLowerCase().includes(historySearch.toLowerCase()) ||
                    q.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
                    (q.customerPhone || '').toLowerCase().includes(historySearch.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-[#F5B738] text-sm truncate">
                          {item.customerName || item.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.timestamp}
                        </div>
                      </div>
                      <div className="text-base font-mono font-black text-[#F5B738] shrink-0 tabular-nums">
                        Rs {Math.round(item.grandTotal).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-[10px] font-semibold text-sky-300">
                        {item.color} · {item.gauge}mm · Frame {item.frameType}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-[10px] font-semibold text-slate-300">
                        {item.itemsSummary}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onRestoreQuotation(item)}
                        className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                        title="Open / Load Quotation"
                        aria-label="Open / Load Quotation"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareModalTarget({ kind: 'HISTORY', item })}
                        className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-sky-500/70 text-sky-300 hover:bg-sky-500 hover:text-black flex items-center justify-center cursor-pointer"
                        title="Share (Pic or PDF)"
                        aria-label="Share (Pic or PDF)"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintDocument({ kind: 'HISTORY', item })}
                        className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-slate-700 hover:border-[#F5B738] text-slate-200 flex items-center justify-center cursor-pointer"
                        title="Print / Download PDF"
                        aria-label="Print / Download PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQuotationHistory(item.id)}
                        className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-rose-500/60 text-rose-400 hover:bg-rose-600 hover:text-white flex items-center justify-center cursor-pointer"
                        title="Delete saved quotation"
                        aria-label="Delete saved quotation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 9: CLIENT APP LAYOUT SETTINGS & RATES SCREEN                    */}
      {/* (Client-only: Global Unit, Rates, Logo & BG, Hardware, Plans)       */}
      {/* =================================================================== */}
      {currentTab === 'RATES' && (
        <div className="space-y-3">
          {settingsNotice && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{settingsNotice}</span>
            </div>
          )}

          {/* Global Measurement Unit Card */}
          <div className="p-3 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#F5B738]">
              <Ruler className="w-4 h-4 shrink-0" />
              <span>Global Measurement Unit</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'INCH_SUTAR', label: 'Inch & Sutar' },
                  { id: 'CM', label: 'Centimeter' },
                  { id: 'MM', label: 'Millimeter' },
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSetMeasurementUnit(u.id)}
                  className={`boss-flat-btn py-2 px-2 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                    measurementUnit === u.id
                      ? 'bg-[#F5B738] text-black'
                      : 'bg-[#0C0F14] border border-slate-700 text-slate-200 hover:border-[#F5B738]'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Compact Sub-Tabs Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setRatesSubTab('RATES')}
              className={`boss-flat-btn shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                ratesSubTab === 'RATES'
                  ? 'bg-[#F5B738] border-[#F5B738] text-black'
                  : 'bg-[#14181F] border-[#2B3441] text-slate-200 hover:border-[#F5B738]'
              }`}
            >
              <Calculator className="w-3 h-3 shrink-0" />
              <span>Rates</span>
            </button>

            <button
              type="button"
              onClick={() => setRatesSubTab('LOGO_BG')}
              className={`boss-flat-btn shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                ratesSubTab === 'LOGO_BG'
                  ? 'bg-[#F5B738] border-[#F5B738] text-black'
                  : 'bg-[#14181F] border-[#2B3441] text-slate-200 hover:border-[#F5B738]'
              }`}
            >
              <ImageIcon className="w-3 h-3 shrink-0" />
              <span>Logo &amp; BG</span>
            </button>

            <button
              type="button"
              onClick={() => setRatesSubTab('HARDWARE')}
              className={`boss-flat-btn shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                ratesSubTab === 'HARDWARE'
                  ? 'bg-[#F5B738] border-[#F5B738] text-black'
                  : 'bg-[#14181F] border-[#2B3441] text-slate-200 hover:border-[#F5B738]'
              }`}
            >
              <Wrench className="w-3 h-3 shrink-0" />
              <span>Hardware</span>
            </button>

            <button
              type="button"
              onClick={() => setRatesSubTab('PACKAGES')}
              className={`boss-flat-btn shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                ratesSubTab === 'PACKAGES'
                  ? 'bg-[#F5B738] border-[#F5B738] text-black'
                  : 'bg-[#14181F] border-[#2B3441] text-slate-200 hover:border-[#F5B738]'
              }`}
            >
              <Award className="w-3 h-3 shrink-0" />
              <span>Plans</span>
            </button>

            <button
              type="button"
              onClick={openSupportModal}
              className="boss-flat-btn relative shrink-0 px-2.5 py-1.5 rounded-lg border border-sky-500/60 bg-sky-950/30 text-sky-300 hover:bg-sky-500 hover:text-black text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <MessageSquarePlus className="w-3 h-3 shrink-0" />
              <span>Support Request</span>
              {unreadAdminSupportCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                  {unreadAdminSupportCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenThemeStudio}
              className="boss-flat-btn shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#0C0F14] text-amber-300 hover:border-[#F5B738] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Palette className="w-3 h-3 shrink-0" />
              <span>Theme</span>
            </button>
          </div>

          {/* =============================================================== */}
          {/* SUB-TAB 1: ALUMINIUM & GLASS RATES (3-COL GRID & TABLE)         */}
          {/* =============================================================== */}
          {ratesSubTab === 'RATES' && (
            <div
              className="p-2.5 sm:p-3.5 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-2.5 text-xs select-none boss-protected-content"
              onCopy={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Header & View Switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#F5B738]">
                    Rates Setup ({rateGaugeTab}mm - {rateColorTab})
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    {rateListSavedAt && (
                      <span className="text-emerald-400 font-mono font-bold">
                        ✓ Saved on Device ({new Date(rateListSavedAt).toLocaleDateString('en-GB')})
                      </span>
                    )}
                    {cloudAccessInfo?.lastSyncedAt && (
                      <span className="text-sky-400 font-mono">
                        ☁️ Cloud ({cloudAccessInfo.status})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center rounded-lg bg-[#0C0F14] border border-slate-800 p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setRateViewMode('GRID')}
                    className={`boss-flat-btn w-7 h-7 rounded flex items-center justify-center cursor-pointer ${
                      rateViewMode === 'GRID'
                        ? 'bg-[#F5B738] text-black'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="3-Col Grid View"
                    aria-label="3-Col Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateViewMode('TABLE')}
                    className={`boss-flat-btn w-7 h-7 rounded flex items-center justify-center cursor-pointer ${
                      rateViewMode === 'TABLE'
                        ? 'bg-[#F5B738] text-black'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="3-Col Table View"
                    aria-label="3-Col Table View"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact Icon-Only Smart Action Toolbar (Scan Photo | Sync Cloud | Import JSON | Save Device | Utilities) */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                    title={rateScanLoading ? 'Scanning Rate Photo...' : 'AI Scan Photo'}
                    aria-label="AI Scan Photo"
                  >
                    <Camera className={`w-4 h-4 ${rateScanLoading ? 'animate-pulse' : ''}`} />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={rateScanLoading}
                      onChange={(e) => {
                        setShowRateUpdater(true);
                        handleClientScanRateImages(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={() => onSyncFromSupabase?.({ forceRates: true, silent: false })}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/60 text-sky-300 hover:bg-sky-500 hover:text-black flex items-center justify-center cursor-pointer"
                    title={isSyncingCloud ? 'Syncing Updates...' : 'Sync / Check Updates'}
                    aria-label="Sync / Check Updates"
                  >
                    <Cloud className={`w-4 h-4 ${isSyncingCloud ? 'animate-pulse' : ''}`} />
                  </button>

                  <label
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-[#F5B738]/60 text-[#F5B738] hover:bg-[#F5B738] hover:text-black flex items-center justify-center cursor-pointer"
                    title="Import JSON Rate List"
                    aria-label="Import JSON Rate List"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const parsed = JSON.parse(String(reader.result || '{}'));
                            if (parsed.rates && onApplyRateListRows) {
                              const importedRows: {
                                sectionTitle: string;
                                sectionCode: string;
                                gauge: string;
                                color: string;
                                rate: number;
                              }[] = [];
                              Object.entries(parsed.rates).forEach(([g, colMap]: [string, any]) => {
                                Object.entries(colMap || {}).forEach(([col, secMap]: [string, any]) => {
                                  Object.entries(secMap || {}).forEach(([sec, val]: [string, any]) => {
                                    const num = Number(val);
                                    if (num > 0) {
                                      importedRows.push({
                                        sectionTitle: sec,
                                        sectionCode: sec,
                                        gauge: g,
                                        color: col,
                                        rate: num,
                                      });
                                    }
                                  });
                                });
                              });
                              if (importedRows.length > 0) {
                                onApplyRateListRows(importedRows);
                                onSaveRatesToDevice();
                                showSettingsToast(`Imported ${importedRows.length} rates & saved to device!`);
                                return;
                              }
                            }
                            const ok = onImportFullBackup(String(reader.result || ''));
                            if (ok) onSaveRatesToDevice();
                            showSettingsToast(ok ? 'Rate List imported & saved!' : 'Invalid Rate List JSON.');
                          } catch {
                            showSettingsToast('Invalid Rate List JSON file.');
                          }
                        };
                        reader.readAsText(f);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      onSaveRatesToDevice();
                      showSettingsToast('Saved on Device! Rate list is permanently locked in your browser/app.');
                    }}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center cursor-pointer"
                    title="Save Rate List to Device"
                    aria-label="Save Rate List to Device"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>

                {/* Compact Secondary Rate Utilities Icon Strip */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowRateUpdater((prev) => !prev)}
                    className={`boss-flat-btn w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer ${
                      showRateUpdater
                        ? 'bg-sky-500 border-sky-400 text-black'
                        : 'bg-[#0C0F14] border-sky-500/50 text-sky-300'
                    }`}
                    title={showRateUpdater ? 'Hide Bulk % / Paste Updater' : 'Paste / Bulk % Rate Updater'}
                    aria-label="Paste / Bulk % Rate Updater"
                  >
                    <Percent className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateSectionRate) {
                        DG_SERIES_SCANNED_RATES.forEach((item) => {
                          const sec = item.sec;
                          const g = item.gauge;
                          Object.entries(item.rates).forEach(([col, r]) => {
                            onUpdateSectionRate(g, col, sec, r);
                            onUpdateSectionRate(g, col, item.fullCode, r);
                          });
                        });
                      }
                      showSettingsToast('Applied DG.SERIES Rates — tap Save to store!');
                    }}
                    className="boss-flat-btn w-7 h-7 rounded-lg bg-[#0C0F14] border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-black flex items-center justify-center cursor-pointer"
                    title="Auto-Apply DG.SERIES Rates"
                    aria-label="Auto-Apply DG.SERIES Rates"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRestoreDefaultRates();
                      showSettingsToast('Restored factory default rates!');
                    }}
                    className="boss-flat-btn w-7 h-7 rounded-lg bg-[#0C0F14] border border-slate-700 text-slate-300 hover:border-[#F5B738] hover:text-[#F5B738] flex items-center justify-center cursor-pointer"
                    title="Restore Factory Defaults"
                    aria-label="Restore Factory Defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmClearRates(true)}
                    className="boss-flat-btn w-7 h-7 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white flex items-center justify-center cursor-pointer"
                    title="Clear All Rates to 0"
                    aria-label="Clear All Rates to 0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {hiddenSections.length > 0 && (
                    <button
                      type="button"
                      onClick={onUnhideAllSections}
                      className="boss-flat-btn w-7 h-7 rounded-lg bg-amber-500/20 border border-[#F5B738] text-[#F5B738] flex items-center justify-center cursor-pointer"
                      title={`Unhide ${hiddenSections.length} Hidden Section(s)`}
                      aria-label="Unhide Hidden Sections"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Client New Rate List Updater Panel (Photo Scan / Paste Table / % Adjust / Export) */}
              {showRateUpdater && (
                <div className="p-3 rounded-xl bg-[#0C0F14] border border-sky-500/60 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <div className="text-xs font-bold text-sky-400">
                        Update New Rate List &amp; Save on Your Device
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Photo scan karein, rate list paste karein, ya % rate barhayein/kam karein.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob(
                          [
                            JSON.stringify(
                              {
                                rates,
                                glassRates,
                                availableColors,
                                customSections,
                                exportedAt: new Date().toISOString(),
                              },
                              null,
                              2
                            ),
                          ],
                          { type: 'application/json' }
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `boss_rate_list_${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showSettingsToast('Rate List JSON exported!');
                      }}
                      className="boss-flat-btn px-2.5 py-1 rounded bg-[#14181F] border border-slate-700 text-amber-300 font-bold text-[10px] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  {/* Quick Market % Adjustment */}
                  <div className="p-2.5 rounded-lg bg-[#14181F] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-200 text-[11px]">
                      Quick % Rate Update:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={rateBulkScope}
                        onChange={(e) => setRateBulkScope(e.target.value as 'CURRENT' | 'ALL')}
                        className="px-2 py-1 rounded bg-[#0C0F14] border border-slate-700 text-white text-[11px] font-semibold"
                      >
                        <option value="ALL">All Gauges &amp; Colors</option>
                        <option value="CURRENT">
                          Only {rateGaugeTab}mm · {rateColorTab}
                        </option>
                      </select>
                      <input
                        type="number"
                        step="0.5"
                        value={rateBulkPct}
                        onChange={(e) => setRateBulkPct(e.target.value)}
                        placeholder="+5"
                        className="w-16 px-2 py-1 rounded bg-[#0C0F14] border border-slate-700 font-mono text-amber-300 font-bold text-[11px]"
                      />
                      <span className="text-slate-400 font-bold">%</span>
                      <button
                        type="button"
                        onClick={() => {
                          const pctVal = parseFloat(rateBulkPct);
                          if (!pctVal || Number.isNaN(pctVal)) return;
                          onBulkAdjustRatesPct?.(
                            pctVal,
                            rateBulkScope === 'CURRENT' ? rateGaugeTab : 'ALL',
                            rateBulkScope === 'CURRENT' ? rateColorTab : 'ALL'
                          );
                          showSettingsToast(
                            `Updated ${rateBulkScope === 'CURRENT' ? `${rateGaugeTab}mm ${rateColorTab}` : 'All'} rates by ${pctVal > 0 ? '+' : ''}${pctVal}% & saved!`
                          );
                        }}
                        className="boss-flat-btn px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] cursor-pointer"
                      >
                        Apply % &amp; Save
                      </button>
                    </div>
                  </div>

                  {/* Paste Rate Text + Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-300">
                        Paste Rates (<span className="font-mono text-amber-300">DC30C | 1.6 | DULL | 980</span> ya <span className="font-mono text-amber-300">DC30C = 980</span>):
                      </label>
                      <textarea
                        rows={3}
                        value={ratePasteText}
                        onChange={(e) => setRatePasteText(e.target.value)}
                        placeholder={'DC30C | 1.6 | DULL | 980\nDC26C | 1.6 | DULL | 940\nD54A = 1120'}
                        className="w-full p-2 rounded-lg bg-[#14181F] border border-slate-700 font-mono text-[11px] text-white focus:border-sky-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rows = parseClientRateListText(ratePasteText);
                          if (rows.length === 0) {
                            showSettingsToast('No valid rate rows found.');
                            return;
                          }
                          setRateScanRows(rows);
                          showSettingsToast(`Parsed ${rows.length} rates! Review and save.`);
                        }}
                        className="boss-flat-btn px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-[11px] cursor-pointer"
                      >
                        Parse Pasted Rates
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#14181F] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#F5B738] text-[11px]">
                          Extracted Rows ({rateScanRows.length})
                        </span>
                        {rateScanRows.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setRateScanRows([])}
                            className="boss-flat-btn text-[10px] text-rose-400 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {rateScanRows.length === 0 ? (
                        <div className="text-[10px] text-slate-400 py-3 text-center">
                          Scan photo or paste rate rows to preview &amp; apply.
                        </div>
                      ) : (
                        <>
                          <div className="max-h-36 overflow-y-auto space-y-1">
                            {rateScanRows.map((row, idx) => (
                              <div
                                key={`${row.sectionCode}-${row.gauge}-${row.color}-${idx}`}
                                className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-[#0C0F14] border border-slate-800 text-[10px]"
                              >
                                <span className="font-mono font-bold text-[#F5B738] truncate">
                                  {row.sectionCode}
                                </span>
                                <span className="text-slate-400 font-mono">{row.gauge}mm</span>
                                <span className="text-sky-300 truncate">{row.color}</span>
                                <input
                                  type="number"
                                  value={row.rate}
                                  onChange={(e) => {
                                    const next = [...rateScanRows];
                                    next[idx] = { ...next[idx], rate: parseFloat(e.target.value) || 0 };
                                    setRateScanRows(next);
                                  }}
                                  className="w-16 px-1 py-0.5 rounded bg-[#14181F] border border-slate-700 font-mono text-emerald-300 text-right font-bold"
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onApplyRateListRows) {
                                const res = onApplyRateListRows(rateScanRows);
                                onSaveRatesToDevice();
                                showSettingsToast(
                                  `Saved to Device! Updated ${res.updated} & added ${res.inserted} rates.`
                                );
                              }
                              setRateScanRows([]);
                            }}
                            className="boss-flat-btn w-full py-2 rounded-lg bg-emerald-500 text-black font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Apply &amp; Save to Device</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {confirmClearRates && (
                <div className="p-3 rounded-xl bg-rose-950 border border-rose-500 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-white">
                    Confirm: Clear all rate list values to 0?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllRates();
                        setConfirmClearRates(false);
                      }}
                      className="boss-flat-btn px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                    >
                      Yes, Clear to 0
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearRates(false)}
                      className="boss-flat-btn px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Underline Switcher: Aluminium Rates (3 Cols) vs Glass Rates (3 Cols) */}
              <div className="grid grid-cols-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setRateCategoryTab('ALUMINIUM')}
                  className={`boss-flat-btn py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
                    rateCategoryTab === 'ALUMINIUM'
                      ? 'border-[#F5B738] text-[#F5B738]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Aluminium Rates (3 Cols)
                </button>
                <button
                  type="button"
                  onClick={() => setRateCategoryTab('GLASS')}
                  className={`boss-flat-btn py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
                    rateCategoryTab === 'GLASS'
                      ? 'border-[#F5B738] text-[#F5B738]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Glass Rates (3 Cols)
                </button>
              </div>

              {/* =========================================================== */}
              {/* ALUMINIUM RATES (3-COL GRID OR 3-COL TABLE)                 */}
              {/* =========================================================== */}
              {rateCategoryTab === 'ALUMINIUM' && (
                <div className="space-y-3">
                  {/* Gauges & Colors Selector Box */}
                  <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Aluminium Gauges (Tap to Select):
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {GAUGES.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setRateGaugeTab(g)}
                            className={`boss-flat-btn px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              rateGaugeTab === g
                                ? 'bg-[#F5B738] text-black'
                                : 'bg-[#14181F] border border-slate-700 text-slate-300'
                            }`}
                          >
                            {g}mm
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Aluminium Colors (Tap to Select / × Delete):
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddColorForm((v) => !v)}
                          className="boss-flat-btn px-2 py-0.5 rounded bg-[#F5B738] text-black font-extrabold text-[10px] cursor-pointer shrink-0"
                        >
                          + Add Color
                        </button>
                      </div>

                      {showAddColorForm && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            value={newColorInput}
                            onChange={(e) => setNewColorInput(e.target.value.toUpperCase())}
                            placeholder="New Color (e.g. CHAMPAGNE)"
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newColorInput.trim()) return;
                              onAddColor(newColorInput.trim());
                              setRateColorTab(newColorInput.trim().toUpperCase());
                              setNewColorInput('');
                              setShowAddColorForm(false);
                              showSettingsToast('Color added!');
                            }}
                            className="boss-flat-btn px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        {availableColors.map((col) => (
                          <div
                            key={col}
                            className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[11px] ${
                              rateColorTab === col
                                ? 'bg-[#F5B738]/20 border-[#F5B738] text-[#F5B738] font-extrabold'
                                : 'bg-[#14181F] border-slate-700 text-slate-300 font-semibold'
                            }`}
                          >
                            {editingColorName === col ? (
                              <>
                                <input
                                  type="text"
                                  value={editingColorVal}
                                  onChange={(e) => setEditingColorVal(e.target.value.toUpperCase())}
                                  className="w-20 px-1 py-0.5 rounded bg-[#0C0F14] border border-amber-400 text-white font-mono text-[10px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingColorVal.trim()) {
                                      onEditColor(col, editingColorVal.trim().toUpperCase());
                                      setRateColorTab(editingColorVal.trim().toUpperCase());
                                      showSettingsToast(`Renamed ${col} → ${editingColorVal.trim().toUpperCase()}`);
                                    }
                                    setEditingColorName(null);
                                  }}
                                  className="boss-flat-btn px-1.5 py-0.5 rounded bg-emerald-500 text-black font-bold text-[10px]"
                                >
                                  Ok
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setRateColorTab(col)}
                                  className="boss-flat-btn truncate max-w-[110px] cursor-pointer"
                                >
                                  {col}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingColorName(col);
                                    setEditingColorVal(col);
                                  }}
                                  className="boss-flat-btn text-sky-400 hover:text-sky-300 text-[10px] cursor-pointer"
                                  title="Rename color"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteColor(col);
                                    showSettingsToast(`Deleted color "${col}"`);
                                  }}
                                  className="boss-flat-btn text-rose-400 hover:text-rose-300 font-bold text-[10px] cursor-pointer"
                                  title="Delete color"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Filter & Section Action Bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={rateSearch}
                        onChange={(e) => setRateSearch(e.target.value)}
                        placeholder="Search Section (e.g. D54A, M23)"
                        className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddSectionForm((v) => !v)}
                      className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center shrink-0 cursor-pointer"
                      title="Add New Section"
                      aria-label="Add New Section"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateMultiDeleteMode((v) => !v)}
                      className={`boss-flat-btn w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                        rateMultiDeleteMode
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-[#0C0F14] border-rose-500/60 text-rose-400 hover:bg-rose-600 hover:text-white'
                      }`}
                      title="Toggle Multi-Delete Mode"
                      aria-label="Toggle Multi-Delete Mode"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inline Add New Section Form */}
                  {showAddSectionForm && (
                    <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-emerald-500/50 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newSecCodeInput}
                          onChange={(e) => setNewSecCodeInput(e.target.value.toUpperCase())}
                          placeholder="Code (e.g. CW50)"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 font-mono text-white text-xs"
                        />
                        <input
                          type="number"
                          value={newSecRateInput}
                          onChange={(e) => setNewSecRateInput(e.target.value)}
                          placeholder="Rate/ft"
                          className="w-20 px-2 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 font-mono text-amber-300 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newSecCodeInput.trim()) return;
                            onAddCustomSection(
                              newSecCodeInput.trim(),
                              parseFloat(newSecRateInput) || 750
                            );
                            showSettingsToast(`Added section "${newSecCodeInput.trim().toUpperCase()}"!`);
                            setNewSecCodeInput('');
                            setShowAddSectionForm(false);
                          }}
                          className="boss-flat-btn px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs shrink-0"
                        >
                          Add
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddPairModal(true)}
                        className="boss-flat-btn text-[11px] text-sky-400 hover:underline font-semibold"
                      >
                        + Or Add Frame Section Pair (2 in 1)
                      </button>
                    </div>
                  )}

                  {/* Computed Filtered Sections List */}
                  {(() => {
                    const filteredSections = Array.from(
                      new Set([
                        ...DEFAULT_SECTIONS,
                        ...customSections,
                        ...Object.keys(rates[rateGaugeTab]?.[rateColorTab] || {}),
                        ...Object.keys(rates['1.2']?.['DULL'] || {}),
                        ...Object.keys(rates['1.6']?.['DULL'] || {}),
                        ...Object.keys(rates['2']?.['DULL'] || {}),
                      ])
                    )
                      .sort((a, b) => {
                        const isDGA = a.startsWith('DG') || a.startsWith('GSPR');
                        const isDGB = b.startsWith('DG') || b.startsWith('GSPR');
                        if (isDGA && !isDGB) return -1;
                        if (!isDGA && isDGB) return 1;
                        return a.localeCompare(b);
                      })
                      .filter((sec) => !deletedSecs.includes(sec))
                      .filter(
                        (sec) =>
                          !rateSearch.trim() ||
                          sec.toLowerCase().includes(rateSearch.trim().toLowerCase()) ||
                          (SECTION_LABELS[sec] || '')
                            .toLowerCase()
                            .includes(rateSearch.trim().toLowerCase())
                      );

                    if (rateViewMode === 'TABLE') {
                      return (
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-[#0C0F14] text-[10px] text-slate-400 uppercase sticky top-0">
                              <tr className="border-b border-slate-800">
                                <th className="py-2 px-2.5">Section</th>
                                <th className="py-2 px-2">Rate (Rs/ft)</th>
                                <th className="py-2 px-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/70">
                              {filteredSections.map((sec) => {
                                const isHidden = hiddenSections.includes(sec);
                                const val =
                                  rates[rateGaugeTab]?.[rateColorTab]?.[sec] ??
                                  resolveSectionRate(rates, rateGaugeTab, rateColorTab, sec);
                                const barLen = sec.endsWith('F') ? 19 : 18;
                                return (
                                  <tr
                                    key={sec}
                                    className={isHidden ? 'bg-[#0C0F14]/40 opacity-60' : 'bg-[#0C0F14]'}
                                  >
                                    <td className="py-1.5 px-2.5">
                                      <div className="font-mono font-extrabold text-[#F5B738]">{sec}</div>
                                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                        {SECTION_LABELS[sec] || sec}
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          value={val}
                                          onChange={(e) =>
                                            onUpdateSectionRate(
                                              rateGaugeTab,
                                              rateColorTab,
                                              sec,
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          className="w-20 px-2 py-1 rounded bg-[#14181F] border border-slate-700 font-mono font-bold text-white text-xs"
                                        />
                                        <span className="text-[10px] font-mono text-emerald-400 whitespace-nowrap">
                                          {barLen}ft: Rs {Math.round(val * barLen).toLocaleString()}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => onToggleHideSection(sec)}
                                          className="boss-flat-btn p-1 rounded bg-[#14181F] border border-slate-700 text-slate-300"
                                          title={isHidden ? 'Unhide' : 'Hide'}
                                        >
                                          {isHidden ? (
                                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                                          ) : (
                                            <Eye className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteSection(sec);
                                            showSettingsToast(`Deleted "${sec}"`);
                                          }}
                                          className="boss-flat-btn p-1 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300"
                                          title="Delete section"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[420px] overflow-y-auto pr-0.5">
                        {filteredSections.map((sec) => {
                          const isHidden = hiddenSections.includes(sec);
                          const val =
                            rates[rateGaugeTab]?.[rateColorTab]?.[sec] ??
                            resolveSectionRate(rates, rateGaugeTab, rateColorTab, sec);
                          const barLen = sec.endsWith('F') ? 19 : 18;
                          return (
                            <div
                              key={sec}
                              className={`p-2 rounded-xl border space-y-1 ${
                                rateMultiDeleteMode
                                  ? 'bg-rose-950/20 border-rose-500/60'
                                  : isHidden
                                  ? 'bg-[#0C0F14]/50 border-rose-900/50 opacity-60'
                                  : 'bg-[#0C0F14] border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-[#F5B738] font-mono truncate">
                                  {sec}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteSection(sec);
                                      showSettingsToast(`Deleted "${sec}"`);
                                    }}
                                    className="boss-flat-btn p-0.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                                    title="Delete Section"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onToggleHideSection(sec)}
                                    className="boss-flat-btn p-0.5 text-slate-400 hover:text-white cursor-pointer"
                                    title={isHidden ? 'Unhide Section' : 'Hide Section'}
                                  >
                                    {isHidden ? (
                                      <EyeOff className="w-3 h-3 text-amber-400" />
                                    ) : (
                                      <Eye className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="text-[9px] text-slate-400 truncate">
                                {SECTION_LABELS[sec] || sec}
                              </div>

                              <div className="text-[10px] font-mono font-bold text-emerald-400 truncate">
                                {barLen}ft: Rs {Math.round(val * barLen).toLocaleString()}
                              </div>

                              <div className="flex items-center gap-1 bg-[#14181F] px-1.5 py-1 rounded-lg border border-slate-700">
                                <span className="text-[9px] text-slate-400 shrink-0">Rs/ft:</span>
                                <input
                                  type="number"
                                  value={val}
                                  onChange={(e) =>
                                    onUpdateSectionRate(
                                      rateGaugeTab,
                                      rateColorTab,
                                      sec,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full min-w-0 bg-transparent text-xs font-mono font-bold text-white text-right focus:outline-none"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* =========================================================== */}
              {/* GLASS RATES (3-COL GRID OR 3-COL TABLE)                     */}
              {/* =========================================================== */}
              {rateCategoryTab === 'GLASS' && (
                <div className="space-y-3">
                  {/* Glass Gauges & Colors Add/Delete Card */}
                  <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-[#F5B738]">
                        Glass Gauges &amp; Colors (Add / Delete)
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowAddGlassGaugeForm((v) => !v)}
                          className="boss-flat-btn px-2 py-1 rounded-lg bg-[#F5B738] text-black font-extrabold text-[10px] cursor-pointer"
                        >
                          + Glass Gauge
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddGlassColorForm((v) => !v)}
                          className="boss-flat-btn px-2 py-1 rounded-lg bg-emerald-500 text-black font-extrabold text-[10px] cursor-pointer"
                        >
                          + Glass Color
                        </button>
                        <button
                          type="button"
                          onClick={() => setRateMultiDeleteMode((v) => !v)}
                          className={`boss-flat-btn px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                            rateMultiDeleteMode
                              ? 'bg-rose-600 border-rose-500 text-white'
                              : 'bg-[#14181F] border-rose-500/60 text-rose-400'
                          }`}
                        >
                          Multi-Del
                        </button>
                      </div>
                    </div>

                    {/* Inline Add Glass Gauge Form */}
                    {showAddGlassGaugeForm && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newGlassGaugeInput}
                          onChange={(e) => setNewGlassGaugeInput(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="Gauge mm (e.g. 10, 12)"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 font-mono text-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const g = newGlassGaugeInput.trim();
                            if (!g) return;
                            onAddGlassGauge(g);
                            setAddGlassTargetGauge(g);
                            setShowAddGlassGaugeForm(false);
                            showSettingsToast(`Added ${g}mm Glass Gauge!`);
                          }}
                          className="boss-flat-btn px-3 py-1.5 rounded-lg bg-[#F5B738] text-black font-bold text-xs shrink-0"
                        >
                          Add Gauge
                        </button>
                      </div>
                    )}

                    {/* Inline Add Glass Color Form */}
                    {showAddGlassColorForm && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={addGlassTargetGauge}
                          onChange={(e) => setAddGlassTargetGauge(e.target.value)}
                          className="px-2 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-amber-300 font-mono text-xs"
                        >
                          {Object.keys(glassRates).map((gm) => (
                            <option key={gm} value={gm}>
                              {gm === 'DG' ? 'DG Glass' : `${gm}mm`}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={addGlassTargetGauge === '8' ? newGlass8Color : newGlass5Color}
                          onChange={(e) =>
                            addGlassTargetGauge === '8'
                              ? setNewGlass8Color(e.target.value.toUpperCase())
                              : setNewGlass5Color(e.target.value.toUpperCase())
                          }
                          placeholder="Color (e.g. GREEN, BRONZE)"
                          className="flex-1 min-w-[110px] px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs"
                        />
                        <input
                          type="number"
                          value={addGlassTargetGauge === '8' ? newGlass8Rate : newGlass5Rate}
                          onChange={(e) =>
                            addGlassTargetGauge === '8'
                              ? setNewGlass8Rate(e.target.value)
                              : setNewGlass5Rate(e.target.value)
                          }
                          placeholder="Rate"
                          className="w-16 px-2 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 font-mono text-amber-300 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const rawCol =
                              addGlassTargetGauge === '8' ? newGlass8Color : newGlass5Color;
                            const rawRate =
                              addGlassTargetGauge === '8' ? newGlass8Rate : newGlass5Rate;
                            const col = rawCol.trim().toUpperCase();
                            if (!col) return;
                            onAddGlassColor(
                              addGlassTargetGauge,
                              col,
                              parseFloat(rawRate) || 220
                            );
                            if (addGlassTargetGauge === '8') setNewGlass8Color('');
                            else setNewGlass5Color('');
                            setShowAddGlassColorForm(false);
                            showSettingsToast(
                              `Added "${col}" to ${
                                addGlassTargetGauge === 'DG' ? 'DG' : `${addGlassTargetGauge}mm`
                              } Glass!`
                            );
                          }}
                          className="boss-flat-btn px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs shrink-0"
                        >
                          Add Color
                        </button>
                      </div>
                    )}

                    {/* Glass Gauges Pills Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">Glass Gauges:</span>
                        {Object.keys(glassRates).map((gm) => (
                          <span
                            key={gm}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14181F] border border-amber-500/50 text-amber-300 font-bold text-[11px]"
                          >
                            <span>{gm === 'DG' ? 'DG Glass' : `${gm}mm Glass`}</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteGlassGauge(gm);
                                showSettingsToast(
                                  `Removed ${gm === 'DG' ? 'DG' : `${gm}mm`} Glass Gauge`
                                );
                              }}
                              className="boss-flat-btn text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                              title={`Delete ${gm === 'DG' ? 'DG' : `${gm}mm`} Glass Gauge`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onRestoreDefaultRates();
                          showSettingsToast('Restored Default Glass Rates!');
                        }}
                        className="boss-flat-btn px-2.5 py-1 rounded-lg bg-[#14181F] border border-slate-700 text-slate-300 text-[10px] font-bold"
                      >
                        Restore Defaults
                      </button>
                    </div>
                  </div>

                  {/* Per Glass Gauge 3-Col Cards or Table */}
                  {Object.entries(glassRates).map(([gm, colorMap]) => (
                    <div
                      key={gm}
                      className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-[#F5B738]">
                          {gm === 'DG' ? 'DG Glass' : `${gm}mm Glass`} Rates (Rs. / Sq.Ft)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAddGlassTargetGauge(gm);
                              setShowAddGlassColorForm(true);
                            }}
                            className="boss-flat-btn px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold cursor-pointer"
                          >
                            + {gm === 'DG' ? 'DG' : `${gm}mm`} Color
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteGlassGauge(gm);
                              showSettingsToast(
                                `Deleted ${gm === 'DG' ? 'DG' : `${gm}mm`} Glass Gauge`
                              );
                            }}
                            className="boss-flat-btn px-2 py-0.5 rounded bg-rose-950 border border-rose-500/60 text-rose-300 text-[10px] font-bold cursor-pointer"
                          >
                            Del {gm === 'DG' ? 'DG' : `${gm}mm`}
                          </button>
                        </div>
                      </div>

                      {rateViewMode === 'TABLE' ? (
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-[#14181F] text-[10px] text-slate-400 uppercase">
                              <tr className="border-b border-slate-800">
                                <th className="py-1.5 px-2.5">Glass Color</th>
                                <th className="py-1.5 px-2">Rate (Rs/Sq.Ft)</th>
                                <th className="py-1.5 px-2 text-right">Del</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/70">
                              {Object.entries(colorMap || {}).map(([col, rateVal]) => (
                                <tr key={`${gm}-${col}`}>
                                  <td className="py-1.5 px-2.5 font-bold text-amber-300">
                                    {gm === 'DG' ? `DG ${col}` : `${gm}mm ${col}`}
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <input
                                      type="number"
                                      value={rateVal}
                                      onChange={(e) =>
                                        onUpdateGlassRate(
                                          gm,
                                          col,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-24 px-2 py-1 rounded bg-[#14181F] border border-slate-700 font-mono font-bold text-white"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteGlassColor(gm, col);
                                        showSettingsToast(
                                          `Deleted "${col}" from ${
                                            gm === 'DG' ? 'DG' : `${gm}mm`
                                          } Glass`
                                        );
                                      }}
                                      className="boss-flat-btn p-1 rounded bg-rose-950 text-rose-300"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                          {Object.entries(colorMap || {}).map(([col, rateVal]) => (
                            <div
                              key={`${gm}-${col}`}
                              className={`p-2 rounded-xl border space-y-1 ${
                                rateMultiDeleteMode
                                  ? 'bg-rose-950/20 border-rose-500/60'
                                  : 'bg-[#14181F] border-slate-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-[11px] font-extrabold text-[#F5B738] leading-tight truncate">
                                  {gm === 'DG' ? `DG ${col}` : `${gm}mm ${col}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteGlassColor(gm, col);
                                    showSettingsToast(
                                      `Deleted "${col}" from ${
                                        gm === 'DG' ? 'DG' : `${gm}mm`
                                      } Glass`
                                    );
                                  }}
                                  className="boss-flat-btn p-0.5 text-rose-400 hover:text-rose-300 shrink-0 cursor-pointer"
                                  title={`Delete ${col} from ${gm === 'DG' ? 'DG' : `${gm}mm`} Glass`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-[9px] text-slate-400">Per Sq.Ft</div>
                              <div className="flex items-center gap-1 bg-[#0C0F14] px-1.5 py-1 rounded-lg border border-slate-700">
                                <span className="text-[9px] text-slate-400 shrink-0">Rs:</span>
                                <input
                                  type="number"
                                  value={rateVal}
                                  onChange={(e) =>
                                    onUpdateGlassRate(gm, col, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full min-w-0 bg-transparent text-xs font-mono font-bold text-white text-right focus:outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* SUB-TAB 2: LOGO, BACKGROUND & CUSTOM LETTERHEAD                 */}
          {/* =============================================================== */}
          {ratesSubTab === 'LOGO_BG' && (
            <div className="p-3 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-3.5 text-xs">
              <div>
                <h3 className="text-sm font-extrabold text-[#F5B738] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Logo, Background &amp; Custom Letterhead</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customize your shop logo, quotation background, and letterhead details for PDF bills &amp; charts.
                </p>
              </div>

              {/* Locked Official App Main Logo Notice (User Requirement #3) */}
              <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-[#F5B738]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={mainLogoUrl}
                    alt="Official App Logo"
                    className="w-10 h-10 rounded-full object-cover border border-[#F5B738] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-[#F5B738] text-[11px] truncate">
                      Official App Icon (Locked)
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      App header logo locked hai aur change nahi ho sakta.
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#14181F] border border-slate-700 text-slate-300 font-bold text-[10px] shrink-0">
                  <Lock className="w-3 h-3 text-[#F5B738]" />
                  <span>Locked</span>
                </span>
              </div>

              {/* Shop Logo & Background Compact Icon Action Row */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={activeShopLogoUrl}
                    alt="Shop Logo"
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#F5B738] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs truncate">Shop Logo &amp; Sheet BG</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Upload, Save or Share logo &amp; sheet background
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                    title="Upload Custom Logo from Gallery"
                    aria-label="Upload Custom Logo from Gallery"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageFileUpload(
                          e,
                          (dataUrl) =>
                            onUpdateLayoutConfig({
                              ...layoutConfig,
                              shopLogoUrl: dataUrl,
                            }),
                          'Shop Logo for Quotation & Charts'
                        )
                      }
                      className="hidden"
                    />
                  </label>

                  <label
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#14181F] border border-[#F5B738]/60 text-[#F5B738] hover:bg-[#F5B738] hover:text-black flex items-center justify-center cursor-pointer"
                    title="Upload Custom Sheet Background"
                    aria-label="Upload Custom Sheet Background"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageFileUpload(
                          e,
                          onUpdateLetterheadBgUrl,
                          'Quotation Letterhead Background'
                        )
                      }
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = activeShopLogoUrl;
                      a.download = `boss_shop_logo_${Date.now()}.png`;
                      a.click();
                      showSettingsToast('Saved Shop Logo!');
                    }}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#14181F] border border-amber-500/60 text-amber-300 hover:bg-amber-500 hover:text-black flex items-center justify-center cursor-pointer"
                    title="Save Shop Logo"
                    aria-label="Save Shop Logo"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          const resp = await fetch(activeShopLogoUrl);
                          const blob = await resp.blob();
                          const file = new File([blob], 'boss_shop_logo.png', { type: blob.type || 'image/png' });
                          if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ title: companyName || 'Boss Aluminium & Glass', files: [file] });
                            return;
                          }
                        }
                      } catch {
                        // fallback to download
                      }
                      const a = document.createElement('a');
                      a.href = activeShopLogoUrl;
                      a.download = `boss_shop_logo_${Date.now()}.png`;
                      a.click();
                      showSettingsToast('Logo downloaded for sharing!');
                    }}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#14181F] border border-sky-500/60 text-sky-300 hover:bg-sky-500 hover:text-black flex items-center justify-center cursor-pointer"
                    title="Share Shop Logo"
                    aria-label="Share Shop Logo"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Letterhead Background Quick Controls */}
              <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-300">Picture Background:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateLayoutConfig({
                        ...layoutConfig,
                        showLetterheadBackground: !layoutConfig.showLetterheadBackground,
                      })
                    }
                    className={`boss-flat-btn px-2 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                      layoutConfig.showLetterheadBackground
                        ? 'bg-emerald-500 text-black'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {layoutConfig.showLetterheadBackground ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <span className="text-[10px] text-slate-400">Opacity:</span>
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
                </div>
                {layoutConfig.shopLogoUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdateLayoutConfig({ ...layoutConfig, shopLogoUrl: '' })}
                    className="boss-flat-btn px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold"
                  >
                    Reset Shop Logo
                  </button>
                )}
              </div>

              {/* Company Info Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Company / Shop Name</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tagline / Subtitle</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Phone Numbers (Shown on PDF Bill)
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Shop / Office Address (Shown on PDF Bill)
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              {/* Client Cloud Profile Photos & Sync */}
              {authSession && (
                <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#F5B738]">
                      Client Cloud Profile &amp; Verification Photos
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSyncUserProfileToCloud?.({ companyName });
                        showSettingsToast('✅ Company Name & Profile synced to Admin Cloud!');
                      }}
                      className="boss-flat-btn px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10.5px] flex items-center gap-1 cursor-pointer"
                    >
                      <Cloud className="w-3 h-3" />
                      <span>Sync Profile to Cloud</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer p-2 rounded-lg bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] flex items-center gap-2 text-[10.5px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          const up = await uploadImageToUserUploadsBucket({
                            fileOrDataUrl: f,
                            folder: 'selfies',
                            deviceId: clientDeviceId,
                            tag: 'selfie',
                          });
                          onSyncUserProfileToCloud?.({ selfieUrl: up.url, companyName });
                          showSettingsToast('✅ Selfie photo synced to Admin Cloud!');
                        }}
                        className="hidden"
                      />
                      <Camera className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate font-semibold text-slate-200">
                        {authSession.selfieUrl ? 'Update Selfie Photo' : 'Upload Selfie Photo'}
                      </span>
                    </label>

                    <label className="cursor-pointer p-2 rounded-lg bg-[#14181F] border border-dashed border-slate-700 hover:border-[#F5B738] flex items-center gap-2 text-[10.5px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          const up = await uploadImageToUserUploadsBucket({
                            fileOrDataUrl: f,
                            folder: 'shops',
                            deviceId: clientDeviceId,
                            tag: 'shop',
                          });
                          onSyncUserProfileToCloud?.({ shopPhotoUrl: up.url, companyName });
                          showSettingsToast('✅ Shop photo synced to Admin Cloud!');
                        }}
                        className="hidden"
                      />
                      <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate font-semibold text-slate-200">
                        {authSession.shopPhotoUrl ? 'Update Shop Photo' : 'Upload Shop Photo'}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Live PDF Letterhead Preview */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold text-[#F5B738] uppercase tracking-wider">
                  LIVE PDF LETTERHEAD PREVIEW:
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[#F5B738]/50 bg-[#0C0F14] p-3 flex items-center gap-3">
                  {layoutConfig.showLetterheadBackground && (
                    <img
                      src={letterheadBgUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{ opacity: layoutConfig.letterheadOpacity || 0.25 }}
                    />
                  )}
                  <img
                    src={activeShopLogoUrl}
                    alt="Letterhead Logo"
                    className="relative w-11 h-11 rounded-full object-cover border border-[#F5B738] shrink-0"
                  />
                  <div className="relative min-w-0">
                    <div className="font-extrabold text-[#F5B738] text-xs truncate">
                      {companyName || 'BOSS ALUMINIUM & GLASS'}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      {companyTagline}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {companyPhone} · {companyAddress}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Icon Backup / Restore JSON & Default Letterhead Bar */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">Backup &amp; Restore:</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onExportFullBackup}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                    title="Backup JSON"
                    aria-label="Backup JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <label
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center cursor-pointer"
                    title="Restore JSON"
                    aria-label="Restore JSON"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const ok = onImportFullBackup(String(reader.result || ''));
                          showSettingsToast(ok ? 'Full backup restored!' : 'Invalid backup JSON.');
                        };
                        reader.readAsText(f);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreDefaultBrandingAssets();
                      showSettingsToast('Restored default Letterhead Background!');
                    }}
                    className="boss-flat-btn w-8 h-8 rounded-lg bg-[#0C0F14] border border-slate-700 text-slate-300 hover:text-white hover:border-[#F5B738] flex items-center justify-center cursor-pointer"
                    title="Restore Default BG"
                    aria-label="Restore Default BG"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SUB-TAB 3: HARDWARE, DISCOUNT (%) & QUOTATION DEFAULTS          */}
          {/* =============================================================== */}
          {ratesSubTab === 'HARDWARE' && (
            <div className="p-3 sm:p-4 rounded-xl bg-[#14181F] border border-[#2B3441] space-y-3.5 text-xs">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#F5B738] shrink-0" />
                <h3 className="text-sm font-extrabold text-[#F5B738]">
                  Hardware, Discount (%) &amp; Quotation Defaults
                </h3>
              </div>

              {/* Auto-Include Hardware Toggle */}
              <div className="p-3 rounded-xl bg-[#0C0F14] border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white text-xs">Auto-Include Hardware in Bill</div>
                  <div className="text-[10px] text-slate-400">
                    Automatically calculate locks, rollers &amp; screws
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayoutConfig({
                      ...layoutConfig,
                      showHardwareRow: !layoutConfig.showHardwareRow,
                    })
                  }
                  className={`boss-flat-btn relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                    layoutConfig.showHardwareRow ? 'bg-[#F5B738]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      layoutConfig.showHardwareRow ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* 2x2 Hardware, Discount, Labour, Transport Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Hardware / Unit (Rs)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftHardwareStr}
                    onChange={(e) => handleHardwareTextChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none font-mono font-bold text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-emerald-400 font-bold mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftDiscountStr}
                    onChange={(e) => handleDiscountTextChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-emerald-500/60 focus:border-emerald-400 outline-none font-mono font-bold text-emerald-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Labour Charges (Rs)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftLabourStr}
                    onChange={(e) => handleLabourTextChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none font-mono font-bold text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Transport Rent (Rs)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftTransportStr}
                    onChange={(e) => handleTransportTextChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F14] border border-slate-700 focus:border-[#F5B738] outline-none font-mono font-bold text-white text-xs"
                  />
                </div>
              </div>

              {/* Glass Fitting & Master Locks */}
              <div className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-300">Glass Fitting Type:</span>
                  <div className="flex items-center gap-1">
                    {(['FIX_RUBBER', 'U_PVC'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onSetGlassFittingOption(opt)}
                        className={`boss-flat-btn px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          glassFittingOption === opt
                            ? 'bg-[#F5B738] text-black'
                            : 'bg-[#14181F] border border-slate-700 text-slate-300'
                        }`}
                      >
                        {opt === 'FIX_RUBBER' ? 'Fix Rubber' : 'U(PVC) (-2 Sutar)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-300">Master Gauge Lock:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onSetCtxGauge(ctxGauge, ctxGaugeMode === 'ON' ? 'OFF' : 'ON')
                    }
                    className={`boss-flat-btn px-2.5 py-1 rounded text-[10px] font-black cursor-pointer ${
                      ctxGaugeMode === 'ON'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {ctxGaugeMode === 'ON' ? `ON (${ctxGauge}mm Locked)` : 'OFF (Separate Unlocked)'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-300">Master Glass Lock:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onSetCtxGlass(
                        ctxGlassGauge,
                        ctxGlassColor,
                        ctxGlassMode === 'ON' ? 'OFF' : 'ON'
                      )
                    }
                    className={`boss-flat-btn px-2.5 py-1 rounded text-[10px] font-black cursor-pointer ${
                      ctxGlassMode === 'ON'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {ctxGlassMode === 'ON'
                      ? `ON (${ctxGlassGauge}mm ${ctxGlassColor})`
                      : 'OFF (Separate Unlocked)'}
                  </button>
                </div>
              </div>

              {/* Quotation Terms & Conditions */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Quotation Terms &amp; Conditions (Printed on PDF)
                </label>
                <textarea
                  rows={3}
                  value={layoutConfig.quotationFooterTerms || ''}
                  onChange={(e) =>
                    onUpdateLayoutConfig({
                      ...layoutConfig,
                      quotationFooterTerms: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-[#0C0F14] border border-slate-700 text-xs text-white focus:border-[#F5B738] outline-none"
                />
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSaveRatesToDevice();
                    onUpdateLayoutConfig(layoutConfig);
                    showSettingsToast('Saved All Rates, Hardware, Gauges & Defaults to Device!');
                  }}
                  className="boss-flat-btn w-8 h-8 rounded-lg bg-[#F5B738] hover:bg-amber-400 text-black flex items-center justify-center cursor-pointer"
                  title="Save All Rates, Hardware, Gauges & Defaults"
                  aria-label="Save All Rates, Hardware, Gauges & Defaults"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SUB-TAB 4: CLIENT SUBSCRIPTION PLANS & BANK TRANSFER ACTIVATION */}
          {/* =============================================================== */}
          {ratesSubTab === 'PACKAGES' && (
            <div className="p-3 sm:p-4 rounded-xl bg-[#14181F] border border-[#F5B738]/60 space-y-3.5 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-extrabold text-[#F5B738] flex items-center gap-1.5">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>Subscription Plans &amp; Activation</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Choose a plan and submit your payment TID for instant verification.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={() => onSyncFromSupabase?.({ forceRates: true, silent: false })}
                    className="boss-flat-btn px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/60 text-sky-300 hover:bg-sky-500 hover:text-black font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCloud ? 'Checking...' : 'Sync / Check Updates'}</span>
                  </button>
                  <span className="px-2 py-0.5 rounded bg-[#0C0F14] border border-slate-700 text-[10px] font-mono text-slate-300">
                    ID: {clientDeviceId}
                  </span>
                </div>
              </div>

              {activeOffer &&
                activeOffer.isActive !== false &&
                activeOffer.isVisible !== false &&
                activeOffer.showBanner !== false && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/60 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase">
                        {activeOffer.badgeText || 'OFFER'}
                      </span>
                      <span className="font-extrabold text-white">{activeOffer.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{activeOffer.message}</p>
                  </div>
                )}

              {/* Packages Grid */}
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
                  return (
                    <div
                      key={pkg.id || idx}
                      className={`p-3.5 rounded-xl bg-[#0C0F14] border ${
                        hasDiscount ? 'border-amber-500/70' : 'border-slate-800'
                      } flex flex-col justify-between space-y-2.5`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-black text-white text-sm">{pkg.name}</span>
                          {(pkg.badge || pkg.badgeText) && (
                            <span className="px-2 py-0.5 rounded bg-[#F5B738] text-black font-extrabold text-[10px]">
                              {pkg.badge || pkg.badgeText}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-xl font-black ${hasDiscount ? 'text-emerald-400' : 'text-[#F5B738]'}`}>
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
                        {pkg.discountOfferText && (
                          <div className="text-[10.5px] text-amber-300 font-semibold italic">
                            ⚡ {pkg.discountOfferText}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Duration: {pkg.durationLabel || `${pkg.durationMonths} Month(s)`}
                        </div>
                        <ul className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
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
                          setOrderSelectedPackage(pkg);
                          setShowPackagesModal(true);
                        }}
                        className="boss-flat-btn w-full py-2 rounded-lg bg-[#F5B738] text-black font-extrabold text-[11px] cursor-pointer"
                      >
                        Select Plan (Rs. {curPrice.toLocaleString()})
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Official Bank / Wallet Accounts */}
              {bankAccounts.filter((a) => a.isActive !== false).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#F5B738] uppercase">
                    Official Bank &amp; Wallet Accounts
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {bankAccounts
                      .filter((a) => a.isActive !== false)
                      .map((acc, aidx) => (
                        <div
                          key={acc.id || aidx}
                          className="p-2.5 rounded-xl bg-[#0C0F14] border border-slate-800 space-y-1"
                        >
                          <div className="font-bold text-amber-400 text-xs truncate">
                            {acc.bankName}
                          </div>
                          <div className="text-[10px] text-slate-300 truncate">
                            Title: <strong className="text-white">{acc.accountTitle}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-1 bg-[#14181F] px-2 py-1 rounded border border-slate-800 font-mono">
                            <span className="text-emerald-400 font-bold text-[10px] truncate">
                              {acc.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(acc.accountNumber);
                                setCopiedBankId(acc.id || String(aidx));
                                showSettingsToast(`Copied ${acc.bankName} Account Number!`);
                                setTimeout(() => setCopiedBankId(null), 2500);
                              }}
                              className="boss-flat-btn px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black shrink-0"
                            >
                              {copiedBankId === (acc.id || String(aidx)) ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPackagesModal(true)}
                className="boss-flat-btn w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>Submit Transaction ID (TID) for Auto-Verification</span>
              </button>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Add Section Pair Modal (2 in 1: 2H+1W & 1W) */}
      {showAddPairModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#14181F] border border-[#F5B738] p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F5B738]">
                Add Frame Section Pair (2 in 1: 2H+1W & 1W)
              </h3>
              <button
                onClick={() => setShowAddPairModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-400">
              Section 1 counts as 2 Heights + 1 Top Width. Section 2 counts as 1 Bottom Track Width (like DC30C / DC26C).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={pairSec1}
                onChange={(e) => setPairSec1(e.target.value.toUpperCase())}
                placeholder="Sec 1 (e.g. DC30C)"
                className="px-3 py-2 rounded bg-[#0C0F14] border border-slate-700 font-mono text-white"
              />
              <input
                type="number"
                value={pairRate1}
                onChange={(e) => setPairRate1(e.target.value)}
                placeholder="Sec 1 Rate/ft"
                className="px-3 py-2 rounded bg-[#0C0F14] border border-slate-700 font-mono text-white"
              />
              <input
                type="text"
                value={pairSec2}
                onChange={(e) => setPairSec2(e.target.value.toUpperCase())}
                placeholder="Sec 2 (e.g. DC26C)"
                className="px-3 py-2 rounded bg-[#0C0F14] border border-slate-700 font-mono text-white"
              />
              <input
                type="number"
                value={pairRate2}
                onChange={(e) => setPairRate2(e.target.value)}
                placeholder="Sec 2 Rate/ft"
                className="px-3 py-2 rounded bg-[#0C0F14] border border-slate-700 font-mono text-white"
              />
            </div>
            <button
              onClick={() => {
                if (!pairSec1.trim()) return;
                onAddCustomSectionPair(
                  pairSec1.trim(),
                  parseFloat(pairRate1) || 0,
                  pairSec2.trim(),
                  parseFloat(pairRate2) || 0
                );
                setShowAddPairModal(false);
                setPairSec1('');
                setPairSec2('');
              }}
              className="w-full py-2.5 rounded-lg bg-[#F5B738] text-black font-bold"
            >
              Save Section Pair
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CLIENT PACKAGES, ACTIVE OFFERS & BANK TRANSFER INSTRUCTIONS  */}
      {/* =================================================================== */}
      {showPackagesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto overflow-x-hidden">
          <div className="bg-[#0C1017] border-2 border-amber-500/80 rounded-2xl max-w-4xl w-full p-3.5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-4 overflow-x-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black shrink-0">
                  <Zap className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#F5B738] tracking-wide">
                    BOSS Mobile App Subscription Packages & Special Offers
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Official verified plans & direct bank transfer activation
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPackagesModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Active Offer Callout */}
              {activeOffer &&
                activeOffer.isActive !== false &&
                activeOffer.isVisible !== false &&
                activeOffer.showBanner !== false && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/60 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black uppercase">
                          {activeOffer.badgeText || 'OFFER'}
                        </span>
                        <span className="text-xs font-black text-white">{activeOffer.title}</span>
                        {activeOffer.discountPct && activeOffer.discountPct > 0 && (
                          <span className="text-[11px] font-black text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/40">
                            {activeOffer.discountPct}% DISCOUNT ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{activeOffer.message}</p>
                    </div>
                  </div>
                )}

              {/* Packages Cards Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Available Packages ({packages.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Direct instant activation upon TID receipt verification
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {packages.map((pkg, idx) => {
                    const hasDiscount =
                      (pkg.discountPct && pkg.discountPct > 0) ||
                      (pkg.originalPriceRs && pkg.originalPriceRs > (pkg.priceRs ?? pkg.price ?? 0));
                    const origPrice = pkg.originalPriceRs ?? pkg.priceRs ?? pkg.price ?? 0;
                    const curPrice = pkg.priceRs ?? pkg.price ?? origPrice;
                    const discPct = pkg.discountPct ?? (origPrice > curPrice ? Math.round(((origPrice - curPrice) / origPrice) * 100) : 0);

                    return (
                      <div
                        key={pkg.id || idx}
                        className={`p-4 rounded-xl bg-[#141A24] border ${
                          hasDiscount
                            ? 'border-amber-500/80 shadow-lg shadow-amber-950/30'
                            : 'border-slate-800'
                        } flex flex-col justify-between space-y-3 relative`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <div className="font-black text-white text-sm">{pkg.name}</div>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">
                                {pkg.planCode}
                              </span>
                            </div>
                            {(pkg.badge || pkg.badgeText) && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold shadow-sm">
                                {pkg.badge || pkg.badgeText}
                              </span>
                            )}
                          </div>

                          <div className="pt-1">
                            {hasDiscount ? (
                              <div>
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-2xl font-black text-emerald-400">
                                    Rs. {curPrice.toLocaleString()}
                                  </span>
                                  <span className="text-xs line-through text-slate-400">
                                    Rs. {origPrice.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black animate-pulse">
                                    {discPct}% OFF
                                  </span>
                                </div>
                                {pkg.discountOfferText && (
                                  <div className="text-[11px] text-amber-300 font-semibold italic mt-0.5">
                                    ⚡ {pkg.discountOfferText}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-2xl font-black text-amber-400">
                                Rs. {curPrice.toLocaleString()}
                              </div>
                            )}
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Duration: {pkg.durationLabel || `${pkg.durationMonths} Month(s)`}
                            </div>
                          </div>

                          <ul className="space-y-1.5 text-slate-300 border-t border-slate-800 pt-2">
                            {(pkg.features || []).map((f, fi) => (
                              <li key={fi} className="flex items-start gap-1.5 text-[11px] leading-tight">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOrderSelectedPackage(pkg);
                            showSettingsToast(`Selected ${pkg.name}! Transfer payment and enter TID below.`);
                            const elem = document.getElementById('client-tid-submission-box');
                            if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            orderSelectedPackage?.id === pkg.id
                              ? 'bg-amber-400 text-black shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-md'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-black" />
                          <span>{orderSelectedPackage?.id === pkg.id ? '✓ Plan Selected' : `Select Plan (Rs. ${curPrice.toLocaleString()})`}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Official Bank Accounts for Payment Transfer */}
              <div className="p-4 rounded-xl bg-[#141A24] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5B738] uppercase tracking-wide">
                      Official Bank Accounts & Wallets ({bankAccounts.filter((a) => a.isActive !== false).length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Paise transfer karne k baad raseed ki TID nechy darj karein
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {bankAccounts.filter((a) => a.isActive !== false).map((acc, aidx) => (
                    <div
                      key={acc.id || aidx}
                      className="p-3.5 rounded-xl bg-[#0C1017] border border-slate-700/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 text-sm truncate">{acc.bankName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                          {acc.accountType || 'BANK'}
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <div>Title: <strong className="text-white">{acc.accountTitle}</strong></div>
                        <div className="flex items-center justify-between gap-1.5 bg-[#141A24] p-1.5 rounded-lg border border-slate-800 font-mono">
                          <span className="text-emerald-400 font-bold truncate text-[11px]">{acc.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(acc.accountNumber);
                              setCopiedBankId(acc.id || String(aidx));
                              showSettingsToast(`Copied ${acc.bankName} Account Number!`);
                              setTimeout(() => setCopiedBankId(null), 2500);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedBankId === (acc.id || String(aidx)) ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        {acc.ibanOrRaast && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            IBAN: {acc.ibanOrRaast}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 1: SUBMIT TRANSACTION ID (TID) FOR AUTO-VERIFICATION */}
              <div
                id="client-tid-submission-box"
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#101726] to-[#0A0E18] border-2 border-amber-500/60 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-amber-400">
                        ⚡ Step 1: Submit Bank Receipt Transaction ID (TID)
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Paise bhejne ke baad raseed par likhi hui TID yahan enter karein. Google Robot foran check karke aapka account LIVE active kar dega!
                      </p>
                    </div>
                  </div>

                  {orderSelectedPackage && (
                    <span className="text-[11px] px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      Plan: {orderSelectedPackage.name} (Rs. {(orderSelectedPackage.priceRs || orderSelectedPackage.price || 0).toLocaleString()})
                    </span>
                  )}
                </div>

                {/* Real-time Order Status if Already Submitted */}
                {activeClientOrder && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      activeClientOrder.status === 'APPROVED_AUTO' || activeClientOrder.status === 'APPROVED_MANUAL' || isOrderAutoApproved
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                        : activeClientOrder.status === 'REJECTED'
                        ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                        : 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {activeClientOrder.status === 'APPROVED_AUTO' || activeClientOrder.status === 'APPROVED_MANUAL' || isOrderAutoApproved ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-300">🎉 ACCOUNT ACTIVE & APPROVED!</span>
                          </>
                        ) : activeClientOrder.status === 'REJECTED' ? (
                          <>
                            <X className="w-5 h-5 text-rose-400" />
                            <span className="text-rose-300">Order Rejected</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                            <span className="text-amber-300">⏳ ORDER STATUS: PENDING (Waiting for Bank Email Robot Match)</span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={checkClientOrderStatus}
                        disabled={isCheckingOrderStatus}
                        className="px-2.5 py-1 rounded-lg bg-[#141A24] text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 text-amber-400 ${isCheckingOrderStatus ? 'animate-spin' : ''}`} />
                        <span>Refresh Status</span>
                      </button>
                    </div>

                    <div className="text-[11px] leading-relaxed">
                      {activeClientOrder.status === 'APPROVED_AUTO' || activeClientOrder.status === 'APPROVED_MANUAL' || isOrderAutoApproved ? (
                        <span>Mubarak ho! Aap ki payment TID (<strong>{activeClientOrder.tid}</strong>) verify ho chuki hai. Aap ka <strong>{activeClientOrder.packageName}</strong> plan foran activate ho gaya hai!</span>
                      ) : activeClientOrder.status === 'REJECTED' ? (
                        <span>{activeClientOrder.rejectReason || 'Aap ki payment verify nahi ho saki. Baraye meharbani WhatsApp par rabta karein.'}</span>
                      ) : (
                        <span>
                          Aap ki TID (<strong>{activeClientOrder.tid}</strong>) darj ho chuki hai. Bank ki email aatay hi Google Apps Script robot match karke bina kisi manual intezar ke screen ko khud <strong>ACTIVE</strong> kar dega!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Form to submit TID, Amount & Receipt Screenshot */}
                <form onSubmit={handleSubmitClientOrder} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Select Subscription Package:</label>
                      <select
                        value={orderSelectedPackage?.id || (packages[0]?.id ?? '')}
                        onChange={(e) => {
                          const chosen = packages.find((p) => p.id === e.target.value);
                          if (chosen) {
                            setOrderSelectedPackage(chosen);
                            setOrderAmountInput(String(chosen.priceRs ?? chosen.price ?? 3000));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
                      >
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — Rs. {(p.priceRs || p.price || 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Bank / Wallet Transferred To:</label>
                      <select
                        value={orderBankName}
                        onChange={(e) => setOrderBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
                      >
                        {bankAccounts.filter((b) => b.isActive !== false).map((b) => (
                          <option key={b.id} value={b.bankName}>
                            {b.bankName} ({b.accountNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        Amount Sent (Rs.): <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={orderAmountInput}
                        onChange={(e) => setOrderAmountInput(e.target.value)}
                        placeholder="e.g. 3000"
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-emerald-300 font-mono font-bold text-xs focus:border-amber-400 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        Bank Receipt Transaction ID (TID): <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={orderTidInput}
                        onChange={(e) => setOrderTidInput(e.target.value)}
                        placeholder="e.g. 42819038291 / FT26111244"
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border-2 border-amber-500/80 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 outline-none uppercase"
                        required
                      />
                    </div>
                  </div>

                  {/* Transaction Receipt Screenshot Upload */}
                  <label className="cursor-pointer rounded-xl bg-[#0C1017] border border-dashed border-slate-700 hover:border-[#F5B738] p-2.5 flex items-center justify-between gap-2 text-xs">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOrderReceiptUpload}
                      className="hidden"
                    />
                    {orderReceiptUrl ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={orderReceiptUrl}
                          alt="Payment Receipt"
                          className="w-10 h-10 object-cover rounded-lg border border-emerald-500/60 shrink-0"
                        />
                        <span className="text-[11px] font-bold text-emerald-400 truncate">
                          ✓ Transaction Screenshot Ready (Tap to change)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300">
                        {isUploadingOrderReceipt ? (
                          <RefreshCw className="w-4 h-4 text-[#F5B738] animate-spin shrink-0" />
                        ) : (
                          <Camera className="w-4 h-4 text-[#F5B738] shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold">
                          {isUploadingOrderReceipt
                            ? 'Uploading Payment Screenshot...'
                            : 'Upload Payment Screenshot / Receipt (Saved to Admin Cloud)'}
                        </span>
                      </div>
                    )}
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Your Name:</label>
                      <input
                        type="text"
                        value={orderClientName}
                        onChange={(e) => setOrderClientName(e.target.value)}
                        placeholder="Client / Shop Name"
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Your WhatsApp / Phone Number:</label>
                      <input
                        type="text"
                        value={orderClientPhone}
                        onChange={(e) => setOrderClientPhone(e.target.value)}
                        placeholder="0300-1234567"
                        className="w-full px-3 py-2 rounded-lg bg-[#0C1017] border border-slate-700 text-white text-xs focus:border-amber-400 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                    <span className="text-[11px] text-slate-400">
                      TID &amp; Screenshot seedha Supabase par Admin Panel ko send hon ge
                    </span>

                    <button
                      type="submit"
                      disabled={isSubmittingOrder || isUploadingOrderReceipt || !orderTidInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className={`w-4 h-4 ${isSubmittingOrder ? 'animate-bounce' : ''}`} />
                      <span>{isSubmittingOrder ? 'Submitting Order...' : '⚡ Submit Payment TID & Receipt'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* WhatsApp Support Callout */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-xs text-emerald-200">
                    Agar aap WhatsApp par raseed bhejna chahein: <strong>0310-5524225</strong> par bhej dein, tab b foran account activate ho jaye ga!
                  </div>
                </div>
                <a
                  href="https://wa.me/923105524225?text=Assalam-o-Alaikum%20Syed%20Saboor%20Nawab%20Sahib,%20I%20have%20sent%20payment%20for%20BOSS%20Aluminium%20App%20subscription.%20Kindly%20find%20attached%20receipt."
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/60"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Send Receipt on WhatsApp</span>
                </a>
              </div>
            </div>


            <div className="flex justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowPackagesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CLIENT SUPPORT TEAM REQUEST BOX                              */}
      {/* =================================================================== */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto overflow-x-hidden">
          <div className="bg-[#0C1017] border-2 border-sky-500/80 rounded-2xl max-w-2xl w-full p-3.5 sm:p-5 space-y-3.5 shadow-2xl my-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-black flex items-center justify-center shrink-0">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-sky-400 truncate">
                    Support Team Request Box
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    Device: {clientDeviceId} · Cloud Access: {cloudAccessInfo?.status || 'TRIAL'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="boss-flat-btn text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reqMessage.trim() || !onSubmitSupportRequest) return;
                setSupportSubmitError(null);
                setSupportSubmitSuccess(null);
                const result = await onSubmitSupportRequest({
                  userName: reqUserName.trim() || customerName || 'Client',
                  userPhone: reqUserPhone.trim() || customerPhone || '',
                  userEmail: reqUserEmail.trim(),
                  requestType: reqType,
                  message: reqMessage.trim(),
                });
                const isOk = typeof result === 'boolean' ? result : Boolean(result?.ok);
                if (isOk) {
                  setReqMessage('');
                  setSupportSubmitSuccess('Message Support Team ko send aur Supabase mein save ho gaya hai!');
                } else {
                  const errMsg =
                    typeof result === 'object' && result?.error
                      ? result.error
                      : 'Request sending error: Message send nahi ho saka.';
                  setSupportSubmitError(errMsg);
                }
              }}
              className="space-y-2.5 text-xs"
            >
              {supportSubmitError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-[11px] flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 break-words">
                    <div className="font-black text-rose-300">Request Sending Error</div>
                    <div>{supportSubmitError}</div>
                  </div>
                </div>
              )}
              {supportSubmitSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/80 text-emerald-200 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{supportSubmitSuccess}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                    Request Category
                  </label>
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-sky-400 outline-none"
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
                    value={reqUserName}
                    onChange={(e) => setReqUserName(e.target.value)}
                    placeholder="e.g. Tariq Aluminium Works"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                    WhatsApp / Mobile Number
                  </label>
                  <input
                    type="text"
                    value={reqUserPhone}
                    onChange={(e) => setReqUserPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-white font-mono text-xs focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={reqUserEmail}
                    onChange={(e) => setReqUserEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                  Message / Request Details <span className="text-sky-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  placeholder="Apni request ya masla yahan likhein (maslan naya section code, rate help, ya account issue)..."
                  className="w-full p-2.5 rounded-lg bg-[#14181F] border border-slate-700 text-white text-xs focus:border-sky-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <a
                  href={`https://wa.me/923105524225?text=${encodeURIComponent(
                    `Assalam-o-Alaikum Support Team, Device: ${clientDeviceId}\nType: ${reqType}\nName: ${reqUserName || customerName}\nMessage: ${reqMessage}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>WhatsApp Support</span>
                </a>

                <button
                  type="submit"
                  disabled={isSubmittingSupportRequest || !reqMessage.trim()}
                  className="boss-flat-btn px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingSupportRequest ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>
            </form>

            {/* Submitted Requests & Admin Messages / Replies */}
            <div className="border-t border-slate-800 pt-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-bold text-slate-300">
                <span>Messages &amp; Admin Replies ({supportRequests.length})</span>
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
                    className="boss-flat-btn px-2 py-1 rounded bg-sky-500/15 border border-sky-500/50 text-sky-300 hover:bg-sky-500 hover:text-black text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingSupport ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingSupport ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                  {supportRequests.length > 0 && onClearAllSupportRequests && (
                    <button
                      type="button"
                      onClick={() => onClearAllSupportRequests()}
                      className="boss-flat-btn px-2 py-1 rounded bg-rose-950/70 border border-rose-500/60 text-rose-300 hover:bg-rose-600 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>
              {supportRequests.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-500">
                  No messages or admin replies yet.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-0.5">
                  {supportRequests.map((req) => {
                    const isAdminMsg = req.sender === 'ADMIN';
                    return (
                      <div
                        key={req.id}
                        className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
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
                            <span className="font-bold text-sky-300 truncate">{req.requestType}</span>
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
                                title="Clear this message"
                                aria-label="Clear message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-slate-100 leading-snug whitespace-pre-wrap break-words">
                          {req.message}
                        </div>

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
                            <div className="text-[11px] text-emerald-100 leading-snug whitespace-pre-wrap break-words">
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
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: 2-OPTION SHARE CHOOSER (PICTURE PNG vs PDF DOCUMENT)         */}
      {/* =================================================================== */}
      {shareModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto no-print">
          <div className="bg-[#0C1017] border-2 border-emerald-500/80 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-emerald-400 truncate">
                    Share Options
                  </h3>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    Picture (PNG) ya PDF select karein
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalTarget(null)}
                className="boss-flat-btn w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close share dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={isGeneratingExport !== null}
                onClick={() => executeExportTarget(shareModalTarget, 'PNG', 'SHARE')}
                className="boss-flat-btn w-full p-3 rounded-xl bg-[#14181F] border-2 border-emerald-500/70 hover:bg-emerald-500 hover:text-black text-left flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-60 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 group-hover:bg-black/20 text-emerald-400 group-hover:text-black flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white group-hover:text-black">
                      Share Picture (PNG)
                    </div>
                    <div className="text-[10px] text-slate-400 group-hover:text-black/80">
                      {isGeneratingExport === 'PNG' ? 'Generating PNG...' : 'HD Image save & share'}
                    </div>
                  </div>
                </div>
                <Share2 className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                disabled={isGeneratingExport !== null}
                onClick={() => executeExportTarget(shareModalTarget, 'PDF', 'SHARE')}
                className="boss-flat-btn w-full p-3 rounded-xl bg-[#14181F] border-2 border-[#F5B738]/70 hover:bg-[#F5B738] hover:text-black text-left flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-60 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 group-hover:bg-black/20 text-[#F5B738] group-hover:text-black flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white group-hover:text-black">
                      Share PDF Document
                    </div>
                    <div className="text-[10px] text-slate-400 group-hover:text-black/80">
                      {isGeneratingExport === 'PDF' ? 'Generating PDF...' : 'A4 Official PDF save & share'}
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 shrink-0" />
              </button>

              <a
                href={getWhatsAppShareUrl(shareModalTarget)}
                target="_blank"
                rel="noopener noreferrer"
                className="boss-flat-btn w-full py-2 px-3 rounded-xl bg-[#1C222B] border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Send Text Summary on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: PRINT PAGE PREVIEW (WHEN FRAME BLOCKS NATIVE PRINT DIALOG)   */}
      {/* =================================================================== */}
      {printPreviewState && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto no-print">
          <div className="bg-[#0C1017] border-2 border-[#F5B738] rounded-2xl max-w-2xl w-full p-3.5 sm:p-4 space-y-3 shadow-2xl my-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#F5B738] text-black flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-[#F5B738] truncate">
                    Print Page Preview (A4)
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    {printPreviewState.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (printPreviewState.pdfUrl) URL.revokeObjectURL(printPreviewState.pdfUrl);
                  setPrintPreviewState(null);
                }}
                className="boss-flat-btn w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close print preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto rounded-xl bg-[#070A0F] border border-slate-800 p-2 flex justify-center">
              <img
                src={printPreviewState.previewImageUrl}
                alt="A4 Print Preview"
                className="w-full max-w-[460px] h-auto rounded-lg shadow-lg border border-[#F5B738]/40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href={printPreviewState.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="boss-flat-btn py-2.5 px-3 rounded-xl bg-[#F5B738] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Print Page</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  try {
                    window.print();
                  } catch {
                    showSettingsToast('Preview frame ne direct print block kiya hai — "Open Print Page" par click karein!');
                  }
                }}
                className="boss-flat-btn py-2.5 px-3 rounded-xl bg-[#14181F] border border-[#F5B738]/70 text-[#F5B738] hover:bg-[#F5B738] hover:text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>System Print</span>
              </button>

              <a
                href={printPreviewState.pdfUrl}
                download={printPreviewState.fileName}
                className="boss-flat-btn py-2.5 px-3 rounded-xl bg-[#1C222B] border border-slate-700 hover:border-emerald-400 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
