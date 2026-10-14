import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { apiError } from "@/lib/api-response";
import { enforceRateLimit, aiRatelimit } from "@/lib/ratelimit";
import { getPerfumesBySlugs } from "@/lib/catalog";
import type { ApiPerfumeListItem } from "@/types";

export const runtime = "nodejs";

// ----------------------------------------------------------------------------
//  Claude-powered perfume advisor. Streams the reply token-by-token over a
//  ReadableStream (NDJSON), strips the recommendations marker before it reaches
//  the client, then emits a final event carrying the recommended products.
// ----------------------------------------------------------------------------

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const bodySchema = z.object({
  message: z.string().trim().min(1, "Mesajul este gol").max(2000),
  conversationHistory: z.array(messageSchema).max(20).optional(),
});

const SYSTEM_PROMPT = `You are the parfum advisor for DecantLux, a Romanian niche perfume decants shop.
Your role: help customers discover their perfect perfume through conversation.

Available perfume families: Floral, Oriental, Woody, Fresh, Chypre, Fougère, Gourmand
You have access to decants from niche houses including: Creed, Xerjoff, Amouage, Initio and Maison Francis Kurkdjian.

The perfumes you may recommend (use these exact slugs):
- "creed-aventus" — Creed Aventus (fructat-fumuriu, ananas, mesteacăn; versatil, masculin)
- "creed-green-irish-tweed" — Creed Green Irish Tweed (proaspăt-aromat, verde, elegant)
- "xerjoff-naxos" — Xerjoff Naxos (oriental-gourmand, miere, tutun, lavandă, vanilie)
- "xerjoff-erba-pura" — Xerjoff Erba Pura (fructat dulce, luminos, ambrat)
- "amouage-interlude-man" — Amouage Interlude Man (fumuriu, condimentat, oud, rezinos)
- "amouage-reflection-man" — Amouage Reflection Man (floral-lemnos luminos, sofisticat)
- "initio-oud-for-greatness" — Initio Oud for Greatness (oud puternic, nucșoară, mosc)
- "mfk-baccarat-rouge-540" — Maison Francis Kurkdjian Baccarat Rouge 540 (dulce-mineral, luminos, unisex)

Rules:
- Ask clarifying questions (occasion, season, preferred intensity, liked/disliked notes).
- Keep responses under 150 words — concise, elegant.
- End each response with 1-3 perfume recommendations in this exact JSON block (even mid-sentence):
  <<<RECOMMENDATIONS:["slug-1","slug-2"]>>>
- If you have no recommendation yet (e.g. still gathering preferences), use <<<RECOMMENDATIONS:[]>>>
- Only ever use the exact slugs listed above. Never invent slugs.
- Respond in Romanian.
- Never mention competitors.
- If asked about pricing/availability, say "Verifică pe site pentru prețuri actualizate".
- Tone: knowledgeable friend, not salesperson — sophisticated but warm.`;

const RECOMMENDATIONS_RE = /<<<RECOMMENDATIONS:\s*(\[[^\]]*\])\s*>>>/;

/** Pull the slug array out of the marker; tolerant of malformed JSON. */
function parseRecommendations(text: string): string[] {
  const match = RECOMMENDATIONS_RE.exec(text);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]!);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function encodeEvent(obj: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

export async function POST(req: NextRequest) {
  if (!env.ANTHROPIC_API_KEY) {
    return apiError("Funcționalitate indisponibilă temporar", 503);
  }

  const limited = await enforceRateLimit(aiRatelimit, req);
  if (limited) return limited;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return apiError("Datele trimise sunt invalide", 422);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    ...(parsed.conversationHistory ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: parsed.message },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      let emitted = 0;

      try {
        const messageStream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 600,
          output_config: { effort: "low" },
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            // Everything before the marker is safe to display. Once "<<<"
            // appears we stop emitting, holding back the recommendations block.
            const visible = full.split("<<<")[0]!;
            if (visible.length > emitted) {
              controller.enqueue(
                encodeEvent({
                  type: "text",
                  value: visible.slice(emitted),
                }),
              );
              emitted = visible.length;
            }
          }
        }

        const slugs = parseRecommendations(full);
        let products: ApiPerfumeListItem[] = [];
        if (slugs.length > 0) {
          try {
            products = await getPerfumesBySlugs(slugs);
          } catch (err) {
            console.error("[ai/recommend] product fetch failed:", err);
          }
        }

        const reply = full.replace(RECOMMENDATIONS_RE, "").trim();
        controller.enqueue(
          encodeEvent({
            type: "done",
            reply,
            recommendedSlugs: products.map((p) => p.slug),
            products,
          }),
        );
      } catch (err) {
        console.error("[ai/recommend] stream error:", err);
        controller.enqueue(
          encodeEvent({
            type: "error",
            error: "Asistentul nu este disponibil momentan. Încearcă din nou.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
