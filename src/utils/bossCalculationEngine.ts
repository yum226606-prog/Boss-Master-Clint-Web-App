import {
  AluminiumCostRow,
  CutPiece,
  DeductionDim,
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
  OpenableWindowItem,
  PackedBar,
  PackedResult,
  QuotationResult,
  SlidingDoorFormulaSettings,
  SlidingDoorItem,
  TallyInfo,
  WindowFormulaSettings,
  WindowItem,
} from '../types/bossModels';
import { MASTER_PASSCODES, normalizeSectionCode } from './bossDefaultRates';

export const ELEVEN_FT_IN = 132.0; // 11 ft
export const BAR_EXTRA_IN = 1.0; // 1 inch extra stock margin

export function dimToInches(d: DeductionDim): number {
  return (d?.inch || 0) + (d?.sutar || 0) / 8.0;
}

export function calcFHeight(f: FSectionFormula, frameHeight: number): number {
  if (f.applyTo === 'W') return Math.max(0, frameHeight);
  const sign = f.heightIsAdd ? 1.0 : -1.0;
  const offset = dimToInches(f.heightDim) * sign;
  return Math.max(0, frameHeight + offset);
}

export function calcFWidth(f: FSectionFormula, frameWidth: number): number {
  if (f.applyTo === 'H') return Math.max(0, frameWidth);
  const sign = f.widthIsAdd ? 1.0 : -1.0;
  const offset = dimToInches(f.widthDim) * sign;
  return Math.max(0, frameWidth + offset);
}

export function toDotSutar(decIn: number): string {
  if (isNaN(decIn) || !isFinite(decIn)) return '0.0';
  const neg = decIn < 0;
  const v = Math.abs(decIn);
  const sutar = Math.round(v * 8.0);
  const inch = Math.floor(sutar / 8);
  const rem = sutar % 8;
  const s = `${inch}.${rem}`;
  return neg ? `-${s}` : s;
}

export function parseInSutar(raw: string): number {
  const str = String(raw || '').trim();
  if (!str) return 0.0;
  const sign = str.startsWith('-') ? -1.0 : 1.0;
  const body = str.replace(/^[-+]/, '');
  if (/^\d+(?:\.\d+)?$/.test(body)) {
    const parts = body.split('.');
    const inch = parseFloat(parts[0] || '0') || 0;
    const sutRaw = (parts[1] || '0').slice(0, 2);
    const sutar = parseFloat(sutRaw) || 0;
    return sign * (inch + sutar / 8.0);
  }
  return parseFloat(str) || 0.0;
}

export function billFeet(decIn: number): number {
  if (isNaN(decIn) || decIn <= 0) return 0.0;
  const eighths = Math.round(decIn * 8.0);
  const rem = eighths % 48;
  const rounded = rem === 0 ? eighths : eighths - rem + 48;
  return rounded / 96.0;
}

export function barLengthsFor(section: string): number[] {
  const u = String(section || '').toUpperCase().trim();
  const norm = normalizeSectionCode(section);
  const isF =
    /(?:^|[^A-Z0-9])(?:M26F|M30F|DC26F|DC30F|D42F|D51F|D54F|E60F|EC26F|EC30F|DG26F|CW1F)/.test(u) ||
    norm.includes('M26F') ||
    norm.includes('M30F') ||
    norm.includes('DC26F') ||
    norm.includes('DC30F') ||
    norm.includes('DG26F') ||
    norm.endsWith('F');
  if (isF) return [15, 17, 19];
  if (
    norm.startsWith('ANGLE') ||
    norm.startsWith('PIPE') ||
    norm.startsWith('U') ||
    norm.startsWith('PATTI') ||
    norm.startsWith('LOOM') ||
    norm.startsWith('OVALTUBE')
  ) {
    return [12];
  }
  return [14, 16, 18];
}

export function pricingGaugeForSection(section: string, fallbackGauge: string): string {
  const k = normalizeSectionCode(section);
  if (
    k === 'D29' ||
    k === 'D41' ||
    k === 'D31' ||
    k === 'DG29' ||
    k === 'DG31'
  ) {
    return '1.2';
  }
  return fallbackGauge && fallbackGauge.trim() ? fallbackGauge.trim() : '1.2';
}

export function formatDim(inches: number, unit: MeasurementUnit = 'INCH_SUTAR'): string {
  if (isNaN(inches) || !isFinite(inches)) return '0';
  if (unit === 'CM') return `${(inches * 2.54).toFixed(1)} cm`;
  if (unit === 'MM') return `${Math.round(inches * 25.4)} mm`;
  return `${toDotSutar(inches)}"`;
}

export function formatDimValueOnly(inches: number, unit: MeasurementUnit = 'INCH_SUTAR'): string {
  if (isNaN(inches) || !isFinite(inches) || inches <= 0) return '';
  if (unit === 'CM') return (inches * 2.54).toFixed(1);
  if (unit === 'MM') return String(Math.round(inches * 25.4));
  return toDotSutar(inches);
}

export function parseDimToInches(raw: string, unit: MeasurementUnit = 'INCH_SUTAR'): number {
  const str = String(raw || '').trim();
  if (!str) return 0;
  if (unit === 'CM') {
    const v = parseFloat(str.replace(/cm/i, '').trim()) || 0;
    return v / 2.54;
  }
  if (unit === 'MM') {
    const v = parseFloat(str.replace(/mm/i, '').trim()) || 0;
    return v / 25.4;
  }
  return parseInSutar(str);
}

export function unitLabel(unit: MeasurementUnit = 'INCH_SUTAR'): string {
  if (unit === 'CM') return 'cm';
  if (unit === 'MM') return 'mm';
  return 'in.sut';
}

export function evaluateParametricFormula(
  expr: string,
  W: number,
  H: number,
  panels: number = 2,
  M24: number = (W - 6.25) / 2
): number {
  const clean = String(expr || '').trim();
  if (!clean) return 0;
  try {
    const sanitized = clean
      .replace(/\bW\b/gi, String(W))
      .replace(/\bH\b/gi, String(H))
      .replace(/\bP\b/gi, String(panels))
      .replace(/\bM24\b/gi, String(M24));
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return 0;
    const val = Function(`"use strict"; return (${sanitized});`)();
    return typeof val === 'number' && isFinite(val) ? Math.max(0, val) : 0;
  } catch {
    return 0;
  }
}

