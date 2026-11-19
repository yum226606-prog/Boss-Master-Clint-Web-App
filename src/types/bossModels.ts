export type BossTab =
  | 'WINDOWS'
  | 'DG_WINDOWS'
  | 'DOORS'
  | 'EXTRA_PIECES'
  | 'CUTTING'
  | 'LENGTH'
  | 'GLASS'
  | 'QUOTATION'
  | 'HISTORY'
  | 'RATES'
  | (string & {});

export type MainAppSystem = 'HUB' | 'DASHBOARD' | 'SETTINGS' | 'LAYOUT';

export type MeasurementUnit = 'INCH_SUTAR' | 'CM' | 'MM';

export interface ExtraPiece {
  id: string;
  section: string;
  lengthFt: number;
  qty: number;
  gauge: string;
}

export interface WindowItem {
  id: string;
  width: number; // in inches
  height: number; // in inches
  qty: number;
  frameType: string; // "C" | "F" | custom pair
  sectionGauge: string;
  glassGauge: string;
  glassColor: string;
  glassEnabled: boolean;
  m24Qty: number;
  m24aQty: number;
  d29HeightQty: number;
  d29WidthQty: number;
  extras: ExtraPiece[];
  outerSection: string;
  panelCount: number; // 2, 3, or 4
  lockType: 'LATCH' | 'PUSH_HANDLE';
}

export interface DgWindowItem {
  id: string;
  width: number; // in inches
  height: number; // in inches
  qty: number;
  frameType: 'C' | 'F' | string; // "C" (DG.26) | "F" (DG.26F)
  sectionGauge: string;
  glassGauge: string;
  glassColor: string;
  glassEnabled: boolean;
  panelCount: number; // 2, 3, or 4
  lockType: 'LATCH' | 'PUSH_HANDLE';
  dg23aHQty: number;
  dg23aWQty: number;
  dg24aHQty: number;
  dg24aWQty: number;
  extras: ExtraPiece[];
}

export interface DoorItem {
  id: string;
  width: number;
  height: number;
  qty: number;
  outer: string;
  sectionGauge: string;
  glassGauge: string;
  glassColor: string;
  glassEnabled: boolean;
  d59Qty: number;
  d59aQty: number;
  d52Qty: number;
  extras: ExtraPiece[];
}

export interface FixFrameItem {
  id: string;
  width: number;
  height: number;
  qty: number;
  outer: string;
  sectionGauge: string;
  glassGauge: string;
  glassColor: string;
  glassEnabled: boolean;
  d59Qty: number;
  d59aQty: number;
  d52Qty: number;
  extras: ExtraPiece[];
}

export interface OpenableWindowItem {
  id: string;
  width: number;
  height: number;
  qty: number;
  outer: string;
  sectionGauge: string;
  glassGauge: string;
  glassColor: string;
  glassEnabled: boolean;
  d59Qty: number;
  d59aQty: number;
  d52Qty: number;
  extras: ExtraPiece[];
}

export interface SlidingDoorItem {
  id: string;
  width: number;
  height: number;
  qty: number;
  outer: string; // "NORMAL" ("M30 / M26") | "F" ("M30F / M26F") | custom pair/section
  m24Qty: number;
  m24aQty: number;
  d29HeightQty?: number;
  d29WidthQty?: number;
  d59Qty: number;
  d59aQty: number;
  d52Qty: number;
  sectionGauge: string;
  glassGauge: string;
  glassColor: string;
  glassEnabled: boolean;
  extras: ExtraPiece[];
  panelCount: number; // 2, 3, or 4
  lockType: 'LATCH' | 'PUSH_HANDLE';
}

export interface DeductionDim {
  inch: number;
  sutar: number;
}

export interface DeductionPair {
  h: DeductionDim;
  w: DeductionDim;
}

export interface AccessoryConfig {
  enabled: boolean;
  which: string;
  applyTo: 'H' | 'W' | 'both';
  qty: number;
  qtyH: number;
  qtyW: number;
  hOp?: 'MINUS' | 'PLUS';
  wOp?: 'MINUS' | 'PLUS';
  wDivisor?: 1 | 2 | 3 | 4;
}

export interface FormulaCategorySettings {
  formulas: Record<string, DeductionPair>;
  acc: Record<string, AccessoryConfig>;
  outerQtyH?: number;
  outerQtyW?: number;
  outerDeductH?: DeductionDim;
  outerDeductW?: DeductionDim;
}

