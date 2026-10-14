import { APP_URL } from "@/lib/constants";
import { JsonLd } from "./json-ld";
import type { ApiPerfumeDetail } from "@/types";

const AVAILABILITY = {
  inStock: "https://schema.org/InStock",
  outOfStock: "https://schema.org/OutOfStock",
} as const;

/** Product + AggregateOffer + AggregateRating structured data for a perfume. */
export function ProductJsonLd({ perfume }: { perfume: ApiPerfumeDetail }) {
  const inStock = perfume.variants.some((v) => v.inStock);
  const url = `${APP_URL}/parfumuri/${perfume.slug}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: perfume.name,
    image: perfume.images.map((img) => img.url),
    description: perfume.metaDescription ?? perfume.description.slice(0, 300),
    sku: perfume.variants[0]?.sku,
    brand: { "@type": "Brand", name: perfume.house.name },
    category: perfume.family.name,
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: perfume.priceRange.currency,
      lowPrice: perfume.priceRange.min.toFixed(2),
      highPrice: perfume.priceRange.max.toFixed(2),
      offerCount: perfume.variants.length,
      availability: inStock ? AVAILABILITY.inStock : AVAILABILITY.outOfStock,
      url,
    },
  };

  if (perfume.rating.count > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: perfume.rating.average.toFixed(1),
      reviewCount: perfume.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return <JsonLd data={data} />;
}