export function packSection(pieceList: CutPiece[], lengthsFt: number[]): PackedResult {
  const pool: CutPiece[] = [];
  pieceList.forEach((p) => {
    for (let i = 0; i < p.qty; i++) {
      pool.push({ ...p, qty: 1 });
    }
  });
  pool.sort((a, b) => b.length - a.length);

  const lens = [...lengthsFt].sort((a, b) => a - b);
  const maxIn = lens.length > 0 ? Math.max(...lens) * 12.0 + BAR_EXTRA_IN : 0.0;
  const bins: PackedBar[] = [];
  const unfit: CutPiece[] = [];

  while (pool.length > 0) {
    const item = pool.shift()!;
    const len = item.length;
    if (len > maxIn + 1e-6) {
      unfit.push(item);
      continue;
    }
    let bestIdx = -1;
    let bestRemain = Number.MAX_VALUE;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      if (b.remainInches >= len - 1e-6 && b.remainInches - len < bestRemain) {
        bestIdx = i;
        bestRemain = b.remainInches - len;
      }
    }
    if (bestIdx >= 0) {
      const b = bins[bestIdx];
      bins[bestIdx] = {
        ...b,
        remainInches: b.remainInches - len,
        pieces: [...b.pieces, item],
      };
      continue;
    }

    let bestSl = lens[0] ?? 14;
    let bestUtil = -1.0;
    let bestFit: CutPiece[] = [];

    for (const L of lens) {
      const cap = L * 12.0 + BAR_EXTRA_IN;
      if (cap < len - 1e-6) continue;
      let rem = cap - len;
      let used = len;
      const fit: CutPiece[] = [];
      for (const p of pool) {
        if (p.length <= rem + 1e-6) {
          rem -= p.length;
          used += p.length;
          fit.push(p);
        }
      }
      const util = used / cap;
      if (util > bestUtil + 1e-9 || (Math.abs(util - bestUtil) <= 1e-9 && fit.length > bestFit.length)) {
        bestUtil = util;
        bestSl = L;
        bestFit = [...fit];
      }
    }

    const piecesInBin: CutPiece[] = [item];
    let rem = bestSl * 12.0 + BAR_EXTRA_IN - len;
    bestFit.forEach((p) => {
      rem -= p.length;
      piecesInBin.push(p);
      const idx = pool.indexOf(p);
      if (idx >= 0) pool.splice(idx, 1);
    });
    bins.push({
      lenFt: bestSl,
      isCustom: false,
      remainInches: rem,
      pieces: piecesInBin,
    });
  }

  // Apply <= 11ft offcut rule
  const finalBins: PackedBar[] = bins.map((b) => {
    const content = b.pieces.reduce((acc, it) => acc + it.length, 0);
    if (content <= ELEVEN_FT_IN) {
      const customLenFt = Math.max(1, Math.ceil(content / 12.0));
      return {
        ...b,
        lenFt: customLenFt,
        isCustom: true,
        remainInches: customLenFt * 12.0 - content,
      };
    }
    return b;
  });

  const tally: Record<number, TallyInfo> = {};
  finalBins.forEach((b) => {
    const cur = tally[b.lenFt];
    if (!cur) {
      tally[b.lenFt] = { count: 1, isCustom: b.isCustom };
    } else {
      tally[b.lenFt] = { count: cur.count + 1, isCustom: cur.isCustom || b.isCustom };
    }
  });

  return { tally, unfit, bins: finalBins };
}

