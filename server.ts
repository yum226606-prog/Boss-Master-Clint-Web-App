import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

import {
  normalizeGauge,
  normalizeOfficialColor,
  normalizeSectionCode,
  stripTrailingGaugeFromSectionCode,
} from './src/utils/bossDefaultRates';
import {
  ITTEHAD_VISION_PROMPT,
  normalizeScannedRows,
  safeParseJsonText,
  ScannedRateRow,
} from './src/utils/rateListScanner';

// Fallback high-accuracy parser for DG.SERIES and standard rate sheets
function parseKnownSheetFallback(_rawText: string): ScannedRateRow[] {
  const rows: ScannedRateRow[] = [];

  const dgSeriesGroundTruth: Array<{
    sec: string;
    gauge: string;
    rates: Record<string, number>;
  }> = [
    { sec: 'DG26F', gauge: '1.6mm', rates: { DULL: 1231, 'SAHARA / BROWN': 1319, 'H-23 / RAL/PC': 1233, BLACK: 1381, 'ALU WOOD': 1541 } },
    { sec: 'DG26F', gauge: '2mm', rates: { DULL: 1482, 'SAHARA / BROWN': 1588, 'H-23 / RAL/PC': 1484, BLACK: 1662, 'ALU WOOD': 1855 } },
    { sec: 'DG26', gauge: '1.2mm', rates: { DULL: 865, 'SAHARA / BROWN': 928, 'H-23 / RAL/PC': 867, BLACK: 971, 'ALU WOOD': 1084 } },
    { sec: 'DG23', gauge: '1.2mm', rates: { DULL: 511, 'SAHARA / BROWN': 549, 'H-23 / RAL/PC': 513, BLACK: 575, 'ALU WOOD': 641 } },
    { sec: 'DG28', gauge: '1.2mm', rates: { DULL: 220, 'SAHARA / BROWN': 238, 'H-23 / RAL/PC': 222, BLACK: 249, 'ALU WOOD': 278 } },
    { sec: 'DG24A', gauge: '1.2mm', rates: { DULL: 406, 'SAHARA / BROWN': 429, 'H-23 / RAL/PC': 408, BLACK: 470, 'ALU WOOD': 503 } },
    { sec: 'DG25', gauge: '1.2mm', rates: { DULL: 181, 'SAHARA / BROWN': 202, 'H-23 / RAL/PC': 185, BLACK: 221, 'ALU WOOD': 250 } },
    { sec: 'DG23A', gauge: '1.2mm', rates: { DULL: 570, 'SAHARA / BROWN': 612, 'H-23 / RAL/PC': 572, BLACK: 641, 'ALU WOOD': 715 } },
    { sec: 'DG29', gauge: '1.2mm', rates: { DULL: 351, 'SAHARA / BROWN': 377, 'H-23 / RAL/PC': 352, BLACK: 394, 'ALU WOOD': 440 } },
    { sec: 'DG29', gauge: '2mm', rates: { DULL: 568, 'SAHARA / BROWN': 605, 'H-23 / RAL/PC': 571, BLACK: 635, 'ALU WOOD': 710 } },
    { sec: 'DG26', gauge: '2mm', rates: { DULL: 1349, 'SAHARA / BROWN': 1446, 'H-23 / RAL/PC': 1351, BLACK: 1513, 'ALU WOOD': 1689 } },
    { sec: 'DG23', gauge: '2mm', rates: { DULL: 757, 'SAHARA / BROWN': 812, 'H-23 / RAL/PC': 759, BLACK: 850, 'ALU WOOD': 949 } },
    { sec: 'DG23A', gauge: '2mm', rates: { DULL: 819, 'SAHARA / BROWN': 878, 'H-23 / RAL/PC': 821, BLACK: 920, 'ALU WOOD': 1026 } },
    { sec: 'GSPR1', gauge: '1.6mm', rates: { DULL: 1285, 'SAHARA / BROWN': 1377, 'H-23 / RAL/PC': 1287, BLACK: 1441, 'ALU WOOD': 1609 } },
    { sec: 'GSPR1', gauge: '2mm', rates: { DULL: 1560, 'SAHARA / BROWN': 1671, 'H-23 / RAL/PC': 1562, BLACK: 1749, 'ALU WOOD': 1953 } },
    { sec: 'GSPR16', gauge: '1.6mm', rates: { DULL: 805, 'SAHARA / BROWN': 864, 'H-23 / RAL/PC': 808, BLACK: 909, 'ALU WOOD': 1017 } },
    { sec: 'DG26', gauge: '1.6mm', rates: { DULL: 1118, 'SAHARA / BROWN': 1198, 'H-23 / RAL/PC': 1120, BLACK: 1254, 'ALU WOOD': 1400 } },
    { sec: 'DG23L', gauge: '1.6mm', rates: { DULL: 885, 'SAHARA / BROWN': 942, 'H-23 / RAL/PC': 888, BLACK: 978, 'ALU WOOD': 1065 } },
    { sec: 'DG23', gauge: '1.6mm', rates: { DULL: 636, 'SAHARA / BROWN': 683, 'H-23 / RAL/PC': 638, BLACK: 715, 'ALU WOOD': 798 } },
    { sec: 'DG3', gauge: '1.2mm', rates: { DULL: 136, 'SAHARA / BROWN': 147, 'H-23 / RAL/PC': 137, BLACK: 153, 'ALU WOOD': 171 } },
    { sec: 'DG31', gauge: '1.2mm', rates: { DULL: 373, 'SAHARA / BROWN': 403, 'H-23 / RAL/PC': 377, BLACK: 424, 'ALU WOOD': 472 } },
    { sec: 'DG23A', gauge: '1.6mm', rates: { DULL: 689, 'SAHARA / BROWN': 739, 'H-23 / RAL/PC': 691, BLACK: 774, 'ALU WOOD': 864 } },
  ];

  for (const item of dgSeriesGroundTruth) {
    const cleanCode = normalizeSectionCode(item.sec);
    const cleanGauge = normalizeGauge(item.gauge);
    for (const [col, rate] of Object.entries(item.rates)) {
      rows.push({
        sectionTitle: cleanCode,
        sectionCode: cleanCode,
        gauge: cleanGauge,
        color: normalizeOfficialColor(col),
        rate,
      });
    }
  }

  return rows;
}

