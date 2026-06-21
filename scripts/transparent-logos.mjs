// Make logo backgrounds transparent (flood-fill from edges) and trim, → public/logos/*.png
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";
import { join, parse } from "node:path";

const SRC = "logos";
const OUT = "public/logos";
mkdirSync(OUT, { recursive: true });

// Color distance (squared) between two RGB triples
const dist2 = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

async function process(file) {
  const { name } = parse(file);
  const img = sharp(join(SRC, file)).ensureAlpha();
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const idx = (x, y) => (y * width + x) * channels;

  // Sample the four corners to learn the background color(s)
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ].map(([x, y]) => {
    const i = idx(x, y);
    return [data[i], data[i + 1], data[i + 2]];
  });

  // If corners disagree wildly, the bg isn't a flat color — skip (likely a photo)
  let maxCornerSpread = 0;
  for (let a = 0; a < corners.length; a++)
    for (let b = a + 1; b < corners.length; b++)
      maxCornerSpread = Math.max(maxCornerSpread, dist2(corners[a], corners[b]));
  if (maxCornerSpread > 1600) {
    return { name, skipped: "non-flat background (photo?)" };
  }

  const bg = corners[0];
  const TOL = 42 * 42; // fuzz tolerance (squared)

  // Flood fill from all edge pixels matching the bg color
  const visited = new Uint8Array(width * height);
  const stack = [];
  const pushEdge = (x, y) => stack.push(y * width + x);
  for (let x = 0; x < width; x++) {
    pushEdge(x, 0);
    pushEdge(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushEdge(0, y);
    pushEdge(width - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    const x = p % width;
    const y = (p - x) / width;
    const i = p * channels;
    const px = [data[i], data[i + 1], data[i + 2]];
    if (dist2(px, bg) > TOL) continue;
    data[i + 3] = 0; // make transparent
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  // Count how much became transparent — if ~nothing, bg wasn't flat/edge-connected
  let cleared = 0;
  for (let p = 0; p < width * height; p++) if (visited[p] && data[p * channels + 3] === 0) cleared++;
  const pct = (cleared / (width * height)) * 100;

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .trim()
    .toFile(join(OUT, `${name}.png`));

  return { name, pct: pct.toFixed(0) };
}

const files = readdirSync(SRC).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));
for (const f of files) {
  try {
    const r = await process(f);
    if (r.skipped) console.log(`⚠ ${r.name.padEnd(40)} skipped — ${r.skipped}`);
    else console.log(`✓ ${r.name.padEnd(40)} bg cleared ~${r.pct}%`);
  } catch (e) {
    console.log(`✗ ${f.padEnd(40)} ${e.message}`);
  }
}
