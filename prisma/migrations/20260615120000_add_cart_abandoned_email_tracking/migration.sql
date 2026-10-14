-- Abandoned-cart recovery + low-stock admin alert tracking.
-- Adds idempotency timestamps consumed by the scheduled cron jobs.

ALTER TABLE "Cart" ADD COLUMN "abandonedEmailSentAt" TIMESTAMP(3);

ALTER TABLE "Inventory" ADD COLUMN "lowStockAlertSentAt" TIMESTAMP(3);