export function computeSlidingWindowPieces(
  w: WindowItem,
  overrideFrameType: string | null,
  formula: WindowFormulaSettings,
  fFormula: FSectionFormula
): CutPiece[] {
  const ft = (overrideFrameType ?? (w.frameType.trim() ? w.frameType : 'C')).trim();
  const isCustom = ft !== 'C' && ft !== 'F' && ft !== '';
  const isF = isCustom ? ft.toUpperCase().endsWith('F') : ft.toUpperCase() === 'F';
  const c = isF ? 'F' : 'C';
  const h = w.height;
  const width = w.width;
  const q = Math.max(1, w.qty);
  const pieces: CutPiece[] = [];
  const src = 'Window';
  const g = w.sectionGauge;

  const isPair = ft.includes('/');
  const topSec = isPair ? ft.split('/')[0].trim() : isCustom ? ft : `DC30${c}`;
  const botSec = isPair
    ? ft.split('/')[1]?.trim() || ft.split('/')[0].trim()
    : isCustom
    ? ft
    : `DC26${c}`;

  if (isF && fFormula.enabled) {
    const hLen = calcFHeight(fFormula, h);
    const hQty = fFormula.qtyH ?? 2;
    if (hQty > 0) {
      pieces.push({ section: topSec, length: hLen, qty: hQty * q, source: src, label: 'Frame side F (Height)', gauge: g });
    }
    const wLen = calcFWidth(fFormula, width);
    const wQtyTotal = fFormula.qtyW ?? 2;
    if (wQtyTotal > 0) {
      const wTopQty = Math.floor(wQtyTotal / 2);
      const wBotQty = wQtyTotal - wTopQty;
      if (wTopQty > 0) {
        pieces.push({ section: topSec, length: wLen, qty: wTopQty * q, source: src, label: 'Frame top F (Width)', gauge: g });
      }
      if (wBotQty > 0) {
        pieces.push({ section: botSec, length: wLen, qty: wBotQty * q, source: src, label: 'Frame bottom F (Width)', gauge: g });
      }
    }
  } else {
    pieces.push({ section: topSec, length: h, qty: 2 * q, source: src, label: 'Frame side (Height)', gauge: g });
    pieces.push({ section: topSec, length: width, qty: 1 * q, source: src, label: 'Frame top (Width)', gauge: g });
    pieces.push({ section: botSec, length: width, qty: 1 * q, source: src, label: 'Frame bottom (Width)', gauge: g });
  }

  const panels = Math.min(4, Math.max(2, w.panelCount));
  const sashH = Math.max(0, h - dimToInches(formula.m23HeightDeduction));
  const m24Deduction =
    panels === 3
      ? dimToInches(formula.m24WidthDeduction3)
      : panels === 4
      ? dimToInches(formula.m24WidthDeduction4)
      : dimToInches(formula.m24WidthDeduction);
  const sashW = Math.max(0, (width - m24Deduction) / panels);

  // M23 Sash
  const m23Apply = formula.m23ApplyTo;
  const m23Pcs = Math.max(
    0,
    panels === 3
      ? (formula.m23Qty3 ?? 2)
      : panels === 4
      ? (formula.m23Qty4 ?? 4)
      : (formula.m23Qty ?? 2)
  );

  if (m23Pcs > 0) {
    if (m23Apply === 'H' || m23Apply === 'both') {
      pieces.push({ section: 'M23', length: sashH, qty: m23Pcs * q, source: src, label: 'Sash height (M23)', gauge: g });
    }
    if (m23Apply === 'W' || m23Apply === 'both') {
      pieces.push({ section: 'M23', length: sashW, qty: m23Pcs * q, source: src, label: 'Sash width (M23)', gauge: g });
    }
  }

  // M28 Sash
  const m28Apply = formula.m28ApplyTo;
  const m28Pcs = Math.max(
    0,
    panels === 3
      ? (formula.m28Qty3 ?? 4)
      : panels === 4
      ? (formula.m28Qty4 ?? 4)
      : (formula.m28Qty ?? 2)
  );

  if (m28Pcs > 0) {
    if (m28Apply === 'H' || m28Apply === 'both') {
      pieces.push({ section: 'M28', length: sashH, qty: m28Pcs * q, source: src, label: 'Sash height (M28)', gauge: g });
    }
    if (m28Apply === 'W' || m28Apply === 'both') {
      pieces.push({ section: 'M28', length: sashW, qty: m28Pcs * q, source: src, label: 'Sash width (M28)', gauge: g });
    }
  }

  // M24 & M24A Sash (Reads live formula settings!)
  const defaultM24 =
    panels === 3
      ? (formula.m24Qty3 ?? 6)
      : panels === 4
      ? (formula.m24Qty4 ?? 8)
      : (formula.m24Qty ?? 4);
  const m24Pcs = w.m24Qty >= 0 ? w.m24Qty : defaultM24;
  const m24Apply = formula.m24ApplyTo;

  if (panels === 3) {
    const centerDed = dimToInches(formula.m24WidthCenterDeduction3);
    const sidesDed = dimToInches(formula.m24WidthSidesDeduction3);
    const sashWCenter = Math.max(0, (width - centerDed) / 2.0);
    const sashWSides = Math.max(0, (width - sidesDed) / 4.0);

    if (m24Pcs > 0) {
      if (m24Apply === 'W' || m24Apply === 'both') {
        const centerPcs = m24Pcs === 6 ? 2 : Math.max(1, Math.floor(m24Pcs / 3));
        const sidesPcs = m24Pcs === 6 ? 4 : Math.max(0, m24Pcs - centerPcs);
        if (centerPcs > 0) {
          pieces.push({ section: 'M24', length: sashWCenter, qty: centerPcs * q, source: src, label: 'M24 Center width', gauge: g });
        }
        if (sidesPcs > 0) {
          pieces.push({ section: 'M24', length: sashWSides, qty: sidesPcs * q, source: src, label: 'M24 Sides width', gauge: g });
        }
      }
      if (m24Apply === 'H' || m24Apply === 'both') {
        pieces.push({ section: 'M24', length: sashH, qty: m24Pcs * q, source: src, label: 'Sash height (M24)', gauge: g });
      }
    }
    if (w.m24aQty > 0) {
      const centerPcsA = w.m24aQty === 6 ? 2 : Math.max(1, Math.floor(w.m24aQty / 3));
      const sidesPcsA = w.m24aQty === 6 ? 4 : Math.max(0, w.m24aQty - centerPcsA);
      if (centerPcsA > 0) {
        pieces.push({ section: 'M24A', length: sashWCenter, qty: centerPcsA * q, source: src, label: 'M24A Center width', gauge: g });
      }
      if (sidesPcsA > 0) {
        pieces.push({ section: 'M24A', length: sashWSides, qty: sidesPcsA * q, source: src, label: 'M24A Sides width', gauge: g });
      }
    }
  } else {
    const sashWEff =
      panels === 2
        ? Math.max(0, (width - dimToInches(formula.m24WidthDeduction)) / 2.0)
        : panels === 4
        ? Math.max(0, (width - dimToInches(formula.m24WidthDeduction4)) / 4.0)
        : sashW;

    if (m24Pcs > 0) {
      if (m24Apply === 'W' || m24Apply === 'both') {
        pieces.push({ section: 'M24', length: sashWEff, qty: m24Pcs * q, source: src, label: 'M24 width', gauge: g });
      }
      if (m24Apply === 'H' || m24Apply === 'both') {
        pieces.push({ section: 'M24', length: sashH, qty: m24Pcs * q, source: src, label: 'Sash height (M24)', gauge: g });
      }
    }
    if (w.m24aQty > 0) {
      pieces.push({ section: 'M24A', length: sashWEff, qty: w.m24aQty * q, source: src, label: 'M24A width', gauge: g });
    }
  }

  // D29 Jali (Net Screen)
  const jaliHDedDim =
    panels === 3
      ? (formula.d29HeightDeduction3 ?? formula.m23HeightDeduction)
      : panels === 4
      ? (formula.d29HeightDeduction4 ?? formula.m23HeightDeduction)
      : (formula.d29HeightDeduction ?? formula.m23HeightDeduction);
  const jaliH = Math.max(0, h - dimToInches(jaliHDedDim));
  const m24ForJali =
    panels === 3
      ? Math.max(0, (width - dimToInches(formula.m24WidthSidesDeduction3)) / 4.0)
      : panels === 4
      ? Math.max(0, (width - dimToInches(formula.m24WidthDeduction4)) / 4.0)
      : Math.max(0, (width - dimToInches(formula.m24WidthDeduction)) / 2.0);

  const d29ExtraW = dimToInches(
    formula.d29ExtraWidthAdd ??
      (panels === 3
        ? formula.d29WidthOverlap3
        : panels === 4
        ? formula.d29WidthOverlap4
        : formula.d29WidthOverlap) ?? { inch: 0, sutar: 0 }
  );
  let jaliW = Math.max(0, m24ForJali + d29ExtraW);
  if (w.lockType === 'PUSH_HANDLE') {
    jaliW = Math.max(0, jaliW - dimToInches(formula.d29PushHandleDeduction));
  }

  const defaultD29H =
    panels === 3
      ? (formula.d29HeightQty3 ?? 4)
      : panels === 4
      ? (formula.d29HeightQty4 ?? 4)
      : (formula.d29HeightQty ?? 2);
  const defaultD29W =
    panels === 3
      ? (formula.d29WidthQty3 ?? 4)
      : panels === 4
      ? (formula.d29WidthQty4 ?? 4)
      : (formula.d29WidthQty ?? 2);
  const d29HPcs = w.d29HeightQty >= 0 ? w.d29HeightQty : defaultD29H;
  const d29WPcs = w.d29WidthQty >= 0 ? w.d29WidthQty : defaultD29W;
  const jaliWLabel = w.lockType === 'PUSH_HANDLE' ? 'Jali width (D29) [Push Handle]' : 'Jali width (D29)';

  if (d29HPcs > 0) {
    pieces.push({ section: 'D29', length: jaliH, qty: d29HPcs * q, source: src, label: 'Jali height (D29)', gauge: '1.2' });
  }
  if (d29WPcs > 0) {
    pieces.push({ section: 'D29', length: jaliW, qty: d29WPcs * q, source: src, label: jaliWLabel, gauge: '1.2' });
  }

  // D31 Interlock for 4-Palay
  if (panels === 4) {
    const d31Ded = dimToInches(formula.d31HeightDeduction4 ?? { inch: 0, sutar: 0 });
    const d31H = Math.max(0, h - d31Ded);
    pieces.push({ section: 'D31', length: d31H, qty: 1 * q, source: src, label: 'D31 Height (4-Palay)', gauge: '1.2' });
  }

  // Evaluate any custom per-section Height & Width formula boxes added in Window Formulas (skipping core sliding sections already added above)
  const coreWinSecs = new Set(
    [
      topSec,
      botSec,
      'DC30C',
      'DC26C',
      'DC30F',
      'DC26F',
      'M23',
      'M28',
      'M24',
      'M24A',
      'D29',
      'D31',
    ].map(normalizeSectionCode)
  );
  if (formula.customSectionRules && formula.customSectionRules.acc) {
    Object.entries(formula.customSectionRules.acc).forEach(([key, accCfg]) => {
      if (!accCfg.enabled) return;
      const targetSec = accCfg.which && accCfg.which !== 'none' ? accCfg.which : key;
      if (
        coreWinSecs.has(normalizeSectionCode(key)) ||
        coreWinSecs.has(normalizeSectionCode(targetSec))
      ) {
        return;
      }
      const f = formula.customSectionRules?.formulas?.[key] || { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } };
      const qH = accCfg.qtyH ?? accCfg.qty ?? 0;
      const qW = accCfg.qtyW ?? accCfg.qty ?? 0;
      const divW = accCfg.wDivisor || 1;
      if ((accCfg.applyTo === 'H' || accCfg.applyTo === 'both') && qH > 0) {
        const dedH = dimToInches(f.h);
        const lenH = Math.max(0, accCfg.hOp === 'PLUS' ? h + dedH : h - dedH);
        if (lenH > 0) {
          pieces.push({ section: targetSec, length: lenH, qty: qH * q, source: src, label: `${targetSec} height`, gauge: g });
        }
      }
      if ((accCfg.applyTo === 'W' || accCfg.applyTo === 'both') && qW > 0) {
        const dedW = dimToInches(f.w);
        const rawW = accCfg.wOp === 'PLUS' ? width + dedW : width - dedW;
        const lenW = Math.max(0, rawW / divW);
        if (lenW > 0) {
          pieces.push({ section: targetSec, length: lenW, qty: qW * q, source: src, label: `${targetSec} width`, gauge: g });
        }
      }
    });
  }

  w.extras.forEach((ex) => {
    if (ex.lengthFt > 0 && ex.qty > 0) {
      pieces.push({
        section: ex.section,
        length: ex.lengthFt * 12.0,
        qty: ex.qty * q,
        source: src,
        label: 'Extra piece',
        gauge: g,
      });
    }
  });

  return pieces;
}

