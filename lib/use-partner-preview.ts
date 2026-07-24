"use client";

import { useEffect, useState } from "react";
import {
  parsePartnerPreviewParams,
  type PartnerPreviewConfig,
} from "@/lib/partner-preview";

export function usePartnerPreview(): PartnerPreviewConfig | null {
  const [config, setConfig] = useState<PartnerPreviewConfig | null>(null);

  useEffect(() => {
    setConfig(
      parsePartnerPreviewParams(new URLSearchParams(window.location.search))
    );
  }, []);

  return config;
}
