const toSeconds = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

/** 75 -> "1:15", 3725 -> "1:02:05" */
export function clock(value) {
  const s = toSeconds(value);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 75 -> "1 min", 3725 -> "1h 2m" */
export function human(value) {
  const s = toSeconds(value);
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${s}s`;
}

function hash(text = "") {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Violet / indigo / teal family that matches the theme.
const PALETTES = [
  ["#7c3aed", "#4f46e5"],
  ["#6d28d9", "#0d9488"],
  ["#4338ca", "#8b5cf6"],
  ["#0f766e", "#4f46e5"],
  ["#9333ea", "#c026d3"],
  ["#2563eb", "#7c3aed"],
  ["#5b21b6", "#0891b2"],
];

export function gradientFor(seed) {
  const [a, b] = PALETTES[hash(seed) % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function initials(title = "") {
  return String(title)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
