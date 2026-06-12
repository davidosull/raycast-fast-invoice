/**
 * Standalone PDF preview script.
 * Run: npx ts-node preview-pdf.ts
 * Opens the generated PDF automatically.
 */

import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const LIGHT_GREY = "#E5E5E5";
const MID_GREY = "#999999";
const BLACK = "#000000";

const W = 595.28;
const H = 841.89;
const M = 50; // margin
const CW = W - M * 2; // content width

// --- Sample data ---
const invoice = {
  invoiceNumber: "INV-0042",
  invoiceDate: "2026-02-07",
  dueDate: "2026-03-09",
  clientName: "Test Corp",
  clientEmail: "billing@testcorp.com",
  clientAddress: "1 Business Park, London, EC1A 1BB",
  lineItems: [
    { description: "Website Development", quantity: 1, rate: 2500, lineTotal: 2500 },
    { description: "Hosting Setup", quantity: 1, rate: 150, lineTotal: 150 },
    { description: "Domain Registration", quantity: 2, rate: 15, lineTotal: 30 },
  ],
  subtotal: 2680,
  vatApplied: true,
  vatRate: 20,
  vatAmount: 536,
  total: 3216,
  notes: "Project ref: WEB-2026-001",
};

const prefs = {
  businessName: "David O Builds",
  businessAddress: "123 Test Street, Testville, Lancashire, TE1 2ST",
  businessEmail: "test@davidobuilds.com",
  businessPhone: "07700 900000",
  bankName: "Test Bank",
  accountName: "David O",
  sortCode: "12-34-56",
  accountNumber: "12345678",
  paymentTermsDays: "30",
  paymentTermsText: "",
  vatNumber: "GB123456789",
};

function fmt(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function addr(address: string): string[] {
  return address.split(",").map((l) => l.trim()).filter(Boolean);
}

// --- Table column layout ---
const TABLE_RIGHT = W - M;
const COL_AMOUNT_W = 70;
const COL_RATE_W = 70;
const COL_QTY_W = 40;
const COL_AMOUNT_X = TABLE_RIGHT - COL_AMOUNT_W;
const COL_RATE_X = COL_AMOUNT_X - COL_RATE_W;
const COL_QTY_X = COL_RATE_X - COL_QTY_W;
const COL_DESC_X = M;
const COL_DESC_W = COL_QTY_X - COL_DESC_X - 8;

// --- Generate ---
const outPath = path.join(__dirname, "preview-invoice.pdf");
const doc = new PDFDocument({ size: "A4", margins: { top: M, bottom: M, left: M, right: M } });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

let y = M;

// ── INVOICE title + number (top right) ──
doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK);
doc.text("INVOICE", M, y, { width: CW, align: "right" });
y += 14;
doc.font("Helvetica").fontSize(9).fillColor(MID_GREY);
doc.text(invoice.invoiceNumber, M, y, { width: CW, align: "right" });

// ── Business name (top left, same baseline as INVOICE) ──
doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK).text(prefs.businessName, M, M);

y += 24;

// ── Divider ──
doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
y += 20;

// ── Two-column: From / To ──
const colLeft = M;
const colRight = M + CW / 2 + 20;

// From
doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("From", colLeft, y);
y += 12;
const fromStartY = y;
doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
for (const line of addr(prefs.businessAddress)) {
  doc.text(line, colLeft, y);
  y += 12;
}
if (prefs.businessEmail) { doc.text(prefs.businessEmail, colLeft, y); y += 12; }
if (prefs.businessPhone) { doc.text(prefs.businessPhone, colLeft, y); y += 12; }

// To (right column, same start Y)
let ry = fromStartY - 12;
doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("To", colRight, ry);
ry += 12;
doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BLACK).text(invoice.clientName, colRight, ry);
ry += 12;
if (invoice.clientAddress) {
  doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
  for (const line of addr(invoice.clientAddress)) { doc.text(line, colRight, ry); ry += 12; }
}
doc.font("Helvetica").fontSize(8.5).fillColor(BLACK).text(invoice.clientEmail, colRight, ry);
ry += 12;

y = Math.max(y, ry) + 8;

