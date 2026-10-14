import { Link } from "@/i18n/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary/40 px-4 py-12">
      <Link
        href="/"
        className="font-serif text-3xl font-light tracking-widest text-gold"
      >
        DÉCANT
      </Link>
      {children}
    </div>
  );
}