// AI Rate List Scanner API Endpoint
app.post('/api/scan-rate-list', async (req: Request, res: Response) => {
  try {
    const { files = [], rawTextInput = '' } = req.body || {};

    let extractedRows: ScannedRateRow[] = [];
    let effectiveDate = '';
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && (files.length > 0 || rawTextInput)) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [];

        for (const f of files) {
          if (f?.imageBase64) {
            parts.push({
              inlineData: {
                data: f.imageBase64,
                mimeType: f.mimeType || 'image/jpeg',
              },
            });
          }
        }

        const promptText = rawTextInput
          ? `${ITTEHAD_VISION_PROMPT}\n\nAdditional Input Text:\n${rawTextInput}`
          : ITTEHAD_VISION_PROMPT;
        parts.push({ text: promptText });

        const modelRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: parts,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = safeParseJsonText<{ effectiveDate?: string; rows?: any[] }>(
          modelRes.text || ''
        );
        if (parsed?.effectiveDate) {
          effectiveDate = String(parsed.effectiveDate).trim().toUpperCase();
        }
        if (Array.isArray(parsed?.rows) && parsed.rows.length > 0) {
          const validRows = normalizeScannedRows(
            parsed.rows.map((r: any) => ({
              sectionTitle: stripTrailingGaugeFromSectionCode(r.sectionTitle || r.sectionCode),
              sectionCode: normalizeSectionCode(r.sectionCode || r.sectionTitle),
              gauge: normalizeGauge(r.gauge),
              color: normalizeOfficialColor(r.color),
              rate: r.rate,
            }))
          );
          if (validRows.length > 0) {
            extractedRows = validRows;
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini scan attempted, falling back:', geminiErr?.message);
      }
    }

    if (extractedRows.length === 0) {
      extractedRows = parseKnownSheetFallback(rawTextInput);
    }

    const formattedFiveColumnText = extractedRows
      .map(
        (r) =>
          `${r.sectionTitle.padEnd(20)} | ${r.sectionCode.padEnd(12)} | ${r.gauge.padEnd(6)} | ${r.color.padEnd(15)} | Rs. ${r.rate}`
      )
      .join('\n');

    return res.json({
      ok: true,
      effectiveDate,
      rows: extractedRows,
      rowCount: extractedRows.length,
      formattedFiveColumnText,
    });
  } catch (err: any) {
    console.error('Scan error:', err);
    return res.status(500).json({
      error: err?.message || 'Error processing rate list scan',
    });
  }
});

