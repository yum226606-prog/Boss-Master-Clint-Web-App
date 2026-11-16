import React, { useState } from 'react';
import {
  Palette,
  Check,
  X,
  Download,
  Sparkles,
  Sliders,
  Type,
  Square,
  Circle,
  Table,
  Zap,
  Layers,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Box,
  Flame,
  Crown,
  Cpu,
  Scissors,
} from 'lucide-react';

export type ThemeFontFamily =
  | 'PLUS_JAKARTA'
  | 'IBM_PLEX_MONO'
  | 'RAJDHANI'
  | 'SPACE_GROTESK'
  | 'OUTFIT'
  | 'CINZEL'
  | 'INTER';

export type ThemeButtonShape =
  | 'PILL_3D'
  | 'SHARP_SQUARE'
  | 'CHISELED_3D'
  | 'SQUIRCLE_SMOOTH'
  | 'CYBER_CHAMFER'
  | 'METALLIC_BEVEL';

export type ThemeTableStyle =
  | 'COMPACT_WORKSHOP'
  | 'SPACIOUS_MODERN'
  | 'BLUEPRINT_CAD'
  | 'GLASS_LUXURY'
  | 'CHISELED_INDUSTRIAL';

export type ThemeIconPack =
  | 'MINIMAL_OUTLINE'
  | 'BOLD_DUOTONE'
  | 'CAD_TECHNICAL'
  | 'NEON_CYBER'
  | 'ROUNDED_BADGE';

export interface AppThemeConfig {
  id: string;
  name: string;
  preset: string;
  category?: string;
  description?: string;
  fontFamily: ThemeFontFamily;
  buttonShape: ThemeButtonShape;
  buttonStyle?: string;
  tableStyle: ThemeTableStyle;
  iconPack: ThemeIconPack;
  templateLayout: 'CLASSIC_GOLD' | 'INDUSTRIAL_DARK' | 'PLATINUM_SLATE' | 'EMERALD_PRO' | 'BLUEPRINT_CYBER' | 'CHROME_TITANIUM' | string;
  isLight?: boolean;
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  primary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  fontScale?: number;
}

export const FONT_LABELS: Record<ThemeFontFamily, { label: string; desc: string; sample: string }> = {
  PLUS_JAKARTA: { label: 'Plus Jakarta Sans', desc: 'Modern Clean Architectural Sans', sample: 'Boss Aluminium & Glass 1.6mm' },
  IBM_PLEX_MONO: { label: 'IBM Plex Mono', desc: 'Technical CAD & Workshop Monospace', sample: 'DC30C 48" x 60" [Tally 14FT]' },
  RAJDHANI: { label: 'Rajdhani Industrial', desc: 'Heavy Duty Factory Machine Heading', sample: 'CUTTING CHART 24 BARS OPTIMIZED' },
  SPACE_GROTESK: { label: 'Space Grotesk', desc: 'Futuristic High-Tech Engineering', sample: 'Parametric CAD Engine 2026' },
  OUTFIT: { label: 'Outfit Display', desc: 'Bold Geometric Showroom Display', sample: 'Premium Double Glazed Sliding' },
  CINZEL: { label: 'Cinzel Architectural', desc: 'Luxury Royal Architectural Serif', sample: 'SYED SABOOR NAWAB · VIP OWNER' },
  INTER: { label: 'Inter Clean UI', desc: 'Universal High-Legibility UI', sample: 'Quotation Rs. 142,500 Complete' },
};

export const BUTTON_SHAPE_LABELS: Record<ThemeButtonShape, { label: string; desc: string; radiusClass: string }> = {
  PILL_3D: { label: 'Pill 3D (Elevated)', desc: 'Full round 9999px with tactile shadow', radiusClass: 'rounded-full' },
  SHARP_SQUARE: { label: 'Sharp CAD (90° Square)', desc: 'Zero border-radius crisp engineering cut', radiusClass: 'rounded-none' },
  CHISELED_3D: { label: 'Chiseled 3D (Machine Press)', desc: 'Industrial 4px bottom border tactile press', radiusClass: 'rounded-md' },
  SQUIRCLE_SMOOTH: { label: 'Squircle Smooth (16px)', desc: 'Modern organic iOS / OneUI curve', radiusClass: 'rounded-2xl' },
  CYBER_CHAMFER: { label: 'Cyber Chamfer (Angled)', desc: 'High-tech chamfered angled corners', radiusClass: 'rounded-sm' },
  METALLIC_BEVEL: { label: 'Metallic Bevel (Regal)', desc: 'Dual-layer metallic highlight bevel', radiusClass: 'rounded-xl' },
};

