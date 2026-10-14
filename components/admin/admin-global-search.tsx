"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Package, ClipboardList, User } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminSearchResults } from "@/app/api/admin/search/route";

const EMPTY: AdminSearchResults = { orders: [], products: [], users: [] };

/** Global admin search — orders (by #/email), products (by name), customers. */
export function AdminGlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdminSearchResults>(EMPTY);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await apiFetch<AdminSearchResults>(
          `/api/admin/search?q=${encodeURIComponent(term)}`,
        );
        setResults(res);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const hasResults =
    results.orders.length + results.products.length + results.users.length > 0;

  return (
    <div ref={ref} className="relative hidden w-64 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Caută comenzi, produse, clienți…"
        aria-label="Căutare admin"
        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
      />
      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
          {!hasResults && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Niciun rezultat.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {results.orders.length > 0 && (
                <Group label="Comenzi">
                  {results.orders.map((o) => (
                    <Row
                      key={o.id}
                      icon={<ClipboardList className="size-4" />}
                      onClick={() => navigate(`/admin/comenzi?q=${o.orderNumber}`)}
                      title={`#${o.orderNumber}`}
                      subtitle={`${o.customerEmail} · ${o.status}`}
                    />
                  ))}
                </Group>
              )}
              {results.products.length > 0 && (
                <Group label="Produse">
                  {results.products.map((p) => (
                    <Row
                      key={p.id}
                      icon={<Package className="size-4" />}
                      onClick={() => navigate(`/admin/produse`)}
                      title={p.name}
                      subtitle={p.houseName}
                    />
                  ))}
                </Group>
              )}
              {results.users.length > 0 && (
                <Group label="Clienți">
                  {results.users.map((u) => (
                    <Row
                      key={u.id}
                      icon={<User className="size-4" />}
                      onClick={() => navigate(`/admin/comenzi?q=${u.email}`)}
                      title={u.name ?? u.email}
                      subtitle={u.email}
                    />
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted",
      )}
    >
      <span className="text-gold">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </button>
  );
}
