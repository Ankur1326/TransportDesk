import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TruckTypeIcon } from "../TruckTypeIcon";
import { TRUCK_TYPE_CATALOG } from "@/lib/lorry-hire/truck-types";

const render = (type: string | null) => renderToStaticMarkup(createElement(TruckTypeIcon, { type }));

test("every truck type draws its own icon", () => {
  const seen = new Set<string>();
  for (const t of TRUCK_TYPE_CATALOG) {
    const svg = render(t.label);
    assert.match(svg, new RegExp(`data-truck-type="${t.key}"`), t.label);
    assert.ok(svg.includes("<circle"), `${t.label} has wheels`);
    seen.add(svg);
  }
  assert.equal(seen.size, TRUCK_TYPE_CATALOG.length, "each icon is different");
});

test("icons are self-contained so they print and render in the PDF", () => {
  for (const t of TRUCK_TYPE_CATALOG) {
    const svg = render(t.label);
    assert.ok(!/(<image|<use|href=|url\(|<style|\sid=)/.test(svg), `${t.label} uses only inline shapes`);
  }
});

test("values saved by the old form still show the right icon, and unknown ones a plain truck", () => {
  assert.match(render("Pickup"), /data-truck-type="pickup"/);
  assert.match(render("Open Truck"), /data-truck-type="half-body"/);
  assert.match(render("Other"), /data-truck-type="generic"/);
  assert.match(render(null), /data-truck-type="generic"/);
});

test("no icon uses yellow, and each type has its own body colour", () => {
  const isYellow = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return r > 180 && g > 150 && b < 130 && Math.abs(r - g) < 90;
  };
  const bodies = new Set<string>();
  for (const t of TRUCK_TYPE_CATALOG) {
    const svg = render(t.label);
    for (const m of svg.matchAll(/#[0-9a-fA-F]{6}/g)) assert.ok(!isYellow(m[0]), `${t.label} uses yellow ${m[0]}`);
    bodies.add(svg.match(/#[0-9a-fA-F]{6}/g)!.filter((c) => c.toLowerCase() !== "#1b2559").join(","));
  }
  assert.equal(bodies.size, TRUCK_TYPE_CATALOG.length);
});
