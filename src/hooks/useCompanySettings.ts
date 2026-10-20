"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettingsResponse,
  type CompanySettingsValues,
} from "@/lib/company-settings";

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettingsValues>(DEFAULT_COMPANY_SETTINGS);
  const [isLoading, setLoading] = useState(true);
  // True after the first fetch settles; unlike isLoading it never flips back on focus reloads.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/settings", { cache: "no-store" });
        const result = (await response.json()) as CompanySettingsResponse;
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Unable to load company settings");
        }
        if (!cancelled) {
          setSettings({
            ...DEFAULT_COMPANY_SETTINGS,
            ...result.data,
            lrFormatBackgrounds: {
              ...DEFAULT_COMPANY_SETTINGS.lrFormatBackgrounds,
              ...result.data.lrFormatBackgrounds,
            },
            chargeDefinitions: result.data.chargeDefinitions ?? DEFAULT_COMPANY_SETTINGS.chargeDefinitions,
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load company settings";
          setError(message);
          console.error("Unable to load company settings:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    }

    void load();

    function reloadWhenFocused() {
      if (document.visibilityState === "visible") {
        setReloadKey((current) => current + 1);
      }
    }

    window.addEventListener("focus", reloadWhenFocused);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", reloadWhenFocused);
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  return { settings, isLoading, hasLoaded, error, reload };
}