// ── Date / Due row ──
doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("Date", colLeft, y);
doc.text("Due", colRight, y);
y += 12;
doc.font("Helvetica").fontSize(8.5).fillColor(BLACK).text(fmtDate(invoice.invoiceDate), colLeft, y);
doc.text(fmtDate(invoice.dueDate), colRight, y);
y += 20;

// ── Divider ──
doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
y += 16;

// ── Line items table header ──
doc.font("Helvetica").fontSize(7).fillColor(MID_GREY);
doc.text("Description", COL_DESC_X, y, { width: COL_DESC_W });
doc.text("Qty", COL_QTY_X, y, { width: COL_QTY_W, align: "right" });
doc.text("Rate", COL_RATE_X, y, { width: COL_RATE_W, align: "right" });
doc.text("Amount", COL_AMOUNT_X, y, { width: COL_AMOUNT_W, align: "right" });
y += 14;
doc.moveTo(M, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
y += 2;

// ── Table rows ──
doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
for (const item of invoice.lineItems) {
  const descH = doc.heightOfString(item.description, { width: COL_DESC_W });
  const rowH = Math.max(descH + 10, 20);
  const ty = y + 5;
  doc.text(item.description, COL_DESC_X, ty, { width: COL_DESC_W });
  const qtyStr = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2);
  doc.text(qtyStr, COL_QTY_X, ty, { width: COL_QTY_W, align: "right" });
  doc.text(fmt(item.rate), COL_RATE_X, ty, { width: COL_RATE_W, align: "right" });
  doc.text(fmt(item.lineTotal), COL_AMOUNT_X, ty, { width: COL_AMOUNT_W, align: "right" });
  y += rowH;
  doc.moveTo(M, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
  y += 2;
}

// ── Totals ──
y += 10;
const totLabelX = COL_RATE_X;
const totValX = COL_AMOUNT_X;

doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
doc.text("Subtotal", totLabelX, y, { width: COL_RATE_W, align: "right" });
doc.text(fmt(invoice.subtotal), totValX, y, { width: COL_AMOUNT_W, align: "right" });
y += 14;

if (invoice.vatApplied) {
  doc.text(`VAT (${invoice.vatRate}%)`, totLabelX, y, { width: COL_RATE_W, align: "right" });
  doc.text(fmt(invoice.vatAmount), totValX, y, { width: COL_AMOUNT_W, align: "right" });
  y += 14;
}

y += 2;
doc.moveTo(totLabelX, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
y += 8;
doc.font("Helvetica-Bold").fontSize(9);
doc.text("Total", totLabelX, y, { width: COL_RATE_W, align: "right" });
doc.text(fmt(invoice.total), totValX, y, { width: COL_AMOUNT_W, align: "right" });
y += 18;

if (invoice.vatApplied && prefs.vatNumber) {
  doc.font("Helvetica").fontSize(7).fillColor(MID_GREY);
  doc.text(`VAT Registration: ${prefs.vatNumber}`, totLabelX, y, { width: TABLE_RIGHT - totLabelX, align: "right" });
  y += 14;
}

// ── Payment details ──
y += 24;
doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("Payment Details", M, y);
y += 12;
doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
doc.text(`${prefs.bankName}  ·  ${prefs.accountName}  ·  ${prefs.sortCode}  ·  ${prefs.accountNumber}`, M, y, { width: CW });
y += 14;
const terms = prefs.paymentTermsText || `Payment due within ${prefs.paymentTermsDays} days of invoice date`;
doc.font("Helvetica").fontSize(8).fillColor(MID_GREY).text(terms, M, y, { width: CW });
y += 12;

// ── Notes ──
if (invoice.notes) {
  y += 14;
  doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("Notes", M, y);
  y += 12;
  doc.font("Helvetica").fontSize(8.5).fillColor(BLACK).text(invoice.notes, M, y, { width: CW });
}

// ── Footer ──
const footerY = H - M - 10;
doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text(prefs.businessName, M, footerY, { width: CW, align: "center" });

doc.end();

stream.on("finish", () => {
  console.log(`Preview saved to: ${outPath}`);
  require("child_process").execSync(`open "${outPath}"`);
});
