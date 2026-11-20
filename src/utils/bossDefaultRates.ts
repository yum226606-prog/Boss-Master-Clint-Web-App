import {
  BankAccountConfig,
  ClientAppLayoutControlConfig,
  DynamicMasterSection,
  FSectionFormula,
  FormulaCategorySettings,
  GlassFormula,
  IdentityRecord,
  SlidingDoorFormulaSettings,
  SubscriptionPackage,
  UserUploadedPhoto,
  WindowFormulaSettings,
} from '../types/bossModels';

export const OWNER_VIP_EMAILS = ['ssaboor2t@gmail.com', 'yum226606@gmail.com'];
export const OWNER_NAME = 'Syed Saboor Nawab';
export const OWNER_PHONE = '03105524225';
export const EASYPAISA_ACCOUNT = '03105524225';
export const BANKISLAMI_ACCOUNT = '300800600380016';
export const BANKALFALAH_IBAN = 'PK63ALFH0977001008094809';
export const MONTHLY_FEE = 3000;
export const THREE_MONTH_FEE = 8000;
// 2796 removed per owner request - only 2 strong passcodes authorized
export const SECURITY_MASTER_PIN = '';
export const MASTER_PASSCODES = ['BOSS2796', 'SABOOR2796'];

export const GAUGES = [
  '1.2',
  '1.4',
  '1.5',
  '1.6',
  '2',
  '2.5',
  '2.75',
  '2.85',
  '3',
  '3.2',
  '3.5',
  '3.8',
  '4',
  '6',
  'Std',
];

// Default finish colors ensuring H.23, BLACK, BROWN, SAHARA, PC-RAL, WOOD COAT, ANODIZED, CHAMPAGNE are always available
export const REQUIRED_DEFAULT_FINISH_COLORS = [
  'DULL',
  'H.23',
  'BLACK',
  'BROWN',
  'SAHARA',
  'PC-RAL',
  'WOOD COAT',
  'ANODIZED',
  'CHAMPAGNE',
];

// Supports both required defaults, legacy grouped colors, and individual fixed colors from the Industrial Rate Scanner
export const DEFAULT_COLORS = [
  'DULL',
  'H.23',
  'BLACK',
  'BROWN',
  'SAHARA',
  'PC-RAL',
  'WOOD COAT',
  'ANODIZED',
  'CHAMPAGNE',
  'H23',
  'H23/PC-RAL',
  'SAHARA/BROWN',
  'BLACK/MULTI',
  'MULTI',
  'NATURAL',
  'D.SHINE',
  'SS DESIGNER',
];

export const INDUSTRIAL_FIXED_CATEGORIES = [
  'CURTAIN WALL SECTIONS',
  'PIPE SECTIONS / RECT. PIPE / SQUARE & RECTANGLE PIPE PROFILES',
  'DOUBLE GLAZED SECTIONS (Windows, Doors & Fix) / DOUBLE GLAZE SLIDING DOOR/WINDOWS',
  'SLIDING WINDOWS SECTIONS / DELUX SLIDING WINDOW / DELUX SLIDING WINDOW (2MM) / DELUX SLIDING WINDOW (1.6MM)',
  'AL SERIES',
  'EC SERIES',
  'ET SERIES',
  'EF SERIES',
  'ALUMINIUM ANGLES / HEAVY ANGLES MILLNISH',
  'SINGLE SLIDING SECTIONS / FIXED DOUBLE GLAZE WINDOWS',
  'SLIDING NET SECTIONS',
  'LOUVER SECTIONS / LOUVER PROFILES',
  'GE SERIES',
  'OTHER MISC SECTIONS / MISC SECTIONS',
  'ECONOMY FIX SECTIONS',
  'KITCHEN SECTIONS / KITCHEN PROFILES',
  'RAILING SECTIONS / MIRA PROFILE SERIES',
  'STRUCTURAL GLAZING CURTAIN WALL PROFILES',
  'FIX & OPENABLE WINDOWS PROFILE',
  'VALIDATED SERIES PROFILES / PN SERIES / BF SERIES / WAW PROFILES',
];

export const INDUSTRIAL_FIXED_COLORS = [
  'DULL',
  'H23',
  'PC-RAL',
  'SAHARA',
  'BROWN',
  'BLACK',
  'MULTI',
  'WOOD COAT',
  'NATURAL',
  'D.SHINE',
  'SS DESIGNER',
  'ANODIZED',
];

export const DEFAULT_GLASS_COLORS_5MM = ['CLEAR', 'GREEN', 'BLUE', 'BRONZE', 'GREY', 'REFLECTIVE'];
export const DEFAULT_GLASS_COLORS_8MM = ['CLEAR', 'GREEN', 'BLUE', 'BRONZE', 'GREY', 'FROSTED'];
export const DEFAULT_GLASS_COLORS_DG = ['CLEAR', 'GREEN', 'BLUE', 'FROSTED'];

