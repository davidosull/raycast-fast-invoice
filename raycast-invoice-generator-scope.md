# Raycast Invoice Generator — Full Specification

## Project Overview

A Raycast extension for generating clean, unbranded PDF invoices for **David O Builds**. Replaces a manual Google Sheets workflow (clone template → update → export → email) with a streamlined command-based flow that handles invoice creation, client management, history, and export — all locally with zero external dependencies.

### Design Principles

- **Speed first** — creating an invoice should take under 60 seconds
- **Fully local** — no API calls, no accounts, no authentication
- **Data integrity** — invoice numbers never duplicate, data persists reliably
- **Minimal UI** — leverage Raycast's native components, no over-engineering

---

## Commands

The extension exposes four commands in Raycast:

### 1. Create Invoice

**Raycast command name:** `create-invoice`
**Type:** Form view
**Description:** Create and generate a new PDF invoice

#### Form Fields

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| Client | Dropdown | Yes | — | Populated from stored clients. First option is "+ New Client" which reveals inline fields |
| New Client Name | TextField | Conditional | — | Only shown when "+ New Client" selected |
| New Client Email | TextField | Conditional | — | Only shown when "+ New Client" selected |
| New Client Address | TextArea | Conditional | — | Only shown when "+ New Client" selected. Free text, multi-line |
| Invoice Date | DatePicker | Yes | Today | |
| Due Date | DatePicker | Yes | Today + payment terms preference | Auto-calculated but editable |
| Line Items | Dynamic section | Yes (min 1) | 1 empty row | See line items detail below |
| Apply VAT | Checkbox | Yes | Value from `vatRegistered` preference | Per-invoice override |
| Notes | TextArea | No | — | Freeform. Appears at bottom of invoice |

#### Line Items

Each line item row contains:

| Field | Type | Required |
|---|---|---|
| Description | TextField | Yes |
| Quantity | TextField (number) | Yes (default: 1) |
| Rate (£) | TextField (number) | Yes |

The form should support:
- Adding rows (action or button)
- Removing rows (action on each row)
- Minimum 1 row enforced

#### On Submit — Processing Steps

1. **Validate** all required fields are populated and numeric fields are valid numbers
2. **Calculate financials:**
   - Line totals: `quantity × rate` for each item
   - Subtotal: sum of all line totals
   - VAT amount: `subtotal × (vatRate / 100)` if VAT applied, otherwise `0`
   - Total: `subtotal + vatAmount`
3. **Increment invoice counter** in LocalStorage
4. **Format invoice number** as `{prefix}-{number padded to 4 digits}` (e.g., `INV-0042`)
5. **Generate PDF** (see PDF Template section)
6. **Ensure directory exists:** `{saveLocation}/{year}/` — create if needed
7. **Write PDF** to `{saveLocation}/{year}/{invoiceNumber}.pdf`
8. **If "+ New Client" was used**, save the new client to LocalStorage
9. **Save invoice record** to LocalStorage (see Data Model)
10. **Show success** with action panel:
    - **Open PDF** — opens the file in default PDF viewer
    - **Open in Finder** — reveals the file in Finder
    - **Copy File Path** — copies full path to clipboard
    - **Compose Email** — opens `mailto:{clientEmail}?subject=Invoice {invoiceNumber} from {businessName}&body=Hi {clientFirstName},%0D%0A%0D%0APlease find attached invoice {invoiceNumber} for {total}.%0D%0A%0D%0APayment is due by {dueDate}.%0D%0A%0D%0AThanks,%0D%0A{yourName}`
    - **Copy Invoice Details** — copies a plain text summary to clipboard

#### Error Handling

- If no clients exist and user doesn't select "+ New Client", show validation error
- If line items have empty descriptions or invalid numbers, show inline validation
- If PDF generation fails, show error toast with detail
- If file write fails (permissions, disk space), show actionable error toast

---

### 2. List Invoices

**Raycast command name:** `list-invoices`
**Type:** List view
**Description:** Browse, search, and manage all issued invoices

#### List View

Each list item shows:
- **Title:** `{invoiceNumber} — {clientName}`
- **Subtitle:** `£{total}` (include "inc. VAT" or "no VAT" indicator)
- **Accessories:** Invoice date, status tag (Draft / Sent / Paid)
- **Keywords:** client name, invoice number, amount (for search)

#### Filtering