export const TABLE_STYLE_LABELS: Record<ThemeTableStyle, { label: string; desc: string }> = {
  COMPACT_WORKSHOP: { label: 'Compact Workshop (Dense)', desc: 'Tight padding py-1, zebra rows, high data density' },
  SPACIOUS_MODERN: { label: 'Spacious Modern (Comfort)', desc: 'Generous padding py-3, subtle dividers, cards feel' },
  BLUEPRINT_CAD: { label: 'Blueprint CAD (Grid Matrix)', desc: 'Technical blue borders, monospaced tabular data' },
  GLASS_LUXURY: { label: 'Glass Luxury (Frosted Glow)', desc: 'Frosted blur backdrop, golden borders & gradients' },
  CHISELED_INDUSTRIAL: { label: 'Chiseled Industrial (Heavy)', desc: '2px solid borders, heavy dark cell divisions' },
};

export const ICON_PACK_LABELS: Record<ThemeIconPack, { label: string; desc: string }> = {
  MINIMAL_OUTLINE: { label: 'Minimal Outline (1.5px)', desc: 'Ultra-thin crisp minimalist stroke' },
  BOLD_DUOTONE: { label: 'Bold DuoTone (2.3px)', desc: 'Punchy thick stroke with accent shadow' },
  CAD_TECHNICAL: { label: 'CAD Technical (Boxed)', desc: 'Sharp geometric vector precision' },
  NEON_CYBER: { label: 'Neon Cyber (Radiant Glow)', desc: 'Radiant colored drop-shadow glow' },
  ROUNDED_BADGE: { label: 'Rounded Badge (Pill Frame)', desc: 'High-contrast badge framed icons' },
};

export function enforceReadableContrast(thm: Partial<AppThemeConfig>): AppThemeConfig {
  const isLight = !!thm.isLight;
  return {
    id: thm.id || 'theme-classic-gold',
    name: thm.name || 'Classic Gold Pro',
    preset: thm.preset || 'GOLD',
    category: thm.category || (isLight ? 'DAYLIGHT' : 'OFFICIAL'),
    description: thm.description || 'Official Boss Gold & Slate architectural theme with tactile pill controls.',
    fontFamily: thm.fontFamily || 'PLUS_JAKARTA',
    buttonShape: thm.buttonShape || (thm.buttonStyle === 'ROUNDED' ? 'SQUIRCLE_SMOOTH' : thm.buttonStyle === 'MODERN_FLAT' ? 'SHARP_SQUARE' : thm.buttonStyle === 'METALLIC' ? 'METALLIC_BEVEL' : 'PILL_3D'),
    buttonStyle: thm.buttonStyle || 'PILL_3D',
    tableStyle: thm.tableStyle || 'COMPACT_WORKSHOP',
    iconPack: thm.iconPack || 'BOLD_DUOTONE',
    templateLayout: thm.templateLayout || 'CLASSIC_GOLD',
    isLight,
    bg: thm.bg || (isLight ? '#F8FAFC' : '#0F172A'),
    panel: thm.panel || (isLight ? '#FFFFFF' : '#1E293B'),
    panel2: thm.panel2 || (isLight ? '#F1F5F9' : '#334155'),
    border: thm.border || (isLight ? '#CBD5E1' : '#475569'),
    primary: thm.primary || '#F5B738',
    accent: thm.accent || '#38BDF8',
    textPrimary: thm.textPrimary || (isLight ? '#0F172A' : '#F8FAFC'),
    textSecondary: thm.textSecondary || (isLight ? '#475569' : '#94A3B8'),
    fontScale: thm.fontScale || 1,
  };
}

