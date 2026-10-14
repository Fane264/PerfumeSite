import { setRequestLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { LOCALES } from "@/i18n/routing";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(LOCALES as readonly string[]).includes(params.locale)) notFound();
  // Pin the request locale before any child reads it, then load that locale's
  // messages so the client provider hydrates with the URL's locale (no mismatch).
  setRequestLocale(params.locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={params.locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
