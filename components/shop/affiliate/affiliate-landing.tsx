"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Banknote,
  Link2,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { affiliateApi, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  {
    icon: BadgeCheck,
    title: "Aplici",
    text: "Trimite o aplicație cu codul tău unic și profilurile de social media.",
  },
  {
    icon: Link2,
    title: "Primești link",
    text: "După aprobare, primești un link unic de partajat cu audiența ta.",
  },
  {
    icon: Banknote,
    title: "Câștigi comision",
    text: "Iei 10% din fiecare comandă confirmată generată prin linkul tău.",
  },
];

const COMMISSION_ROWS = [
  { sales: 10, avg: 180, label: "10 vânzări / lună" },
  { sales: 30, avg: 180, label: "30 vânzări / lună" },
  { sales: 60, avg: 180, label: "60 vânzări / lună" },
];

export function AffiliateLanding() {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: account, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: affiliateApi.dashboard,
    enabled: isLoaded && Boolean(isSignedIn),
  });

  return (
    <div className="container py-28 md:py-32">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-luxe text-gold">
          <Sparkles className="size-4" /> Program afiliat
        </p>
        <h1 className="mt-4 font-serif text-4xl font-light text-cream md:text-6xl">
          Câștigă 10% din fiecare vânzare pe care o generezi
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Iubești parfumurile de nișă? Transformă-ți pasiunea în venit. Recomandă
          decanturi DecantLux audienței tale de pe Instagram și TikTok și
          câștigă comision la fiecare comandă.
        </p>
      </section>

      {/* 3 steps */}
      <section className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="border border-border bg-surface p-6 text-center"
          >
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-gold/40 text-gold">
              <step.icon className="size-5" />
            </div>
            <h3 className="font-serif text-xl text-cream">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </section>

      {/* Earnings table */}
      <section className="mx-auto mt-16 max-w-2xl">
        <h2 className="mb-5 flex items-center gap-2 font-serif text-2xl font-light text-cream">
          <TrendingUp className="size-5 text-gold" /> Cât poți câștiga
        </h2>
        <div className="overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Activitate</th>
                <th className="p-3 font-medium">Valoare medie comandă</th>
                <th className="p-3 text-right font-medium">Comision estimat</th>
              </tr>
            </thead>
            <tbody>
              {COMMISSION_ROWS.map((row) => (
                <tr key={row.sales} className="border-t border-border">
                  <td className="p-3 text-cream">{row.label}</td>
                  <td className="p-3 text-muted-foreground">{row.avg} RON</td>
                  <td className="p-3 text-right font-medium text-gold">
                    ~{Math.round(row.sales * row.avg * 0.1)} RON
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Estimări orientative la o rată de comision de 10%.
        </p>
      </section>

      {/* Application */}
      <section className="mx-auto mt-16 max-w-xl">
        {!isLoaded || (isSignedIn && isLoading) ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : !isSignedIn ? (
          <div className="border border-border bg-surface p-8 text-center">
            <p className="text-cream">
              Creează un cont mai întâi pentru a aplica în program.
            </p>
            <Link
              href="/sign-in?redirect_url=/afiliat"
              className="mt-4 inline-block border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
            >
              Autentificare
            </Link>
          </div>
        ) : account ? (
          <div className="border border-gold/40 bg-gold/5 p-8 text-center">
            <p className="text-cream">
              Ai deja o aplicație de afiliat ({account.status}).
            </p>
            <Link
              href="/cont/afiliat"
              className="mt-4 inline-block bg-gold px-7 py-3 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
            >
              Mergi la dashboard
            </Link>
          </div>
        ) : (
          <ApplyForm />
        )}
      </section>
    </div>
  );
}

function ApplyForm() {
  const [code, setCode] = useState("AFF-");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [paypal, setPaypal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await affiliateApi.apply({
        code: code.trim().toUpperCase(),
        bio: bio.trim() || undefined,
        instagramHandle: instagram.trim() || undefined,
        tiktokHandle: tiktok.trim() || undefined,
        paypalEmail: paypal.trim() || undefined,
      });
      setDone(true);
      toast.success("Aplicație trimisă!");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Trimiterea a eșuat",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="border border-gold/40 bg-gold/5 p-8 text-center">
        <BadgeCheck className="mx-auto mb-3 size-8 text-gold" />
        <p className="text-cream">
          Aplicația ta a fost trimisă și este în revizuire. Te anunțăm prin email
          după aprobare.
        </p>
        <Link
          href="/cont/afiliat"
          className="mt-4 inline-block text-sm uppercase tracking-widest text-gold hover:text-gold-light"
        >
          Vezi statusul →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-border bg-surface p-8">
      <h2 className="mb-6 font-serif text-2xl font-light text-cream">
        Aplică în program
      </h2>
      <div className="space-y-5">
        <div>
          <Label className="mb-1.5 block">Codul tău unic</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AFF-NUMELE-TAU"
            className="uppercase"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Începe cu AFF-. Acesta va fi în linkul tău: decantlux.ro?aff={code || "AFF-…"}
          </p>
        </div>
        <div>
          <Label className="mb-1.5 block">Despre tine (opțional)</Label>
          <textarea
            rows={3}
            value={bio}
            maxLength={500}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Spune-ne despre audiența și conținutul tău…"
            className="w-full border border-input bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Instagram (opțional)</Label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">TikTok (opțional)</Label>
            <Input
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="@handle"
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Email PayPal (pentru plăți)</Label>
          <Input
            type="email"
            value={paypal}
            onChange={(e) => setPaypal(e.target.value)}
            placeholder="email@exemplu.com"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 bg-gold py-3.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light disabled:opacity-60"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Trimite aplicația
      </button>
    </form>
  );
}