export function computeDgWindowPieces(
  w: DgWindowItem,
  overrideFrameType: string | null,
  formula: WindowFormulaSettings,
  fFormula: FSectionFormula
): CutPiece[] {
  const ft = (overrideFrameType ?? (w.frameType?.trim() ? w.frameType : 'C')).trim().toUpperCase();
  const isF = ft === 'F' || ft.endsWith('F');
  const outerSec = isF ? 'DG.26F' : 'DG.26';
  const h = w.height;
  const width = w.width;
  const q = Math.max(1, w.qty);
  const g = w.sectionGauge || '1.6';
  const src = 'DG.Window';
  const pieces: CutPiece[] = [];

  // 1. Outer Frame (2H + 2W): DG.26 (Normal C) or DG.26F (F-Section with F formula)
  if (isF && fFormula.enabled) {
    const hLen = calcFHeight(fFormula, h);
    const wLen = calcFWidth(fFormula, width);
    const hQty = Math.max(0, fFormula.qtyH ?? 2);
    const wQty = Math.max(0, fFormula.qtyW ?? 2);
    if (hQty > 0) {
      pieces.push({
        section: outerSec,
        length: hLen,
        qty: hQty * q,
        source: src,
        label: 'Outer frame F (Height)',
        gauge: g,
      });
    }
    if (wQty > 0) {
      pieces.push({
        section: outerSec,
        length: wLen,
        qty: wQty * q,
        source: src,
        label: 'Outer frame F (Width)',
        gauge: g,
      });
    }
  } else {
    pieces.push({
      section: outerSec,
      length: h,
      qty: 2 * q,
      source: src,
      label: 'Outer frame (Height)',
      gauge: g,
    });
    pieces.push({
      section: outerSec,
      length: width,
      qty: 2 * q,
      source: src,
      label: 'Outer frame (Width)',
      gauge: g,
    });
  }

  const panels = Math.min(4, Math.max(2, w.panelCount || 2));
  const dg23H = Math.max(0, h - dimToInches(formula.m23HeightDeduction));

  // 2. Palay Height (DG.23): reads formula qty (default 2P=4, 3P=6, 4P=8)
  const dg23HPcs = Math.max(
    0,
    panels === 3
      ? (formula.m23Qty3 ?? 6)
      : panels === 4
      ? (formula.m23Qty4 ?? 8)
      : (formula.m23Qty ?? 4)
  );
  if (dg23HPcs > 0) {
    pieces.push({
      section: 'DG.23',
      length: dg23H,
      qty: dg23HPcs * q,
      source: src,
      label: 'Palay height (DG.23)',
      gauge: g,
    });
  }

  // 3. Interlock (DG.28): reads formula qty (default 2P=2, 3P/4P=4), length = DG.23 H
  const dg28Pcs = Math.max(
    0,
    panels === 3
      ? (formula.m28Qty3 ?? 4)
      : panels === 4
      ? (formula.m28Qty4 ?? 4)
      : (formula.m28Qty ?? 2)
  );
  if (dg28Pcs > 0) {
    pieces.push({
      section: 'DG.28',
      length: dg23H,
      qty: dg28Pcs * q,
      source: src,
      label: 'Interlock height (DG.28)',
      gauge: g,
    });
  }

  // 4. Palay Width (DG.23 W) using + (plus) formula:
  //    2P: (W + x) / 2
  //    3P: Center (W + x) / 2 & Sides (W + x) / 4
  //    4P: (W + x) / 4
  let dg23WCenter = 0;
  let dg23WSides = 0;
  let dg23WSingle = 0;

  if (panels === 3) {
    const addCenter = dimToInches(formula.m24WidthCenterDeduction3);
    const addSides = dimToInches(formula.m24WidthSidesDeduction3);
    dg23WCenter = Math.max(0, (width + addCenter) / 2.0);
    dg23WSides = Math.max(0, (width + addSides) / 4.0);
    const dg23WPcs = Math.max(0, formula.m24Qty3 ?? 6);
    if (dg23WPcs > 0) {
      const centerPcs = dg23WPcs === 6 ? 2 : Math.max(1, Math.floor(dg23WPcs / 3));
      const sidesPcs = dg23WPcs === 6 ? 4 : Math.max(0, dg23WPcs - centerPcs);
      if (centerPcs > 0) {
        pieces.push({
          section: 'DG.23',
          length: dg23WCenter,
          qty: centerPcs * q,
          source: src,
          label: 'DG.23 Center width',
          gauge: g,
        });
      }
      if (sidesPcs > 0) {
        pieces.push({
          section: 'DG.23',
          length: dg23WSides,
          qty: sidesPcs * q,
          source: src,
          label: 'DG.23 Sides width',
          gauge: g,
        });
      }
    }
  } else {
    const addW =
      panels === 4
        ? dimToInches(formula.m24WidthDeduction4)
        : dimToInches(formula.m24WidthDeduction);
    dg23WSingle = Math.max(0, (width + addW) / panels);
    const dg23WPcs = Math.max(
      0,
      panels === 4 ? (formula.m24Qty4 ?? 8) : (formula.m24Qty ?? 4)
    );
    if (dg23WPcs > 0) {
      pieces.push({
        section: 'DG.23',
        length: dg23WSingle,
        qty: dg23WPcs * q,
        source: src,
        label: 'Palay width (DG.23)',
        gauge: g,
      });
    }
  }

  // 5. Jali Palay (DG.29): Height & Width match DG.23 H/W (synced from formula qty/offsets + Push Handle)
  const dg29HPcs = Math.max(
    0,
    panels === 3
      ? (formula.d29HeightQty3 ?? 4)
      : panels === 4
      ? (formula.d29HeightQty4 ?? 4)
      : (formula.d29HeightQty ?? 2)
  );
  const dg29WPcs = Math.max(
    0,
    panels === 3
      ? (formula.d29WidthQty3 ?? 4)
      : panels === 4
      ? (formula.d29WidthQty4 ?? 4)
      : (formula.d29WidthQty ?? 2)
  );
  const dg29HDed =
    panels === 3
      ? (formula.d29HeightDeduction3 ?? formula.m23HeightDeduction)
      : panels === 4
      ? (formula.d29HeightDeduction4 ?? formula.m23HeightDeduction)
      : (formula.d29HeightDeduction ?? formula.m23HeightDeduction);
  const dg29H = Math.max(0, h - dimToInches(dg29HDed));
  const dg29BaseW = panels === 3 ? dg23WSides : dg23WSingle;
  const dg29ExtraW = dimToInches(formula.d29ExtraWidthAdd ?? { inch: 0, sutar: 0 });
  let dg29W = Math.max(0, dg29BaseW + dg29ExtraW);
  if (w.lockType === 'PUSH_HANDLE') {
    dg29W = Math.max(0, dg29W - dimToInches(formula.d29PushHandleDeduction));
  }

  if (dg29HPcs > 0) {
    pieces.push({
      section: 'DG.29',
      length: dg29H,
      qty: dg29HPcs * q,
      source: src,
      label: 'Jali height (DG.29)',
      gauge: '1.2',
    });
  }
  if (dg29WPcs > 0) {
    pieces.push({
      section: 'DG.29',
      length: dg29W,
      qty: dg29WPcs * q,
      source: src,
      label: w.lockType === 'PUSH_HANDLE' ? 'Jali width (DG.29) [Push Handle]' : 'Jali width (DG.29)',
      gauge: '1.2',
    });
  }

  // 6. 4-Palay DG.31: 1 pc equal to DG.23 H (or Admin d31HeightDeduction4 if customized)
  if (panels === 4) {
    const dg31H = Math.max(0, h - dimToInches(formula.d31HeightDeduction4 ?? formula.m23HeightDeduction));
    pieces.push({
      section: 'DG.31',
      length: dg31H,
      qty: 1 * q,
      source: src,
      label: 'DG.31 Height (4-Palay)',
      gauge: '1.2',
    });
  }

  // 7. Optional + / - piece steppers starting at 0 (DG.23A H, DG.23A W, DG.24A H, DG.24A W)
  const addOptionalWidth = (secName: 'DG.23A' | 'DG.24A', qtyVal: number) => {
    if (qtyVal <= 0) return;
    if (panels === 3) {
      const centerPcs = qtyVal === 6 ? 2 : Math.max(1, Math.floor(qtyVal / 3));
      const sidesPcs = qtyVal === 6 ? 4 : Math.max(0, qtyVal - centerPcs);
      if (centerPcs > 0) {
        pieces.push({
          section: secName,
          length: dg23WCenter,
          qty: centerPcs * q,
          source: src,
          label: `${secName} Center width`,
          gauge: g,
        });
      }
      if (sidesPcs > 0) {
        pieces.push({
          section: secName,
          length: dg23WSides,
          qty: sidesPcs * q,
          source: src,
          label: `${secName} Sides width`,
          gauge: g,
        });
      }
    } else {
      pieces.push({
        section: secName,
        length: dg23WSingle,
        qty: qtyVal * q,
        source: src,
        label: `${secName} width`,
        gauge: g,
      });
    }
  };

  if ((w.dg23aHQty || 0) > 0) {
    pieces.push({
      section: 'DG.23A',
      length: dg23H,
      qty: w.dg23aHQty * q,
      source: src,
      label: 'DG.23A height',
      gauge: g,
    });
  }
  addOptionalWidth('DG.23A', w.dg23aWQty || 0);

  if ((w.dg24aHQty || 0) > 0) {
    pieces.push({
      section: 'DG.24A',
      length: dg23H,
      qty: w.dg24aHQty * q,
      source: src,
      label: 'DG.24A height',
      gauge: g,
    });
  }
  addOptionalWidth('DG.24A', w.dg24aWQty || 0);

  // 8. Custom per-section rules attached to dgWindowFormula
  const coreDgSecs = new Set(
    ['DG.26', 'DG.26F', 'DG.23', 'DG.28', 'DG.29', 'DG.31', 'DG.23A', 'DG.24A'].map(
      normalizeSectionCode
    )
  );
  if (formula.customSectionRules && formula.customSectionRules.acc) {
    Object.entries(formula.customSectionRules.acc).forEach(([key, accCfg]) => {
      if (!accCfg.enabled) return;
      const targetSec = accCfg.which && accCfg.which !== 'none' ? accCfg.which : key;
      if (
        coreDgSecs.has(normalizeSectionCode(key)) ||
        coreDgSecs.has(normalizeSectionCode(targetSec))
      ) {
        return;
      }
      const f = formula.customSectionRules?.formulas?.[key] || {
        h: { inch: 0, sutar: 0 },
        w: { inch: 0, sutar: 0 },
      };
      const qH = accCfg.qtyH ?? accCfg.qty ?? 0;
      const qW = accCfg.qtyW ?? accCfg.qty ?? 0;
      const divW = accCfg.wDivisor || 1;
      if ((accCfg.applyTo === 'H' || accCfg.applyTo === 'both') && qH > 0) {
        const dedH = dimToInches(f.h);
        const lenH = Math.max(0, accCfg.hOp === 'PLUS' ? h + dedH : h - dedH);
        if (lenH > 0) {
          pieces.push({
            section: targetSec,
            length: lenH,
            qty: qH * q,
            source: src,
            label: `${targetSec} height`,
            gauge: g,
          });
        }
      }
      if ((accCfg.applyTo === 'W' || accCfg.applyTo === 'both') && qW > 0) {
        const dedW = dimToInches(f.w);
        const rawW = accCfg.wOp === 'PLUS' ? width + dedW : width - dedW;
        const lenW = Math.max(0, rawW / divW);
        if (lenW > 0) {
          pieces.push({
            section: targetSec,
            length: lenW,
            qty: qW * q,
            source: src,
            label: `${targetSec} width`,
            gauge: g,
          });
        }
      }
    });
  }

  (w.extras || []).forEach((ex) => {
    if (ex.lengthFt > 0 && ex.qty > 0) {
      pieces.push({
        section: ex.section,
        length: ex.lengthFt * 12.0,
        qty: ex.qty * q,
        source: src,
        label: 'Extra piece',
        gauge: g,
      });
    }
  });

  return pieces;
}