- Search by client name, invoice number, or amount
- Dropdown filter by status: All / Draft / Sent / Paid
- Dropdown filter by year

#### Actions (per invoice)

| Action | Shortcut | Description |
|---|---|---|
| Open PDF | Enter | Opens PDF in default viewer |
| Open in Finder | ⌘+O | Reveals file in Finder |
| Compose Email | ⌘+E | Opens pre-filled mailto link |
| Copy File Path | ⌘+C | Copies path to clipboard |
| Mark as Sent | ⌘+S | Updates status |
| Mark as Paid | ⌘+P | Updates status |
| Mark as Draft | ⌘+D | Resets status to draft |
| Copy Invoice Summary | ⌘+Shift+C | Plain text summary to clipboard |
| Delete Invoice | ⌘+Backspace | Confirmation required. Removes record AND PDF file |

#### Detail View (on tab or secondary action)

When viewing invoice detail, show a `Detail` component with markdown rendering of:
- Invoice number, date, due date, status
- Client details
- Line items table
- Subtotal, VAT, total
- Notes if present
- File path

---

### 3. Export Invoices

**Raycast command name:** `export-invoices`
**Type:** Form view → generates file
**Description:** Export invoice history as CSV or PDF summary

#### Form Fields

| Field | Type | Required | Default |
|---|---|---|---|
| Export Format | Dropdown | Yes | CSV |
| Date From | DatePicker | No | Start of current tax year (6 April) |
| Date To | DatePicker | No | Today |
| Filter by Client | Dropdown | No | All Clients |
| Filter by Status | Dropdown | No | All Statuses |

#### Export Formats

**CSV Export:**
Columns: `Invoice Number, Client Name, Client Email, Invoice Date, Due Date, Subtotal, VAT Amount, Total, VAT Applied, Status, Notes, PDF Path`

One row per invoice. Saved to `{saveLocation}/Exports/invoices-export-{YYYY-MM-DD}.csv`

**PDF Summary Report:**
A single PDF document containing:
- Header: "Invoice Summary — David O Builds" with date range
- Summary stats: total invoiced, total VAT, number of invoices, breakdown by status
- Table of all invoices in the period: number, client, date, subtotal, VAT, total, status
- Footer: generated date

Saved to `{saveLocation}/Exports/invoice-summary-{YYYY-MM-DD}.pdf`

#### On Submit

1. Filter invoices from LocalStorage based on form criteria
2. Generate the chosen export format
3. Ensure `{saveLocation}/Exports/` directory exists
4. Write file
5. Show success with actions: Open File, Open in Finder, Copy Path

---

### 4. Manage Clients

**Raycast command name:** `manage-clients`
**Type:** List view
**Description:** Add, edit, and remove saved clients

#### List View

Each client shows:
- **Title:** Client name
- **Subtitle:** Client email
- **Accessories:** Number of invoices issued to this client

#### Actions

| Action | Shortcut | Description |
|---|---|---|
| Edit Client | Enter | Opens edit form (push navigation) |
| Create Invoice for Client | ⌘+N | Opens Create Invoice with client pre-selected |
| View Client Invoices | ⌘+I | Filters List Invoices to this client |
| Delete Client | ⌘+Backspace | Confirmation required. Only if no invoices linked. Otherwise show warning |
| Add New Client | ⌘+N (empty state) | Opens add form |

#### Add/Edit Client Form

| Field | Type | Required |
|---|---|---|
| Name | TextField | Yes |
| Email | TextField | Yes |
| Address | TextArea | No |

---

## Extension Preferences

Configured in Raycast's extension settings panel. Set once, used across all commands.

### Business Details

| Preference | Type | Required | Default | Description |
|---|---|---|---|---|
| `businessName` | TextField | Yes | — | Trading name shown on invoices (e.g., "David O Builds") |
| `yourName` | TextField | Yes | — | Your full name for correspondence |
| `businessAddress` | TextField | Yes | — | Full address, use `\n` or commas for line breaks. Rendered multi-line on PDF |
| `businessEmail` | TextField | No | — | Contact email shown on invoice |
| `businessPhone` | TextField | No | — | Contact phone shown on invoice |

### Payment Details

