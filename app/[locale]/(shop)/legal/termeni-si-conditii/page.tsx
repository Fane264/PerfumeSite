import type { Metadata } from "next";
import { LegalShell } from "@/components/shop/legal/legal-shell";

export const metadata: Metadata = {
  title: "Termeni și Condiții",
  description:
    "Termenii comerciali pentru achizițiile din magazinul DecantLux: prețuri, plată, livrare, retur și garanții.",
};

export default function TermeniSiConditiiPage() {
  return (
    <LegalShell title="Termeni și Condiții" updated="16 iunie 2026">
      <h2>1. Obiectul</h2>
      <p>
        Acești termeni reglementează utilizarea magazinului online decantlux.ro,
        operat de DecantLux SRL (CUI RO12345678). Prin plasarea unei comenzi,
        accepți acești termeni.
      </p>

      <h2>2. Produse și prețuri</h2>
      <p>
        Vindem decanturi (porții) turnate manual din parfumuri de nișă autentice.
        Prețurile sunt afișate în RON (sau EUR la alegere) și includ TVA (19%).
        Ne rezervăm dreptul de a modifica prețurile fără notificare prealabilă;
        prețul aplicabil este cel din momentul plasării comenzii.
      </p>

      <h2>3. Plata</h2>
      <p>
        Acceptăm plata cu cardul (procesată securizat de Stripe) și plata la
        livrare (ramburs). Pentru comenzile cu ramburs se aplică o taxă
        suplimentară afișată la finalizarea comenzii.
      </p>

      <h2>4. Livrare</h2>
      <p>
        Livrăm în România prin curier rapid, în 1–5 zile lucrătoare în funcție de
        metoda aleasă. Transportul este gratuit peste pragul afișat în coș. Riscul
        trece la cumpărător la momentul livrării.
      </p>

      <h2>5. Dreptul de retur</h2>
      <p>
        Conform OUG 34/2014, ai dreptul de a te retrage din contract în termen de
        14 zile de la primirea produsului, fără a invoca un motiv. Vezi{" "}
        <a href="/legal/politica-retur">Politica de Retur</a> pentru detalii și
        condiții.
      </p>

      <h2>6. Garanții și reclamații</h2>
      <p>
        Garantăm autenticitatea fiecărui parfum. Pentru reclamații, scrie-ne la{" "}
        <a href="mailto:suport@decantlux.ro">suport@decantlux.ro</a>; răspundem în
        maximum 30 de zile.
      </p>

      <h2>7. Limitarea răspunderii</h2>
      <p>
        Nu răspundem pentru reacții alergice individuale. Te sfătuim să testezi
        produsul pe o zonă mică a pielii înainte de utilizare.
      </p>

      <h2>8. Jurisdicție</h2>
      <p>
        Acești termeni sunt guvernați de legea română. Orice litigiu va fi
        soluționat de instanțele competente din România.
      </p>
    </LegalShell>
  );
}
