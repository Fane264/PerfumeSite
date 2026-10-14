"use client";

import { useTrackRecentlyViewed } from "@/hooks/use-recently-viewed";

/** Records a product view in localStorage on mount. Renders nothing. */
export function RecentlyViewedTracker({ slug }: { slug: string }) {
  useTrackRecentlyViewed(slug);
  return null;
}