export const BUILT_IN_THEMES: AppThemeConfig[] = [
  enforceReadableContrast({
    id: 'theme-classic-gold',
    name: 'Classic Gold Pro',
    preset: 'GOLD',
    category: 'OFFICIAL',
    description: 'Official Boss Aluminium flagship theme with tactile 3D pill buttons, dense workshop tables, and duo-tone icons.',
    fontFamily: 'PLUS_JAKARTA',
    buttonShape: 'PILL_3D',
    buttonStyle: 'PILL_3D',
    tableStyle: 'COMPACT_WORKSHOP',
    iconPack: 'BOLD_DUOTONE',
    templateLayout: 'CLASSIC_GOLD',
    bg: '#0F172A',
    panel: '#1E293B',
    panel2: '#334155',
    border: '#475569',
    primary: '#F5B738',
    accent: '#38BDF8',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
  }),
  enforceReadableContrast({
    id: 'theme-industrial-cad',
    name: 'Industrial Blueprint & CAD',
    preset: 'CAD_BLUEPRINT',
    category: 'ENGINEERING',
    description: 'Precision engineering theme with IBM Plex Monospace font, 90° sharp square buttons, blueprint grid matrix tables, and technical crosshair icons.',
    fontFamily: 'IBM_PLEX_MONO',
    buttonShape: 'SHARP_SQUARE',
    buttonStyle: 'SHARP_CYBER',
    tableStyle: 'BLUEPRINT_CAD',
    iconPack: 'CAD_TECHNICAL',
    templateLayout: 'INDUSTRIAL_DARK',
    bg: '#061224',
    panel: '#0C1B33',
    panel2: '#13284A',
    border: '#1E3E6E',
    primary: '#38BDF8',
    accent: '#FACC15',
    textPrimary: '#E0F2FE',
    textSecondary: '#7DD3FC',
  }),
  enforceReadableContrast({
    id: 'theme-titanium-machine',
    name: 'Factory Machine Titanium',
    preset: 'TITANIUM',
    category: 'WORKSHOP',
    description: 'Heavy machinery aesthetic with Rajdhani condensed industrial font, 3D chiseled bottom-press buttons, and solid cell dividers.',
    fontFamily: 'RAJDHANI',
    buttonShape: 'CHISELED_3D',
    buttonStyle: 'MODERN_FLAT',
    tableStyle: 'CHISELED_INDUSTRIAL',
    iconPack: 'BOLD_DUOTONE',
    templateLayout: 'INDUSTRIAL_DARK',
    bg: '#090D14',
    panel: '#121824',
    panel2: '#1C2433',
    border: '#283344',
    primary: '#F59E0B',
    accent: '#38BDF8',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
  }),
  enforceReadableContrast({
    id: 'theme-emerald-executive',
    name: 'Emerald Executive Architect',
    preset: 'EMERALD',
    category: 'LUXURY',
    description: 'Architectural showroom styling with Outfit geometric display font, smooth organic squircle buttons, and spacious modern tables.',
    fontFamily: 'OUTFIT',
    buttonShape: 'SQUIRCLE_SMOOTH',
    buttonStyle: 'SOFT_MOBILE',
    tableStyle: 'SPACIOUS_MODERN',
    iconPack: 'MINIMAL_OUTLINE',
    templateLayout: 'EMERALD_PRO',
    bg: '#061412',
    panel: '#0E2420',
    panel2: '#143832',
    border: '#1E4E45',
    primary: '#10B981',
    accent: '#F59E0B',
    textPrimary: '#ECFDF5',
    textSecondary: '#6EE7B7',
  }),
  enforceReadableContrast({
    id: 'theme-platinum-slate',
    name: 'Platinum Daylight Showroom',
    preset: 'LIGHT',
    category: 'DAYLIGHT',
    description: 'High-contrast pure daylight mode with Inter UI font, smooth rounded pill buttons, and spacious clean tables for outdoor workshop readability.',
    fontFamily: 'INTER',
    buttonShape: 'SQUIRCLE_SMOOTH',
    buttonStyle: 'ROUNDED',
    tableStyle: 'SPACIOUS_MODERN',
    iconPack: 'MINIMAL_OUTLINE',
    templateLayout: 'PLATINUM_SLATE',
    isLight: true,
    bg: '#F8FAFC',
    panel: '#FFFFFF',
    panel2: '#F1F5F9',
    border: '#CBD5E1',
    primary: '#D97706',
    accent: '#0284C7',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
  }),
];

