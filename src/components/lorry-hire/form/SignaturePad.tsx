"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/components/Button";

/** Draw-to-sign pad. Emits a small PNG data URL ("" when cleared). */
export function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Paint an existing signature (edit mode) once.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !value) return;
    const img = new Image();
    img.onload = () => canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      y: ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(e.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const c = ref.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  return (
    <div>
      <canvas
        ref={ref}
        width={480}
        height={160}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="h-32 w-full max-w-md touch-none border border-dashed border-neutral-300 bg-neutral-50"
        aria-label="Driver signature"
      />
      <div className="mt-1 flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
        <span className="text-caption text-neutral-500">Sign inside the box with a finger, stylus or mouse.</span>
      </div>
    </div>
  );
}
