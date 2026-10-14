import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";

// Server-side admin guard — the authoritative check (middleware is the first
// layer). Any non-admin is redirected away before the page renders.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/admin");
  if (user.role !== UserRole.ADMIN) redirect("/");

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/admin" className="font-serif text-lg">
            Decanturi Niche <span className="text-gold">· Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <AdminGlobalSearch />
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Înapoi la magazin
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="container grid gap-8 py-8 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-8 md:h-fit">
          <AdminNav />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