export const ONLINE_STORE_THEMES: AppThemeConfig[] = [
  enforceReadableContrast({
    id: 'store-cyberpunk-neon',
    name: 'Cyberpunk Neon Matrix',
    preset: 'CYBERPUNK',
    category: 'CYBER',
    description: 'Futuristic sci-fi workshop with Space Grotesk font, chamfered angled cyber buttons, neon glowing icon pack, and cyan matrix tables.',
    fontFamily: 'SPACE_GROTESK',
    buttonShape: 'CYBER_CHAMFER',
    buttonStyle: 'GLASS_NEON',
    tableStyle: 'BLUEPRINT_CAD',
    iconPack: 'NEON_CYBER',
    templateLayout: 'BLUEPRINT_CYBER',
    bg: '#080811',
    panel: '#111124',
    panel2: '#1A1A36',
    border: '#2E2E5C',
    primary: '#00F0FF',
    accent: '#FF007A',
    textPrimary: '#F8FAFC',
    textSecondary: '#A5B4FC',
  }),
  enforceReadableContrast({
    id: 'store-royal-imperial',
    name: 'Royal Imperial Architectural',
    preset: 'ROYAL_GOLD',
    category: 'LUXURY',
    description: 'Regal Roman aesthetic with Cinzel classical serif typography, metallic beveled luxury buttons, and frosted glass tables with gold trims.',
    fontFamily: 'CINZEL',
    buttonShape: 'METALLIC_BEVEL',
    buttonStyle: 'ROYAL_BEVEL',
    tableStyle: 'GLASS_LUXURY',
    iconPack: 'ROUNDED_BADGE',
    templateLayout: 'ROYAL_CREST',
    bg: '#0A0D14',
    panel: '#131926',
    panel2: '#1C2538',
    border: '#334155',
    primary: '#FFD700',
    accent: '#F59E0B',
    textPrimary: '#FFFBEB',
    textSecondary: '#FDE68A',
  }),
  enforceReadableContrast({
    id: 'store-crimson-forge',
    name: 'Crimson Forge Machine',
    preset: 'CRIMSON',
    category: 'WORKSHOP',
    description: 'High-temperature aluminum extrusion foundry theme with Rajdhani condensed fonts, 3D chiseled buttons, and high-visibility red/gold contrast.',
    fontFamily: 'RAJDHANI',
    buttonShape: 'CHISELED_3D',
    buttonStyle: 'MODERN_FLAT',
    tableStyle: 'CHISELED_INDUSTRIAL',
    iconPack: 'BOLD_DUOTONE',
    templateLayout: 'INDUSTRIAL_DARK',
    bg: '#14080A',
    panel: '#240F13',
    panel2: '#36161D',
    border: '#5C1D29',
    primary: '#F43F5E',
    accent: '#F59E0B',
    textPrimary: '#FFF1F2',
    textSecondary: '#FDA4AF',
  }),
  enforceReadableContrast({
    id: 'store-midnight-sapphire',
    name: 'Midnight Sapphire Glazing',
    preset: 'SAPPHIRE',
    category: 'ENGINEERING',
    description: 'Deep navy glass factory theme with IBM Plex Mono font, sharp CAD buttons, and high-density technical workshop tables.',
    fontFamily: 'IBM_PLEX_MONO',
    buttonShape: 'SHARP_SQUARE',
    buttonStyle: 'SHARP_CYBER',
    tableStyle: 'COMPACT_WORKSHOP',
    iconPack: 'CAD_TECHNICAL',
    templateLayout: 'INDUSTRIAL_DARK',
    bg: '#050B14',
    panel: '#0B1728',
    panel2: '#10223D',
    border: '#1D3B6B',
    primary: '#38BDF8',
    accent: '#60A5FA',
    textPrimary: '#F0F9FF',
    textSecondary: '#93C5FD',
  }),
];