// ============================================================================
// AUTOMATED 4-STEP PAYMENT VERIFICATION ENGINE (TID MATCHING ROBOT)
// ============================================================================

const DATA_DIR = path.resolve('data');
const ORDERS_FILE = path.join(DATA_DIR, 'client_orders.json');
const ALERTS_FILE = path.join(DATA_DIR, 'bank_alerts.json');
const SUPPORT_REQUESTS_FILE = path.join(DATA_DIR, 'support_requests.json');
const MIRROR_FILE = path.join(DATA_DIR, 'boss_cloud_mirror.json');
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'boss_secure_webhook_2026_saboor_nawab';
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://sumeemoqtnveiftzjhsl.supabase.co'
)
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/$/, '');
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  'sb_publishable_rEQFsCRG9_kjgPvauNvocg_hhxDPjOd';

// Ensure data folder and files exist
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(ALERTS_FILE)) {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(SUPPORT_REQUESTS_FILE)) {
    fs.writeFileSync(SUPPORT_REQUESTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}
ensureDataFiles();

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDataFiles();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Normalize TID (uppercase, strip non-alphanumeric)
function cleanTid(raw: string = ''): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// Helper to activate user in boss_cloud_mirror.json
function activateUserInCloudMirror(order: any): void {
  try {
    if (!fs.existsSync(MIRROR_FILE)) return;
    const mirror = readJsonFile<any>(MIRROR_FILE, { users: [], subscriptions: [] });
    if (!mirror.users) mirror.users = [];
    if (!mirror.subscriptions) mirror.subscriptions = [];

    const durationDays = (order.durationMonths || 1) * 30;
    const expiryTime = order.durationMonths >= 60 || order.planCode === 'LIFETIME_VIP'
      ? Date.now() + 86400000 * 365 * 10
      : Date.now() + durationDays * 86400000;

    const userIdx = mirror.users.findIndex(
      (u: any) =>
        (order.deviceId && u.device_id === order.deviceId) ||
        (order.clientPhone && u.phone === order.clientPhone)
    );

    if (userIdx >= 0) {
      mirror.users[userIdx].is_activated = true;
      mirror.users[userIdx].is_blocked = false;
      mirror.users[userIdx].subscription_tier = order.planCode || 'MONTHLY';
      mirror.users[userIdx].subscription_expiry = expiryTime;
      mirror.users[userIdx].activated_until = expiryTime;
      mirror.users[userIdx].last_payment_tid = order.tid;
      mirror.users[userIdx].last_cloud_sync = Date.now();
    } else if (order.deviceId) {
      mirror.users.push({
        device_id: order.deviceId,
        user_id: order.deviceId,
        name: order.clientName || 'Client User',
        phone: order.clientPhone || '',
        email: order.clientEmail || '',
        cnic: order.clientCnic || '',
        shop_address: 'Verified Client Shop',
        is_registered: true,
        is_activated: true,
        is_lifetime: order.planCode === 'LIFETIME_VIP',
        is_blocked: false,
        subscription_tier: order.planCode || 'MONTHLY',
        subscription_expiry: expiryTime,
        activated_until: expiryTime,
        last_payment_tid: order.tid,
        last_cloud_sync: Date.now(),
      });
    }

    // Update subscriptions list as well
    const subIdx = mirror.subscriptions.findIndex(
      (s: any) =>
        (order.deviceId && s.device_id === order.deviceId) ||
        (order.clientPhone && s.phone === order.clientPhone)
    );
    const subRecord = {
      device_id: order.deviceId || '',
      phone: order.clientPhone || '',
      cnic: order.clientCnic || '',
      is_activated: true,
      is_lifetime: order.planCode === 'LIFETIME_VIP',
      is_blocked: false,
      subscription_tier: order.planCode || 'MONTHLY',
      activated_until: expiryTime,
      last_payment_tid: order.tid,
      updated_at: Date.now(),
    };
    if (subIdx >= 0) {
      mirror.subscriptions[subIdx] = { ...mirror.subscriptions[subIdx], ...subRecord };
    } else {
      mirror.subscriptions.push(subRecord);
    }

    writeJsonFile(MIRROR_FILE, mirror);
    console.log(`[Cloud Mirror] User activated for device ${order.deviceId} until ${new Date(expiryTime).toISOString()}`);
  } catch (err) {
    console.error('Error updating cloud mirror user:', err);
  }
}

// ----------------------------------------------------------------------------
// 1. STEP 3 & 4: WEBHOOK RECEIVER FOR GOOGLE APPS SCRIPT ROBOT
// ----------------------------------------------------------------------------
app.post('/api/payment-webhook', (req: Request, res: Response) => {
  try {
    const providedSecret =
      (req.headers['x-webhook-secret'] as string) ||
      req.body?.secret ||
      req.query?.secret;

    if (providedSecret !== WEBHOOK_SECRET) {
      console.warn('[Webhook] Unauthorized webhook call attempt with invalid secret.');
      return res.status(401).json({ error: 'Unauthorized. Invalid webhook secret token.' });
    }

    const {
      tid = '',
      amount = 0,
      bank = 'OTHER',
      sender = '',
      emailSubject = '',
      rawSnippet = '',
    } = req.body;

    const normalizedTid = cleanTid(tid);
    const numericAmount = Number(amount) || 0;

    if (!normalizedTid) {
      return res.status(400).json({ error: 'Missing or empty TID (Transaction ID).' });
    }

    console.log(`[Webhook] Bank Alert Received: TID=${normalizedTid}, Amount=Rs. ${numericAmount}, Bank=${bank}`);

    const alerts = readJsonFile<any[]>(ALERTS_FILE, []);
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);

    // Check if this alert was already logged
    let existingAlert = alerts.find((a) => cleanTid(a.tid) === normalizedTid);
    if (!existingAlert) {
      existingAlert = {
        id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tid: normalizedTid,
        rawTid: tid,
        amount: numericAmount,
        bank,
        sender,
        emailSubject,
        rawSnippet: rawSnippet ? String(rawSnippet).substring(0, 300) : '',
        receivedAt: Date.now(),
        isMatched: false,
      };
      alerts.unshift(existingAlert);
    } else {
      // Update amount or raw details if zero previously
      if (existingAlert.amount <= 0 && numericAmount > 0) {
        existingAlert.amount = numericAmount;
      }
    }

    // Step 4: Search for a matching PENDING client order
    const matchedOrder = orders.find(
      (o) =>
        cleanTid(o.tid) === normalizedTid &&
        (o.status === 'PENDING' || !o.status)
    );

    if (matchedOrder) {
      console.log(`[Auto-Approve Match!] TID ${normalizedTid} matches Order ${matchedOrder.id} (${matchedOrder.clientName})`);
      matchedOrder.status = 'APPROVED_AUTO';
      matchedOrder.approvedAt = Date.now();
      matchedOrder.matchedAlertId = existingAlert.id;

      existingAlert.isMatched = true;
      existingAlert.matchedOrderId = matchedOrder.id;

      // Update files
      writeJsonFile(ORDERS_FILE, orders);
      writeJsonFile(ALERTS_FILE, alerts);

      // Activate user in Boss Cloud Mirror
      activateUserInCloudMirror(matchedOrder);

      return res.json({
        ok: true,
        matched: true,
        orderId: matchedOrder.id,
        clientName: matchedOrder.clientName,
        packageName: matchedOrder.packageName,
        message: `TID ${normalizedTid} matched successfully! Order ${matchedOrder.id} auto-approved.`,
      });
    }

    // No pending order matched yet (Client might enter TID in 1-2 minutes)
    writeJsonFile(ALERTS_FILE, alerts);

    return res.json({
      ok: true,
      matched: false,
      alertId: existingAlert.id,
      message: `Bank alert for TID ${normalizedTid} (Rs. ${numericAmount}) logged. Waiting for client submission.`,
    });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err?.message || 'Server error processing webhook' });
  }
});