export function computeSlidingDoorPieces(
  it: SlidingDoorItem,
  formula: SlidingDoorFormulaSettings,
  fFormula: FSectionFormula
): CutPiece[] {
  const rawOuter = (it.outer || 'NORMAL').trim();
  const upOuter = rawOuter.toUpperCase();
  const isDefaultC = upOuter === 'NORMAL' || upOuter === 'C' || upOuter === 'M30/M26' || upOuter === 'M30 / M26';
  const isDefaultF = upOuter === 'F' || upOuter === 'M30F/M26F' || upOuter === 'M30F / M26F';
  const isPair = rawOuter.includes('/') && !isDefaultC && !isDefaultF;

  const topSec = isDefaultF
    ? 'M30F'
    : isDefaultC
    ? 'M30'
    : isPair
    ? rawOuter.split('/')[0].trim()
    : rawOuter;
  const botSec = isDefaultF
    ? 'M26F'
    : isDefaultC
    ? 'M26'
    : isPair
    ? rawOuter.split('/')[1]?.trim() || rawOuter.split('/')[0].trim()
    : rawOuter;

  const isF = isDefaultF || topSec.toUpperCase().endsWith('F') || botSec.toUpperCase().endsWith('F');
  const h = it.height;
  const width = it.width;
  const q = Math.max(1, it.qty);
  const pieces: CutPiece[] = [];
  const src = 'Sliding Door';
  const g = it.sectionGauge || '1.6';

  if (isF && fFormula.enabled) {
    const hLen = calcFHeight(fFormula, h);
    const hQty = fFormula.qtyH ?? 2;
    if (hQty > 0) {
      pieces.push({ section: topSec, length: hLen, qty: hQty * q, source: src, label: `${topSec} Side height F`, gauge: g });
    }
    const wLen = calcFWidth(fFormula, width);
    const wQtyTotal = fFormula.qtyW ?? 2;
    if (wQtyTotal > 0) {
      const wTopQty = Math.floor(wQtyTotal / 2);
      const wBotQty = wQtyTotal - wTopQty;
      if (wTopQty > 0) {
        pieces.push({ section: topSec, length: wLen, qty: wTopQty * q, source: src, label: `${topSec} Top width F`, gauge: g });
      }
      if (wBotQty > 0) {
        pieces.push({ section: botSec, length: wLen, qty: wBotQty * q, source: src, label: `${botSec} Bottom width F`, gauge: g });
      }
    }
  } else {
    pieces.push({ section: topSec, length: h, qty: 2 * q, source: src, label: `${topSec} Side height`, gauge: g });
    pieces.push({ section: topSec, length: width, qty: 1 * q, source: src, label: `${topSec} Top width`, gauge: g });
    pieces.push({ section: botSec, length: width, qty: 1 * q, source: src, label: `${botSec} Bottom width`, gauge: g });
  }

  const panels = Math.min(4, Math.max(2, it.panelCount || 2));
  const sashH = Math.max(0, h - dimToInches(formula.m23HeightDeduction));
  const m23Pcs = Math.max(0, panels === 3 ? (formula.m23Qty3 ?? 2) : panels === 4 ? (formula.m23Qty4 ?? 4) : (formula.m23Qty ?? 2));
  const m28Pcs = Math.max(0, panels === 3 ? (formula.m28Qty3 ?? 4) : panels === 4 ? (formula.m28Qty4 ?? 4) : (formula.m28Qty ?? 2));

  if (m23Pcs > 0) {
    pieces.push({ section: 'M23', length: sashH, qty: m23Pcs * q, source: src, label: 'Sash height (M23)', gauge: g });
  }
  if (m28Pcs > 0) {
    pieces.push({ section: 'M28', length: sashH, qty: m28Pcs * q, source: src, label: 'Sash height (M28)', gauge: g });
  }

  const defaultM24 = panels === 2 ? (formula.m24Qty ?? 4) : panels === 3 ? (formula.m24Qty3 ?? 6) : (formula.m24Qty4 ?? 8);
  const m24Pcs = it.m24Qty >= 0 ? it.m24Qty : defaultM24;

  if (panels === 3) {
    const centerDed = dimToInches(formula.m24WidthCenterDeduction3);
    const sidesDed = dimToInches(formula.m24WidthSidesDeduction3);
    const sashWCenter = Math.max(0, (width - centerDed) / 2.0);
    const sashWSides = Math.max(0, (width - sidesDed) / 4.0);
    if (m24Pcs > 0) {
      const centerPcs = m24Pcs === 6 ? 2 : Math.max(1, Math.floor(m24Pcs / 3));
      const sidesPcs = m24Pcs === 6 ? 4 : Math.max(0, m24Pcs - centerPcs);
      if (centerPcs > 0) {
        pieces.push({ section: 'M24', length: sashWCenter, qty: centerPcs * q, source: src, label: 'M24 Center width', gauge: g });
      }
      if (sidesPcs > 0) {
        pieces.push({ section: 'M24', length: sashWSides, qty: sidesPcs * q, source: src, label: 'M24 Sides width', gauge: g });
      }
    }
    if (it.m24aQty > 0) {
      const centerPcsA = it.m24aQty === 6 ? 2 : Math.max(1, Math.floor(it.m24aQty / 3));
      const sidesPcsA = it.m24aQty === 6 ? 4 : Math.max(0, it.m24aQty - centerPcsA);
      if (centerPcsA > 0) {
        pieces.push({ section: 'M24A', length: sashWCenter, qty: centerPcsA * q, source: src, label: 'M24A Center width', gauge: g });
      }
      if (sidesPcsA > 0) {
        pieces.push({ section: 'M24A', length: sashWSides, qty: sidesPcsA * q, source: src, label: 'M24A Sides width', gauge: g });
      }
    }
  } else {
    const sashWEff =
      panels === 2
        ? Math.max(0, (width - dimToInches(formula.m24WidthDeduction)) / 2.0)
        : Math.max(0, (width - dimToInches(formula.m24WidthDeduction4)) / 4.0);
    if (m24Pcs > 0) {
      pieces.push({ section: 'M24', length: sashWEff, qty: m24Pcs * q, source: src, label: 'M24 width', gauge: g });
    }
    if (it.m24aQty > 0) {
      pieces.push({ section: 'M24A', length: sashWEff, qty: it.m24aQty * q, source: src, label: 'M24A width', gauge: g });
    }
  }

  // D29 Jali (Net Screen) + Push Handle vs Latch on Sliding Door
  const d29HPcs = it.d29HeightQty ?? 0;
  const d29WPcs = it.d29WidthQty ?? 0;
  if (d29HPcs > 0 || d29WPcs > 0) {
    const jaliH = sashH;
    const m24ForJali =
      panels === 3
        ? Math.max(0, (width - dimToInches(formula.m24WidthSidesDeduction3)) / 4.0)
        : panels === 4
        ? Math.max(0, (width - dimToInches(formula.m24WidthDeduction4)) / 4.0)
        : Math.max(0, (width - dimToInches(formula.m24WidthDeduction)) / 2.0);
    const d29ExtraW = dimToInches(formula.d29ExtraWidthAdd ?? { inch: 0, sutar: 0 });
    let jaliW = Math.max(0, m24ForJali + d29ExtraW);
    if (it.lockType === 'PUSH_HANDLE') {
      jaliW = Math.max(0, jaliW - dimToInches(formula.d29PushHandleDeduction));
    }
    const jaliWLabel = it.lockType === 'PUSH_HANDLE' ? 'Jali width (D29) [Push Handle]' : 'Jali width (D29)';
    if (d29HPcs > 0) {
      pieces.push({ section: 'D29', length: jaliH, qty: d29HPcs * q, source: src, label: 'Jali height (D29)', gauge: '1.2' });
    }
    if (d29WPcs > 0) {
      pieces.push({ section: 'D29', length: jaliW, qty: d29WPcs * q, source: src, label: jaliWLabel, gauge: '1.2' });
    }
  }

  if (panels === 4) {
    const d31Ded = dimToInches(formula.d31HeightDeduction4 ?? { inch: 0, sutar: 0 });
    pieces.push({ section: 'D31', length: Math.max(0, h - d31Ded), qty: 1 * q, source: src, label: 'D31 Height (4-Palay)', gauge: '1.2' });
  }

  // Evaluate any custom per-section Height & Width formula boxes added in Sliding Door Formulas (skipping core sliding sections already added above)
  const coreSlidingDoorSecs = new Set(
    [
      topSec,
      botSec,
      'M30',
      'M26',
      'M30F',
      'M26F',
      'DC30C',
      'DC26C',
      'DC30F',
      'DC26F',
      'M23',
      'M28',
      'M24',
      'M24A',
      'D29',
      'D31',
    ].map(normalizeSectionCode)
  );
  if (formula.customSectionRules && formula.customSectionRules.acc) {
    Object.entries(formula.customSectionRules.acc).forEach(([key, accCfg]) => {
      if (!accCfg.enabled) return;
      const targetSec = accCfg.which && accCfg.which !== 'none' ? accCfg.which : key;
      if (
        coreSlidingDoorSecs.has(normalizeSectionCode(key)) ||
        coreSlidingDoorSecs.has(normalizeSectionCode(targetSec))
      ) {
        return;
      }
      const f = formula.customSectionRules?.formulas?.[key] || { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } };
      const qH = accCfg.qtyH ?? accCfg.qty ?? 0;
      const qW = accCfg.qtyW ?? accCfg.qty ?? 0;
      const divW = accCfg.wDivisor || 1;
      if ((accCfg.applyTo === 'H' || accCfg.applyTo === 'both') && qH > 0) {
        const dedH = dimToInches(f.h);
        const lenH = Math.max(0, accCfg.hOp === 'PLUS' ? h + dedH : h - dedH);
        if (lenH > 0) {
          pieces.push({ section: targetSec, length: lenH, qty: qH * q, source: src, label: `${targetSec} height`, gauge: g });
        }
      }
      if ((accCfg.applyTo === 'W' || accCfg.applyTo === 'both') && qW > 0) {
        const dedW = dimToInches(f.w);
        const rawW = accCfg.wOp === 'PLUS' ? width + dedW : width - dedW;
        const lenW = Math.max(0, rawW / divW);
        if (lenW > 0) {
          pieces.push({ section: targetSec, length: lenW, qty: qW * q, source: src, label: `${targetSec} width`, gauge: g });
        }
      }
    });
  }

  (it.extras || []).forEach((ex) => {
    if (ex.lengthFt > 0 && ex.qty > 0) {
      pieces.push({
        section: ex.section,
        length: ex.lengthFt * 12.0,
        qty: ex.qty * q,
        source: src,
        label: 'Extra piece',
        gauge: ex.gauge || g,
      });
    }
  });

  return pieces;
}