export interface WindowFormulaSettings {
  m23HeightDeduction: DeductionDim;
  m24WidthDeduction: DeductionDim; // 2-Palay default 6" 2 sutar
  m24Panels: number;
  d29HeightDeduction: DeductionDim;
  d29WidthDeduction: DeductionDim;
  d29WidthOverlap: DeductionDim;
  d29Panels: number;
  m23ApplyTo: 'H' | 'W' | 'both';
  m23Qty: number;
  m28ApplyTo: 'H' | 'W' | 'both';
  m28Qty: number;
  m24ApplyTo: 'H' | 'W' | 'both';
  m24Qty: number;
  d29ApplyTo: 'H' | 'W' | 'both';
  d29HeightQty: number;
  d29WidthQty: number;
  // 3-Palay Configurations
  m24WidthCenterDeduction3: DeductionDim;
  m24WidthSidesDeduction3: DeductionDim; // default 2" (16 sutar)
  m24WidthDeduction3: DeductionDim;
  m24WidthOverlap3: DeductionDim;
  m23Qty3: number;
  m28Qty3: number;
  m24Qty3: number;
  d29WidthDeduction3: DeductionDim;
  d29WidthOverlap3: DeductionDim;
  d29Panels3: number;
  d29HeightQty3: number;
  d29WidthQty3: number;
  d29HeightDeduction3: DeductionDim;
  // 4-Palay Configurations
  m24WidthDeduction4: DeductionDim; // default 11" 4 sutar
  m23Qty4: number;
  m28Qty4: number;
  m24Qty4: number;
  d29WidthDeduction4: DeductionDim;
  d29WidthOverlap4: DeductionDim;
  d29Panels4: number;
  d29HeightQty4: number;
  d29WidthQty4: number;
  d29HeightDeduction4: DeductionDim;
  // Jali Extra Width & Push Handle Deduction & D31 4-Palay Deduction
  d29ExtraWidthAdd: DeductionDim; // default +3" 2 sutar
  d29PushHandleDeduction: DeductionDim; // default 1" 2 sutar
  d31HeightDeduction4: DeductionDim; // default 2" 4 sutar
  customSectionRules?: FormulaCategorySettings;
}

export interface SlidingDoorFormulaSettings {
  m23HeightDeduction: DeductionDim;
  m24WidthDeduction: DeductionDim;
  m24Panels: number;
  m23ApplyTo: 'H' | 'W' | 'both';
  m23Qty: number;
  m28ApplyTo: 'H' | 'W' | 'both';
  m28Qty: number;
  m24ApplyTo: 'H' | 'W' | 'both';
  m24Qty: number;
  m24WidthCenterDeduction3: DeductionDim;
  m24WidthSidesDeduction3: DeductionDim;
  m24WidthDeduction3: DeductionDim;
  m24WidthOverlap3: DeductionDim;
  m23Qty3: number;
  m28Qty3: number;
  m24Qty3: number;
  m24WidthDeduction4: DeductionDim;
  m23Qty4: number;
  m28Qty4: number;
  m24Qty4: number;
  d29ExtraWidthAdd?: DeductionDim;
  d29PushHandleDeduction: DeductionDim;
  d31HeightDeduction4: DeductionDim;
  customSectionRules?: FormulaCategorySettings;
}

export interface GlassFormula {
  marginH: number;
  marginW: number;
  panels: number;
  marginHSutar: number;
  marginWSutar: number;
  // Sliding glass additions
  slidingHeightDeductionInch: number; // default 5
  slidingHeightDeductionSutar: number; // default 5 (5" 5 sutar = 5.625")
  slidingWidthAddToM24Inch: number; // default 0
  slidingWidthAddToM24Sutar: number; // default 5 (+5 sutar)
}

export interface FSectionFormula {
  enabled: boolean;
  applyTo: 'both' | 'H' | 'W';
  heightDim: DeductionDim; // default 2" 3 sutar
  widthDim: DeductionDim; // default 2" 3 sutar
  heightIsAdd: boolean;
  widthIsAdd: boolean;
  qtyH: number;
  qtyW: number;
}

export interface CutPiece {
  section: string;
  length: number; // in inches
  qty: number;
  source: string;
  label: string;
  gauge: string;
}

export interface PackedBar {
  lenFt: number;
  isCustom: boolean;
  remainInches: number;
  pieces: CutPiece[];
}

export interface TallyInfo {
  count: number;
  isCustom: boolean;
}

export interface PackedResult {
  tally: Record<number, TallyInfo>;
  unfit: CutPiece[];
  bins: PackedBar[];
}

export interface GlassCutResult {
  frameLabel: string;
  frameDim: string;
  glassGauge: string;
  glassColor: string;
  gH: number;
  gWpanel: number;
  billedHFt: number;
  billedWFt: number;
  pieces: number;
  sqft: number;
}

export interface AluminiumCostRow {
  section: string;
  gauge: string;
  bars: number;
  totalFt: number;
  ratePerFt: number;
  cost: number;
}

export interface GlassCostLine {
  description: string;
  sqft: number;
  rate: number;
  total: number;
}