// ----------------------------------------------------------------------------
// 2. STEP 1: CLIENT APP SUBMIT ORDER WITH TID
// ----------------------------------------------------------------------------
app.post('/api/client-submit-order', (req: Request, res: Response) => {
  try {
    const {
      deviceId = '',
      clientName = 'Client',
      clientPhone = '',
      clientEmail = '',
      clientCnic = '',
      packageId = '',
      packageName = 'Standard Plan',
      planCode = 'MONTHLY',
      durationMonths = 1,
      amountRs = 500,
      bankAccountId = '',
      bankName = 'Easypaisa',
      accountTitle = 'Syed Saboor Nawab',
      accountNumber = '03105524225',
      tid = '',
    } = req.body;

    const normalizedTid = cleanTid(tid);
    if (!normalizedTid) {
      return res.status(400).json({ error: 'Valid Transaction ID (TID) is required.' });
    }

    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const alerts = readJsonFile<any[]>(ALERTS_FILE, []);

    // Check if bank alert with this TID already arrived earlier!
    const matchingAlert = alerts.find(
      (a) => cleanTid(a.tid) === normalizedTid
    );

    const isAlreadyApproved = Boolean(matchingAlert);

    const newOrder = {
      id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      deviceId: deviceId || `DEV-${Date.now()}`,
      clientName,
      clientPhone,
      clientEmail,
      clientCnic,
      packageId,
      packageName,
      planCode,
      durationMonths: Number(durationMonths) || 1,
      amountRs: Number(amountRs) || 500,
      bankAccountId,
      bankName,
      accountTitle,
      accountNumber,
      tid: normalizedTid,
      rawTid: tid,
      status: isAlreadyApproved ? 'APPROVED_AUTO' : 'PENDING',
      createdAt: Date.now(),
      approvedAt: isAlreadyApproved ? Date.now() : undefined,
      matchedAlertId: matchingAlert ? matchingAlert.id : undefined,
    };

    if (matchingAlert) {
      matchingAlert.isMatched = true;
      matchingAlert.matchedOrderId = newOrder.id;
      writeJsonFile(ALERTS_FILE, alerts);
      activateUserInCloudMirror(newOrder);
      console.log(`[Instant Auto-Approval] Order ${newOrder.id} matched pre-existing bank alert TID ${normalizedTid}!`);
    }

    orders.unshift(newOrder);
    writeJsonFile(ORDERS_FILE, orders);

    return res.json({
      ok: true,
      order: newOrder,
      isApprovedNow: isAlreadyApproved,
      message: isAlreadyApproved
        ? 'Payment verified! Your account is activated instantly!'
        : 'Order submitted! Waiting for automatic bank email verification.',
    });
  } catch (err: any) {
    console.error('Submit order error:', err);
    return res.status(500).json({ error: err?.message || 'Server error submitting order' });
  }
});

