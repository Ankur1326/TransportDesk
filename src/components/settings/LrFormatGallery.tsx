"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Maximize2, Palette, Trash2, X } from "lucide-react";
import { LorryCopy, LRStyles } from "@/components/billing/Printpreview";
import { LR_FORMATS, type CompanySettingsValues, type LRFormat } from "@/lib/company-settings";
import { LR_FORMAT_META } from "@/lib/lr-formats";
import { LR_COPY_LABELS, type LrCopyKey } from "@/lib/lr-copies";
import { buildSampleLr, withSampleCompany } from "@/lib/lr-sample";

/** A4 landscape LR sheet in CSS px (287mm x 200mm at 96dpi). */
const PAGE_W = 1085;
const PAGE_H = 756;

/** Renders its child at natural LR size and scales it to fit the available width. */
function ScaledSheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.1, el.clientWidth / PAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className={`relative w-full overflow-hidden ${className}`} style={{ height: PAGE_H * scale }}>
      <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

interface GalleryProps {
  settings: CompanySettingsValues;
  onSelect: (format: LRFormat) => void;
  onBackgroundColor: (format: LRFormat, color: string) => void;
  onBackgroundImage: (format: LRFormat, event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveBackgroundImage: (format: LRFormat) => void;
}

export function LrFormatGallery({ settings, onSelect, onBackgroundColor, onBackgroundImage, onRemoveBackgroundImage }: GalleryProps) {
  const [fullFormat, setFullFormat] = useState<LRFormat | null>(null);
  const sample = useMemo(() => buildSampleLr(), []);
  const company = useMemo(() => withSampleCompany(settings), [settings]);

  return (
    <div className="space-y-3">
      <LRStyles />
      <div>
        <h4 className="font-semibold text-slate-900">Lorry Receipt format</h4>
        <p className="mt-0.5 text-xs text-slate-500">
          Pick a layout. Every preview below is the real bilty, drawn with your logo, address, bank details and
          background, using a sample consignment. Open <b>Full preview</b> to see a format at full size.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {LR_FORMATS.map((format, index) => {
          const meta = LR_FORMAT_META[format];
          const selected = settings.lrFormat === format;
          const background = settings.lrFormatBackgrounds[format];
          return (
            <section
              key={format}
              style={{ animationDelay: `${index * 60}ms` }}
              className={`uts-rise overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                selected ? "border-brand-600 ring-2 ring-brand-200" : "border-slate-200"
              }`}
            >
              <div className="group relative bg-slate-100 p-3">
                <button
                  type="button"
                  onClick={() => setFullFormat(format)}
                  aria-label={`Open full preview of ${meta.name}`}
                  className="block w-full cursor-zoom-in overflow-hidden rounded-lg shadow-md ring-1 ring-slate-300 transition group-hover:ring-brand-400"
                >
                  <ScaledSheet>
                    <LorryCopy values={sample} company={company} lrFormat={format} />
                  </ScaledSheet>
                </button>
                <span className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-b-lg bg-gradient-to-t from-black/55 to-transparent py-3 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Full preview
                </span>
                {selected && (
                  <span className="uts-pop absolute right-5 top-5 flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> In use
                  </span>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-base font-bold text-slate-900">{meta.name}</h5>
                      <span className="flex overflow-hidden rounded-full ring-1 ring-slate-200" aria-hidden="true">
                        <span className="h-3.5 w-3.5" style={{ backgroundColor: meta.swatch[0] }} />
                        <span className="h-3.5 w-3.5" style={{ backgroundColor: meta.swatch[1] }} />
                      </span>
                    </div>
                    <p className="text-xs font-medium text-brand-700">{meta.tagline}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setFullFormat(format)}
                      className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
                    >
                      <Maximize2 className="h-4 w-4" aria-hidden="true" /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(format)}
                      aria-pressed={selected}
                      className={`focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition active:scale-95 ${
                        selected ? "bg-brand-700 text-white" : "bg-slate-900 text-white hover:bg-slate-700"
                      }`}
                    >
                      {selected ? <><Check className="h-4 w-4" aria-hidden="true" /> Selected</> : "Use this"}
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-600">{meta.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {meta.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{tag}</span>
                  ))}
                </div>

                <details className="group/bg rounded-lg border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700">
                    <Palette className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Paper colour &amp; background image
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition group-open/bg:rotate-90" aria-hidden="true" />
                  </summary>
                  <div className="space-y-3 border-t border-slate-200 p-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        aria-label={`${meta.name} background color`}
                        type="color"
                        value={background.backgroundColor}
                        onChange={(event) => onBackgroundColor(format, event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
                      />
                      <span className="text-xs font-medium uppercase text-slate-600">{background.backgroundColor}</span>
                    </label>
                    {background.backgroundImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={background.backgroundImage} alt={`${meta.name} background preview`} className="h-16 w-full rounded border border-slate-200 object-cover" />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <label className="focus-ring inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <ImagePlus className="h-4 w-4" aria-hidden="true" /> Choose image
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => onBackgroundImage(format, event)} />
                      </label>
                      {background.backgroundImage && (
                        <button
                          type="button"
                          onClick={() => onRemoveBackgroundImage(format)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPEG or WebP, max 256 KB. Printed behind the whole sheet.</p>
                  </div>
                </details>
              </div>
            </section>
          );
        })}
      </div>

      {fullFormat && (
        <FullPreview
          format={fullFormat}
          selectedFormat={settings.lrFormat}
          sample={sample}
          company={company}
          onChange={setFullFormat}
          onUse={(format) => { onSelect(format); }}
          onClose={() => setFullFormat(null)}
        />
      )}
    </div>
  );
}

const COPY_CHOICES: { key: LrCopyKey | "none"; label: string }[] = [
  { key: "none", label: "No copy label" },
  { key: "lorry", label: "Lorry copy" },
  { key: "consignee", label: "Consignee copy" },
  { key: "consignor", label: "Consignor copy" },
  { key: "file", label: "File copy" },
];

function FullPreview({ format, selectedFormat, sample, company, onChange, onUse, onClose }: {
  format: LRFormat;
  selectedFormat: LRFormat;
  sample: ReturnType<typeof buildSampleLr>;
  company: CompanySettingsValues;
  onChange: (format: LRFormat) => void;
  onUse: (format: LRFormat) => void;
  onClose: () => void;
}) {
  const [copy, setCopy] = useState<LrCopyKey | "none">("none");
  const meta = LR_FORMAT_META[format];
  const index = LR_FORMATS.indexOf(format);
  const selected = selectedFormat === format;

  const go = useCallback((delta: number) => {
    onChange(LR_FORMATS[(index + delta + LR_FORMATS.length) % LR_FORMATS.length]);
  }, [index, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${meta.name} format preview`}>
      <div className="uts-pop m-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:m-6" onClick={(e) => e.stopPropagation()}>
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{meta.name} format</h3>
            <p className="text-xs text-slate-500">{meta.tagline}</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={copy}
              onChange={(e) => setCopy(e.target.value as LrCopyKey | "none")}
              aria-label="Copy label"
              className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700"
            >
              {COPY_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => onUse(format)}
              className={`focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition active:scale-95 ${
                selected ? "bg-brand-700 text-white" : "bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              {selected ? <><Check className="h-4 w-4" aria-hidden="true" /> In use</> : "Use this format"}
            </button>
            <button type="button" onClick={onClose} aria-label="Close preview" className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <nav className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2" aria-label="Formats">
          <button type="button" onClick={() => go(-1)} aria-label="Previous format" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {LR_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              aria-current={f === format}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                f === format ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {LR_FORMAT_META[f].name}
            </button>
          ))}
          <button type="button" onClick={() => go(1)} aria-label="Next format" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-200 p-4 sm:p-6">
          <div key={format} className="uts-rise mx-auto max-w-[1085px] overflow-hidden rounded-lg shadow-xl ring-1 ring-slate-300">
            <ScaledSheet>
              <LorryCopy
                values={sample}
                company={company}
                lrFormat={format}
                copyName={copy === "none" ? undefined : LR_COPY_LABELS[copy]}
              />
            </ScaledSheet>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-slate-600">{meta.description}</p>
        </div>
      </div>
    </div>
  );
}
