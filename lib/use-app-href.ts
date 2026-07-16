"use client";

import { useEffect, useState } from "react";
import { appHref } from "@/lib/site-url";

/** Client-safe app link: stays relative on apex, points to apex on website-reverse subdomains. */
export function useAppHref(path: string): string {
  const [href, setHref] = useState(path);

  useEffect(() => {
    setHref(appHref(window.location.host, path));
  }, [path]);

  return href;
}