export const DEFAULT_SECTIONS = [
  // DG.SERIES (Official Boss & Prime DG Series Master Profiles)
  'DG.26', 'DG.23', 'DG.28', 'DG.24A', 'DG.25', 'DG.23A', 'DG.29', 'DG.26F', 'DG.23L', 'DG.3', 'DG.31',
  'GSPR.1', 'GSPR.16',
  'DG.26F 1.6M', 'DG.26F 2MM', 'DG.29 2MM', 'DG.26 2MM', 'DG.23 2MM', 'DG.23A 2MM',
  'GSPR.1 1.6M', 'GSPR.1 2MM', 'GSPR.16 1.6M', 'DG.26 1.6MM', 'DG.23L 1.6M', 'DG.23 1.6MM', 'DG.23A 1.6M',
  // D Series (Complete Master List)
  'D10', 'D10A', 'D11', 'D14', 'D15', 'D16', 'D18', 'D20', 'D28', 'D29', 'D29/D29D/EM29', 'D29A', 'D29B', 'D29F',
  'D31', 'D31A', 'D32', 'D32A', 'D32B', 'D32C', 'D33', 'D35', 'D38', 'D38B', 'D38F',
  'D40', 'D41', 'D41A', 'D41B', 'D41C', 'D42', 'D42A', 'D42F', 'D43', 'D44', 'D44A',
  'D45', 'D45A', 'D45F', 'D46', 'D47', 'D48', 'D48A', 'D48B', 'D49',
  'D50', 'D50A', 'D50B', 'D51', 'D51A', 'D51C', 'D51F', 'D52', 'D53',
  'D54', 'D54A', 'D54C', 'D54F', 'D55', 'D56', 'D57', 'D58', 'D59', 'D59A', 'D60', 'D61', 'D61H', 'D61S', 'B-6', 'EM-29',
  // Sliding Window Codes (Complete Master List)
  'DC30C', 'DC26C', 'DC30F', 'DC26F', 'DC24', 'DC26', 'DC30',
  'DC26E', 'DC30E', 'DC26A', 'DC30A', 'DC30B', 'DC26B', 'DC26BA/C', 'DC30BA/C', 'DC26F/H', 'DC30F/H', 'DC26JC', 'DC30JC', 'DC26BH', 'DC30BH',
  'M23', 'M28', 'M24', 'M24A', 'M23F', 'M24F', 'M23H', 'M28A', 'M23B', 'M28B', 'M24B',
  'AA23', 'AA23-S', 'AA28', 'M25', 'M26', 'M30', 'M26F', 'M30F', 'M27',
  // Kitchen Codes (Complete Master List)
  'KT.1', 'KT.2', 'KT.3', 'KT.4', 'KT.4A', 'KT.5A', 'KT.6A', 'KT.6', 'KT.7', 'KT.8', 'KT.8B',
  'KT.9', 'KT.9H', 'KT.12', 'KT.13', 'KT.14', 'KT.15', 'KT.16', 'KT.21', 'KT.24', 'KT.25', 'KT.27',
  'KT8BA', 'KT8BC', 'KT20', 'SC.8', 'Z.1', 'Z.2', 'Z1', 'Z2',
  // Curtain Wall & AL Series (Complete Master List)
  'CW-1', 'CW-1-S', 'CW-2', 'CW-3', 'CW-01', 'CW-02', 'CW-03', 'CW-1A', 'CW-01A', 'CW-01-L', 'CW-01-LS',
  'CW-6', 'CW-7', 'CW-1-B', 'CW-1-BS', 'CW-10', 'CW-11', 'CW-12', 'CW-U', 'CW Y BIG', 'CW Y SMALL',
  'AL-D10', 'AL-D10A', 'AL-D20', 'AL-20F', 'AL-29', 'AL-29A', 'AL-32', 'AL-33', 'AL-33L', 'AL-33A', 'AL-35', 'AL-35L',
  // ET & EF Series (Complete Master List)
  'ET 23', 'ET 24', 'ET 24A', 'ET 26', 'ET 28', 'ET 30', 'ET30A', 'ET-45', 'ET-41',
  'EF22', 'EF24', 'EF25', 'EF26', 'EF27', 'EF28', 'EF30',
  // Miscellaneous, Angles, Louvers, GE, Railing, SG (Complete Master List)
  'PIPE1', 'PIPE12', 'PIPE22', 'PIPE13', 'PIPE112', 'PIPE1123',
  'ANGLE 1*1', 'ANGLE 1-1/2', 'ANGLE 1-1/4', 'ANGLE 2*2', 'ANGLE1', 'ANGLE112',
  'L 39', 'L39', 'L-39 A', 'L-26', 'L-30', 'LOUVER (60X15.5)', 'LOUVER (98X25)',
  'NETING SECTION 1', 'NETING SECTION 2',
  'GE-1', 'GE-2', 'GE-3', 'GE-4', 'GE-5', 'GE-6', 'GE-7', 'GE-8', 'GE-9', 'GE-10', 'GE-11', 'GE-12', 'GE-13', 'GE-14',
  'B6', 'UPER', 'U-1/2*3/4', 'U-12X17MM', 'H-7', 'LK 42', 'K.PLATE 4.5', 'K.PLATE 6', 'PATTI412', 'PATTI6', 'AA51',
  'E10', 'E11', 'E12', 'E14', 'E15', 'E16', 'E18', 'E20', 'PR-1', 'PR-2',
  'RAILING-1', 'RAILING-2',
  'MRA-1', 'MRA-2', 'MRA-3', 'MRA-4', 'MRA-5', 'MRA-6', 'MRA-7', 'MRA-8', 'MRA-9', 'MRA-10', 'MRA-11', 'MRA-12', 'MRA-13',
  'SG-101', 'SG-102', 'SG-103', 'SG-104', 'SG-105', 'SG-106', 'SG-107', 'SG-108', 'SG-109', 'SG-110', 'SG-111', 'SG-112', 'SG-113',
];

export const SECTION_LABELS: Record<string, string> = {
  // DG.SERIES Profiles
  'DG.26': 'DG.26 Bottom Track (DG Series)',
  'DG.23': 'DG.23 Plain Sash (DG Series)',
  'DG.28': 'DG.28 Interlock Sash (DG Series)',
  'DG.24A': 'DG.24A Sash Top/Bottom (DG Series)',
  'DG.25': 'DG.25 Adaptor Profile (DG Series)',
  'DG.23A': 'DG.23A Heavy Sash (DG Series)',
  'DG.29': 'DG.29 Jali / Net Frame (DG Series)',
  'DG.26F': 'DG.26F Outer Bottom F-Track',
  'DG.23L': 'DG.23L Light Sash Profile',
  'GSPR.1': 'GSPR.1 Heavy Glass Track (DG)',
  'GSPR.16': 'GSPR.16 Top Frame Profile (DG)',
  'DG.3': 'DG.3 Beading Profile (DG Series)',
  'DG.31': 'DG.31 4-Panel Interlock (DG Series)',
  DC30C: 'DC30C Frame Top/Side',
  DC26C: 'DC26C Bottom Track',
  DC30F: 'DC30F Heavy F-Frame',
  DC26F: 'DC26F Heavy Bottom F',
  M23: 'M23 Plain Sash',
  M28: 'M28 Interlock Sash',
  M24: 'M24 Sash Top/Bottom',
  M24A: 'M24A Heavy Sash',
  M26: 'M26 Door Bottom Track',
  M30: 'M30 Door Side/Top',
  M26F: 'M26F Door Track F',
  M30F: 'M30F Door Frame F',
  D29: 'D29 Jali / Net Profile',
  D31: 'D31 4-Palay Interlock',
  D41: 'D41 Glass Beading (Gola)',
  D42: 'D42 Fix Outer Frame',
  D42F: 'D42F Fix Frame F',
  D46: 'D46 Door Bottom Rail',
  D48: 'D48 Center Mullion / Divider',
  D50: 'D50 Openable Sash',
  D50A: 'D50A Openable Sash Alt',
  D51: 'D51 Door Outer Frame',
  D51A: 'D51A Door Frame Light',
  D51F: 'D51F Door Frame F',
  D52: 'D52 Door Center Lock Rail',
  D54A: 'D54A Standard Door/Fix Outer',
  D54F: 'D54F Heavy Door/Fix F',
  D59: 'D59 Arch / Partition Bar',
  D59A: 'D59A Heavy Partition Bar',
  PIPE1: 'Pipe 1*1',
  PIPE12: 'Pipe 1*2',
  PIPE22: 'Pipe 2*2',
  PIPE13: 'Pipe 1*3',
  PIPE112: 'Pipe 1*1/2',
  PIPE1123: 'Pipe 1*1/2*3',
  ANGLE1: 'Angle 1*1',
  ANGLE112: 'Angle 1-1/2',
  PATTI412: 'K.Plate 4.5"',
  PATTI6: 'K.Plate 6"',
  L39: 'Louver L-39',
  Z1: 'Netting Section 1 (Z-1)',
  Z2: 'Netting Section 2 (Z-2)',
};

