import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { PageTransition } from "@/components/shop/page-transition";
import { SkipLink } from "@/components/shop/SkipLink";
import {
  CompareBar,
  MobileNav,
  FlashSaleBanner,
} from "@/components/shop/lazy-widgets";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <FlashSaleBanner />
      <SiteHeader />
      {/* Bottom padding on mobile clears the fixed MobileNav bar. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 pb-16 outline-none sm:pb-0"
      >
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <CartDrawer />
      <CompareBar />
      <MobileNav />
    </div>
  );
}
