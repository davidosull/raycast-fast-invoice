import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  open,
  showInFinder,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { calculateInvoiceTotals, calculateLineTotal } from "./lib/calculations";
import { formatCurrency, formatDate, formatInvoiceNumber, buildMailtoLink, buildInvoiceSummary } from "./lib/formatters";
import { generateInvoicePDF } from "./lib/pdf-generator";
import { addClient, addInvoice, getClients, getNextInvoiceNumber } from "./lib/storage";
import { Client, Invoice, InvoiceLineItem, Preferences } from "./lib/types";

const NEW_CLIENT_ID = "__new__";

export default function CreateInvoice() {
  const preferences = getPreferenceValues<Preferences>();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [lineItemCount, setLineItemCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [successInvoice, setSuccessInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    getClients().then((data) => {
      setClients(data);
      setIsLoading(false);
    });
  }, []);

  if (successInvoice) {
    return (
      <Detail
        markdown={`# Invoice Created\n\n${buildInvoiceSummary(successInvoice)}\n\n**PDF saved to:** \`${successInvoice.pdfPath}\``}
        actions={
          <ActionPanel>
            <Action title="Open PDF" icon={Icon.Document} onAction={() => open(successInvoice.pdfPath)} />
            <Action title="Open in Finder" icon={Icon.Finder} onAction={() => showInFinder(successInvoice.pdfPath)} />
            <Action
              title="Copy File Path"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(successInvoice.pdfPath);
                await showToast({ style: Toast.Style.Success, title: "Path copied" });
              }}
            />
            <Action.OpenInBrowser
              title="Compose Email"
              icon={Icon.Envelope}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              url={buildMailtoLink(successInvoice, preferences)}
            />
            <Action
              title="Copy Invoice Summary"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(buildInvoiceSummary(successInvoice));
                await showToast({ style: Toast.Style.Success, title: "Summary copied" });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: Record<string, string | boolean | Date>) {
    // --- Validate client ---
    const clientId = values.clientId as string;
    let client: Client;

    if (clientId === NEW_CLIENT_ID) {
      const newName = (values.newClientName as string || "").trim();
      const newEmail = (values.newClientEmail as string || "").trim();
      const newAddress = (values.newClientAddress as string || "").trim();

      if (!newName) {
        await showToast({ style: Toast.Style.Failure, title: "Client name is required" });
        return;
      }
      if (!newEmail) {
        await showToast({ style: Toast.Style.Failure, title: "Client email is required" });
        return;
      }

      const now = new Date().toISOString();
      client = {
        id: uuidv4(),
        name: newName,
        email: newEmail,
        address: newAddress,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      const found = clients.find((c) => c.id === clientId);
      if (!found) {
        await showToast({ style: Toast.Style.Failure, title: "Please select a client" });
        return;
      }
      client = found;
    }

    // --- Validate and parse line items ---
    const lineItems: InvoiceLineItem[] = [];
    for (let i = 0; i < lineItemCount; i++) {
      const desc = (values[`desc_${i}`] as string || "").trim();
      const qtyStr = (values[`qty_${i}`] as string || "").trim();
      const rateStr = (values[`rate_${i}`] as string || "").trim();

      if (!desc) {
        await showToast({ style: Toast.Style.Failure, title: `Line item ${i + 1}: Description is required` });
        return;
      }
      const qty = parseFloat(qtyStr || "1");
      const rate = parseFloat(rateStr);

      if (isNaN(qty) || qty < 0) {
        await showToast({ style: Toast.Style.Failure, title: `Line item ${i + 1}: Invalid quantity` });
        return;
      }
      if (isNaN(rate)) {
        await showToast({ style: Toast.Style.Failure, title: `Line item ${i + 1}: Invalid rate` });
        return;
      }

      lineItems.push({
        description: desc,
        quantity: qty,
        rate,
        lineTotal: calculateLineTotal(qty, rate),
      });
    }

    if (lineItems.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "At least one line item is required" });
      return;
    }

    // --- Dates ---
    const invoiceDate = values.invoiceDate as Date;
    const dueDate = values.dueDate as Date;

    if (!invoiceDate || !dueDate) {
      await showToast({ style: Toast.Style.Failure, title: "Invoice date and due date are required" });
      return;
    }

    // --- Calculate totals ---
    const vatApplied = values.vatApplied as boolean;
    const vatRate = parseFloat(preferences.vatRate) || 0;
    const { subtotal, vatAmount, total } = calculateInvoiceTotals(lineItems, vatApplied, vatRate);

    // --- Generate invoice ---
    try {
      const startingNum = parseInt(preferences.startingInvoiceNumber) || 1;
      const numberRaw = await getNextInvoiceNumber(startingNum);
      const invoiceNumber = formatInvoiceNumber(preferences.invoicePrefix, numberRaw);

      const now = new Date().toISOString();
      const invoice: Invoice = {
        id: uuidv4(),
        invoiceNumber,
        numberRaw,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientAddress: client.address,
        invoiceDate: invoiceDate.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
        lineItems,
        subtotal,
        vatApplied,
        vatRate: vatApplied ? vatRate : 0,
        vatAmount,
        total,
        notes: (values.notes as string || "").trim(),
        status: "draft",
        pdfPath: "",
        createdAt: now,
        updatedAt: now,
      };

      // Generate PDF
      const pdfPath = await generateInvoicePDF(invoice, preferences);
      invoice.pdfPath = pdfPath;

      // Save new client if needed
      if (clientId === NEW_CLIENT_ID) {
        await addClient(client);
      }

      // Save invoice
      await addInvoice(invoice);

      await showToast({ style: Toast.Style.Success, title: `Invoice ${invoiceNumber} created` });
      setSuccessInvoice(invoice);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create invoice",
        message: String(error),
      });
    }
  }

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + (parseInt(preferences.paymentTermsDays) || 30));

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Invoice"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Invoice" icon={Icon.Document} onSubmit={handleSubmit} />
          <Action
            title="Add Line Item"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => setLineItemCount((c) => c + 1)}
          />
          {lineItemCount > 1 && (
            <Action
              title="Remove Last Line Item"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() => setLineItemCount((c) => Math.max(1, c - 1))}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="clientId" title="Client" value={selectedClientId} onChange={setSelectedClientId}>
        <Form.Dropdown.Item value="" title="Select a client..." />
        <Form.Dropdown.Item value={NEW_CLIENT_ID} title="+ New Client" icon={Icon.Plus} />
        {clients.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>

      {selectedClientId === NEW_CLIENT_ID && (
        <>
          <Form.TextField id="newClientName" title="New Client Name" placeholder="Client name" />
          <Form.TextField id="newClientEmail" title="New Client Email" placeholder="client@example.com" />
          <Form.TextArea id="newClientAddress" title="New Client Address" placeholder="Street, City, Postcode" />
        </>
      )}

      <Form.Separator />

      <Form.DatePicker id="invoiceDate" title="Invoice Date" defaultValue={new Date()} />
      <Form.DatePicker id="dueDate" title="Due Date" defaultValue={defaultDueDate} />

      <Form.Separator />

      {Array.from({ length: lineItemCount }, (_, i) => [
        <Form.Description key={`header_${i}`} title="" text={`— Line Item ${i + 1} —`} />,
        <Form.TextField key={`desc_${i}`} id={`desc_${i}`} title={`Description ${i + 1}`} placeholder="Service description" />,
        <Form.TextField key={`qty_${i}`} id={`qty_${i}`} title={`Quantity ${i + 1}`} placeholder="1" defaultValue="1" />,
        <Form.TextField key={`rate_${i}`} id={`rate_${i}`} title={`Rate (£) ${i + 1}`} placeholder="0.00" />,
      ]).flat()}

      <Form.Separator />

      <Form.Checkbox id="vatApplied" label="Apply VAT" title="VAT" defaultValue={preferences.vatRegistered} />
      <Form.TextArea id="notes" title="Notes" placeholder="Optional notes..." />
    </Form>
  );
}