export function getInitialRates(): Record<string, Record<string, Record<string, number>>> {
  const root: Record<string, Record<string, Record<string, number>>> = {};

  const setRate = (gauge: string, color: string, section: string, rate: number) => {
    if (!root[gauge]) root[gauge] = {};
    if (!root[gauge][color]) root[gauge][color] = {};
    root[gauge][color][section] = rate;
  };

  const base12Rates: Record<string, number> = {
    DC30C: 672, DC26C: 774, DC30F: 752, DC26F: 878,
    DC24: 620, DC26: 774, DC30: 672,
    DC26E: 710, DC30E: 640, DC26A: 760, DC30A: 665, DC30B: 680, DC26B: 780,
    M23: 352, M24: 418, M24A: 369, M25: 410,
    M26: 580, M30: 520, M26F: 678, M30F: 610,
    M27: 430, M28: 429,
    D10: 514, D10A: 490, D11: 465, D14: 480, D15: 510, D16: 525, D18: 540, D20: 560,
    D28: 290, D29: 273, D31: 325, D32: 390, D33: 410, D35: 435, D38: 450,
    D40: 195, D41: 182, D41A: 146, D42: 318, D42F: 406,
    D43: 330, D44: 345, D45: 484, D45A: 428, D46: 859,
    D47: 470, D48: 510, D48A: 460, D49: 495,
    D50: 551, D50A: 488,
    D51: 528, D51A: 451, D51F: 528, D52: 432,
    D53: 450, D54: 476, D54A: 476, D54F: 484,
    D55: 490, D56: 505, D57: 515, D58: 520, D59: 506, D59A: 548, D60: 560, D61: 680,
    'CW-1': 840, 'CW-2': 810, 'CW-01': 840, 'CW-01A': 894, 'CW-10': 780,
    'KT.1': 420, 'KT.2': 445, 'KT.3': 460, 'KT.4': 490,
    PIPE1: 225, PIPE12: 350, PIPE22: 468, PIPE13: 452,
    PIPE112: 380, PIPE1123: 520,
    ANGLE1: 266, ANGLE112: 406, PATTI412: 327, PATTI6: 432,
    L39: 221, Z1: 294, Z2: 339,
  };

  const colorMultipliers: Record<string, number> = {
    DULL: 1.0,
    'H23/PC-RAL': 1.05,
    'H.23': 1.05,
    H23: 1.05,
    'PC-RAL': 1.05,
    'SAHARA/BROWN': 1.07,
    SAHARA: 1.07,
    BROWN: 1.07,
    'BLACK/MULTI': 1.12,
    BLACK: 1.12,
    MULTI: 1.12,
    'WOOD COAT': 1.25,
    NATURAL: 1.0,
    'D.SHINE': 1.1,
    'SS DESIGNER': 1.18,
    ANODIZED: 1.06,
    CHAMPAGNE: 1.08,
  };

  GAUGES.forEach((g) => {
    const gaugeMultiplier =
      g === '1.4'
        ? 1.15
        : g === '1.5'
        ? 1.21
        : g === '1.6'
        ? 1.28
        : g === '2'
        ? 1.55
        : g === '2.5'
        ? 1.85
        : g === '3'
        ? 2.15
        : g === '3.5'
        ? 2.45
        : g === '4'
        ? 2.8
        : 1.0;

    DEFAULT_COLORS.forEach((c) => {
      const cm = colorMultipliers[c] ?? 1.0;
      DEFAULT_SECTIONS.forEach((sec) => {
        const fallbackBase =
          sec.startsWith('CW') || sec.startsWith('SG')
            ? 820
            : sec.startsWith('DC') || sec.startsWith('M30') || sec.startsWith('M26')
            ? 680
            : sec.startsWith('M') || sec.startsWith('ET') || sec.startsWith('EF')
            ? 430
            : sec.startsWith('KT')
            ? 440
            : sec.startsWith('D5') || sec.startsWith('D6')
            ? 510
            : 380;
        const baseRate = base12Rates[sec] ?? fallbackBase;
        setRate(g, c, sec, Math.round(baseRate * cm * gaugeMultiplier));
      });
    });
  });

  // Specific adjustments for 1.6mm DULL from Android App
  const exact16Dull: Record<string, number> = {
    DC30C: 815, DC26C: 955, DC30F: 909, DC26F: 1047,
    M23: 443, M24: 495, M28: 532, D29: 351,
    D54A: 482, D51A: 557, D50: 705, D50A: 582,
    D59A: 674, D46: 1085,
  };
  Object.entries(exact16Dull).forEach(([sec, rate]) => {
    setRate('1.6', 'DULL', sec, rate);
  });

  return mergeDgSeriesRates(root);
}

export interface DgScannedRateItem {
  sec: string;
  fullCode: string;
  gauge: string;
  rates: {
    DULL: number;
    BROWN: number;
    H23: number;
    'PC-RAL': number;
    BLACK: number;
    SAHARA: number;
    'WOOD COAT': number;
  };
}

