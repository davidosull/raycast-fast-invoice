/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Business Name - Your trading name shown on invoices */
  "businessName": string,
  /** Your Name - Your full name for email correspondence */
  "yourName": string,
  /** Business Address - Full address shown on invoices. Use commas to separate lines. */
  "businessAddress": string,
  /** Business Email - Contact email shown on invoices */
  "businessEmail": string,
  /** Business Phone - Contact phone shown on invoices */
  "businessPhone": string,
  /** Bank Name - Bank details are printed on invoices so clients can pay you directly */
  "bankName": string,
  /** Account Name - Account holder name */
  "accountName": string,
  /** Sort Code - Sort code in XX-XX-XX format */
  "sortCode": string,
  /** Account Number - Bank account number */
  "accountNumber": string,
  /** Payment Terms (Days) - Default number of days until payment is due */
  "paymentTermsDays": string,
  /** Payment Terms Text - Optional custom payment terms text. Leave blank to auto-generate from days. */
  "paymentTermsText"?: string,
  /** VAT Registered - Whether VAT is applied by default on new invoices */
  "vatRegistered": boolean,
  /** VAT Rate (%) - VAT percentage rate */
  "vatRate": string,
  /** VAT Number - VAT registration number shown on invoices when VAT is applied */
  "vatNumber"?: string,
  /** Invoice Prefix - Prefix before invoice number (e.g., INV) */
  "invoicePrefix": string,
  /** Starting Invoice Number - First invoice number to use. Set to continue an existing sequence (e.g., 24 if last invoice was INV-0023) */
  "startingInvoiceNumber": string,
  /** Currency - ISO 4217 currency code for invoice amounts (e.g., GBP, EUR, USD) */
  "currencyCode": string,
  /** Invoice Save Location - Base directory for invoice files. Year subfolders are created automatically. */
  "saveLocation": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `create-invoice` command */
  export type CreateInvoice = ExtensionPreferences & {}
  /** Preferences accessible in the `list-invoices` command */
  export type ListInvoices = ExtensionPreferences & {}
  /** Preferences accessible in the `export-invoices` command */
  export type ExportInvoices = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-clients` command */
  export type ManageClients = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `create-invoice` command */
  export type CreateInvoice = {}
  /** Arguments passed to the `list-invoices` command */
  export type ListInvoices = {}
  /** Arguments passed to the `export-invoices` command */
  export type ExportInvoices = {}
  /** Arguments passed to the `manage-clients` command */
  export type ManageClients = {}
}

