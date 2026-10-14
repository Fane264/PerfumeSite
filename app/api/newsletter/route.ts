import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { addToNewsletterAudience, sendWelcomeEmail } from "@/lib/resend";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const newsletterSchema = z.object({
  email: z.string().email("Adresă de email invalidă"),
});

// POST /api/newsletter — capture a newsletter subscription. Adds the address to
// the Resend audience and sends a welcome email. Email failures are swallowed so
// the subscription is still acknowledged.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const { email } = newsletterSchema.parse(await req.json());

    try {
      await addToNewsletterAudience(email);
      await sendWelcomeEmail(email);
    } catch (err) {
      console.error("[newsletter] Resend wiring failed:", err);
    }

    return apiSuccess({ email, subscribed: true }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