interface ThemeStudioModalProps {
  currentTheme: AppThemeConfig;
  downloadedThemes: AppThemeConfig[];
  onApplyTheme: (thm: AppThemeConfig) => void;
  onDownloadTheme: (thm: AppThemeConfig) => void;
  onClose: () => void;
}

export const ThemeStudioModal: React.FC<ThemeStudioModalProps> = ({
  currentTheme,
  downloadedThemes,
  onApplyTheme,
  onDownloadTheme,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'BUILT_IN' | 'ONLINE' | 'CUSTOM'>('BUILT_IN');

  // Custom Theme Builder State
  const [customName, setCustomName] = useState('My Custom Workshop Theme');
  const [customFont, setCustomFont] = useState<ThemeFontFamily>(currentTheme.fontFamily || 'PLUS_JAKARTA');
  const [customBtnShape, setCustomBtnShape] = useState<ThemeButtonShape>(currentTheme.buttonShape || 'PILL_3D');
  const [customTableStyle, setCustomTableStyle] = useState<ThemeTableStyle>(currentTheme.tableStyle || 'COMPACT_WORKSHOP');
  const [customIconPack, setCustomIconPack] = useState<ThemeIconPack>(currentTheme.iconPack || 'BOLD_DUOTONE');
  const [customPrimary, setCustomPrimary] = useState(currentTheme.primary || '#F5B738');
  const [customAccent, setCustomAccent] = useState(currentTheme.accent || '#38BDF8');
  const [customBg, setCustomBg] = useState(currentTheme.bg || '#0F172A');
  const [customPanel, setCustomPanel] = useState(currentTheme.panel || '#1E293B');
  const [customIsLight, setCustomIsLight] = useState(Boolean(currentTheme.isLight));

  // Merge Built-in and user downloaded custom themes
  const builtInList = BUILT_IN_THEMES;
  const storeList = ONLINE_STORE_THEMES;
  const customList = downloadedThemes;

  const handleSaveCustomTheme = () => {
    const newTheme = enforceReadableContrast({
      id: `theme-custom-${Date.now()}`,
      name: customName.trim() || 'Custom Fabricator Theme',
      preset: 'CUSTOM',
      category: 'CUSTOM',
      description: `Custom Theme Engine configuration with ${FONT_LABELS[customFont].label}, ${BUTTON_SHAPE_LABELS[customBtnShape].label}, and ${TABLE_STYLE_LABELS[customTableStyle].label}.`,
      fontFamily: customFont,
      buttonShape: customBtnShape,
      tableStyle: customTableStyle,
      iconPack: customIconPack,
      templateLayout: 'CLASSIC_GOLD',
      isLight: customIsLight,
      bg: customBg,
      panel: customPanel,
      panel2: customIsLight ? '#F1F5F9' : '#334155',
      border: customIsLight ? '#CBD5E1' : '#475569',
      primary: customPrimary,
      accent: customAccent,
      textPrimary: customIsLight ? '#0F172A' : '#FFFFFF',
      textSecondary: customIsLight ? '#475569' : '#94A3B8',
    });

    onDownloadTheme(newTheme);
    onApplyTheme(newTheme);
  };

  const renderThemeCard = (thm: AppThemeConfig, isStore = false) => {
    const isSelected = currentTheme.id === thm.id;
    const isDownloaded = downloadedThemes.some((d) => d.id === thm.id);
    const fontInfo = FONT_LABELS[thm.fontFamily] || FONT_LABELS.PLUS_JAKARTA;
    const btnInfo = BUTTON_SHAPE_LABELS[thm.buttonShape] || BUTTON_SHAPE_LABELS.PILL_3D;
    const tableInfo = TABLE_STYLE_LABELS[thm.tableStyle] || TABLE_STYLE_LABELS.COMPACT_WORKSHOP;
    const iconInfo = ICON_PACK_LABELS[thm.iconPack] || ICON_PACK_LABELS.BOLD_DUOTONE;

    return (
      <div
        key={thm.id}
        style={{ backgroundColor: thm.panel, borderColor: thm.border }}
        className={`p-4 rounded-2xl border-2 transition-all space-y-3.5 relative flex flex-col justify-between ${
          isSelected
            ? 'ring-2 ring-[#F5B738] shadow-xl shadow-amber-950/40'
            : 'hover:border-slate-500'
        }`}
      >
        <div className="space-y-2.5">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm" style={{ color: thm.textPrimary }}>
                  {thm.name}
                </span>
                {thm.category && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-black/30 border border-white/10 text-slate-300">
                    {thm.category}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                {thm.description}
              </p>
            </div>

            {isSelected && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center gap-1 shrink-0 shadow-sm">
                <Check className="w-3 h-3" /> ACTIVE
              </span>
            )}
          </div>

          {/* 4 Core Dimensions Badges (Font, Button, Table, Icon) */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="p-1.5 rounded-lg bg-black/25 border border-white/5 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">Font Family:</span>
                <span className="font-bold text-white truncate block">{fontInfo.label}</span>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-black/25 border border-white/5 flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">Button Shape:</span>
                <span className="font-bold text-white truncate block">{btnInfo.label.split(' ')[0]}</span>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-black/25 border border-white/5 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">Table Style:</span>
                <span className="font-bold text-white truncate block">{tableInfo.label.split(' ')[0]}</span>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-black/25 border border-white/5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">Icon Pack:</span>
                <span className="font-bold text-white truncate block">{iconInfo.label.split(' ')[0]}</span>
              </div>
            </div>
          </div>

          {/* Live Mini Preview Box (Buttons, Table, Icons) */}
          <div
            className="p-2.5 rounded-xl border border-white/10 space-y-2"
            style={{ backgroundColor: thm.bg }}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Live Theme Preview:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: thm.primary }}
                  title="Primary Color"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: thm.accent }}
                  title="Accent Color"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: thm.panel }}
                  title="Panel Color"
                />
              </div>
            </div>

            {/* Preview Action Button with Exact Shape */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  backgroundColor: thm.primary,
                  color: thm.isLight ? '#FFFFFF' : '#000000',
                  borderRadius: thm.buttonShape === 'PILL_3D' ? '9999px' : thm.buttonShape === 'SHARP_SQUARE' ? '0px' : thm.buttonShape === 'CHISELED_3D' ? '6px' : thm.buttonShape === 'SQUIRCLE_SMOOTH' ? '14px' : '8px',
                  boxShadow: thm.buttonShape === 'PILL_3D' ? '0 2px 0 rgba(0,0,0,0.4)' : thm.buttonShape === 'CHISELED_3D' ? '0 3px 0 rgba(0,0,0,0.6)' : 'none',
                }}
                className="px-3 py-1 text-[11px] font-black flex items-center gap-1 shadow-sm"
              >
                <Scissors className="w-3 h-3" />
                <span>Sample Button</span>
              </div>

              <div
                style={{
                  borderColor: thm.primary,
                  color: thm.primary,
                  borderRadius: thm.buttonShape === 'PILL_3D' ? '9999px' : thm.buttonShape === 'SHARP_SQUARE' ? '0px' : '8px',
                }}
                className="px-2.5 py-1 text-[11px] font-bold border flex items-center gap-1"
              >
                <span>Secondary</span>
              </div>
            </div>

            {/* Mini Table Rows Preview */}
            <div
              className={`rounded border overflow-hidden text-[10px] ${
                thm.tableStyle === 'BLUEPRINT_CAD'
                  ? 'border-cyan-500/50 font-mono'
                  : thm.tableStyle === 'CHISELED_INDUSTRIAL'
                  ? 'border-slate-600 font-bold'
                  : 'border-slate-800'
              }`}
            >
              <div
                style={{ backgroundColor: thm.panel2 }}
                className="px-2 py-1 flex items-center justify-between font-bold border-b border-white/10"
              >
                <span>Section (DC30C)</span>
                <span style={{ color: thm.primary }}>Rate: Rs. 672/ft</span>
              </div>
              <div className="px-2 py-0.5 flex items-center justify-between text-slate-300">
                <span>Height: 60" · Width: 48"</span>
                <span>2 Bars (30 ft)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isStore && !isDownloaded ? (
            <button
              type="button"
              onClick={() => {
                onDownloadTheme(thm);
                onApplyTheme(thm);
              }}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download & Apply Theme</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onApplyTheme(thm)}
              disabled={isSelected}
              className={`w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                  : 'bg-[#F5B738] hover:bg-amber-400 text-black cursor-pointer shadow-md shadow-amber-500/20'
              }`}
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Theme Active Across All 4 Systems</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Theme Engine</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-4xl bg-[#0C1017] border-2 border-amber-500/80 rounded-2xl shadow-2xl p-3.5 sm:p-6 text-white space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto overflow-x-hidden my-4">
        {/* Header Bar */}
        <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500 text-black shadow-md shadow-amber-500/30 shrink-0">
              <Palette className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-black text-[#F5B738] tracking-wide">
                  Complete Theme Engine Studio
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black uppercase">
                  4-WAY UI ENGINE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Colors · Fonts Family · Button Shapes · Table Borders & Padding · Icon Packs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('BUILT_IN')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'BUILT_IN'
                ? 'bg-[#F5B738] text-black shadow-md shadow-amber-500/20'
                : 'bg-[#141A24] text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Built-in Official Themes ({builtInList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ONLINE')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'ONLINE'
                ? 'bg-[#F5B738] text-black shadow-md shadow-amber-500/20'
                : 'bg-[#141A24] text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Online Cloud Theme Store ({storeList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOM')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'CUSTOM'
                ? 'bg-[#F5B738] text-black shadow-md shadow-amber-500/20'
                : 'bg-[#141A24] text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Theme Builder Workshop</span>
          </button>
        </div>

        {/* TAB 1: BUILT IN THEMES */}
        {activeTab === 'BUILT_IN' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              Kisi bhi theme par click karne se us ke sath <strong>Icons ka pack, Tables ke borders/padding, Buttons ki shapes, aur Fonts ki family</strong> foran tabdeel ho jayein ge:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {builtInList.map((thm) => renderThemeCard(thm, false))}
            </div>
          </div>
        )}

        {/* TAB 2: ONLINE CLOUD STORE */}
        {activeTab === 'ONLINE' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              Online Cloud Theme Store se naye verified themes download karein. Download hone kay baad yeh permanent aap ke mobile/desktop vault mein save ho jayein ge:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeList.map((thm) => renderThemeCard(thm, true))}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM THEME BUILDER WORKSHOP */}
        {activeTab === 'CUSTOM' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#141A24] border border-slate-800 space-y-4 text-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 border-b border-slate-800 pb-2.5">
                <span className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Configure Your Own 4-Way Custom Theme Engine</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Instant live changes applied across the entire app
                </span>
              </div>

              {/* Theme Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Theme Title / Name:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Al-Madina Titanium CAD Theme"
                  className="w-full p-2.5 rounded-xl bg-[#090D13] border border-slate-700 text-white outline-none focus:border-amber-400 font-bold"
                />
              </div>

              {/* 1. Font Family Picker */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-amber-400" />
                  <span>1. Select Fonts Family (Typography Engine):</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.keys(FONT_LABELS) as ThemeFontFamily[]).map((fontKey) => {
                    const info = FONT_LABELS[fontKey];
                    const isSel = customFont === fontKey;
                    return (
                      <button
                        key={fontKey}
                        type="button"
                        onClick={() => setCustomFont(fontKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400'
                            : 'bg-[#090D13] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{info.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{info.desc}</div>
                        <div className="text-[10px] text-amber-300/80 font-mono mt-1 italic truncate">
                          "{info.sample}"
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Button Shape Picker */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Square className="w-4 h-4 text-sky-400" />
                  <span>2. Select Buttons Shape & Micro-interactions:</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.keys(BUTTON_SHAPE_LABELS) as ThemeButtonShape[]).map((shapeKey) => {
                    const info = BUTTON_SHAPE_LABELS[shapeKey];
                    const isSel = customBtnShape === shapeKey;
                    return (
                      <button
                        key={shapeKey}
                        type="button"
                        onClick={() => setCustomBtnShape(shapeKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-sky-500/20 border-sky-400 text-white ring-1 ring-sky-400'
                            : 'bg-[#090D13] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{info.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{info.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Table Style Picker */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>3. Select Tables Borders & Padding Style:</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.keys(TABLE_STYLE_LABELS) as ThemeTableStyle[]).map((tblKey) => {
                    const info = TABLE_STYLE_LABELS[tblKey];
                    const isSel = customTableStyle === tblKey;
                    return (
                      <button
                        key={tblKey}
                        type="button"
                        onClick={() => setCustomTableStyle(tblKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400'
                            : 'bg-[#090D13] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{info.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{info.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Icon Pack Picker */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-rose-400" />
                  <span>4. Select Icons Pack & Styling:</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.keys(ICON_PACK_LABELS) as ThemeIconPack[]).map((iconKey) => {
                    const info = ICON_PACK_LABELS[iconKey];
                    const isSel = customIconPack === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setCustomIconPack(iconKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-rose-500/20 border-rose-400 text-white ring-1 ring-rose-400'
                            : 'bg-[#090D13] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{info.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{info.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Colors Palette */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#F5B738]" />
                  <span>5. Color Palette & Tone:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Primary Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customPrimary}
                        onChange={(e) => setCustomPrimary(e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-[#090D13] border border-slate-700 text-white font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Accent Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-[#090D13] border border-slate-700 text-white font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Background:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customBg}
                        onChange={(e) => setCustomBg(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customBg}
                        onChange={(e) => setCustomBg(e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-[#090D13] border border-slate-700 text-white font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Panel Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPanel}
                        onChange={(e) => setCustomPanel(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customPanel}
                        onChange={(e) => setCustomPanel(e.target.value)}
                        className="w-full p-1.5 rounded-lg bg-[#090D13] border border-slate-700 text-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Daylight Light Mode Switch */}
                <label className="flex items-center gap-2 cursor-pointer pt-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={customIsLight}
                    onChange={(e) => setCustomIsLight(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <span>Daylight Showroom Light Mode (White Background / Dark Text)</span>
                </label>
              </div>

              {/* Live Sandbox Preview */}
              <div className="p-4 rounded-xl border border-amber-500/40 bg-[#090D13] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>Live Theme Engine Sandbox Preview</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Font: {FONT_LABELS[customFont].label} · Shape: {BUTTON_SHAPE_LABELS[customBtnShape].label.split(' ')[0]}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    style={{
                      backgroundColor: customPrimary,
                      color: customIsLight ? '#FFFFFF' : '#000000',
                      borderRadius: customBtnShape === 'PILL_3D' ? '9999px' : customBtnShape === 'SHARP_SQUARE' ? '0px' : customBtnShape === 'CHISELED_3D' ? '6px' : customBtnShape === 'SQUIRCLE_SMOOTH' ? '16px' : '8px',
                      boxShadow: customBtnShape === 'PILL_3D' ? '0 3px 0 rgba(0,0,0,0.5)' : customBtnShape === 'CHISELED_3D' ? '0 4px 0 rgba(0,0,0,0.6)' : 'none',
                    }}
                    className="px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Primary Action Button</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      borderColor: customAccent,
                      color: customAccent,
                      borderRadius: customBtnShape === 'PILL_3D' ? '9999px' : customBtnShape === 'SHARP_SQUARE' ? '0px' : '8px',
                    }}
                    className="px-3.5 py-2 text-xs font-bold border flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Plan</span>
                  </button>
                </div>

                {/* Table Preview */}
                <div
                  className={`rounded border overflow-hidden text-xs ${
                    customTableStyle === 'BLUEPRINT_CAD'
                      ? 'border-cyan-500 font-mono'
                      : customTableStyle === 'CHISELED_INDUSTRIAL'
                      ? 'border-slate-500 font-bold'
                      : 'border-slate-800'
                  }`}
                >
                  <div
                    style={{ backgroundColor: customPanel }}
                    className="px-3 py-1.5 flex items-center justify-between font-bold border-b border-white/10"
                  >
                    <span>Section Code / Description</span>
                    <span style={{ color: customPrimary }}>Rate / Foot</span>
                  </div>
                  <div className="px-3 py-1 flex items-center justify-between text-slate-300">
                    <span>DC30C Sliding Outer (1.6mm DULL)</span>
                    <span className="font-bold">Rs. 672 / ft</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveCustomTheme}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#F5B738] hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save & Apply Custom Theme Engine</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
