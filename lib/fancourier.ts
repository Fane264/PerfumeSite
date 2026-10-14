import { env } from "./env";

// ----------------------------------------------------------------------------
//  FanCourier AWB integration (Phase 7). Talks to the FanCourier REST API v2
//  directly with `fetch`. Gracefully disabled when credentials are not set, so
//  the rest of the order flow keeps working without a courier account.
// ----------------------------------------------------------------------------

const FANCOURIER_BASE = "https://api.fancourier.ro";

export interface AWBRequest {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCounty: string;
  recipientPostalCode: string;
  packageCount: number;
  weight: number; // kg
  codAmount?: number; // RON — for ramburs orders
  orderReference: string; // our order id / number
  observations?: string;
}

export interface AWBResponse {
  awbNumber: string;
  trackingUrl: string;
}

export interface TrackingResult {
  status: string;
  events: { date: string; description: string }[];
}

/** Whether FanCourier credentials are configured. */
export function isFanCourierEnabled(): boolean {
  return Boolean(
    env.FANCOURIER_USERNAME &&
      env.FANCOURIER_PASSWORD &&
      env.FANCOURIER_CLIENT_ID,
  );
}

export function trackingUrlFor(awbNumber: string): string {
  return `https://www.fancourier.ro/awb-tracking/?awb=${encodeURIComponent(awbNumber)}`;
}

class FanCourierError extends Error {}

/** Authenticate and return a bearer token. */
async function login(): Promise<string> {
  const res = await fetch(`${FANCOURIER_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      username: env.FANCOURIER_USERNAME,
      password: env.FANCOURIER_PASSWORD,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new FanCourierError(`Autentificare FanCourier eșuată (${res.status})`);
  }
  const json: unknown = await res.json();
  const token =
    (json as { data?: { token?: string }; token?: string })?.data?.token ??
    (json as { token?: string })?.token;
  if (!token) {
    throw new FanCourierError("FanCourier nu a returnat un token");
  }
  return token;
}

/** Best-effort extraction of an AWB number from a varied response shape. */
function extractAwb(json: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    const obj = node as Record<string, unknown>;
    for (const key of ["awbNumber", "awb", "awbNo", "number"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    for (const value of Object.values(obj)) {
      const found = walk(value);
      if (found) return found;
    }
    return null;
  };
  return walk(json);
}

/**
 * Generate an AWB for an order. Throws when FanCourier is not configured or the
 * API rejects the request; callers should treat AWB generation as best-effort.
 */
export async function generateAWB(order: AWBRequest): Promise<AWBResponse> {
  if (!isFanCourierEnabled()) {
    throw new FanCourierError("FanCourier nu este configurat");
  }

  const token = await login();
  const clientId = Number(env.FANCOURIER_CLIENT_ID);

  const shipment = {
    info: {
      service: "Standard",
      packages: { parcel: order.packageCount, envelopes: 0 },
      weight: order.weight,
      payment: "recipient",
      cod: order.codAmount && order.codAmount > 0 ? order.codAmount : 0,
      declaredValue: 0,
      observation: order.observations ?? "",
      content: "Decanturi parfumuri",
    },
    recipient: {
      name: order.recipientName,
      phone: order.recipientPhone,
      address: {
        county: order.recipientCounty,
        locality: order.recipientCity,
        street: order.recipientAddress,
        zipCode: order.recipientPostalCode,
      },
    },
  };

  const res = await fetch(`${FANCOURIER_BASE}/intern-awb`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ clientId, shipments: [shipment] }),
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new FanCourierError(
      `Generarea AWB FanCourier a eșuat (${res.status})`,
    );
  }

  const awbNumber = extractAwb(json);
  if (!awbNumber) {
    throw new FanCourierError("FanCourier nu a returnat un număr AWB");
  }

  return { awbNumber, trackingUrl: trackingUrlFor(awbNumber) };
}

/** Fetch tracking status + events for an AWB. */
export async function trackAWB(awbNumber: string): Promise<TrackingResult> {
  if (!isFanCourierEnabled()) {
    throw new FanCourierError("FanCourier nu este configurat");
  }
  const token = await login();
  const url = new URL(`${FANCOURIER_BASE}/reports/awb/tracking`);
  url.searchParams.set("clientId", String(env.FANCOURIER_CLIENT_ID));
  url.searchParams.set("awb[]", awbNumber);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new FanCourierError(`Urmărirea AWB a eșuat (${res.status})`);
  }
  const json: unknown = await res.json().catch(() => null);

  const first = (json as { data?: unknown[] })?.data?.[0] as
    | { events?: { date?: string; status?: string; name?: string }[] }
    | undefined;
  const events = (first?.events ?? []).map((e) => ({
    date: e.date ?? "",
    description: e.status ?? e.name ?? "",
  }));
  return {
    status: events[events.length - 1]?.description ?? "Necunoscut",
    events,
  };
}

/** Cancel an AWB. Best-effort; throws on API failure. */
export async function cancelAWB(awbNumber: string): Promise<void> {
  if (!isFanCourierEnabled()) {
    throw new FanCourierError("FanCourier nu este configurat");
  }
  const token = await login();
  const res = await fetch(`${FANCOURIER_BASE}/intern-awb`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      clientId: Number(env.FANCOURIER_CLIENT_ID),
      awb: awbNumber,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new FanCourierError(`Anularea AWB a eșuat (${res.status})`);
  }
}