export interface QuotationResult {
  aluminiumRows: AluminiumCostRow[];
  alumTotal: number;
  alumWithMarkup: number;
  markupPct: number;
  totalUnits: number;
  hardwareTotal: number;
  glassTotal: number;
  glassLines: GlassCostLine[];
  transportRent: number;
  labourCost: number;
  grandTotal: number;
}

export interface SavedQuotation {
  id: number;
  timestamp: string;
  label: string;
  customerName: string;
  customerPhone: string;
  gauge: string;
  color: string;
  frameType: string;
  grandTotal: number;
  alumTotal: number;
  hardwareTotal: number;
  glassTotal: number;
  transportRent: number;
  labourCost: number;
  totalUnits: number;
  itemsSummary: string;
  windowsJson: string;
  dgWindowsJson?: string;
  doorsJson: string;
  fixframesJson: string;
  openableWindowsJson: string;
  slidingDoorsJson: string;
  projectExtrasJson: string;
}

export interface UserUploadedPhoto {
  id: string;
  title: string;
  category: 'CNIC_FRONT' | 'CNIC_BACK' | 'PAYMENT_RECEIPT' | 'SHOP_PHOTO' | 'RATE_SHEET';
  url: string;
  uploadedAt: number;
}

export interface IdentityRecord {
  deviceId: string;
  cnic: string;
  phone: string;
  email: string;
  name: string;
  shopAddress: string;
  ipAddress: string;
  cnicPhotoPath?: string | null;
  cnicBackPhotoPath?: string | null;
  uploadedPhotos?: UserUploadedPhoto[];
  trialStartTime: number;
  firstRegisteredAt: number;
  isActivated: boolean;
  activatedUntil?: number;
  packagePlan?: 'TRIAL' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'LIFETIME_VIP' | string;
  lastPaymentTid?: string;
  isBlocked: boolean;
  blockReason: string;
  isLifetimeFree: boolean;
  latitude?: number | null;
  longitude?: number | null;
  allowSecondCnic?: boolean;
  clientKey?: string;
}

export interface SubscriptionPackage {
  id: string;
  name: string;
  planCode: string;
  durationMonths: number;
  durationLabel: string;
  priceRs: number;
  price?: number;
  originalPriceRs?: number;
  discountPct?: number;
  discountOfferText?: string;
  isLifetime: boolean;
  isActive: boolean;
  badgeText?: string;
  badge?: string;
  features: string[];
}

export interface DeletedBackupItem {
  id: string;
  category:
    | 'SECTION'
    | 'COLOR'
    | 'GLASS_5MM'
    | 'GLASS_8MM'
    | 'CALC_TAB'
    | 'UI_CONTROL'
    | 'CALC_ITEM';
  title: string;
  codeOrKey: string;
  payload: any;
  deletedAt: number;
}

export interface ClientAppLayoutControlConfig {
  enabledTabs: Record<string, boolean>;
  lockedTabs?: Record<string, boolean>;
  tabCustomTitles: Record<string, string>;
  customControlLabels?: Record<string, string>;
  deletedSections?: string[];
  deletedControls?: string[];
  deletedTabs?: string[];
  showMasterGaugeSelector: boolean;
  showMasterColorSelector: boolean;
  showMasterFrameSelector: boolean;
  showMasterGlassSelector: boolean;
  showThemeStudioButton: boolean;
  showDoneQuotationButton: boolean;
  showCompareCFButton: boolean;
  showDiscountRow: boolean;
  showHardwareRow: boolean;
  showTransportRow: boolean;
  showLabourRow: boolean;
  showLetterheadBackground: boolean;
  letterheadOpacity: number;
  letterheadFitMode?: 'STRETCH' | 'COVER' | 'CONTAIN';
  headerStyle?: 'USE_PIC_HEADER' | 'DIGITAL_HEADER';
  topHeaderOffset?: number;
  backgroundDarkness?: number;
  watermarkOpacity?: number;
  innerFrameMargin?: number;
  keepFullLetterheadProportions?: boolean;
  sheetFitPreset?: 'BEST_FIT' | 'DIGITAL';
  backgroundFitStyle?: 'FILL' | 'CROP' | 'FIT';
  contentRowSpacing?: number;
  shopLogoUrl?: string;
  quotationFooterTerms: string;
  quotationSignatureLabel: string;
  serverDrivenFormulasOnly?: boolean;
  enforceDeviceHardwareLock?: boolean;
  autoLockOnSubscriptionExpiry?: boolean;
  blockFormulaAndRateCopy?: boolean;
  requireServerTimeValidation?: boolean;
}

