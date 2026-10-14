"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Check, Copy, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { affiliateApi } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";
import type { AffiliateConversionRow } from "@/lib/affiliate";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ACTIVE: "bg-success/15 text-success border-success/30",
  SUSPENDED: "bg-error/15 text-red-300 border-error/40",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "În revizuire",
  ACTIVE: "Activ",
  SUSPENDED: "Suspendat",
};

const CONVERSION_LABEL: Record<string, string> = {
  PENDING: "În așteptare",
  CONFIRMED: "Confirmat",
  PAID: "Plătit",
  CANCELLED: "Anulat",
};

export function AffiliateDashboard() {
  const { data: account, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: affiliateApi.dashboard,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-7 animate-spin text-gold" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="border border-dashed border-border py-16 text-center">
        <p className="font-serif text-2xl font-light text-cream">
          Nu ești încă afiliat
        </p>
        <Link
          href="/afiliat"
          className="mt-4 inline-block text-sm uppercase tracking-widest text-gold hover:text-gold-light"
        >
          Aplică în program →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="font-serif text-2xl font-light text-cream">
          Programul tău de afiliat
        </h2>
        <span
          className={`rounded-sm border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
            STATUS_BADGE[account.status] ?? ""
          }`}
        >
          {STATUS_LABEL[account.status] ?? account.status}
        </span>
      </div>

      {account.status === "PENDING" && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-200">
          Aplicația ta este în revizuire. Te anunțăm prin email imediat ce este
          aprobată.
        </div>
      )}
      {account.status === "SUSPENDED" && (
        <div className="border border-error/40 bg-error/10 p-5 text-sm text-red-200">
          Contul tău de afiliat este suspendat. Contactează-ne pentru detalii.
        </div>
      )}

      {account.status === "ACTIVE" && <LinkCard code={account.code} />}

      <StatGrid account={account} />

      {account.conversions.length > 0 && (
        <EarningsChart conversions={account.conversions} />
      )}

      <ConversionsTable conversions={account.conversions} />

      {account.payouts.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm uppercase tracking-luxe text-gold">
            Istoric plăți
          </h3>
          <div className="overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Metodă</th>
                  <th className="p-3 font-medium">Referință</th>
                  <th className="p-3 text-right font-medium">Sumă</th>
                </tr>
              </thead>
              <tbody>
                {account.payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString("ro-RO")
                        : "—"}
                    </td>
                    <td className="p-3 text-cream">{p.method}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.reference ?? "—"}
                    </td>
                    <td className="p-3 text-right text-gold">
                      {formatPrice(p.amount, "RON")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${APP_URL}?aff=${code}`;

  function copy() {
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Link copiat");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6 border border-border bg-surface p-6 sm:flex-row sm:items-center">
      <div className="rounded bg-white p-3">
        <QRCode value={link} size={104} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Linkul tău unic
        </p>
        <p className="mt-1 truncate font-mono text-sm text-cream">{link}</p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 inline-flex items-center gap-2 border border-gold px-4 py-2 text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiat" : "Copiază link"}
        </button>
      </div>
    </div>
  );
}

function StatGrid({
  account,
}: {
  account: NonNullable<Awaited<ReturnType<typeof affiliateApi.dashboard>>>;
}) {
  const stats = [
    { label: "Conversii", value: String(account.conversionCount) },
    { label: "Confirmate", value: String(account.confirmedCount) },
    {
      label: "Câștiguri totale",
      value: formatPrice(account.totalEarned, "RON"),
    },
    {
      label: "Disponibil de plată",
      value: formatPrice(account.availableForPayout, "RON"),
      accent: true,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {s.label}
          </p>
          <p
            className={`mt-2 font-serif text-2xl ${
              s.accent ? "text-gold" : "text-cream"
            }`}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function EarningsChart({
  conversions,
}: {
  conversions: AffiliateConversionRow[];
}) {
  const data = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const c of conversions) {
      const key = c.createdAt.slice(0, 7); // YYYY-MM
      byMonth.set(key, (byMonth.get(key) ?? 0) + c.commission);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, commission]) => ({
        month,
        commission: Math.round(commission * 100) / 100,
      }));
  }, [conversions]);

  return (
    <div className="border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm uppercase tracking-luxe text-gold">
        Comisioane în timp
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="aff-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8A951" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C8A951" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
            <YAxis stroke="#78716c" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #2A2A2A",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value)} RON`, "Comision"]}
            />
            <Area
              type="monotone"
              dataKey="commission"
              stroke="#C8A951"
              fill="url(#aff-grad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ConversionsTable({
  conversions,
}: {
  conversions: AffiliateConversionRow[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm uppercase tracking-luxe text-gold">
        Conversii
      </h3>
      {conversions.length === 0 ? (
        <p className="border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Încă nicio conversie. Partajează linkul tău pentru a începe.
        </p>
      ) : (
        <div className="overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium">Valoare comandă</th>
                <th className="p-3 font-medium">Comision</th>
                <th className="p-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="p-3 text-cream">
                    {formatPrice(c.orderTotal, "RON")}
                  </td>
                  <td className="p-3 text-gold">
                    {formatPrice(c.commission, "RON")}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {CONVERSION_LABEL[c.status] ?? c.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
