"use client";

import { useEffect, useState } from "react";

/** `true` after the first client render — guards persisted/client-only state. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
