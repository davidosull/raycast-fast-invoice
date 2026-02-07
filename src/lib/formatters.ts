import { homedir } from "os";
import path from "path";
import { Invoice, Preferences } from "./types";

export function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatInvoiceNumber(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, "0")}`;
}

export function parseAddress(address: string): string[] {
  return address
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolveSaveLocation(saveLocation: string): string {
  if (saveLocation.startsWith("~")) {
    return path.join(homedir(), saveLocation.slice(1));
  }
  return saveLocation;
}

export function buildMailtoLink(invoice: Invoice, preferences: Preferences): string {
  const firstName = invoice.clientName.split(" ")[0];
  const subject = encodeURIComponent(
    `Invoice ${invoice.invoiceNumber} from ${preferences.businessName}`
  );
  const body = encodeURIComponent(
    `Hi ${firstName},\n\nPlease find attached invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total)}.\n\nPayment is due by ${formatDate(invoice.dueDate)}.\n\nThanks,\n${preferences.yourName}`
  );
  return `mailto:${invoice.clientEmail}?subject=${subject}&body=${body}`;
}

export function buildInvoiceSummary(invoice: Invoice): string {
  const lines = [
    `Invoice: ${invoice.invoiceNumber}`,
    `Client: ${invoice.clientName}`,
    `Date: ${formatDate(invoice.invoiceDate)}`,
    `Due: ${formatDate(invoice.dueDate)}`,
    "",
    ...invoice.lineItems.map(
      (item) =>
        `${item.description} — ${item.quantity} × ${formatCurrency(item.rate)} = ${formatCurrency(item.lineTotal)}`
    ),
    "",
    `Subtotal: ${formatCurrency(invoice.subtotal)}`,
  ];

  if (invoice.vatApplied) {
    lines.push(`VAT (${invoice.vatRate}%): ${formatCurrency(invoice.vatAmount)}`);
  }

  lines.push(`Total: ${formatCurrency(invoice.total)}`);
  lines.push(`Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`);

  return lines.join("\n");
}
