/**
 * Skip-navigation link — the first focusable element on the page. Visually
 * hidden until focused, then jumps keyboard/screen-reader users straight to the
 * main content, bypassing the header navigation (WCAG 2.4.1).
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-background"
    >
      Sari la conținut principal
    </a>
  );
}