// Ground truth extracted directly from User Scanned Official DG.SERIES Rate Sheet (Effected from 03-April)
export const DG_SERIES_SCANNED_RATES: DgScannedRateItem[] = [
  { sec: 'DG.26F', fullCode: 'DG.26F 1.6M', gauge: '1.6', rates: { DULL: 1231, BROWN: 1319, H23: 1233, 'PC-RAL': 1233, BLACK: 1381, SAHARA: 1319, 'WOOD COAT': 1541 } },
  { sec: 'DG.26F', fullCode: 'DG.26F 2MM', gauge: '2', rates: { DULL: 1482, BROWN: 1588, H23: 1484, 'PC-RAL': 1484, BLACK: 1662, SAHARA: 1588, 'WOOD COAT': 1855 } },
  { sec: 'DG.26', fullCode: 'DG.26', gauge: '1.2', rates: { DULL: 865, BROWN: 928, H23: 867, 'PC-RAL': 867, BLACK: 971, SAHARA: 928, 'WOOD COAT': 1084 } },
  { sec: 'DG.23', fullCode: 'DG.23', gauge: '1.2', rates: { DULL: 511, BROWN: 549, H23: 513, 'PC-RAL': 513, BLACK: 575, SAHARA: 549, 'WOOD COAT': 641 } },
  { sec: 'DG.28', fullCode: 'DG.28', gauge: '1.2', rates: { DULL: 220, BROWN: 238, H23: 222, 'PC-RAL': 222, BLACK: 249, SAHARA: 238, 'WOOD COAT': 278 } },
  { sec: 'DG.24A', fullCode: 'DG.24A', gauge: '1.2', rates: { DULL: 406, BROWN: 429, H23: 408, 'PC-RAL': 408, BLACK: 470, SAHARA: 429, 'WOOD COAT': 503 } },
  { sec: 'DG.25', fullCode: 'DG.25', gauge: '1.2', rates: { DULL: 181, BROWN: 202, H23: 185, 'PC-RAL': 185, BLACK: 221, SAHARA: 202, 'WOOD COAT': 250 } },
  { sec: 'DG.23A', fullCode: 'DG.23A', gauge: '1.2', rates: { DULL: 570, BROWN: 612, H23: 572, 'PC-RAL': 572, BLACK: 641, SAHARA: 612, 'WOOD COAT': 715 } },
  { sec: 'DG.29', fullCode: 'DG.29', gauge: '1.2', rates: { DULL: 351, BROWN: 377, H23: 352, 'PC-RAL': 352, BLACK: 394, SAHARA: 377, 'WOOD COAT': 440 } },
  { sec: 'DG.29', fullCode: 'DG.29 2MM', gauge: '2', rates: { DULL: 568, BROWN: 605, H23: 571, 'PC-RAL': 571, BLACK: 635, SAHARA: 605, 'WOOD COAT': 710 } },
  { sec: 'DG.26', fullCode: 'DG.26 2MM', gauge: '2', rates: { DULL: 1349, BROWN: 1446, H23: 1351, 'PC-RAL': 1351, BLACK: 1513, SAHARA: 1446, 'WOOD COAT': 1689 } },
  { sec: 'DG.23', fullCode: 'DG.23 2MM', gauge: '2', rates: { DULL: 757, BROWN: 812, H23: 759, 'PC-RAL': 759, BLACK: 850, SAHARA: 812, 'WOOD COAT': 949 } },
  { sec: 'DG.23A', fullCode: 'DG.23A 2MM', gauge: '2', rates: { DULL: 819, BROWN: 878, H23: 821, 'PC-RAL': 821, BLACK: 920, SAHARA: 878, 'WOOD COAT': 1026 } },
  { sec: 'GSPR.1', fullCode: 'GSPR.1 1.6M', gauge: '1.6', rates: { DULL: 1285, BROWN: 1377, H23: 1287, 'PC-RAL': 1287, BLACK: 1441, SAHARA: 1377, 'WOOD COAT': 1609 } },
  { sec: 'GSPR.1', fullCode: 'GSPR.1 2MM', gauge: '2', rates: { DULL: 1560, BROWN: 1671, H23: 1562, 'PC-RAL': 1562, BLACK: 1749, SAHARA: 1671, 'WOOD COAT': 1953 } },
  { sec: 'GSPR.16', fullCode: 'GSPR.16 1.6M', gauge: '1.6', rates: { DULL: 805, BROWN: 864, H23: 808, 'PC-RAL': 808, BLACK: 909, SAHARA: 864, 'WOOD COAT': 1017 } },
  { sec: 'DG.26', fullCode: 'DG.26 1.6MM', gauge: '1.6', rates: { DULL: 1118, BROWN: 1198, H23: 1120, 'PC-RAL': 1120, BLACK: 1254, SAHARA: 1198, 'WOOD COAT': 1400 } },
  { sec: 'DG.23L', fullCode: 'DG.23L 1.6M', gauge: '1.6', rates: { DULL: 885, BROWN: 942, H23: 888, 'PC-RAL': 888, BLACK: 978, SAHARA: 942, 'WOOD COAT': 1065 } },
  { sec: 'DG.23', fullCode: 'DG.23 1.6MM', gauge: '1.6', rates: { DULL: 636, BROWN: 683, H23: 638, 'PC-RAL': 638, BLACK: 715, SAHARA: 683, 'WOOD COAT': 798 } },
  { sec: 'DG.3', fullCode: 'DG.3', gauge: '1.2', rates: { DULL: 136, BROWN: 147, H23: 137, 'PC-RAL': 137, BLACK: 153, SAHARA: 147, 'WOOD COAT': 171 } },
  { sec: 'DG.31', fullCode: 'DG.31', gauge: '1.2', rates: { DULL: 373, BROWN: 403, H23: 377, 'PC-RAL': 377, BLACK: 424, SAHARA: 403, 'WOOD COAT': 472 } },
  { sec: 'DG.23A', fullCode: 'DG.23A 1.6M', gauge: '1.6', rates: { DULL: 689, BROWN: 739, H23: 691, 'PC-RAL': 691, BLACK: 774, SAHARA: 739, 'WOOD COAT': 864 } },
];

export function mergeDgSeriesRates(
  currentRates: Record<string, Record<string, Record<string, number>>> = {}
): Record<string, Record<string, Record<string, number>>> {
  const merged: Record<string, Record<string, Record<string, number>>> = JSON.parse(
    JSON.stringify(currentRates || {})
  );

  const applyRate = (gauge: string, color: string, code: string, rate: number) => {
    if (!merged[gauge]) merged[gauge] = {};
    if (!merged[gauge][color]) merged[gauge][color] = {};
    merged[gauge][color][code] = rate;
  };

  // Ensure all standard gauges exist
  GAUGES.forEach((g) => {
    if (!merged[g]) merged[g] = {};
  });

  // Apply ground-truth rates for all items across colors, gauges and code aliases
  DG_SERIES_SCANNED_RATES.forEach((item) => {
    const codes = Array.from(
      new Set([
        item.sec,
        item.fullCode,
        item.sec.replace(/\./g, ''), // e.g. DG26
        item.fullCode.replace(/\./g, ''),
      ])
    );

    const primaryGauge = item.gauge; // '1.2', '1.6', or '2'

    // Multipliers for other gauges based on ratio to primaryGauge
    const gaugeFactors: Record<string, number> = {
      '1.2': primaryGauge === '1.2' ? 1.0 : primaryGauge === '1.6' ? 0.78 : 0.65,
      '1.4': primaryGauge === '1.6' ? 0.88 : primaryGauge === '2' ? 0.74 : 1.15,
      '1.5': primaryGauge === '1.6' ? 0.94 : primaryGauge === '2' ? 0.79 : 1.21,
      '1.6': primaryGauge === '1.6' ? 1.0 : primaryGauge === '2' ? 0.83 : 1.28,
      '2': primaryGauge === '2' ? 1.0 : primaryGauge === '1.6' ? 1.21 : 1.55,
      '2.5': primaryGauge === '2' ? 1.2 : 1.85,
      '2.75': primaryGauge === '2' ? 1.3 : 2.0,
      '2.85': primaryGauge === '2' ? 1.35 : 2.08,
      '3': primaryGauge === '2' ? 1.42 : 2.15,
      '3.2': primaryGauge === '2' ? 1.5 : 2.3,
      '3.5': primaryGauge === '2' ? 1.6 : 2.45,
      '3.8': primaryGauge === '2' ? 1.7 : 2.65,
      '4': primaryGauge === '2' ? 1.8 : 2.8,
      '6': primaryGauge === '2' ? 2.5 : 3.8,
      Std: 1.0,
    };

    GAUGES.forEach((g) => {
      const factor = g === primaryGauge ? 1.0 : gaugeFactors[g] ?? 1.0;
      codes.forEach((code) => {
        // Direct colors from rate sheet
        applyRate(g, 'DULL', code, Math.round(item.rates.DULL * factor));
        applyRate(g, 'BROWN', code, Math.round(item.rates.BROWN * factor));
        applyRate(g, 'H.23', code, Math.round(item.rates.H23 * factor));
        applyRate(g, 'H23', code, Math.round(item.rates.H23 * factor));
        applyRate(g, 'PC-RAL', code, Math.round(item.rates['PC-RAL'] * factor));
        applyRate(g, 'BLACK', code, Math.round(item.rates.BLACK * factor));
        applyRate(g, 'SAHARA', code, Math.round(item.rates.SAHARA * factor));
        applyRate(g, 'WOOD COAT', code, Math.round(item.rates['WOOD COAT'] * factor));
        applyRate(g, 'CHAMPAGNE', code, Math.round(item.rates.H23 * 1.04 * factor));

        // Combined / legacy color chip aliases
        applyRate(g, 'H23/PC-RAL', code, Math.round(item.rates.H23 * factor));
        applyRate(g, 'SAHARA/BROWN', code, Math.round(item.rates.BROWN * factor));
        applyRate(g, 'BLACK/MULTI', code, Math.round(item.rates.BLACK * factor));
        applyRate(g, 'MULTI', code, Math.round(item.rates.BLACK * factor));
        applyRate(g, 'NATURAL', code, Math.round(item.rates.DULL * factor));
        applyRate(g, 'D.SHINE', code, Math.round(item.rates.H23 * factor));
        applyRate(g, 'SS DESIGNER', code, Math.round(item.rates.BLACK * factor));
        applyRate(g, 'ANODIZED', code, Math.round(item.rates.DULL * factor));
      });
    });
  });

  return merged;
}

