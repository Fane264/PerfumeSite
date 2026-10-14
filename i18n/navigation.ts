import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. These prefix internal hrefs with the active
 * locale automatically (no prefix for the default RO locale), so EN users stay
 * within `/en/...` as they navigate. Use these instead of `next/link` and
 * `next/navigation` in the localized storefront.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
