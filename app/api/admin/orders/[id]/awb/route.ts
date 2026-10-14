import { NextRequest } from "next/server";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { serializeOrder } from "@/lib/serializers";
import { generateAWB, isFanCourierEnabled } from "@/lib/fancourier";
import { orderArgs, type ShippingAddress } from "@/types";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// COD payment is still outstanding while the order is unpaid.
const COD_OUTSTANDING: OrderStatus[] = [
  OrderStatus.PENDING_COD,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

// POST /api/admin/orders/[id]/awb — generate a FanCourier AWB for an order and
// persist the tracking number + URL. Admin only.
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    if (!isFanCourierEnabled()) {
      return apiError(
        "FanCourier nu este configurat (setează FANCOURIER_USERNAME / PASSWORD / CLIENT_ID)",
        503,
      );
    }

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) return apiError("Comanda nu a fost găsită", 404);

    const address = order.shippingAddress as unknown as ShippingAddress;
    if (!address?.name || !address?.phone) {
      return apiError("Comanda nu are o adresă de livrare validă", 400);
    }

    // Estimate weight: ~0.12 kg per decant, with a 0.5 kg floor.
    const units = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const weight = Math.max(0.5, Math.round(units * 0.12 * 10) / 10);

    const isCodOutstanding =
      order.paymentMethod === PaymentMethod.COD &&
      COD_OUTSTANDING.includes(order.status);

    const awb = await generateAWB({
      recipientName: address.name,
      recipientPhone: address.phone,
      recipientAddress: [address.line1, address.line2].filter(Boolean).join(", "),
      recipientCity: address.city,
      recipientCounty: address.county,
      recipientPostalCode: address.postalCode,
      packageCount: 1,
      weight,
      codAmount: isCodOutstanding ? toNumber(order.total) : 0,
      orderReference: order.orderNumber,
      observations: `Comanda ${order.orderNumber}`,
    });

    const updated = await db.order.update({
      where: { id: order.id },
      data: { trackingNumber: awb.awbNumber, trackingUrl: awb.trackingUrl },
      ...orderArgs,
    });

    return apiSuccess(serializeOrder(updated, { includeCustomer: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