export function computeOpenablePieces(
  width: number,
  height: number,
  qty: number,
  outer: string,
  kind: 'door' | 'fix' | 'openwin',
  categorySettings: FormulaCategorySettings,
  extras: ExtraPiece[],
  gauge: string,
  fFormula: FSectionFormula,
  d59Qty: number = 0,
  d59aQty: number = 0,
  d52Qty: number = 0
): CutPiece[] {
  const q = Math.max(1, qty);
  const pieces: CutPiece[] = [];
  const src = kind === 'door' ? 'Door' : kind === 'fix' ? 'Fix Frame' : 'Openable Window';
  const normOuter = normalizeSectionCode(outer);
  const isOuterF = normOuter.endsWith('F') || normOuter.includes('F');

  // Check if a specific formula box exists for this exact outer section (e.g. D54A, D51A, D42)
  const outerAccEntry = Object.entries(categorySettings?.acc || {}).find(
    ([k]) => normalizeSectionCode(k) === normOuter
  );
  const outerFormEntry = Object.entries(categorySettings?.formulas || {}).find(
    ([k]) => normalizeSectionCode(k) === normOuter
  );
  const outerSpecificAcc = categorySettings?.acc?.[outer.toUpperCase()] ?? outerAccEntry?.[1];
  const outerSpecificForm = categorySettings?.formulas?.[outer.toUpperCase()] ?? outerFormEntry?.[1];

  const baseOuterDedH = outerSpecificForm
    ? dimToInches(outerSpecificForm.h)
    : dimToInches(categorySettings.outerDeductH || { inch: 0, sutar: 0 });
  const baseOuterDedW = outerSpecificForm
    ? dimToInches(outerSpecificForm.w)
    : dimToInches(categorySettings.outerDeductW || { inch: 0, sutar: 0 });

  const effHeightAfterDed = Math.max(0, height - baseOuterDedH);
  const effWidthAfterDed = Math.max(0, width - baseOuterDedW);

  const hLen = isOuterF && fFormula.enabled ? calcFHeight(fFormula, effHeightAfterDed) : effHeightAfterDed;
  const hQty = outerSpecificAcc
    ? outerSpecificAcc.qtyH
    : isOuterF && fFormula.enabled
    ? fFormula.qtyH
    : categorySettings.outerQtyH ?? 2;
  if (hQty > 0 && hLen > 0) {
    pieces.push({ section: outer, length: hLen, qty: hQty * q, source: src, label: 'Outer frame height', gauge });
  }

  const defWQty = kind === 'door' ? 1 : 2;
  const wQty = outerSpecificAcc
    ? outerSpecificAcc.qtyW
    : isOuterF && fFormula.enabled
    ? fFormula.qtyW
    : categorySettings.outerQtyW ?? defWQty;
  const wLen = isOuterF && fFormula.enabled ? calcFWidth(fFormula, effWidthAfterDed) : effWidthAfterDed;
  if (wQty > 0 && wLen > 0) {
    pieces.push({ section: outer, length: wLen, qty: wQty * q, source: src, label: 'Outer frame width', gauge });
  }

  // Process all enabled section formula boxes (e.g. D50A, D50, D45A, D54A, D51A, D42, D41, etc.)
  Object.entries(categorySettings.acc || {}).forEach(([key, accCfg]) => {
    if (!accCfg || !accCfg.enabled) return;
    // Skip only if this exact key is the outer section already added as the main outer frame
    const normKey = normalizeSectionCode(key);
    if (normKey === normOuter) return;
    if (normKey === 'D52' && (kind === 'fix' || d52Qty > 0)) return;
    if (normKey === 'D59' && (d59Qty > 0 || d59aQty > 0)) return;

    const targetSec = (accCfg.which && accCfg.which !== 'none' ? accCfg.which : key).toUpperCase();
    const f = categorySettings.formulas?.[key] || { h: { inch: 0, sutar: 0 }, w: { inch: 0, sutar: 0 } };
    const qH = accCfg.applyTo === 'H' ? (accCfg.qtyH ?? accCfg.qty ?? 2) : (accCfg.qtyH ?? 2);
    const qW = accCfg.applyTo === 'W' ? (accCfg.qtyW ?? accCfg.qty ?? 2) : (accCfg.qtyW ?? 2);
    const divW = accCfg.wDivisor || 1;

    if ((accCfg.applyTo === 'H' || accCfg.applyTo === 'both') && qH > 0) {
      const dedH = dimToInches(f.h);
      const lenH = Math.max(0, accCfg.hOp === 'PLUS' ? height + dedH : height - dedH);
      if (lenH > 0) {
        pieces.push({ section: targetSec, length: lenH, qty: qH * q, source: src, label: `${targetSec} height`, gauge });
      }
    }
    if ((accCfg.applyTo === 'W' || accCfg.applyTo === 'both') && qW > 0) {
      const dedW = dimToInches(f.w);
      const rawW = accCfg.wOp === 'PLUS' ? width + dedW : width - dedW;
      const lenW = Math.max(0, rawW / divW);
      if (lenW > 0) {
        pieces.push({ section: targetSec, length: lenW, qty: qW * q, source: src, label: `${targetSec} width`, gauge });
      }
    }
  });

  if (d59Qty > 0) {
    const f = categorySettings?.formulas?.['D59'];
    const len = f && dimToInches(f.w) > 0 ? Math.max(0, width - dimToInches(f.w)) : width;
    pieces.push({ section: 'D59', length: len, qty: d59Qty * q, source: src, label: 'D59 width', gauge });
  }
  if (d59aQty > 0) {
    const f = categorySettings?.formulas?.['D59'];
    const len = f && dimToInches(f.w) > 0 ? Math.max(0, width - dimToInches(f.w)) : width;
    pieces.push({ section: 'D59A', length: len, qty: d59aQty * q, source: src, label: 'D59A width', gauge });
  }
  if (d52Qty > 0) {
    const f = categorySettings?.formulas?.['D52'];
    const len = f && dimToInches(f.w) > 0 ? Math.max(0, width - dimToInches(f.w)) : width;
    pieces.push({ section: 'D52', length: len, qty: d52Qty * q, source: src, label: 'D52 width', gauge });
  }

  extras.forEach((ex) => {
    if (ex.lengthFt > 0 && ex.qty > 0) {
      pieces.push({
        section: ex.section,
        length: ex.lengthFt * 12.0,
        qty: ex.qty * q,
        source: src,
        label: 'Extra piece',
        gauge,
      });
    }
  });

  return pieces;
}