export function getClearedZeroRates(
  sectionsList: string[] = DEFAULT_SECTIONS,
  colorsList: string[] = DEFAULT_COLORS
): Record<string, Record<string, Record<string, number>>> {
  const root: Record<string, Record<string, Record<string, number>>> = {};
  GAUGES.forEach((g) => {
    root[g] = {};
    colorsList.forEach((c) => {
      root[g][c] = {};
      sectionsList.forEach((sec) => {
        root[g][c][sec] = 0;
      });
    });
  });
  return root;
}

export function getInitialGlassRates(): Record<string, Record<string, number>> {
  return {
    '5': {
      CLEAR: 220,
      GREEN: 240,
      BLUE: 250,
      BRONZE: 250,
      GREY: 250,
      REFLECTIVE: 290,
    },
    '8': {
      CLEAR: 340,
      GREEN: 370,
      BLUE: 390,
      BRONZE: 390,
      GREY: 390,
      REFLECTIVE: 430,
      FROSTED: 410,
    },
    DG: {
      CLEAR: 450,
      GREEN: 480,
      BLUE: 500,
      FROSTED: 650,
    },
  };
}

export function mergeGlassRatesWithDefaults(
  incoming?: Record<string, Record<string, number>> | null
): Record<string, Record<string, number>> {
  const defaults = getInitialGlassRates();
  const next: Record<string, Record<string, number>> = {
    '5': { ...defaults['5'] },
    '8': { ...defaults['8'] },
    DG: { ...defaults.DG },
  };
  if (incoming && typeof incoming === 'object') {
    Object.entries(incoming).forEach(([gaugeKey, colMap]) => {
      if (!colMap || typeof colMap !== 'object' || Object.keys(colMap).length === 0) return;
      const normalizedKey =
        gaugeKey.trim().toUpperCase() === 'DG' ? 'DG' : gaugeKey.trim();
      next[normalizedKey] = {
        ...(next[normalizedKey] || {}),
        ...colMap,
      };
    });
  }
  return next;
}

export function mergeAvailableColorsWithDefaults(colors?: string[] | null): string[] {
  const set = new Set<string>();
  const addClean = (val: string) => {
    const clean = String(val || '').trim().toUpperCase();
    if (clean) set.add(clean);
  };
  (colors || []).forEach(addClean);
  REQUIRED_DEFAULT_FINISH_COLORS.forEach(addClean);
  return Array.from(set);
}

export function resolveSectionRate(
  rates: Record<string, Record<string, Record<string, number>>> | undefined,
  gauge: string,
  color: string,
  section: string
): number {
  if (!rates || !section) return 0;
  const col = String(color || 'DULL').trim().toUpperCase();
  const colorCandidates = Array.from(
    new Set(
      [
        col,
        col === 'H.23' ? 'H23' : col === 'H23' ? 'H.23' : '',
        col.replace(/\./g, ''),
        col === 'H.23' || col === 'H23' || col === 'PC-RAL' ? 'H23/PC-RAL' : '',
        col === 'SAHARA' || col === 'BROWN' ? 'SAHARA/BROWN' : '',
        col === 'BLACK' || col === 'MULTI' ? 'BLACK/MULTI' : '',
        'DULL',
      ].filter(Boolean)
    )
  );
  const secCandidates = Array.from(
    new Set([section, section.replace(/\./g, '')].filter(Boolean))
  );
  const gaugeCandidates = Array.from(new Set([gauge, '1.6', '1.2'].filter(Boolean)));

  for (const g of gaugeCandidates) {
    const gMap = rates[g];
    if (!gMap) continue;
    for (const c of colorCandidates) {
      const cMap = gMap[c];
      if (!cMap) continue;
      for (const s of secCandidates) {
        if (typeof cMap[s] === 'number') {
          return cMap[s];
        }
      }
    }
  }
  return 0;
}

export function getDefaultWindowFormula(): WindowFormulaSettings {
  return {
    m23HeightDeduction: { inch: 1, sutar: 6 }, // 1" 6 sutar (1.75")
    m24WidthDeduction: { inch: 6, sutar: 2 }, // 6" 2 sutar (6.25")
    m24Panels: 2,
    d29HeightDeduction: { inch: 1, sutar: 6 },
    d29WidthDeduction: { inch: 6, sutar: 2 },
    d29WidthOverlap: { inch: 3, sutar: 2 }, // +3" 2 sutar
    d29Panels: 2,
    m23ApplyTo: 'H',
    m23Qty: 2,
    m28ApplyTo: 'H',
    m28Qty: 2,
    m24ApplyTo: 'W',
    m24Qty: 4,
    d29ApplyTo: 'both',
    d29HeightQty: 2,
    d29WidthQty: 2,
    // 3-Palay
    m24WidthCenterDeduction3: { inch: 0, sutar: 0 }, // W / 2
    m24WidthSidesDeduction3: { inch: 2, sutar: 0 }, // (W - 2") / 4 (16 sutar)
    m24WidthDeduction3: { inch: 6, sutar: 2 },
    m24WidthOverlap3: { inch: 0, sutar: 0 },
    m23Qty3: 2,
    m28Qty3: 4,
    m24Qty3: 6,
    d29WidthDeduction3: { inch: 6, sutar: 2 },
    d29WidthOverlap3: { inch: 3, sutar: 2 }, // +3" 2 sutar
    d29Panels3: 3,
    d29HeightQty3: 4,
    d29WidthQty3: 4,
    d29HeightDeduction3: { inch: 1, sutar: 6 },
    // 4-Palay
    m24WidthDeduction4: { inch: 11, sutar: 4 }, // 11" 4 sutar (11.5")
    m23Qty4: 4,
    m28Qty4: 4,
    m24Qty4: 8,
    d29WidthDeduction4: { inch: 6, sutar: 2 },
    d29WidthOverlap4: { inch: 3, sutar: 2 }, // +3" 2 sutar
    d29Panels4: 4,
    d29HeightQty4: 4,
    d29WidthQty4: 4,
    d29HeightDeduction4: { inch: 1, sutar: 6 },
    // Jali Extra & Push Handle & D31
    d29ExtraWidthAdd: { inch: 3, sutar: 2 }, // +3" 2 sutar
    d29PushHandleDeduction: { inch: 1, sutar: 2 }, // -1" 2 sutar
    d31HeightDeduction4: { inch: 2, sutar: 4 }, // H - 2" 4 sutar
  };
}

