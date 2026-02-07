export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  lineTotal: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  numberRaw: number;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatApplied: boolean;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string;
  status: InvoiceStatus;
  pdfPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceCounter {
  currentNumber: number;
}

export interface Preferences {
  businessName: string;
  yourName: string;
  businessAddress: string;
  businessEmail?: string;
  businessPhone?: string;
  bankName: string;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  paymentTermsDays: string;
  paymentTermsText?: string;
  vatRegistered: boolean;
  vatRate: string;
  vatNumber?: string;
  invoicePrefix: string;
  startingInvoiceNumber: string;
  saveLocation: string;
}
