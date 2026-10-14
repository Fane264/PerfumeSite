export type JsonLdData = Record<string, unknown>;

/**
 * Server component that renders a JSON-LD <script>. Centralizes serialization
 * so individual schema components stay declarative.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe inside a JSON-LD script tag; we additionally
      // escape `<` to avoid any chance of breaking out of the element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