| Preference | Type | Required | Default | Description |
|---|---|---|---|---|
| `bankName` | TextField | Yes | — | Bank name for payment section |
| `accountName` | TextField | Yes | — | Account holder name |
| `sortCode` | TextField | Yes | — | Sort code (XX-XX-XX format) |
| `accountNumber` | TextField | Yes | — | Account number |
| `paymentTermsDays` | TextField | Yes | 30 | Default days until payment due |
| `paymentTermsText` | TextField | No | — | Optional custom text override (e.g., "Payment due within 14 days of invoice date") |

### VAT Settings

| Preference | Type | Required | Default | Description |
|---|---|---|---|---|
| `vatRegistered` | Checkbox | Yes | false | Whether VAT is applied by default on new invoices |
| `vatRate` | TextField | Conditional | 20 | VAT percentage. Required if `vatRegistered` is true |
| `vatNumber` | TextField | Conditional | — | VAT registration number. Shown on invoice when VAT applied. Required if `vatRegistered` is true |

### Invoice Settings

| Preference | Type | Required | Default | Description |
|---|---|---|---|---|
| `invoicePrefix` | TextField | Yes | INV | Prefix before invoice number |
| `startingInvoiceNumber` | TextField | Yes | 1 | The first invoice number to use. Set this to continue an existing sequence (e.g., if last Google Sheets invoice was INV-0023, set to 24) |
| `saveLocation` | TextField | Yes | ~/Invoices | Base directory for all invoice files. Year subfolders created automatically |

---

## Data Models

All data stored via Raycast's `LocalStorage` API as JSON strings.

### Client

```typescript
interface Client {
  id: string;           // UUID v4, generated on creation
  name: string;
  email: string;
  address: string;      // Can be empty string
  createdAt: string;    // ISO 8601 datetime
  updatedAt: string;    // ISO 8601 datetime
}
```

**Storage key:** `clients`
**Storage format:** `JSON.stringify(Client[])`

### Invoice

```typescript
interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;         // In pounds, e.g., 500.00
  lineTotal: number;    // quantity × rate
}

interface Invoice {
  id: string;           // UUID v4, generated on creation
  invoiceNumber: string; // Formatted, e.g., "INV-0042"
  numberRaw: number;    // Raw number, e.g., 42 (used for counter tracking)
  clientId: string;     // References Client.id
  clientName: string;   // Denormalised for search/display without lookups
  clientEmail: string;  // Denormalised
  clientAddress: string; // Denormalised
  invoiceDate: string;  // ISO 8601 date (YYYY-MM-DD)
  dueDate: string;      // ISO 8601 date (YYYY-MM-DD)
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatApplied: boolean;
  vatRate: number;      // The rate used at time of creation (snapshot)
  vatAmount: number;
  total: number;
  notes: string;        // Can be empty string
  status: 'draft' | 'sent' | 'paid';
  pdfPath: string;      // Absolute path to generated PDF
  createdAt: string;    // ISO 8601 datetime
  updatedAt: string;    // ISO 8601 datetime
}
```

**Storage key:** `invoices`
**Storage format:** `JSON.stringify(Invoice[])`

### Invoice Counter

```typescript
interface InvoiceCounter {
  currentNumber: number; // The last used invoice number
}
```

**Storage key:** `invoiceCounter`
**Storage format:** `JSON.stringify(InvoiceCounter)`

**Initialisation logic:**
- On first ever invoice creation, check if `invoiceCounter` exists in storage
- If not, initialise `currentNumber` to `startingInvoiceNumber - 1` from preferences
- On each invoice creation, increment by 1 before use
- The counter should NEVER be decremented, even if an invoice is deleted (to prevent number reuse)

---

## PDF Template — Invoice Layout

### Page Setup