export function getDefaultDgWindowFormula(): WindowFormulaSettings {
  return {
    m23HeightDeduction: { inch: 1, sutar: 6 }, // DG.23 H deduction
    m24WidthDeduction: { inch: 0, sutar: 0 }, // 2-Palay + x
    m24Panels: 2,
    d29HeightDeduction: { inch: 1, sutar: 6 },
    d29WidthDeduction: { inch: 0, sutar: 0 },
    d29WidthOverlap: { inch: 0, sutar: 0 },
    d29Panels: 2,
    m23ApplyTo: 'H',
    m23Qty: 4,
    m28ApplyTo: 'H',
    m28Qty: 2,
    m24ApplyTo: 'W',
    m24Qty: 4,
    d29ApplyTo: 'both',
    d29HeightQty: 2,
    d29WidthQty: 2,
    // 3-Palay (+ formula)
    m24WidthCenterDeduction3: { inch: 0, sutar: 0 },
    m24WidthSidesDeduction3: { inch: 0, sutar: 0 },
    m24WidthDeduction3: { inch: 0, sutar: 0 },
    m24WidthOverlap3: { inch: 0, sutar: 0 },
    m23Qty3: 6,
    m28Qty3: 4,
    m24Qty3: 6,
    d29WidthDeduction3: { inch: 0, sutar: 0 },
    d29WidthOverlap3: { inch: 0, sutar: 0 },
    d29Panels3: 3,
    d29HeightQty3: 4,
    d29WidthQty3: 4,
    d29HeightDeduction3: { inch: 1, sutar: 6 },
    // 4-Palay (+ formula)
    m24WidthDeduction4: { inch: 0, sutar: 0 },
    m23Qty4: 8,
    m28Qty4: 4,
    m24Qty4: 8,
    d29WidthDeduction4: { inch: 0, sutar: 0 },
    d29WidthOverlap4: { inch: 0, sutar: 0 },
    d29Panels4: 4,
    d29HeightQty4: 4,
    d29WidthQty4: 4,
    d29HeightDeduction4: { inch: 1, sutar: 6 },
    // Jali & Push Handle & DG.31
    d29ExtraWidthAdd: { inch: 0, sutar: 0 },
    d29PushHandleDeduction: { inch: 1, sutar: 2 },
    d31HeightDeduction4: { inch: 1, sutar: 6 },
  };
}

export function getDefaultSlidingDoorFormula(): SlidingDoorFormulaSettings {
  return {
    m23HeightDeduction: { inch: 1, sutar: 6 },
    m24WidthDeduction: { inch: 6, sutar: 2 },
    m24Panels: 2,
    m23ApplyTo: 'H',
    m23Qty: 2,
    m28ApplyTo: 'H',
    m28Qty: 2,
    m24ApplyTo: 'W',
    m24Qty: 4,
    m24WidthCenterDeduction3: { inch: 0, sutar: 0 },
    m24WidthSidesDeduction3: { inch: 2, sutar: 0 },
    m24WidthDeduction3: { inch: 6, sutar: 2 },
    m24WidthOverlap3: { inch: 0, sutar: 0 },
    m23Qty3: 2,
    m28Qty3: 4,
    m24Qty3: 6,
    m24WidthDeduction4: { inch: 11, sutar: 4 },
    m23Qty4: 4,
    m28Qty4: 4,
    m24Qty4: 8,
    d29ExtraWidthAdd: { inch: 3, sutar: 2 },
    d29PushHandleDeduction: { inch: 1, sutar: 2 },
    d31HeightDeduction4: { inch: 2, sutar: 4 },
  };
}

