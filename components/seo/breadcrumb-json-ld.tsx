import { APP_URL } from "@/lib/constants";
import { JsonLd } from "./json-ld";

export interface Crumb {
  name: string;
  /** Path relative to the site root, e.g. `/parfumuri`. */
  path: string;
}

/** BreadcrumbList structured data. */
export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${APP_URL}${item.path}`,
    })),
  };
  return <JsonLd data={data} />;
}
