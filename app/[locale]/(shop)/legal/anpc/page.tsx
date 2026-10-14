import type { Metadata } from "next";
import { LegalShell } from "@/components/shop/legal/legal-shell";

export const metadata: Metadata = {
  title: "ANPC & Soluționarea litigiilor",
  description:
    "Informații ANPC și platforma SOL/ODR pentru soluționarea alternativă a litigiilor.",
};

export default function AnpcPage() {
  return (
    <LegalShell title="ANPC & Soluționarea litigiilor" updated="16 iunie 2026">
      <h2>Dreptul de retragere</h2>
      <p>
        Conform OUG 34/2014, ai dreptul la retragere din contract în termen de 14
        zile de la primirea produsului, fără a invoca un motiv. Vezi{" "}
        <a href="/legal/politica-retur">Politica de Retur</a>.
      </p>

      <h2>Autoritatea Națională pentru Protecția Consumatorilor</h2>
      <p>
        Pentru sesizări și reclamații, te poți adresa ANPC:
      </p>
      <ul>
        <li>
          Website:{" "}
          <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer">
            anpc.ro
          </a>
        </li>
      </ul>

      <h2>Soluționarea online a litigiilor (SOL/ODR)</h2>
      <p>
        Comisia Europeană pune la dispoziție o platformă pentru soluționarea online
        a litigiilor (SOL/ODR):
      </p>
      <ul>
        <li>
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
        </li>
      </ul>
      <p>
        Pentru orice nelămurire, ne poți contacta direct la{" "}
        <a href="mailto:suport@decantlux.ro">suport@decantlux.ro</a>.
      </p>
    </LegalShell>
  );
}