export function computeGlassCutsForState(params: {
  windows: WindowItem[];
  dgWindows?: DgWindowItem[];
  doors: DoorItem[];
  fixframes: FixFrameItem[];
  openableWindows: OpenableWindowItem[];
  slidingDoors: SlidingDoorItem[];
  glassFormulas: Record<string, GlassFormula>;
  windowFormula: WindowFormulaSettings;
  dgWindowFormula?: WindowFormulaSettings;
  slidingDoorFormula?: SlidingDoorFormulaSettings;
  glassFittingOption: 'FIX_RUBBER' | 'U_PVC';
  measurementUnit: MeasurementUnit;
  ctxGlassMode: 'ON' | 'OFF';
  ctxGlassGauge: string;
  ctxGlassColor: string;
}): GlassCutResult[] {
  const cuts: GlassCutResult[] = [];
  const masterGlassActive = params.ctxGlassMode === 'ON';
  const fittingDeduction = params.glassFittingOption === 'U_PVC' ? 2.0 / 8.0 : 0.0;

  const addCut = (
    cutLabel: string,
    wIn: number,
    hIn: number,
    rawGH: number,
    rawGW: number,
    pcs: number,
    effGauge: string,
    effColor: string,
    skipFittingDeduction: boolean = false
  ) => {
    const appliedDeduction = skipFittingDeduction ? 0.0 : fittingDeduction;
    const finalGH = Math.max(0, rawGH - appliedDeduction);
    const finalGW = Math.max(0, rawGW - appliedDeduction);
    const bH = billFeet(finalGH);
    const bW = billFeet(finalGW);
    cuts.push({
      frameLabel: cutLabel,
      frameDim: `${formatDim(wIn, params.measurementUnit)} × ${formatDim(hIn, params.measurementUnit)}`,
      glassGauge: effGauge,
      glassColor: effColor,
      gH: finalGH,
      gWpanel: finalGW,
      billedHFt: bH,
      billedWFt: bW,
      pieces: pcs,
      sqft: bH * bW * pcs,
    });
  };

  const processItem = (
    w: number,
    h: number,
    qty: number,
    kind: string,
    label: string,
    enabled: boolean,
    gGauge: string,
    gColor: string,
    panelOverride?: number
  ) => {
    if (!enabled) return;
    const isDgWindow = kind === 'dgwindow';
    const skipFittingDeduction = kind !== 'window' && kind !== 'slidingdoor';
    const effGauge = isDgWindow ? 'DG' : masterGlassActive ? params.ctxGlassGauge : gGauge;
    const effColor = isDgWindow
      ? gColor || 'CLEAR'
      : masterGlassActive
      ? params.ctxGlassColor
      : gColor;
    const f = params.glassFormulas[kind] || {
      marginH: 0,
      marginW: 0,
      panels: 1,
      marginHSutar: 0,
      marginWSutar: 0,
      slidingHeightDeductionInch: 0,
      slidingHeightDeductionSutar: 0,
      slidingWidthAddToM24Inch: 0,
      slidingWidthAddToM24Sutar: 0,
    };
    const panels = panelOverride ?? Math.max(1, f.panels ?? 1);
    const actualQty = Math.max(1, qty);

    if (kind === 'window' || kind === 'slidingdoor' || kind === 'dgwindow') {
      const effMarginH = (f.slidingHeightDeductionInch ?? 0) + (f.slidingHeightDeductionSutar ?? 0) / 8.0;
      const gH = Math.max(0, h - effMarginH);
      const glassExtraW = (f.slidingWidthAddToM24Inch ?? 0) + (f.slidingWidthAddToM24Sutar ?? 0) / 8.0;

      const slidingForm =
        kind === 'slidingdoor' && params.slidingDoorFormula
          ? params.slidingDoorFormula
          : kind === 'dgwindow' && params.dgWindowFormula
          ? params.dgWindowFormula
          : params.windowFormula;
      const widthSign = kind === 'dgwindow' ? 1.0 : -1.0;

      if (panels === 3) {
        const m24Center = Math.max(0, (w + widthSign * dimToInches(slidingForm.m24WidthCenterDeduction3)) / 2.0);
        const m24Sides = Math.max(0, (w + widthSign * dimToInches(slidingForm.m24WidthSidesDeduction3)) / 4.0);
        addCut(`${label} (Center 1 Pc)`, w, h, gH, m24Center + glassExtraW, 1 * actualQty, effGauge, effColor, skipFittingDeduction);
        addCut(`${label} (Sides 2 Pcs)`, w, h, gH, m24Sides + glassExtraW, 2 * actualQty, effGauge, effColor, skipFittingDeduction);
      } else {
        const m24Size =
          panels === 2
            ? Math.max(0, (w + widthSign * dimToInches(slidingForm.m24WidthDeduction)) / 2.0)
            : panels === 4
            ? Math.max(0, (w + widthSign * dimToInches(slidingForm.m24WidthDeduction4)) / 4.0)
            : Math.max(0, (w + widthSign * dimToInches(slidingForm.m24WidthDeduction)) / panels);
        addCut(label, w, h, gH, m24Size + glassExtraW, panels * actualQty, effGauge, effColor, skipFittingDeduction);
      }
    } else {
      const effMarginH = (f.marginH ?? 0) + (f.marginHSutar ?? 0) / 8.0;
      const effMarginW = (f.marginW ?? 0) + (f.marginWSutar ?? 0) / 8.0;
      const gH = Math.max(0, h - effMarginH);
      const gWpanel = Math.max(0, w - effMarginW) / panels;
      addCut(label, w, h, gH, gWpanel, panels * actualQty, effGauge, effColor, skipFittingDeduction);
    }
  };

  params.windows.forEach((it, i) =>
    processItem(it.width, it.height, it.qty, 'window', `Window #${i + 1} (${it.panelCount} Palay)`, it.glassEnabled, it.glassGauge, it.glassColor, it.panelCount)
  );
  (params.dgWindows || []).forEach((it, i) =>
    processItem(it.width, it.height, it.qty, 'dgwindow', `DG.Window #${i + 1} (${it.panelCount} Palay)`, it.glassEnabled, it.glassGauge, it.glassColor, it.panelCount)
  );
  params.doors.forEach((it, i) =>
    processItem(it.width, it.height, it.qty, 'door', `Door #${i + 1}`, it.glassEnabled, it.glassGauge, it.glassColor)
  );
  params.fixframes.forEach((it, i) =>
    processItem(it.width, it.height, it.qty, 'fix', `Fix Frame #${i + 1}`, it.glassEnabled, it.glassGauge, it.glassColor)
  );
  params.openableWindows.forEach((it, i) =>
    processItem(it.width, it.height, it.qty, 'openwin', `Openable Window #${i + 1}`, it.glassEnabled, it.glassGauge, it.glassColor)
  );
  params.slidingDoors.forEach((it, i) =>
    processItem(it.width, it.height, it.qty, 'slidingdoor', `Sliding Door #${i + 1} (${it.panelCount} Palay)`, it.glassEnabled, it.glassGauge, it.glassColor, it.panelCount)
  );

  return cuts;
}