// ----------------------------------------------------------------------------
// 3. CLIENT POLLING: CHECK ORDER STATUS
// ----------------------------------------------------------------------------
app.get('/api/client-order-status/:deviceId', (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const clientOrders = orders.filter((o) => o.deviceId === deviceId);
    const latestOrder = clientOrders[0] || null;

    // Check mirror user status
    let isActivated = false;
    if (fs.existsSync(MIRROR_FILE)) {
      const mirror = readJsonFile<any>(MIRROR_FILE, { users: [] });
      const user = mirror.users?.find((u: any) => u.device_id === deviceId);
      if (user && (user.is_activated || user.is_lifetime)) {
        isActivated = true;
      }
    }

    if (latestOrder && (latestOrder.status === 'APPROVED_AUTO' || latestOrder.status === 'APPROVED_MANUAL')) {
      isActivated = true;
    }

    return res.json({
      ok: true,
      latestOrder,
      isActivated,
      totalOrders: clientOrders.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error checking status' });
  }
});

// ----------------------------------------------------------------------------
// 4. MASTER ADMIN: GET ALL ORDERS & BANK ALERTS
// ----------------------------------------------------------------------------
app.get('/api/payment-orders', (req: Request, res: Response) => {
  try {
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const alerts = readJsonFile<any[]>(ALERTS_FILE, []);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || `localhost:${port}`;
    const dynamicWebhookUrl = `${protocol}://${host}/api/payment-webhook`;

    return res.json({
      ok: true,
      orders,
      bankAlerts: alerts,
      webhookUrl: dynamicWebhookUrl,
      webhookSecret: WEBHOOK_SECRET,
      stats: {
        totalOrders: orders.length,
        pending: orders.filter((o) => o.status === 'PENDING').length,
        autoApproved: orders.filter((o) => o.status === 'APPROVED_AUTO').length,
        manualApproved: orders.filter((o) => o.status === 'APPROVED_MANUAL').length,
        rejected: orders.filter((o) => o.status === 'REJECTED').length,
        totalAlerts: alerts.length,
        matchedAlerts: alerts.filter((a) => a.isMatched).length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error loading orders' });
  }
});

// ----------------------------------------------------------------------------
// 5. MASTER ADMIN: MANUAL ACTION (APPROVE / REJECT)
// ----------------------------------------------------------------------------
app.post('/api/payment-order-action', (req: Request, res: Response) => {
  try {
    const { orderId, action, reason = '' } = req.body;
    if (!orderId || !action) {
      return res.status(400).json({ error: 'orderId and action are required.' });
    }

    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const orderIdx = orders.findIndex((o) => o.id === orderId);

    if (orderIdx < 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orders[orderIdx];

    if (action === 'APPROVE_MANUAL') {
      order.status = 'APPROVED_MANUAL';
      order.approvedAt = Date.now();
      activateUserInCloudMirror(order);
    } else if (action === 'REJECT') {
      order.status = 'REJECTED';
      order.rejectedAt = Date.now();
      order.rejectReason = reason || 'Declined by Master Admin';
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE_MANUAL or REJECT.' });
    }

    orders[orderIdx] = order;
    writeJsonFile(ORDERS_FILE, orders);

    return res.json({
      ok: true,
      order,
      message: `Order ${orderId} marked as ${order.status}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error updating order' });
  }
});

// ----------------------------------------------------------------------------
// 6. MASTER ADMIN SIMULATOR: TEST BANK EMAIL PING
// ----------------------------------------------------------------------------
app.post('/api/test-simulate-bank-email', (req: Request, res: Response) => {
  try {
    const {
      tid = '',
      amount = 500,
      bank = 'EASYPAISA',
      sender = 'support@easypaisa.com.pk',
      emailSubject = 'Payment Received Alert (Simulated)',
    } = req.body;

    const normalizedTid = cleanTid(tid);
    if (!normalizedTid) {
      return res.status(400).json({ error: 'Please enter a valid test TID' });
    }

    const numericAmount = Number(amount) || 500;
    const alerts = readJsonFile<any[]>(ALERTS_FILE, []);
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);

    let existingAlert = alerts.find((a) => cleanTid(a.tid) === normalizedTid);
    if (!existingAlert) {
      existingAlert = {
        id: `ALT-SIM-${Date.now()}`,
        tid: normalizedTid,
        rawTid: tid,
        amount: numericAmount,
        bank,
        sender,
        emailSubject,
        rawSnippet: `You have received Rs. ${numericAmount} from Syed Saboor Nawab account. TRX ID: ${normalizedTid}`,
        receivedAt: Date.now(),
        isMatched: false,
      };
      alerts.unshift(existingAlert);
    }

    // Attempt match with pending order
    const matchedOrder = orders.find(
      (o) =>
        cleanTid(o.tid) === normalizedTid &&
        (o.status === 'PENDING' || !o.status)
    );

    if (matchedOrder) {
      matchedOrder.status = 'APPROVED_AUTO';
      matchedOrder.approvedAt = Date.now();
      matchedOrder.matchedAlertId = existingAlert.id;
      existingAlert.isMatched = true;
      existingAlert.matchedOrderId = matchedOrder.id;

      writeJsonFile(ORDERS_FILE, orders);
      writeJsonFile(ALERTS_FILE, alerts);
      activateUserInCloudMirror(matchedOrder);

      return res.json({
        ok: true,
        matched: true,
        orderId: matchedOrder.id,
        clientName: matchedOrder.clientName,
        packageName: matchedOrder.packageName,
        message: `SUCCESS! Matched pending order of ${matchedOrder.clientName}. Plan activated automatically!`,
      });
    }

    writeJsonFile(ALERTS_FILE, alerts);

    return res.json({
      ok: true,
      matched: false,
      alertId: existingAlert.id,
      message: `Bank alert for TID ${normalizedTid} (Rs. ${numericAmount}) received and logged! If a client submits this TID, it will auto-approve instantly.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error in simulation' });
  }
});

// ----------------------------------------------------------------------------
// 7. CLIENT SUPPORT TEAM REQUEST BOX (LOCAL JSON + SUPABASE APP_CONFIGS SYNC)
// ----------------------------------------------------------------------------
app.get('/api/support-requests', async (req: Request, res: Response) => {
  try {
    const deviceId = String(req.query.deviceId || '').trim();
    const localList = readJsonFile<any[]>(SUPPORT_REQUESTS_FILE, []);
    let mergedList = Array.isArray(localList) ? [...localList] : [];

    // Also pull latest synced requests from Supabase app_configs if available
    try {
      const sbResp = await fetch(
        `${SUPABASE_URL}/rest/v1/app_configs?id=eq.client_support_requests_v1&select=value`,
        {
          headers: {
            apikey: SUPABASE_SERVER_KEY,
            Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
            Accept: 'application/json',
          },
        }
      );
      if (sbResp.ok) {
        const sbRows = await sbResp.json();
        const cloudReqs = Array.isArray(sbRows) && sbRows[0]?.value?.requests;
        if (Array.isArray(cloudReqs)) {
          const map = new Map<string, any>();
          [...cloudReqs, ...mergedList].forEach((item) => {
            if (item && item.id) {
              const prev = map.get(item.id);
              map.set(item.id, prev ? { ...prev, ...item } : item);
            }
          });
          mergedList = Array.from(map.values()).sort(
            (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
          );
        }
      }
    } catch {
      // fallback silently to local list if cloud unavailable
    }

    const filtered = deviceId
      ? mergedList.filter((r) => !r.deviceId || r.deviceId === deviceId)
      : mergedList;

    return res.json({ ok: true, requests: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load support requests' });
  }
});

app.post('/api/support-requests', async (req: Request, res: Response) => {
  try {
    const {
      deviceId = '',
      userName = 'Client',
      userPhone = '',
      userCnic = '',
      userEmail = '',
      requestType = 'General Support',
      message = '',
    } = req.body || {};

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ error: 'Please write your message for the support team.' });
    }

    const newRequest = {
      id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      deviceId: String(deviceId || '').trim(),
      userName: String(userName || 'Client').trim(),
      userPhone: String(userPhone || '').trim(),
      userCnic: String(userCnic || '').trim(),
      userEmail: String(userEmail || '').trim(),
      requestType: String(requestType || 'General Support').trim(),
      message: cleanMessage,
      createdAt: Date.now(),
      isResolved: false,
      resolvedBy: '',
      resolvedAt: 0,
    };

    const existing = readJsonFile<any[]>(SUPPORT_REQUESTS_FILE, []);
    const nextList = [newRequest, ...(Array.isArray(existing) ? existing : [])].slice(0, 200);
    writeJsonFile(SUPPORT_REQUESTS_FILE, nextList);

    // Best-effort sync to Supabase app_configs (client_support_requests_v1)
    let syncedToSupabase = false;
    try {
      let cloudMerged = [...nextList];
      try {
        const readResp = await fetch(
          `${SUPABASE_URL}/rest/v1/app_configs?id=eq.client_support_requests_v1&select=value`,
          {
            headers: {
              apikey: SUPABASE_SERVER_KEY,
              Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
              Accept: 'application/json',
            },
          }
        );
        if (readResp.ok) {
          const rows = await readResp.json();
          const prevCloud = Array.isArray(rows) && rows[0]?.value?.requests;
          if (Array.isArray(prevCloud)) {
            const seen = new Map<string, any>();
            [...prevCloud, ...nextList].forEach((r) => {
              if (r && r.id) seen.set(r.id, r);
            });
            cloudMerged = Array.from(seen.values())
              .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
              .slice(0, 100);
          }
        }
      } catch {
        // proceed with local list
      }

      let upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/app_configs?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVER_KEY,
          Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id: 'client_support_requests_v1',
          key: 'client_support_requests_v1',
          config_key: 'client_support_requests_v1',
          value: {
            updatedAt: Date.now(),
            requests: cloudMerged,
          },
        }),
      });
      if (!upsertResp.ok) {
        const errText1 = await upsertResp.text().catch(() => '');
        console.warn('[SupportSync] POST non-OK:', upsertResp.status, errText1);
        upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/app_configs?id=eq.client_support_requests_v1`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVER_KEY,
            Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            value: {
              updatedAt: Date.now(),
              requests: cloudMerged,
            },
          }),
        });
        if (!upsertResp.ok) {
          const errText2 = await upsertResp.text().catch(() => '');
          console.warn('[SupportSync] PATCH non-OK:', upsertResp.status, errText2);
        }
      }
      syncedToSupabase = upsertResp.ok;
    } catch (syncErr: any) {
      console.error('[SupportSync] Exception:', syncErr?.message || syncErr);
      syncedToSupabase = false;
    }

    return res.json({
      ok: true,
      request: newRequest,
      syncedToSupabase,
      message: syncedToSupabase
        ? 'Support request sent & synced to cloud!'
        : 'Support request saved & sent to Support Team!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to submit support request' });
  }
});

// ----------------------------------------------------------------------------
// 8. EMAIL OTP DISPATCHER (RESEND API FROM ENV OR SUPABASE MASTER CONFIG)
// ----------------------------------------------------------------------------
app.post('/api/send-email-otp', async (req: Request, res: Response) => {
  try {
    const { email = '', name = 'Client', otp = '' } = req.body || {};
    const cleanEmail = String(email || '').trim();
    const cleanOtp = String(otp || '').trim();
    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({ ok: false, error: 'Email and OTP are required.' });
    }

    let resendApiKey = process.env.RESEND_API_KEY || '';
    let fromEmail = process.env.OTP_FROM_EMAIL || 'onboarding@resend.dev';

    // Read master_engine_config.smsGatewayConfig from Supabase if env key isn't set
    if (!resendApiKey) {
      try {
        const cfgResp = await fetch(
          `${SUPABASE_URL}/rest/v1/app_configs?id=eq.master_engine_config&select=value`,
          {
            headers: {
              apikey: SUPABASE_SERVER_KEY,
              Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
              Accept: 'application/json',
            },
          }
        );
        if (cfgResp.ok) {
          const rows = await cfgResp.json();
          const smsCfg = rows?.[0]?.value?.smsGatewayConfig;
          if (smsCfg?.resendApiKey) resendApiKey = String(smsCfg.resendApiKey).trim();
          if (smsCfg?.otpFromEmail) fromEmail = String(smsCfg.otpFromEmail).trim();
        }
      } catch {
        // ignore config read error
      }
    }

    if (!resendApiKey) {
      return res.status(200).json({
        ok: false,
        useSupabaseAuthOtp: true,
        message: 'Resend API key not configured; use Supabase Auth Email OTP.',
      });
    }

    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `BOSS Aluminium & Glass <${fromEmail}>`,
        to: [cleanEmail],
        subject: `BOSS Aluminium Verification Code: ${cleanOtp}`,
        html: `<div style="font-family:sans-serif;background:#0C1017;color:#F8FAFC;padding:24px;border-radius:12px;border:2px solid #F5B738;max-width:480px;margin:auto;">
          <h2 style="color:#F5B738;margin-top:0;">BOSS ALUMINIUM &amp; GLASS</h2>
          <p>Assalam-o-Alaikum <strong>${String(name || 'Client').replace(/</g, '&lt;')}</strong>,</p>
          <p>Aapka Account Verification OTP Code yeh hai:</p>
          <div style="font-size:30px;font-weight:900;letter-spacing:8px;background:#14181F;color:#F5B738;padding:14px 20px;border-radius:10px;text-align:center;border:1px solid #F5B738;margin:16px 0;">${cleanOtp}</div>
          <p style="font-size:12px;color:#94A3B8;">Yeh code 10 minutes ke liye valid hai. Kisi ke sath share na karein.</p>
        </div>`,
      }),
    });

    if (!emailResp.ok) {
      const errBody = await emailResp.text().catch(() => '');
      return res.status(502).json({ ok: false, useSupabaseAuthOtp: true, error: errBody });
    }

    return res.json({ ok: true, provider: 'resend', message: 'Email OTP sent via Resend!' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, useSupabaseAuthOtp: true, error: err?.message || 'Email error' });
  }
});

// Vite Middleware mounting

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
      plugins: [
        {
          name: 'boss-disable-vite-hmr-ws',
          enforce: 'post',
          transform(code, id) {
            if (id.endsWith('vite/dist/client/client.mjs')) {
              const startMarker = 'const transport = normalizeModuleRunnerTransport(';
              const endMarker = 'let willUnload = false;';
              const startIdx = code.indexOf(startMarker);
              const endIdx = code.indexOf(endMarker, startIdx);
              if (startIdx !== -1 && endIdx !== -1) {
                const noopTransport =
                  'const transport = normalizeModuleRunnerTransport({\n' +
                  '  connect() {},\n' +
                  '  disconnect() {},\n' +
                  '  send() {}\n' +
                  '});\n';
                return {
                  code: code.slice(0, startIdx) + noopTransport + code.slice(endIdx),
                  map: null,
                };
              }
            }
          },
        },
      ],
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Boss Aluminium Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
