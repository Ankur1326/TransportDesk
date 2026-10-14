export const APPEARANCE_COLOR_KEYS = [
  "primary",
  "accent",
  "pageBackground",
  "cardBackground",
  "text",
  "mutedText",
  "border",
  "sidebarBackground",
  "sidebarText",
  "sidebarActiveBackground",
  "sidebarActiveText",
  "buttonBackground",
  "buttonText",
  "buttonHover",
] as const;

export type AppearanceColorKey = (typeof APPEARANCE_COLOR_KEYS)[number];
export type AppearanceColors = Record<AppearanceColorKey, string>;
export type AppearancePresetId = "transport-orange" | "executive-navy" | "forest-green" | "royal-indigo" | "graphite";

export interface AppearanceTheme {
  preset: AppearancePresetId;
  colors: AppearanceColors;
}

export interface AppearancePreset {
  id: AppearancePresetId;
  name: string;
  description: string;
  colors: AppearanceColors;
}

export const APPEARANCE_PRESETS: AppearancePreset[] = [
  {
    id: "transport-orange",
    name: "Transport Orange",
    description: "Warm, confident orange with charcoal neutrals.",
    colors: {
      primary: "#DB7007",
      accent: "#B85C05",
      pageBackground: "#F7F7F5",
      cardBackground: "#FFFFFF",
      text: "#242321",
      mutedText: "#6C6A66",
      border: "#E5E2DC",
      sidebarBackground: "#FFFFFF",
      sidebarText: "#45423E",
      sidebarActiveBackground: "#FFF0E1",
      sidebarActiveText: "#793B00",
      buttonBackground: "#B85C05",
      buttonText: "#FFFFFF",
      buttonHover: "#A84F00",
    },
  },
  {
    id: "executive-navy",
    name: "Executive Navy",
    description: "Classic navy, crisp white, and restrained blue accents.",
    colors: {
      primary: "#244B78",
      accent: "#38779A",
      pageBackground: "#F4F7FA",
      cardBackground: "#FFFFFF",
      text: "#1E2937",
      mutedText: "#647386",
      border: "#DCE4EC",
      sidebarBackground: "#FFFFFF",
      sidebarText: "#39495B",
      sidebarActiveBackground: "#E8F0F8",
      sidebarActiveText: "#193C62",
      buttonBackground: "#244B78",
      buttonText: "#FFFFFF",
      buttonHover: "#193C62",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "Grounded evergreen with soft, warm neutrals.",
    colors: {
      primary: "#32745A",
      accent: "#55866A",
      pageBackground: "#F5F8F5",
      cardBackground: "#FFFFFF",
      text: "#202B25",
      mutedText: "#64756A",
      border: "#DCE6DE",
      sidebarBackground: "#FFFFFF",
      sidebarText: "#3D5145",
      sidebarActiveBackground: "#E6F2E9",
      sidebarActiveText: "#20553D",
      buttonBackground: "#32745A",
      buttonText: "#FFFFFF",
      buttonHover: "#285F49",
    },
  },
  {
    id: "royal-indigo",
    name: "Royal Indigo",
    description: "Refined indigo with cool, modern surfaces.",
    colors: {
      primary: "#5A58A6",
      accent: "#716FAF",
      pageBackground: "#F6F6FA",
      cardBackground: "#FFFFFF",
      text: "#25253A",
      mutedText: "#6C6C86",
      border: "#E1E1ED",
      sidebarBackground: "#FFFFFF",
      sidebarText: "#474761",
      sidebarActiveBackground: "#EEEDFA",
      sidebarActiveText: "#45438A",
      buttonBackground: "#5A58A6",
      buttonText: "#FFFFFF",
      buttonHover: "#48468D",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Quiet charcoal with a subtle copper accent.",
    colors: {
      primary: "#48515B",
      accent: "#A96839",
      pageBackground: "#F5F6F7",
      cardBackground: "#FFFFFF",
      text: "#24282D",
      mutedText: "#69717A",
      border: "#DFE2E5",
      sidebarBackground: "#FFFFFF",
      sidebarText: "#414950",
      sidebarActiveBackground: "#ECEFF1",
      sidebarActiveText: "#303841",
      buttonBackground: "#48515B",
      buttonText: "#FFFFFF",
      buttonHover: "#353D46",
    },
  },
];

export const DEFAULT_APPEARANCE_THEME: AppearanceTheme = {
  preset: "transport-orange",
  colors: APPEARANCE_PRESETS[0].colors,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function validateAppearanceTheme(value: unknown): AppearanceTheme | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!APPEARANCE_PRESETS.some((preset) => preset.id === input.preset)) return null;
  if (!input.colors || typeof input.colors !== "object" || Array.isArray(input.colors)) return null;

  const rawColors = input.colors as Record<string, unknown>;
  const colors = {} as AppearanceColors;
  for (const key of APPEARANCE_COLOR_KEYS) {
    const color = rawColors[key];
    if (typeof color !== "string" || !HEX_COLOR.test(color)) return null;
    colors[key] = color.toLowerCase();
  }

  if (
    contrastRatio(colors.buttonBackground, colors.buttonText) < 4.5 ||
    contrastRatio(colors.buttonHover, colors.buttonText) < 4.5 ||
    contrastRatio(colors.pageBackground, colors.text) < 4.5 ||
    contrastRatio(colors.cardBackground, colors.text) < 4.5 ||
    contrastRatio(colors.cardBackground, colors.mutedText) < 4.5 ||
    contrastRatio(colors.sidebarBackground, colors.sidebarText) < 4.5 ||
    contrastRatio(colors.sidebarActiveBackground, colors.sidebarActiveText) < 4.5
  ) return null;

  return { preset: input.preset as AppearancePresetId, colors };
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g);
    if (!channels) return 0;
    const [red, green, blue] = channels.map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function mixColor(hex: string, other: string, amount: number): string {
  const from = hex.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16));
  const to = other.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16));
  return `#${from.map((value, index) => Math.round(value * (1 - amount) + to[index] * amount).toString(16).padStart(2, "0")).join("")}`;
}

