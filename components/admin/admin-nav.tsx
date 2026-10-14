"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Boxes,
  Star,
  Ticket,
  Flame,
  Repeat,
  TrendingDown,
  Users,
  Mail,
  RotateCcw,
  Rocket,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/produse", label: "Produse", icon: Package, exact: false },
  { href: "/admin/comenzi", label: "Comenzi", icon: ClipboardList, exact: false },
  { href: "/admin/retururi", label: "Retururi", icon: RotateCcw, exact: false },
  { href: "/admin/stoc", label: "Stoc", icon: Boxes, exact: false },
  { href: "/admin/inventar", label: "Inventar", icon: TrendingDown, exact: false },
  { href: "/admin/flash-sales", label: "Flash Sales", icon: Flame, exact: false },
  { href: "/admin/lansari", label: "Lansări", icon: Rocket, exact: false },
  { href: "/admin/wholesale", label: "Wholesale", icon: Building2, exact: false },
  { href: "/admin/abonamente", label: "Abonamente", icon: Repeat, exact: false },
  { href: "/admin/afiliati", label: "Afiliați", icon: Users, exact: false },
  { href: "/admin/campanii", label: "Campanii", icon: Mail, exact: false },
  { href: "/admin/recenzii", label: "Recenzii", icon: Star, exact: false },
  { href: "/admin/cupoane", label: "Cupoane", icon: Ticket, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:flex-col">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <link.icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