- **Size:** A4 (595.28 × 841.89 points)
- **Margins:** 50pt all sides
- **Font:** Helvetica (built into pdfkit, no external fonts needed)
- **Colours:** Black text only. No brand colours. Light grey (#CCCCCC) for table lines and separators

### Layout Structure (top to bottom)

#### 1. Header Section

**Left column:**
- Business name — 18pt bold
- Business address — 10pt regular, each line on new line
- Business email — 10pt regular (if set)
- Business phone — 10pt regular (if set)

**Right column (right-aligned):**
- "INVOICE" — 24pt bold, all caps
- Invoice number — 12pt regular
- Invoice date — 10pt regular, format: "1 February 2026"
- Due date — 10pt regular, format: "3 March 2026"

#### 2. Separator

- 1pt light grey horizontal line
- 15pt vertical space

#### 3. Bill To Section

- "Bill To" — 10pt bold, grey (#666666)
- Client name — 12pt bold
- Client address — 10pt regular (if present, each line on new line)
- Client email — 10pt regular

#### 4. Spacer

- 25pt vertical space

#### 5. Line Items Table

**Table header row:**
- Background: light grey (#F5F5F5)
- Columns: Description (left, flex), Qty (right, 60pt), Rate (right, 80pt), Amount (right, 80pt)
- Font: 10pt bold
- 0.5pt bottom border

**Table body rows:**
- Font: 10pt regular
- Each row has 0.5pt bottom border in light grey
- Padding: 8pt vertical per row
- Numbers right-aligned
- Rate and Amount formatted as `£X,XXX.XX`
- Quantity formatted as integer or to 2dp if decimal

#### 6. Totals Section (right-aligned, below table)

- 15pt space after last line item
- Subtotal row: "Subtotal" label + `£X,XXX.XX` — 10pt regular
- VAT row (only if VAT applied): "VAT ({rate}%)" label + `£X,XXX.XX` — 10pt regular
- 0.5pt separator line above total
- Total row: "Total" label + `£X,XXX.XX` — 14pt bold
- If VAT applied, small text below total: "VAT Registration: {vatNumber}" — 8pt grey

#### 7. Spacer

- 30pt vertical space

#### 8. Payment Details Section

- "Payment Details" — 10pt bold
- Bank: {bankName} — 10pt regular
- Account Name: {accountName} — 10pt regular
- Sort Code: {sortCode} — 10pt regular
- Account Number: {accountNumber} — 10pt regular
- 10pt space
- Payment terms text — 10pt regular. Either custom text from preferences or auto-generated: "Payment due within {paymentTermsDays} days of invoice date"

#### 9. Notes Section (only if notes present)

- 20pt space
- "Notes" — 10pt bold
- Notes text — 10pt regular, wrapping naturally

#### 10. Footer

- Positioned at bottom of page
- Separator line
- Business name — 8pt grey, centred

---

## File Structure

```
raycast-invoice-generator/
├── package.json
├── tsconfig.json
├── src/
│   ├── create-invoice.tsx          # Create Invoice command
│   ├── list-invoices.tsx           # List Invoices command
│   ├── export-invoices.tsx         # Export Invoices command
│   ├── manage-clients.tsx          # Manage Clients command
│   ├── lib/
│   │   ├── storage.ts              # LocalStorage helpers (CRUD for clients, invoices, counter)
│   │   ├── pdf-generator.ts        # PDF generation using pdfkit
│   │   ├── csv-generator.ts        # CSV export logic
│   │   ├── pdf-summary-generator.ts # PDF summary report generation
│   │   ├── calculations.ts         # Financial calculations (line totals, VAT, etc.)
│   │   ├── formatters.ts           # Number formatting (currency), date formatting, invoice number formatting
│   │   ├── types.ts                # TypeScript interfaces (Client, Invoice, etc.)
│   │   └── constants.ts            # Default values, storage keys
│   └── components/
│       ├── LineItemForm.tsx         # Reusable line item input section
│       ├── InvoiceDetail.tsx        # Detail view for invoice
│       └── ClientForm.tsx           # Reusable client add/edit form
└── assets/
    └── command-icon.png            # Extension icon
```

---

## Package Configuration

### package.json

```json
{
  "name": "invoice-generator",
  "title": "Invoice Generator",
  "description": "Generate clean PDF invoices quickly",
  "icon": "command-icon.png",
  "author": "davidobuilds",
  "categories": ["Finance", "Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "create-invoice",
      "title": "Create Invoice",
      "subtitle": "Invoice Generator",
      "description": "Create and generate a new PDF invoice",
      "mode": "view"
    },
    {
      "name": "list-invoices",
      "title": "List Invoices",
      "subtitle": "Invoice Generator",
      "description": "Browse and manage issued invoices",
      "mode": "view"
    },
    {
      "name": "export-invoices",
      "title": "Export Invoices",
      "subtitle": "Invoice Generator",
      "description": "Export invoice history as CSV or PDF summary",
      "mode": "view"
    },
    {
      "name": "manage-clients",
      "title": "Manage Clients",
      "subtitle": "Invoice Generator",
      "description": "Add, edit, and remove saved clients",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "businessName",
      "title": "Business Name",
      "description": "Your trading name shown on invoices",
      "type": "textfield",
      "required": true
    },
    {
      "name": "yourName",
      "title": "Your Name",
      "description": "Your full name for email correspondence",
      "type": "textfield",
      "required": true
    },
    {
      "name": "businessAddress",
      "title": "Business Address",
      "description": "Full address shown on invoices. Use commas to separate lines.",
      "type": "textfield",
      "required": true
    },
    {
      "name": "businessEmail",
      "title": "Business Email",
      "description": "Contact email shown on invoices",
      "type": "textfield",
      "required": false
    },
    {
      "name": "businessPhone",
      "title": "Business Phone",
      "description": "Contact phone shown on invoices",
      "type": "textfield",
      "required": false
    },
    {
      "name": "bankName",
      "title": "Bank Name",
      "description": "Bank name for payment details",
      "type": "textfield",
      "required": true
    },
    {
      "name": "accountName",
      "title": "Account Name",
      "description": "Account holder name",
      "type": "textfield",
      "required": true
    },
    {
      "name": "sortCode",
      "title": "Sort Code",
      "description": "Sort code in XX-XX-XX format",
      "type": "textfield",
      "required": true
    },
    {
      "name": "accountNumber",
      "title": "Account Number",
      "description": "Bank account number",
      "type": "textfield",
      "required": true
    },
    {
      "name": "paymentTermsDays",
      "title": "Payment Terms (Days)",
      "description": "Default number of days until payment is due",
      "type": "textfield",
      "required": true,
      "default": "30"
    },
    {
      "name": "paymentTermsText",
      "title": "Payment Terms Text",
      "description": "Optional custom payment terms text. Leave blank to auto-generate from days.",
      "type": "textfield",
      "required": false
    },
    {
      "name": "vatRegistered",
      "title": "VAT Registered",
      "description": "Whether VAT is applied by default on new invoices",
      "type": "checkbox",
      "required": true,
      "default": false,
      "label": "Apply VAT by default"
    },
    {
      "name": "vatRate",
      "title": "VAT Rate (%)",
      "description": "VAT percentage rate",
      "type": "textfield",
      "required": false,
      "default": "20"
    },
    {
      "name": "vatNumber",
      "title": "VAT Number",
      "description": "VAT registration number shown on invoices when VAT is applied",
      "type": "textfield",
      "required": false
    },
    {
      "name": "invoicePrefix",
      "title": "Invoice Prefix",
      "description": "Prefix before invoice number (e.g., INV)",
      "type": "textfield",
      "required": true,
      "default": "INV"
    },
    {
      "name": "startingInvoiceNumber",
      "title": "Starting Invoice Number",
      "description": "First invoice number to use. Set to continue an existing sequence (e.g., 24 if last invoice was INV-0023)",
      "type": "textfield",
      "required": true,
      "default": "1"
    },
    {
      "name": "saveLocation",
      "title": "Invoice Save Location",
      "description": "Base directory for invoice files. Year subfolders are created automatically.",
      "type": "directory",
      "required": true,
      "default": "~/Invoices"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.83.0",
    "pdfkit": "^0.15.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/pdfkit": "^0.13.0",
    "@types/uuid": "^10.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0"
  }
}
```

---

## Key Implementation Notes

### Invoice Number Uniqueness

The invoice counter is the single source of truth. The flow must be:

1. Read current counter from storage
2. If counter doesn't exist, initialise to `startingInvoiceNumber - 1`
3. Increment by 1
4. Use the new number for the invoice
5. Save the updated counter to storage
6. **Then** save the invoice record

This ordering prevents duplicate numbers if something fails mid-process. If the invoice record fails to save after the counter has incremented, we skip a number rather than risk a duplicate. That's the safer failure mode.

### Invoice Number Formatting

```typescript
function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(4, '0')}`;
}
// "INV" + 42 → "INV-0042"
```

### Currency Formatting

```typescript
function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
// 1500 → "£1,500.00"
```

### Date Formatting

```typescript
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
// "2026-02-07" → "7 February 2026"
```

### Address Parsing

Business address in preferences uses commas as line separators:

```typescript
function parseAddress(address: string): string[] {
  return address.split(',').map(line => line.trim()).filter(Boolean);
}
// "123 Street, Town, County, AB1 2CD" → ["123 Street", "Town", "County", "AB1 2CD"]
```

### Save Location Path Resolution

The `saveLocation` preference may contain `~`. Resolve before use:

```typescript
import { homedir } from 'os';
import path from 'path';

function resolveSaveLocation(saveLocation: string): string {
  if (saveLocation.startsWith('~')) {
    return path.join(homedir(), saveLocation.slice(1));
  }
  return saveLocation;
}
```

### Mailto Link Construction

```typescript
function buildMailtoLink(invoice: Invoice, preferences: Preferences): string {
  const firstName = invoice.clientName.split(' ')[0];
  const subject = encodeURIComponent(
    `Invoice ${invoice.invoiceNumber} from ${preferences.businessName}`
  );
  const body = encodeURIComponent(
    `Hi ${firstName},\n\nPlease find attached invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total)}.\n\nPayment is due by ${formatDate(invoice.dueDate)}.\n\nThanks,\n${preferences.yourName}`
  );
  return `mailto:${invoice.clientEmail}?subject=${subject}&body=${body}`;
}
```

### Storage Helper Pattern

All storage operations should follow this pattern for consistency:

```typescript
import { LocalStorage } from "@raycast/api";

const STORAGE_KEYS = {
  clients: 'clients',
  invoices: 'invoices',
  invoiceCounter: 'invoiceCounter',
} as const;

async function getClients(): Promise<Client[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.clients);
  return data ? JSON.parse(data) : [];
}

async function saveClients(clients: Client[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients));
}

