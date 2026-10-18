import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Headless-Chromium PDF rendering for the LR sheet. Server-only.
 *
 *  - Serverless / Linux hosts (Vercel, Lambda, Docker): uses the Chromium
 *    binary bundled in `@sparticuz/chromium`.
 *  - Local dev on macOS/Windows (the bundled binary is Linux-only): set
 *    CHROME_EXECUTABLE_PATH to a local Chrome/Chromium.
 *  - Optional LR_PDF_FONT_URL: a font file (e.g. a Noto Sans Devanagari .ttf)
 *    copied into the fonts folder Chromium reads (best effort), for scripts
 *    the bundled fonts lack.
 */

/** Thrown when Chromium itself can't start, so callers can fall back to HTML. */
export class ChromiumUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Headless Chromium could not be started on this host.");
    this.name = "ChromiumUnavailableError";
    this.cause = cause;
  }
}

/** Thrown when Chromium ran but the sheet page didn't load. */
export class SheetLoadError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "SheetLoadError";
  }
}

const PAGE_TIMEOUT_MS = 25_000;

/** Best-effort: a missing font must never stop the PDF from rendering. */
async function installExtraFont(url: string): Promise<void> {
  try {
    const dir = join(tmpdir(), "fonts");
    const target = join(dir, basename(new URL(url).pathname) || "lr-extra-font.ttf");
    if (existsSync(target)) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await mkdir(dir, { recursive: true });
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
  } catch (error) {
    console.warn("LR PDF: couldn't install LR_PDF_FONT_URL font.", error);
  }
}

async function launch(): Promise<Browser> {
  try {
    const localPath = process.env.CHROME_EXECUTABLE_PATH;
    if (localPath) {
      return await puppeteer.launch({
        executablePath: localPath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    }

    const executablePath = await chromium.executablePath(); // also unpacks the bundled fonts
    const fontUrl = process.env.LR_PDF_FONT_URL;
    if (fontUrl) await installExtraFont(fontUrl);

    return await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath,
      headless: "shell",
    });
  } catch (error) {
    throw new ChromiumUnavailableError(error);
  }
}

function parseCookieHeader(header: string, url: string) {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      return eq > 0 ? { name: part.slice(0, eq), value: part.slice(eq + 1), url } : null;
    })
    .filter((c): c is { name: string; value: string; url: string } => c !== null);
}

/**
 * Loads `url` (a same-origin page) as the signed-in user and prints it.
 * The caller's cookies are attached to that origin only — never to
 * third-party requests such as background images.
 */
export async function renderPageToPdf(opts: {
  url: string;
  cookieHeader: string;
}): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const origin = new URL(opts.url).origin;

    const cookies = parseCookieHeader(opts.cookieHeader, origin);
    if (cookies.length > 0) await page.setCookie(...cookies);

    // The sheet is plain server-rendered HTML: skipping JS means no
    // hydration, no session polling and a faster, more deterministic render.
    await page.setJavaScriptEnabled(false);

    const response = await page.goto(opts.url, {
      waitUntil: "networkidle0",
      timeout: PAGE_TIMEOUT_MS,
    });
    const status = response?.status() ?? 0;
    if (status !== 200) {
      throw new SheetLoadError(
        status || 502,
        status === 404
          ? "Consignment not found"
          : `The LR sheet could not be rendered (HTTP ${status || "no response"}).`
      );
    }

    // The sheet's own @page rule (A4 landscape, 5mm margin) decides the size.
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      format: "A4",
      landscape: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
