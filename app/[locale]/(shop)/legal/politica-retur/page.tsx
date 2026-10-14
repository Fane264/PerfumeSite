import type { Metadata } from "next";
import { LegalShell } from "@/components/shop/legal/legal-shell";

export const metadata: Metadata = {
  title: "Politica de Retur",
  description:
    "Returnează produsele în 14 zile, fără justificare, conform OUG 34/2014.",
};

export default function PoliticaReturPage() {
  return (
    <LegalShell title="Politica de Retur" updated="16 iunie 2026">
      <h2>1. Dreptul de retragere</h2>
      <p>
        Conform OUG 34/2014, ai dreptul să te retragi din contract în termen de{" "}
        <strong>14 zile calendaristice</strong> de la primirea produsului, fără a
        invoca vreun motiv și fără penalități.
      </p>

      <h2>2. Condiții pentru produs</h2>
      <ul>
        <li>Produsul trebuie să fie nedesfăcut și sigilat.</li>
        <li>Decanturile desigilate sau folosite nu pot fi returnate, din motive de igienă.</li>
        <li>Păstrează ambalajul original și dovada achiziției (factura).</li>
      </ul>

      <h2>3. Cum faci returul</h2>
      <ol>
        <li>
          Trimite o cerere la{" "}
          <a href="mailto:retur@decantlux.ro">retur@decantlux.ro</a> cu numărul
          comenzii.
        </li>
        <li>Vei primi formularul de retur și adresa de expediere.</li>
        <li>
          Expediază produsul în maximum 14 zile de la notificarea retragerii.
          Costul returului este suportat de cumpărător.
        </li>
      </ol>

      <h2>4. Rambursarea</h2>
      <p>
        Îți rambursăm integral suma plătită (inclusiv transportul standard) în
        termen de <strong>14 zile</strong> de la primirea produsului returnat,
        folosind aceeași metodă de plată utilizată la achiziție.
      </p>

      <h2>5. Excepții</h2>
      <p>
        Produsele sigilate desfăcute după livrare, care nu pot fi returnate din
        motive de protecție a sănătății sau igienă, sunt exceptate de la dreptul
        de retragere conform art. 16 lit. e) din OUG 34/2014.
      </p>
    </LegalShell>
  );
}