export interface SubAdminPermissions {
  canViewOtherUsersData: boolean;
  canViewUploadedUserPhotos: boolean;
  canViewEditFormulas: boolean;
  canEditAppLayoutElements: boolean;
  canCreateNewSections: boolean;
  canEditGlobalRates: boolean;
  canScanRateListsAI: boolean;
  canControlUserTrials: boolean;
  canControlUserPayments: boolean;
  canManageSubscriptionPackages: boolean;
  canMarkLifetimeFree: boolean;
  canViewClientLocations: boolean;
  canManageRequests: boolean;
  canManageOffers: boolean;
  canEditBrandingAndLetterhead: boolean;
  customPermissions: Record<string, boolean>;
}

export interface SubAdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: number;
  isActive: boolean;
  permissions: SubAdminPermissions;
}

export interface ClientSupportRequest {
  id: string;
  deviceId?: string;
  userName: string;
  userPhone: string;
  userCnic?: string;
  userEmail: string;
  requestType: string;
  message: string;
  createdAt: number;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  sender?: 'CLIENT' | 'ADMIN';
  adminReply?: string;
  repliedAt?: number;
  isBroadcast?: boolean;
}

export interface AppOfferBanner {
  id: string;
  title: string;
  message: string;
  badgeText: string;
  isActive: boolean;
  isVisible?: boolean;
  showBanner?: boolean;
  createdAt: number;
  updatedAt?: number;
  createdBy: string;
  discountPct?: number;
  discountCode?: string;
  applyToAllPackages?: boolean;
  expiresAt?: number;
  imageUrl?: string;
}

export interface MobileDownloadConfig {
  androidApkUrl?: string;
  androidUrl?: string;
  windowsUrl?: string;
  iosAppUrl?: string;
  iosUrl?: string;
  iosDownloadUrl?: string;
  androidVersion?: string;
  windowsVersion?: string;
  iosVersion?: string;
  releaseNotes?: string;
}

export interface DynamicMasterSection {
  id: string;
  category: string;
  code: string;
  title: string;
  defaultGauge: string;
  defaultColor: string;
  defaultRate: number;
  weightPerFoot: number;
  formulaWidthDeduction: number;
  formulaHeightDeduction: number;
  glassMarginW: number;
  glassMarginH: number;
  heightFormula: string;
  widthFormula2Panel: string;
  widthFormula3Panel: string;
  widthFormula4Panel: string;
  glassHeightFormula: string;
  glassWidthFormula: string;
  m24Formula: string;
  m24aFormula: string;
  d29HeightFormula: string;
  d29WidthFormula: string;
  lockFormula: string;
  isCuttingEnabled: boolean;
  isGlassEnabled: boolean;
  accessoriesRequired: string[];
  notes: string;
  isActive: boolean;
  createdAt: number;
}

export type SubscriptionPackageConfig = SubscriptionPackage;

export interface BankAccountConfig {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  ibanOrRaast: string;
  branchCode?: string;
  accountType: 'BANK' | 'EASYPAISA' | 'JAZZCASH' | 'RAAST';
  monthlyFee: number;
  quarterlyFee: number;
  autoVerifyEnabled: boolean;
  isActive: boolean;
}

export interface PaymentReceiptLog {
  id: string;
  tid: string;
  clientName: string;
  clientPhone: string;
  clientCnic: string;
  amount: number;
  bankName: string;
  planMonths: number;
  status: 'AUTO_VERIFIED' | 'MANUAL_APPROVED' | 'REJECTED';
  timestamp: number;
  notes: string;
}

export type OrderPaymentStatus =
  | 'PENDING'
  | 'APPROVED_AUTO'
  | 'APPROVED_MANUAL'
  | 'REJECTED';

export interface ClientSubscriptionOrder {
  id: string;
  deviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientCnic?: string;
  packageId: string;
  packageName: string;
  planCode: string;
  durationMonths: number;
  amountRs: number;
  bankAccountId: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  tid: string; // Normalized uppercase alphanumeric
  rawTid: string;
  status: OrderPaymentStatus;
  createdAt: number;
  approvedAt?: number;
  rejectedAt?: number;
  rejectReason?: string;
  matchedAlertId?: string;
  receiptUrl?: string;
}

export interface BankEmailAlert {
  id: string;
  tid: string; // Normalized uppercase alphanumeric
  rawTid: string;
  amount: number;
  bank: 'EASYPAISA' | 'BANK_ISLAMI' | 'BANK_ALFALAH' | 'OTHER' | string;
  sender?: string;
  emailSubject?: string;
  rawSnippet?: string;
  receivedAt: number;
  isMatched: boolean;
  matchedOrderId?: string;
}

export interface PaymentWebhookConfig {
  webhookUrl: string;
  secretToken: string;
  lastPingAt?: number;
  totalAlertsReceived: number;
  autoApprovedCount: number;
}