export function getDefaultCategoryFormula(kind: 'door' | 'fix' | 'openwin' = 'door'): FormulaCategorySettings {
  if (kind === 'fix') {
    return {
      outerQtyH: 2,
      outerQtyW: 2,
      outerDeductH: { inch: 0, sutar: 0 },
      outerDeductW: { inch: 0, sutar: 0 },
      formulas: {
        D41: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D59: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D52: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D50: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D46: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
      },
      acc: {
        D41: { enabled: true, which: 'D41', applyTo: 'both', qty: 2, qtyH: 2, qtyW: 2 },
        D59: { enabled: false, which: 'D59A', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
        D52: { enabled: false, which: 'D52', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
        D50: { enabled: false, which: 'D50', applyTo: 'both', qty: 0, qtyH: 0, qtyW: 0 },
        D46: { enabled: false, which: 'D46', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
      },
    };
  }
  if (kind === 'openwin') {
    return {
      outerQtyH: 2,
      outerQtyW: 2,
      outerDeductH: { inch: 0, sutar: 0 },
      outerDeductW: { inch: 0, sutar: 0 },
      formulas: {
        D41: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D59: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D52: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D50: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
        D46: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
      },
      acc: {
        D41: { enabled: true, which: 'D41', applyTo: 'both', qty: 2, qtyH: 2, qtyW: 2 },
        D50: { enabled: true, which: 'D50', applyTo: 'both', qty: 2, qtyH: 2, qtyW: 2 },
        D59: { enabled: false, which: 'D59A', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
        D52: { enabled: false, which: 'D52', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
        D46: { enabled: false, which: 'D46', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
      },
    };
  }
  return {
    outerQtyH: 2,
    outerQtyW: 1,
    outerDeductH: { inch: 0, sutar: 0 },
    outerDeductW: { inch: 0, sutar: 0 },
    formulas: {
      D41: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
      D59: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
      D52: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
      D50: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
      D46: { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } },
    },
    acc: {
      D41: { enabled: true, which: 'D41', applyTo: 'both', qty: 2, qtyH: 2, qtyW: 2 },
      D50: { enabled: true, which: 'D50', applyTo: 'both', qty: 2, qtyH: 2, qtyW: 1 },
      D46: { enabled: true, which: 'D46', applyTo: 'W', qty: 1, qtyH: 0, qtyW: 1 },
      D52: { enabled: false, which: 'D52', applyTo: 'W', qty: 1, qtyH: 0, qtyW: 1 },
      D59: { enabled: false, which: 'D59A', applyTo: 'W', qty: 0, qtyH: 0, qtyW: 0 },
    },
  };
}

export function getDefaultFSectionFormula(): FSectionFormula {
  return {
    enabled: true,
    applyTo: 'both',
    heightDim: { inch: 2, sutar: 3 }, // +2" 3 sutar (2.375")
    widthDim: { inch: 2, sutar: 3 },
    heightIsAdd: true,
    widthIsAdd: true,
    qtyH: 2,
    qtyW: 2,
  };
}

export function getDefaultGlassFormulas(): Record<string, GlassFormula> {
  const base: GlassFormula = {
    marginH: 1,
    marginW: 1,
    panels: 1,
    marginHSutar: 0,
    marginWSutar: 0,
    slidingHeightDeductionInch: 5,
    slidingHeightDeductionSutar: 5, // 5" 5 sutar
    slidingWidthAddToM24Inch: 0,
    slidingWidthAddToM24Sutar: 5, // +5 sutar
  };
  return {
    window: { ...base, panels: 2 },
    dgwindow: { ...base, panels: 2 },
    door: { ...base, panels: 1 },
    fix: { ...base, panels: 1 },
    openwin: { ...base, panels: 1 },
    slidingdoor: { ...base, panels: 2 },
  };
}

export function getStarterDynamicSections(): DynamicMasterSection[] {
  return [
    {
      id: 'dyn-1',
      code: 'CW50-MULLION',
      title: 'Curtain Wall Mullion 50mm',
      category: 'Curtain Wall',
      defaultGauge: '1.6',
      defaultColor: 'DULL',
      defaultRate: 850,
      weightPerFoot: 0.95,
      formulaWidthDeduction: 0,
      formulaHeightDeduction: 0,
      glassMarginW: 2.25,
      glassMarginH: 2.25,
      heightFormula: 'H',
      widthFormula2Panel: 'W / 2',
      widthFormula3Panel: 'W / 3',
      widthFormula4Panel: 'W / 4',
      glassHeightFormula: 'H - 2.25',
      glassWidthFormula: '(W - 4.5) / 2',
      m24Formula: '(W - 6.25) / 2',
      m24aFormula: 'H - 1.75',
      d29HeightFormula: 'H - 1.75',
      d29WidthFormula: '(W - 6.25) / 2 + 3.25',
      lockFormula: 'LATCH',
      isCuttingEnabled: true,
      isGlassEnabled: true,
      accessoriesRequired: ['D41'],
      notes: 'Vertical structural mullion for commercial facades',
      isActive: true,
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'dyn-2',
      code: 'CW50-TRANSOM',
      title: 'Curtain Wall Transom 50mm',
      category: 'Curtain Wall',
      defaultGauge: '1.6',
      defaultColor: 'DULL',
      defaultRate: 820,
      weightPerFoot: 0.85,
      formulaWidthDeduction: 4.0,
      formulaHeightDeduction: 0,
      glassMarginW: 2.25,
      glassMarginH: 2.25,
      heightFormula: 'H',
      widthFormula2Panel: '(W - 4.0) / 2',
      widthFormula3Panel: '(W - 6.0) / 3',
      widthFormula4Panel: '(W - 8.0) / 4',
      glassHeightFormula: 'H - 2.25',
      glassWidthFormula: '(W - 4.5) / 2',
      m24Formula: '',
      m24aFormula: '',
      d29HeightFormula: '',
      d29WidthFormula: '',
      lockFormula: 'LATCH',
      isCuttingEnabled: true,
      isGlassEnabled: true,
      accessoriesRequired: [],
      notes: 'Horizontal framing member between mullions',
      isActive: true,
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'dyn-3',
      code: 'TH70-FRAME',
      title: 'Thermal Break Outer Frame 70mm',
      category: 'Thermal Break',
      defaultGauge: '2',
      defaultColor: 'SAHARA/BROWN',
      defaultRate: 950,
      weightPerFoot: 1.1,
      formulaWidthDeduction: 0,
      formulaHeightDeduction: 0,
      glassMarginW: 2.5,
      glassMarginH: 2.5,
      heightFormula: 'H + 2.375',
      widthFormula2Panel: 'W + 2.375',
      widthFormula3Panel: 'W + 2.375',
      widthFormula4Panel: 'W + 2.375',
      glassHeightFormula: 'H - 5.625',
      glassWidthFormula: '(W - 6.25) / 2 + 0.625',
      m24Formula: '(W - 6.25) / 2',
      m24aFormula: 'H - 1.75',
      d29HeightFormula: 'H - 1.75',
      d29WidthFormula: '(W - 6.25) / 2 + 3.25',
      lockFormula: 'PUSH_HANDLE',
      isCuttingEnabled: true,
      isGlassEnabled: true,
      accessoriesRequired: ['M23', 'M28', 'M24', 'D29'],
      notes: 'Heavy insulated thermal break sliding frame',
      isActive: true,
      createdAt: Date.now() - 86400000 * 2,
    },
  ];
}

export function makeDemoDocumentSvgDataUrl(
  type: 'CNIC_FRONT' | 'CNIC_BACK' | 'PAYMENT_RECEIPT' | 'SHOP_PHOTO',
  name: string,
  cnic: string,
  phone: string,
  extraText: string
): string {
  const bg =
    type === 'CNIC_FRONT' || type === 'CNIC_BACK'
      ? '#0F2922'
      : type === 'PAYMENT_RECEIPT'
      ? '#0F1E36'
      : '#1E1A10';
  const border =
    type === 'CNIC_FRONT' || type === 'CNIC_BACK'
      ? '#10B981'
      : type === 'PAYMENT_RECEIPT'
      ? '#38BDF8'
      : '#F5B738';
  const header =
    type === 'CNIC_FRONT'
      ? 'ISLAMIC REPUBLIC OF PAKISTAN · NADRA CNIC (FRONT)'
      : type === 'CNIC_BACK'
      ? 'NADRA NATIONAL IDENTITY CARD · (BACK & QR)'
      : type === 'PAYMENT_RECEIPT'
      ? 'EASYPAISA / BANKISLAMI VERIFIED TRANSFER RECEIPT'
      : 'FABRICATOR SHOP & WORKSHOP PHOTO UPLOAD';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="320" viewBox="0 0 540 320">
    <rect width="540" height="320" rx="18" fill="${bg}" stroke="${border}" stroke-width="3"/>
    <rect x="16" y="16" width="508" height="44" rx="8" fill="#090D14" opacity="0.85"/>
    <text x="30" y="43" fill="#F5B738" font-family="monospace" font-size="14" font-weight="bold">${header}</text>
    <rect x="24" y="80" width="96" height="112" rx="10" fill="#141C28" stroke="${border}" stroke-width="1.5"/>
    <text x="72" y="142" fill="#F5B738" font-family="sans-serif" font-size="34" font-weight="bold" text-anchor="middle">${(name || 'U').charAt(0)}</text>
    <text x="140" y="102" fill="#94A3B8" font-family="sans-serif" font-size="12">Full Name / Account Holder:</text>
    <text x="140" y="122" fill="#FFFFFF" font-family="sans-serif" font-size="17" font-weight="bold">${name}</text>
    <text x="140" y="152" fill="#94A3B8" font-family="sans-serif" font-size="12">CNIC / ID Number:</text>
    <text x="140" y="172" fill="#10B981" font-family="monospace" font-size="16" font-weight="bold">${cnic}</text>
    <text x="140" y="202" fill="#94A3B8" font-family="sans-serif" font-size="12">Mobile Number:</text>
    <text x="140" y="222" fill="#38BDF8" font-family="monospace" font-size="15" font-weight="bold">${phone}</text>
    <rect x="24" y="246" width="492" height="50" rx="8" fill="#090D14" opacity="0.85"/>
    <text x="38" y="276" fill="#E2E8F0" font-family="monospace" font-size="12">${extraText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getStarterIdentities(): IdentityRecord[] {
  const now = Date.now();
  return [
    {
      deviceId: 'DEV-528527AD0AD85E56',
      cnic: '37405-0000000-0',
      phone: '03105524225',
      email: 'ssaboor2t@gmail.com',
      name: 'Syed Saboor Nawab (Owner)',
      shopAddress: 'Boss Aluminium & Glass HQ, Main Market, Pakistan',
      ipAddress: '103.255.4.12',
      cnicPhotoPath: makeDemoDocumentSvgDataUrl('CNIC_FRONT', 'Syed Saboor Nawab', '37405-0000000-0', '03105524225', 'VIP Owner Master Identity Verified'),
      cnicBackPhotoPath: makeDemoDocumentSvgDataUrl('CNIC_BACK', 'Syed Saboor Nawab', '37405-0000000-0', '03105524225', 'Boss Aluminium & Glass HQ, Pakistan'),
      uploadedPhotos: [
        {
          id: 'ph-owner-1',
          title: 'Owner CNIC Front Card',
          category: 'CNIC_FRONT',
          url: makeDemoDocumentSvgDataUrl('CNIC_FRONT', 'Syed Saboor Nawab', '37405-0000000-0', '03105524225', 'VIP Owner Master Identity Verified'),
          uploadedAt: now - 86400000 * 60,
        },
        {
          id: 'ph-owner-2',
          title: 'Owner CNIC Back Card',
          category: 'CNIC_BACK',
          url: makeDemoDocumentSvgDataUrl('CNIC_BACK', 'Syed Saboor Nawab', '37405-0000000-0', '03105524225', 'Address: Boss Aluminium & Glass HQ'),
          uploadedAt: now - 86400000 * 60,
        },
      ],
      trialStartTime: now - 86400000 * 60,
      firstRegisteredAt: now - 86400000 * 60,
      isActivated: true,
      activatedUntil: 0,
      packagePlan: 'LIFETIME_VIP',
      lastPaymentTid: 'OWNER-MASTER-VIP',
      isBlocked: false,
      blockReason: '',
      isLifetimeFree: true,
      latitude: 33.6844,
      longitude: 73.0479,
    },
  ];
}

export function getStarterPackages(): SubscriptionPackage[] {
  return [
    {
      id: 'pkg-1m-3000',
      name: '1 Month Standard Package',
      planCode: 'MONTHLY',
      durationMonths: 1,
      durationLabel: '1 Month (30 Days)',
      priceRs: 3000,
      isLifetime: false,
      isActive: true,
      badgeText: 'Monthly Plan',
      features: [
        'All 9 Cutting, Length, Glass & Quotation Screens',
        'Live Cloud Rate List & Formula Updates',
        'Unlimited PDF & WhatsApp Quotations',
      ],
    },
    {
      id: 'pkg-3m-8000',
      name: '3 Months Pro Package',
      planCode: 'QUARTERLY',
      durationMonths: 3,
      durationLabel: '3 Months (90 Days)',
      priceRs: 8000,
      isLifetime: false,
      isActive: true,
      badgeText: 'Save Rs. 1,000',
      features: [
        '90 Days Full Unlocked Access',
        'AI Rate List Scanner & Cloud Backup',
        'Priority WhatsApp Support',
      ],
    },
    {
      id: 'pkg-6m-16000',
      name: '6 Months Business Package',
      planCode: 'HALF_YEARLY',
      durationMonths: 6,
      durationLabel: '6 Months (180 Days)',
      priceRs: 16000,
      isLifetime: false,
      isActive: true,
      badgeText: 'Save Rs. 2,000',
      features: [
        '180 Days Full Unlocked Access',
        'Custom Company Letterhead & Logo',
        'DG.Windows & Multi-Panel Fabrication Support',
      ],
    },
    {
      id: 'pkg-1y-31000',
      name: '1 Year Enterprise Package',
      planCode: 'YEARLY',
      durationMonths: 12,
      durationLabel: '1 Year (365 Days)',
      priceRs: 31000,
      isLifetime: false,
      isActive: true,
      badgeText: 'Save Rs. 5,000',
      features: [
        '365 Days Full Factory & Showroom Access',
        'Unlimited Quotations, History & Cloud Sync',
        'VIP Technical Support & Custom Profiles',
      ],
    },
    {
      id: 'pkg-lifetime-60000',
      name: 'Lifetime Free VIP Package',
      planCode: 'LIFETIME_VIP',
      durationMonths: 999,
      durationLabel: 'Lifetime Free (Never Expires)',
      priceRs: 60000,
      isLifetime: true,
      isActive: true,
      badgeText: 'One-Time Forever VIP',
      features: [
        'Lifetime Unlimited License — Never Expires',
        'All Future Updates, Themes & AI Scanner Free',
        'VIP Golden Badge & Multi-Device Priority Support',
      ],
    },
  ];
}

export function getDefaultLayoutControlConfig(): ClientAppLayoutControlConfig {
  return {
    enabledTabs: {
      WINDOWS: true,
      DG_WINDOWS: true,
      DOORS: true,
      EXTRA_PIECES: true,
      CUTTING: true,
      LENGTH: true,
      GLASS: true,
      QUOTATION: true,
      HISTORY: true,
      RATES: true,
    },
    lockedTabs: {
      DG_WINDOWS: true,
    },
    tabCustomTitles: {
      WINDOWS: 'Windows',
      DG_WINDOWS: 'DG.Windows',
      DOORS: 'Doors & Frames',
      EXTRA_PIECES: 'Extra Pieces',
      CUTTING: 'Cutting Chart',
      LENGTH: 'Length Chart',
      GLASS: 'Glass Chart',
      QUOTATION: 'Quotation',
      HISTORY: 'History',
      RATES: 'Rates & Settings',
    },
    showMasterGaugeSelector: true,
    showMasterColorSelector: true,
    showMasterFrameSelector: true,
    showMasterGlassSelector: true,
    showThemeStudioButton: true,
    showDoneQuotationButton: true,
    showCompareCFButton: true,
    showDiscountRow: true,
    showHardwareRow: true,
    showTransportRow: true,
    showLabourRow: true,
    showLetterheadBackground: true,
    letterheadOpacity: 0.28,
    letterheadFitMode: 'STRETCH',
    headerStyle: 'USE_PIC_HEADER',
    topHeaderOffset: 26,
    backgroundDarkness: 32,
    watermarkOpacity: 95,
    innerFrameMargin: 14,
    keepFullLetterheadProportions: true,
    sheetFitPreset: 'BEST_FIT',
    backgroundFitStyle: 'FILL',
    contentRowSpacing: 10,
    shopLogoUrl: '',
    quotationFooterTerms:
      '50% Advance Payment at order confirmation · Remaining 50% upon delivery of material · Rates valid for 7 days.',
    quotationSignatureLabel: 'Authorized Signature — Boss Aluminium & Glass',
    serverDrivenFormulasOnly: true,
    enforceDeviceHardwareLock: true,
    autoLockOnSubscriptionExpiry: true,
    blockFormulaAndRateCopy: true,
    requireServerTimeValidation: true,
  };
}

export function getStarterBankAccounts(): BankAccountConfig[] {
  return [
    {
      id: 'bank-easypaisa',
      bankName: 'Easypaisa Wallet',
      accountTitle: 'Syed Saboor Nawab',
      accountNumber: '03105524225',
      ibanOrRaast: '03105524225',
      accountType: 'EASYPAISA',
      monthlyFee: 3000,
      quarterlyFee: 8000,
      autoVerifyEnabled: true,
      isActive: true,
    },
    {
      id: 'bank-islami',
      bankName: 'Bank Islami Pakistan Limited',
      accountTitle: 'Syed Saboor Nawab',
      accountNumber: '300800600380016',
      ibanOrRaast: 'PK64BKIP0300800600380016',
      accountType: 'BANK',
      monthlyFee: 3000,
      quarterlyFee: 8000,
      autoVerifyEnabled: true,
      isActive: true,
    },
    {
      id: 'bank-alfalah',
      bankName: 'Bank Alfalah Limited',
      accountTitle: 'Syed Saboor Nawab',
      accountNumber: 'PK63ALFH0977001008094809',
      ibanOrRaast: 'PK63ALFH0977001008094809',
      accountType: 'BANK',
      monthlyFee: 3000,
      quarterlyFee: 8000,
      autoVerifyEnabled: true,
      isActive: true,
    },
  ];
}