function createScale(color: string): string[] {
  return [
    mixColor(color, "#ffffff", 0.96),
    mixColor(color, "#ffffff", 0.90),
    mixColor(color, "#ffffff", 0.76),
    mixColor(color, "#ffffff", 0.58),
    mixColor(color, "#ffffff", 0.34),
    mixColor(color, "#ffffff", 0.16),
    color,
    mixColor(color, "#000000", 0.16),
    mixColor(color, "#000000", 0.30),
    mixColor(color, "#000000", 0.46),
    mixColor(color, "#000000", 0.64),
  ];
}

function darkSurface(color: string, amount: number): string {
  return mixColor("#17191c", color, amount);
}

export function appearanceCssVariables(theme: AppearanceTheme, isDark = false): Record<string, string> {
  const { colors } = theme;
  const brand = createScale(colors.primary);
  const accent = createScale(colors.accent);
  const palette: Record<string, string> = {};
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  for (const [index, step] of steps.entries()) {
    palette[`--color-brand-${step}`] = brand[index];
    palette[`--color-accent-${step}`] = accent[index];
  }

  const lightNeutral: Record<string, string> = {
    50: colors.pageBackground,
    100: mixColor(colors.pageBackground, colors.cardBackground, 0.50),
    200: colors.border,
    300: mixColor(colors.border, colors.mutedText, 0.28),
    400: mixColor(colors.mutedText, colors.cardBackground, 0.18),
    500: colors.mutedText,
    600: mixColor(colors.text, colors.mutedText, 0.42),
    700: mixColor(colors.text, colors.cardBackground, 0.22),
    800: mixColor(colors.text, colors.cardBackground, 0.10),
    900: colors.text,
    950: colors.text,
  };
  const darkNeutral: Record<string, string> = {
    50: darkSurface(colors.primary, 0.10),
    100: darkSurface(colors.primary, 0.15),
    200: darkSurface(colors.primary, 0.24),
    300: darkSurface(colors.primary, 0.33),
    400: "#9AA1AA",
    500: "#AEB4BC",
    600: "#C2C7CE",
    700: "#D3D7DC",
    800: "#E4E7EA",
    900: "#F1F3F5",
    950: "#FFFFFF",
  };
  for (const step of steps) {
    const neutralValue = isDark ? darkNeutral[step] : lightNeutral[step];
    palette[`--color-slate-${step}`] = neutralValue;
    palette[`--color-gray-${step}`] = neutralValue;
    palette[`--color-neutral-${step}`] = neutralValue;
    palette[`--app-dark-slate-${step}`] = darkNeutral[step];
  }
  palette["--app-page-background"] = isDark ? darkSurface(colors.primary, 0.08) : colors.pageBackground;
  palette["--app-card-background"] = isDark ? darkSurface(colors.primary, 0.15) : colors.cardBackground;
  palette["--app-text"] = isDark ? "#F4F3F0" : colors.text;
  palette["--app-muted-text"] = isDark ? "#B8B7B2" : colors.mutedText;
  palette["--app-border"] = isDark ? darkSurface(colors.primary, 0.30) : colors.border;
  palette["--app-sidebar-background"] = isDark ? darkSurface(colors.primary, 0.07) : colors.sidebarBackground;
  palette["--app-sidebar-text"] = isDark ? "#E8E6E1" : colors.sidebarText;
  palette["--app-sidebar-active-background"] = isDark ? darkSurface(colors.primary, 0.42) : colors.sidebarActiveBackground;
  palette["--app-sidebar-active-text"] = isDark ? "#FFFFFF" : colors.sidebarActiveText;
  palette["--app-sidebar-active-mark"] = colors.primary;
  palette["--app-button-background"] = colors.buttonBackground;
  palette["--app-button-text"] = colors.buttonText;
  palette["--app-button-hover"] = colors.buttonHover;
  palette["--app-primary-foreground"] = contrastRatio(colors.primary, "#ffffff") >= 4.5 ? "#ffffff" : "#21160c";
  palette["--app-accent-foreground"] = contrastRatio(colors.accent, "#ffffff") >= 4.5 ? "#ffffff" : "#21160c";
  palette["--app-dark-page-background"] = darkSurface(colors.primary, 0.08);
  palette["--app-dark-card-background"] = darkSurface(colors.primary, 0.15);
  palette["--app-dark-sidebar-background"] = darkSurface(colors.primary, 0.07);
  palette["--app-dark-text"] = "#F4F3F0";
  palette["--app-dark-muted-text"] = "#B8B7B2";
  palette["--app-dark-border"] = darkSurface(colors.primary, 0.30);
  palette["--app-dark-sidebar-text"] = "#E8E6E1";
  palette["--app-dark-sidebar-active-background"] = darkSurface(colors.primary, 0.42);
  palette["--app-dark-sidebar-active-text"] =
    contrastRatio(darkSurface(colors.primary, 0.42), "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#21160c";
  palette["--app-focus-ring"] = `${colors.primary}66`;

  const pageBackground = isDark ? palette["--app-dark-page-background"] : colors.pageBackground;
  const cardBackground = isDark ? palette["--app-dark-card-background"] : colors.cardBackground;
  const appText = isDark ? palette["--app-dark-text"] : colors.text;
  const mutedText = isDark ? palette["--app-dark-muted-text"] : colors.mutedText;
  const border = isDark ? palette["--app-dark-border"] : colors.border;
  const sidebarBackground = isDark ? palette["--app-dark-sidebar-background"] : colors.sidebarBackground;
  const sidebarText = isDark ? palette["--app-dark-sidebar-text"] : colors.sidebarText;
  const sidebarActiveBackground = isDark
    ? palette["--app-dark-sidebar-active-background"]
    : colors.sidebarActiveBackground;
  const sidebarActiveText = isDark
    ? palette["--app-dark-sidebar-active-text"]
    : colors.sidebarActiveText;
  const buttonForeground = colors.buttonText;
  const primaryForeground = contrastRatio(colors.primary, "#ffffff") >= 4.5 ? "#ffffff" : "#21160c";
  const accentForeground = contrastRatio(colors.accent, "#ffffff") >= 4.5 ? "#ffffff" : "#21160c";
  Object.assign(palette, {
    "--background": pageBackground,
    "--foreground": appText,
    "--card": cardBackground,
    "--card-foreground": appText,
    "--popover": cardBackground,
    "--popover-foreground": appText,
    "--primary": colors.primary,
    "--primary-foreground": primaryForeground,
    "--secondary": colors.accent,
    "--secondary-foreground": accentForeground,
    "--accent": colors.accent,
    "--accent-foreground": accentForeground,
    "--muted": isDark ? darkSurface(colors.primary, 0.18) : lightNeutral[100],
    "--muted-foreground": mutedText,
    "--border": border,
    "--input": border,
    "--ring": colors.primary,
    "--sidebar": sidebarBackground,
    "--sidebar-foreground": sidebarText,
    "--sidebar-primary": colors.primary,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-accent": sidebarActiveBackground,
    "--sidebar-accent-foreground": sidebarActiveText,
    "--sidebar-border": border,
    "--sidebar-ring": colors.primary,
    "--app-button-text": buttonForeground,
    "--app-sidebar-active-text": sidebarActiveText,
  });
  return palette;
}
