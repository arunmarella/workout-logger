// Per-template accent hues, derived from the template name so each card keeps
// a stable identity across renders. UI-only: no behavior or data changes.

import { createElement } from "react";
import { Dumbbell, Flame, Footprints, PersonStanding } from "lucide-react";

// Mono — pure black & white, no color accent at all. The single accent
// resolves to var(--brand-1), which is theme-aware (black in light mode,
// white in dark mode), so template cards, icon tiles and history cards
// all follow the theme. accentFor keeps its shape so callers don't change.
export const ACCENT_HUES = [
  { name: "mono", solid: "var(--brand-1)" },
];

export function accentFor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return ACCENT_HUES[hash % ACCENT_HUES.length];
}

// Pastel tile wash — soft cheerful backgrounds for template icon tiles.
// One wash per template, derived from the name so each card keeps a stable
// identity. No pink, no violet, no orange: yellow, mint, peach, sky, lime.
// The icon stays black on the wash in both themes (see .icon-tile[data-wash]).
export const WASHES = ["#fef3c7", "#d1fae5", "#ffe5d9", "#dbeafe", "#ecfccb"];

export function washFor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return WASHES[hash % WASHES.length];
}

// Decorative icon for a template's icon tile, by keyword. Mono line icons
// (lucide-react, currentColor stroke) — no emoji. Returns an element (not a
// component) so callers can render it inline without creating components
// during render. Default dumbbell.
export function iconFor(name = "", size = 21) {
  const n = name.toLowerCase();
  if (n.includes("tib") || n.includes("ankle") || n.includes("calf") || n.includes("foot")) return createElement(Footprints, { size });
  if (n.includes("leg") || n.includes("quad") || n.includes("hamstring") || n.includes("glute")) return createElement(PersonStanding, { size });
  if (n.includes("core") || n.includes("abs")) return createElement(Flame, { size });
  return createElement(Dumbbell, { size });
}