// ============================================================================
// DEVICE-BOUND PASSCODE GENERATOR (PORTED FROM UserSecurityModels.kt)
// ============================================================================
export function generateDeviceActivationCode(clientKey: string, durationMonths: number = 1): string {
  const cleanKey = String(clientKey || '').trim().toUpperCase().replace(/-/g, '');
  if (!cleanKey) return 'BOSS2796';
  let hash = 1125899906842597n;
  const saltCode =
    durationMonths === 1
      ? 'M30'
      : durationMonths === 3
      ? 'Q90'
      : durationMonths === 6
      ? 'H180'
      : durationMonths === 12
      ? 'Y365'
      : durationMonths >= 999
      ? 'VIP999'
      : `D${durationMonths * 30}`;
  const salted = `${cleanKey}_BOSS_SECURE_SALT_${saltCode}_2026`;
  for (let i = 0; i < salted.length; i++) {
    hash = (31n * hash + BigInt(salted.charCodeAt(i))) & 0x7fffffffffffffffn;
  }
  const numPart = Number(hash % 900000n) + 100000;
  const prefix =
    durationMonths === 1
      ? 'BOSS-M'
      : durationMonths === 3
      ? 'BOSS-Q'
      : durationMonths === 6
      ? 'BOSS-6M'
      : durationMonths === 12
      ? 'BOSS-1Y'
      : durationMonths >= 999
      ? 'BOSS-VIP'
      : `BOSS-${durationMonths}M`;
  return `${prefix}-${numPart}`;
}

export function validatePasscode(inputPasscode: string, clientKey: string): { isValid: boolean; durationMonths: number } {
  const cleanInput = String(inputPasscode || '').trim().toUpperCase();
  if (MASTER_PASSCODES.includes(cleanInput)) {
    return { isValid: true, durationMonths: 12 };
  }
  const supportedDurations = [1, 3, 6, 12, 999];
  for (const months of supportedDurations) {
    const code = generateDeviceActivationCode(clientKey, months);
    if (cleanInput === code || cleanInput === code.replace(/-/g, '')) {
      return { isValid: true, durationMonths: months };
    }
  }
  return { isValid: false, durationMonths: 0 };
}
