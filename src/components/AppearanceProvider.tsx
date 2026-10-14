"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  appearanceCssVariables,
  DEFAULT_APPEARANCE_THEME,
  type AppearanceTheme,
  validateAppearanceTheme,
} from "@/lib/appearance-theme";

interface AppearanceContextValue {
  theme: AppearanceTheme;
  setTheme: (theme: AppearanceTheme) => void;
  saveTheme: (theme: AppearanceTheme) => Promise<void>;
  isLoading: boolean;
  error: string;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyTheme(theme: AppearanceTheme, isDark: boolean) {
  const root = document.documentElement;
  root.dataset.appTheme = "true";
  for (const [key, value] of Object.entries(appearanceCssVariables(theme, isDark))) {
    root.style.setProperty(key, value);
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const { resolvedTheme } = useTheme();
  const [storedTheme, setStoredTheme] = useState<AppearanceTheme>(DEFAULT_APPEARANCE_THEME);
  const [isFetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const theme = status === "unauthenticated" ? DEFAULT_APPEARANCE_THEME : storedTheme;
  const isLoading = status === "loading" || (status === "authenticated" && isFetching);

  useEffect(() => {
    applyTheme(theme, resolvedTheme === "dark");
  }, [theme, resolvedTheme]);

  useEffect(() => {
    let cancelled = false;
    if (status !== "authenticated") return () => { cancelled = true; };

    async function loadTheme() {
      setFetching(true);
      setError("");
      try {
        const response = await fetch("/api/user/appearance", { cache: "no-store" });
        const result = await response.json() as { success?: boolean; message?: string; data?: unknown };
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load appearance settings");
        }
        const loaded = validateAppearanceTheme(result.data);
        if (!loaded) throw new Error("The saved appearance settings are invalid.");
        if (!cancelled) setStoredTheme(loaded);
      } catch (loadError) {
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load appearance settings";
          setError(message);
          console.error("Unable to load appearance settings:", loadError);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    void loadTheme();
    return () => { cancelled = true; };
  }, [status]);

  const saveTheme = useCallback(async (nextTheme: AppearanceTheme) => {
    const response = await fetch("/api/user/appearance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextTheme),
    });
    const result = await response.json() as { success?: boolean; message?: string; data?: unknown };
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to save appearance settings");
    }
    const saved = validateAppearanceTheme(result.data);
    if (!saved) throw new Error("The saved appearance response was invalid.");
    setStoredTheme(saved);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme: setStoredTheme, saveTheme, isLoading, error }),
    [theme, saveTheme, isLoading, error]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearanceTheme() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearanceTheme must be used within AppearanceProvider");
  return context;
}
