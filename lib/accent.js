// Per-template accent hues, derived from the template name so each card keeps
// a stable identity across renders. UI-only: no behavior or data changes.

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

// Decorative icon for a template's icon tile, by keyword. Default dumbbell.
export function iconFor(name = "") {
  const n = name.toLowerCase();
  if (n.includes("tib") || n.includes("ankle") || n.includes("calf") || n.includes("foot")) return "🦶";
  if (n.includes("leg") || n.includes("quad") || n.includes("hamstring") || n.includes("glute")) return "🦵";
  if (n.includes("chest")) return "💪";
  if (n.includes("back") || n.includes("pull")) return "🏋️";
  if (n.includes("shoulder") || n.includes("arm") || n.includes("bicep") || n.includes("tricep")) return "💪";
  if (n.includes("core") || n.includes("abs")) return "🔥";
  if (n.includes("push")) return "💪";
  return "🏋️";
}
