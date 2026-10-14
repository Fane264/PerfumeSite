import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Casă de parfumuri de nișă";

const GOLD = "#C9A84C";
const CREAM = "#F5F0E8";
const INK = "#0A0A0A";

export default async function Image({ params }: { params: { slug: string } }) {
  const house = await db.perfumeHouse.findUnique({
    where: { slug: params.slug },
    select: { name: true, country: true, coverImageUrl: true },
  });

  const name = house?.name ?? "Decanturi Niche";
  const country = house?.country ?? "Parfumuri de nișă";
  const imageUrl = house?.coverImageUrl ?? undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
          color: CREAM,
          fontFamily: "Georgia, serif",
        }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "70px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: GOLD,
            }}
          >
            Decanturi Niche
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 96, lineHeight: 1.0, color: CREAM }}>
              {name}
            </div>
            <div
              style={{
                fontSize: 28,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: GOLD,
                marginTop: 18,
              }}
            >
              {country}
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#C9C2B6" }}>
            Colecția casei în decanturi autentice
          </div>
        </div>
      </div>
    ),
    size,
  );
}
