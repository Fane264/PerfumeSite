import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

/** Shared layout for static legal pages — breadcrumb, title, prose container. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-3xl py-28 md:py-32">
      <nav className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Link href="/" className="hover:text-gold">
          Acasă
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-cream">{title}</span>
      </nav>
      <h1 className="font-serif text-4xl font-light text-cream md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ultima actualizare: {updated}
      </p>
      <div className="prose prose-invert mt-10 max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:text-cream prose-a:text-gold prose-strong:text-cream prose-li:text-muted-foreground prose-p:text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
