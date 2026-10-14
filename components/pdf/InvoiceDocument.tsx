import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ----------------------------------------------------------------------------
//  React-PDF invoice document (Phase 7). Server-only — `@react-pdf/renderer`
//  must never be imported into a client bundle. Rendered to a Buffer by
//  `lib/invoice.ts`.
// ----------------------------------------------------------------------------

export interface InvoiceLine {
  name: string;
  quantity: number;
  unitPrice: number; // gross (VAT-inclusive)
  lineTotal: number; // gross
  vat: number; // VAT portion of the line
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string; // formatted
  dueDate: string; // formatted
  currency: string;
  company: {
    name: string;
    cui: string;
    address: string;
    iban: string;
    bank: string;
    email: string;
  };
  customer: {
    name: string;
    email: string;
    address: string;
  };
  lines: InvoiceLine[];
  subtotalGross: number;
  shipping: number;
  discount: number;
  vatTotal: number;
  total: number;
}

const GOLD = "#C8A951";
const INK = "#1c1917";
const MUTED = "#78716c";
const LINE = "#e7e2d6";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: INK,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 16,
    marginBottom: 20,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 1 },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  companyBlock: { textAlign: "right", fontSize: 8.5, color: MUTED, maxWidth: 220 },
  invoiceTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  metaCol: { maxWidth: 250 },
  label: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  strong: { fontFamily: "Helvetica-Bold", color: INK },
  table: { marginTop: 8 },
  th: {
    flexDirection: "row",
    backgroundColor: "#faf7f0",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  thText: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  cNr: { width: "7%" },
  cName: { width: "41%" },
  cQty: { width: "10%", textAlign: "right" },
  cUnit: { width: "16%", textAlign: "right" },
  cVat: { width: "13%", textAlign: "right" },
  cTotal: { width: "13%", textAlign: "right" },
  totals: { marginTop: 18, marginLeft: "auto", width: "48%" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: INK,
    marginTop: 6,
    paddingTop: 8,
  },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 10,
  },
});

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "EUR" ? "de-DE" : "ro-RO", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const cur = data.currency;
  return (
    <Document
      title={`Factura ${data.invoiceNumber}`}
      author={data.company.name}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.company.name}</Text>
            <Text style={styles.brandSub}>Decanturi din parfumuri de nișă</Text>
          </View>
          <View style={styles.companyBlock}>
            <Text>CUI: {data.company.cui}</Text>
            <Text>{data.company.address}</Text>
            <Text>IBAN: {data.company.iban}</Text>
            <Text>{data.company.bank}</Text>
          </View>
        </View>

        {/* Title + parties */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Facturat către</Text>
            <Text style={styles.strong}>{data.customer.name}</Text>
            <Text>{data.customer.address}</Text>
            <Text>{data.customer.email}</Text>
          </View>
          <View style={[styles.metaCol, { alignItems: "flex-end" }]}>
            <Text style={styles.invoiceTitle}>FACTURĂ</Text>
            <Text style={{ marginTop: 6 }}>
              <Text style={styles.strong}>{data.invoiceNumber}</Text>
            </Text>
            <Text style={{ color: MUTED }}>Emisă: {data.issueDate}</Text>
            <Text style={{ color: MUTED }}>Scadentă: {data.dueDate}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.thText, styles.cNr]}>Nr.</Text>
            <Text style={[styles.thText, styles.cName]}>Produs</Text>
            <Text style={[styles.thText, styles.cQty]}>Cant.</Text>
            <Text style={[styles.thText, styles.cUnit]}>Preț unitar</Text>
            <Text style={[styles.thText, styles.cVat]}>TVA 19%</Text>
            <Text style={[styles.thText, styles.cTotal]}>Total</Text>
          </View>
          {data.lines.map((line, i) => (
            <View style={styles.tr} key={i}>
              <Text style={styles.cNr}>{i + 1}</Text>
              <Text style={styles.cName}>{line.name}</Text>
              <Text style={styles.cQty}>{line.quantity}</Text>
              <Text style={styles.cUnit}>{money(line.unitPrice, cur)}</Text>
              <Text style={styles.cVat}>{money(line.vat, cur)}</Text>
              <Text style={styles.cTotal}>{money(line.lineTotal, cur)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ color: MUTED }}>Subtotal produse</Text>
            <Text>{money(data.subtotalGross, cur)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ color: MUTED }}>Reducere</Text>
              <Text>− {money(data.discount, cur)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={{ color: MUTED }}>Transport</Text>
            <Text>
              {data.shipping > 0 ? money(data.shipping, cur) : "Gratuit"}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: MUTED }}>din care TVA (19%)</Text>
            <Text>{money(data.vatTotal, cur)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>TOTAL DE PLATĂ</Text>
            <Text style={styles.grandValue}>{money(data.total, cur)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Mulțumim pentru achiziție! · decantlux.ro · {data.company.email}
        </Text>
      </Page>
    </Document>
  );
}