async function getInvoices(): Promise<Invoice[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.invoices);
  return data ? JSON.parse(data) : [];
}

async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
}

async function getNextInvoiceNumber(startingNumber: number): Promise<number> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.invoiceCounter);
  const counter: InvoiceCounter = data
    ? JSON.parse(data)
    : { currentNumber: startingNumber - 1 };
  const nextNumber = counter.currentNumber + 1;
  await LocalStorage.setItem(
    STORAGE_KEYS.invoiceCounter,
    JSON.stringify({ currentNumber: nextNumber })
  );
  return nextNumber;
}
```

### PDFKit Integration Notes

- `pdfkit` is a pure Node.js library, no native binaries — works in Raycast's environment
- Use `doc.pipe(fs.createWriteStream(path))` for writing
- Wrap generation in a Promise that resolves on the stream's `finish` event
- Built-in fonts: Helvetica, Helvetica-Bold — no need to bundle custom fonts
- Use `doc.text()` with options for alignment: `{ align: 'right' }`
- Use `doc.fontSize()` to change sizes between sections
- Table drawing is manual — position text with `doc.text(text, x, y)` and draw lines with `doc.moveTo(x,y).lineTo(x,y).stroke()`

---

## Testing Plan

### Prerequisites

1. Install Raycast (macOS)
2. Clone the extension repo
3. Run `npm install`
4. Run `npm run dev` to load in Raycast
5. Configure ALL extension preferences in Raycast settings before testing

### Test Data for Preferences

Use these values for consistent testing:

```
Business Name: David O Builds
Your Name: David O
Business Address: 123 Test Street, Testville, Lancashire, TE1 2ST
Business Email: test@davidobuilds.com
Business Phone: 07700 900000
Bank Name: Test Bank
Account Name: David O
Sort Code: 12-34-56
Account Number: 12345678
Payment Terms (Days): 30
VAT Registered: true
VAT Rate: 20
VAT Number: GB123456789
Invoice Prefix: INV
Starting Invoice Number: 1
Save Location: ~/Invoices-Test
```

---

### Test Suite

#### T1: Extension Setup & Preferences

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T1.1 | Extension loads | Open Raycast, search "Create Invoice" | Command appears in results |
| T1.2 | All commands visible | Search "Invoice" in Raycast | All 4 commands appear: Create Invoice, List Invoices, Export Invoices, Manage Clients |
| T1.3 | Preferences accessible | Open extension preferences in Raycast settings | All preference fields shown with correct types and defaults |
| T1.4 | Required prefs enforced | Leave required preferences blank, try to run a command | Extension prompts to fill in required preferences |

#### T2: Client Management

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T2.1 | Empty state | Open Manage Clients with no clients saved | Empty state shown with prompt to add a client |
| T2.2 | Add client | Add client: "Test Corp", "billing@testcorp.com", "1 Business Park, London, EC1A 1BB" | Client appears in list |
| T2.3 | Add client (no address) | Add client: "Freelance Client", "freelancer@email.com", leave address blank | Client saved successfully without address |
| T2.4 | Edit client | Edit Test Corp's email to "accounts@testcorp.com" | Updated email shown in list |
| T2.5 | Persistence | Close and reopen Manage Clients | Both clients still present |
| T2.6 | Delete client (no invoices) | Delete "Freelance Client" (confirm) | Client removed from list |
| T2.7 | Delete client (has invoices) | Try to delete client that has invoices | Warning shown, deletion prevented or requires extra confirmation |

#### T3: Invoice Creation

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T3.1 | Form loads | Open Create Invoice | Form shown with client dropdown, date fields defaulted, one empty line item row |
| T3.2 | Client dropdown | Click client dropdown | Shows saved clients and "+ New Client" option |
| T3.3 | Client selection | Select "Test Corp" | Email and address auto-populated (not editable in form) |
| T3.4 | New client inline | Select "+ New Client" | Name, email, address fields appear in form |
| T3.5 | Due date auto-calc | Change invoice date | Due date recalculates based on payment terms |
| T3.6 | Single line item | Fill: "Website Development", Qty: 1, Rate: 2500 | Form accepts input |
| T3.7 | Multiple line items | Add second line: "Hosting Setup", Qty: 1, Rate: 150. Add third: "Domain Registration", Qty: 2, Rate: 15 | Three line items visible |
| T3.8 | Submit (with VAT) | Submit with VAT checkbox on | PDF generated. Subtotal: £2,680.00. VAT (20%): £536.00. Total: £2,816.00 [sic — actual: Subtotal £2,680, VAT £536, Total £3,216] |
| T3.9 | Submit (without VAT) | Create new invoice with VAT off | PDF generated with no VAT line. Total equals subtotal |
| T3.10 | Invoice numbering | Check invoice numbers of T3.8 and T3.9 | First is INV-0001, second is INV-0002 |
| T3.11 | File location | Check file system | PDF at ~/Invoices-Test/2026/INV-0001.pdf |
| T3.12 | Directory creation | Delete ~/Invoices-Test folder, create new invoice | Directory structure recreated automatically |
| T3.13 | Success actions | After submit, check action panel | Open PDF, Open in Finder, Copy Path, Compose Email all present and working |
| T3.14 | Mailto link | Use Compose Email action | Default mail client opens with correct recipient, subject, body |
| T3.15 | New client saved | After creating invoice with "+ New Client", open Manage Clients | New client appears in client list |
| T3.16 | Validation (empty) | Try to submit with no line item description | Validation error shown |
| T3.17 | Validation (invalid number) | Enter "abc" as quantity | Validation error shown |
| T3.18 | Decimal quantities | Line item with quantity 1.5, rate 100 | Line total: £150.00 |
| T3.19 | Large amounts | Line item with rate 25000, quantity 3 | Formatted as £75,000.00 on PDF with comma separator |
| T3.20 | Notes field | Add notes "Project ref: WEB-2026-001" | Notes appear at bottom of PDF |
| T3.21 | No notes | Leave notes blank | No notes section on PDF |

#### T4: PDF Output Quality

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T4.1 | Visual check | Open generated PDF | Clean layout matching template spec. No overlapping text, correct alignment |
| T4.2 | Business details | Check header | Business name, address, email, phone all present and correct |
| T4.3 | Invoice details | Check right side of header | Invoice number, date, due date correct and right-aligned |
| T4.4 | Client details | Check Bill To section | Client name, address, email correct |
| T4.5 | Line items table | Check table | Headers present, all items listed, amounts correct, right-aligned |
| T4.6 | Totals | Check totals section | Subtotal, VAT, Total all mathematically correct |
| T4.7 | VAT number | Check VAT invoice | VAT registration number shown below total |
| T4.8 | No VAT | Check non-VAT invoice | No VAT line, no VAT number |
| T4.9 | Payment details | Check payment section | Bank name, account name, sort code, account number, payment terms all present |
| T4.10 | Long line items | Create invoice with a very long description (100+ chars) | Text wraps cleanly, doesn't overflow into other columns |
| T4.11 | Many line items | Create invoice with 15+ line items | Items flow correctly, page break if needed |
| T4.12 | Footer | Check bottom of page | Business name centred at bottom |

#### T5: List Invoices

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T5.1 | List populated | Open List Invoices after creating test invoices | All invoices shown in reverse chronological order |
| T5.2 | Search by client | Type client name in search | Results filtered correctly |
| T5.3 | Search by number | Type "0001" in search | Matching invoice shown |
| T5.4 | Status filter | Filter by "Draft" | Only draft invoices shown |
| T5.5 | Mark as Sent | Use action on an invoice | Status changes to "Sent" |
| T5.6 | Mark as Paid | Use action on a sent invoice | Status changes to "Paid" |
| T5.7 | Status persistence | Close and reopen List Invoices | Status changes persisted |
| T5.8 | Open PDF action | Press Enter on an invoice | PDF opens in default viewer |
| T5.9 | Detail view | View invoice detail | All invoice information displayed correctly in markdown |
| T5.10 | Delete invoice | Delete an invoice (confirm) | Removed from list, PDF file deleted from disk |
| T5.11 | Empty state | Delete all invoices | Empty state shown with prompt |

#### T6: Export Invoices

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T6.1 | CSV export (all) | Export all invoices as CSV | CSV file created at ~/Invoices-Test/Exports/ with all expected columns |
| T6.2 | CSV content | Open CSV in text editor | All invoices present, amounts correct, proper comma escaping |
| T6.3 | CSV date filter | Export with date range that excludes some invoices | Only matching invoices in CSV |
| T6.4 | CSV client filter | Export filtered to specific client | Only that client's invoices |
| T6.5 | PDF summary | Export all invoices as PDF summary | PDF created with header, stats, and table |
| T6.6 | PDF summary content | Open PDF summary | Total invoiced amount correct, number of invoices correct, status breakdown correct |
| T6.7 | Export empty | Try to export with filters that match no invoices | Friendly message: "No invoices match the selected filters" |
| T6.8 | Export directory | Check file system | Exports saved to ~/Invoices-Test/Exports/ |

#### T7: Edge Cases & Error Handling

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T7.1 | First run (no data) | Fresh install, open each command | All commands handle empty state gracefully |
| T7.2 | Invoice with deleted client | Delete a client, then view their invoices | Invoices still display correctly using denormalised data |
| T7.3 | Counter continuity | Create INV-0001, delete it, create another | New invoice is INV-0002 (counter never decrements) |
| T7.4 | Starting number override | Set starting number to 50, create invoice | First invoice is INV-0050 |
| T7.5 | Special characters in client name | Client name with apostrophe: "O'Brien Ltd" | Handled correctly in PDF, filename, and mailto |
| T7.6 | Special characters in notes | Notes with &, <, >, quotes | Rendered correctly in PDF |
| T7.7 | Pound sign in amounts | Check all currency displays | £ symbol renders correctly in PDF |
| T7.8 | Zero amount line | Quantity: 1, Rate: 0 | Allowed, shows £0.00 |
| T7.9 | Very long client address | Address with 5+ lines | PDF layout handles it without overlap |
| T7.10 | Year rollover | Create invoices in different years | Files sorted into correct year folders |
| T7.11 | Preference changes | Change business name, create new invoice | New invoice uses updated name. Old invoices/PDFs unchanged |
| T7.12 | Permission error | Set save location to a read-only directory | Clear error message indicating permission issue |

#### T8: Performance

| # | Test | Steps | Expected Result |
|---|---|---|---|
| T8.1 | Invoice creation speed | Time from submit to success toast | Under 3 seconds |
| T8.2 | List load with many invoices | Create 50+ invoices, open List Invoices | List loads in under 2 seconds |
| T8.3 | Export large dataset | Export 50+ invoices to CSV | Completes in under 5 seconds |
| T8.4 | Search responsiveness | Type in List Invoices search with 50+ invoices | Results filter in real-time, no lag |

---

## Out of Scope (v1)

- Xero integration
- Email sending (mailto only)
- Multi-currency
- Logo/branding customisation
- Recurring invoices
- Payment tracking beyond manual status changes
- Multiple business profiles
- Credit notes
- Partial payments
- Invoice editing after creation (create a new one instead)
- Cloud sync / backup
- Tax reporting

## Future Considerations (v2+)

- Branding options (logo, colours, font) for public release
- Multiple business profiles with profile switcher
- Recurring invoice schedules
- Overdue alerts / reminders
- Dashboard command with stats (total invoiced this month/quarter/year)
- Invoice editing and PDF regeneration
- Duplicate invoice action (prefills form from existing invoice)
- Credit notes linked to invoices
- Public Raycast Store submission
- Optional Xero sync for dual-track invoicing
