"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocHeading } from "@/lib/blog";

/**
 * Sticky table of contents for a blog post. Highlights the heading currently in
 * view using an IntersectionObserver, and smooth-scrolls on click.
 */
export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    headings[0]?.id ?? null,
  );

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -66% 0px", threshold: 0 },
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Cuprins" className="text-sm">
      <p className="mb-4 text-xs uppercase tracking-luxe text-gold">Cuprins</p>
      <ol className="space-y-2.5 border-l border-border">
        {headings.map((heading, index) => {
          const active = heading.id === activeId;
          return (
            <li
              key={heading.id}
              className={cn(heading.level === 3 && "ml-4")}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(heading.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveId(heading.id);
                    history.replaceState(null, "", `#${heading.id}`);
                  }
                }}
                className={cn(
                  "-ml-px flex border-l-2 pl-4 leading-snug transition-colors",
                  active
                    ? "border-gold text-gold"
                    : "border-transparent text-muted-foreground hover:text-cream",
                )}
              >
                <span className="mr-2 text-xs tabular-nums text-muted-2">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {heading.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
