import type { Metadata } from "next";
import { LegalShell } from "@/components/shop/legal/legal-shell";

export const metadata: Metadata = {
  title: "Politica de Confidențialitate",
  description:
    "Cum colectăm, folosim și protejăm datele tale personale conform GDPR.",
};

export default function PoliticaConfidentialitatePage() {
  return (
    <LegalShell title="Politica de Confidențialitate" updated="16 iunie 2026">
      <h2>1. Cine suntem</h2>
      <p>
        DecantLux SRL („noi”) operează magazinul online de decanturi de parfumuri
        de nișă disponibil la decantlux.ro. Respectăm Regulamentul (UE) 2016/679
        (GDPR) și legislația română privind protecția datelor.
      </p>

      <h2>2. Ce date colectăm</h2>
      <ul>
        <li>
          <strong>Date de cont:</strong> nume, adresă de email, parolă (gestionate
          de furnizorul nostru de autentificare).
        </li>
        <li>
          <strong>Date de comandă:</strong> adresă de livrare, număr de telefon,
          istoricul comenzilor.
        </li>
        <li>
          <strong>Date de plată:</strong> procesate exclusiv de Stripe — nu stocăm
          datele cardului tău.
        </li>
        <li>
          <strong>Date tehnice:</strong> adresă IP, tip de browser, cookie-uri (în
          baza consimțământului tău).
        </li>
      </ul>

      <h2>3. De ce le folosim</h2>
      <ul>
        <li>Procesarea și livrarea comenzilor tale.</li>
        <li>Comunicări tranzacționale (confirmări, expedieri, facturi).</li>
        <li>Comunicări de marketing, doar cu acordul tău.</li>
        <li>Îmbunătățirea site-ului și prevenirea fraudei.</li>
      </ul>

      <h2>4. Cât timp păstrăm datele</h2>
      <p>
        Datele comenzilor sunt păstrate pe durata impusă de legislația fiscală
        (10 ani pentru documente contabile). Datele de cont sunt păstrate cât timp
        contul tău este activ.
      </p>

      <h2>5. Cui transmitem datele</h2>
      <p>
        Folosim furnizori terți de încredere, în calitate de persoane
        împuternicite: <strong>Stripe</strong> (plăți), <strong>Clerk</strong>
        (autentificare), <strong>Resend</strong> (email), <strong>Cloudinary</strong>
        (imagini) și firme de curierat pentru livrare. Nu vindem datele tale.
      </p>

      <h2>6. Drepturile tale (GDPR)</h2>
      <ul>
        <li>Dreptul de acces la datele tale.</li>
        <li>Dreptul la rectificare.</li>
        <li>Dreptul la ștergere („dreptul de a fi uitat”).</li>
        <li>Dreptul la portabilitatea datelor.</li>
        <li>Dreptul de a te opune prelucrării și de a retrage consimțământul.</li>
      </ul>

      <h2>7. Contact DPO</h2>
      <p>
        Pentru orice solicitare privind datele tale, contactează responsabilul
        nostru cu protecția datelor la{" "}
        <a href="mailto:dpo@decantlux.ro">dpo@decantlux.ro</a>. Ai de asemenea
        dreptul de a depune o plângere la ANSPDCP (
        <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">
          dataprotection.ro
        </a>
        ).
      </p>
    </LegalShell>
  );
}
