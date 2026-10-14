import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Decant parfum de nișă";

const GOLD = "#C9A84C";
const CREAM = "#F5F0E8";
const INK = "#0A0A0A";

export default async function Image({ params }: { params: { slug: string } }) {
  const perfume = await db.perfume.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      house: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: { url: true },
      },
    },
  });

  const name = perfume?.name ?? "Decanturi Niche";
  const houseName = perfume?.house.name ?? "Parfumuri de nișă";
  const imageUrl = perfume?.images[0]?.url;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: INK,
          color: CREAM,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "70px",
            width: imageUrl ? "62%" : "100%",
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
            <div
              style={{
                fontSize: 32,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: GOLD,
                marginBottom: 16,
              }}
            >
              {houseName}
            </div>
            <div style={{ fontSize: 80, lineHeight: 1.05, color: CREAM }}>
              {name}
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#9A9088" }}>
            Decanturi autentice · parfumuri de nișă
          </div>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            width={456}
            height={630}
            style={{ width: "38%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
    ),
    size,
  );
}
