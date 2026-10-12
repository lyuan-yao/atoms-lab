import { db } from "./db.js";
import { PALETTES, escapeHtml } from "./spec.js";
import { artFigure, pickEmoji } from "./art.js";

// 旧版本就地补图：只替换空渐变色块、给列表卡补封面，不重排 DOM、不动 data-eid，
// 手动改过的文字原样保留。幂等：打过补丁的 html 不会再次修改。

const ART_CSS = `.thumb{margin:0 0 10px;border-radius:14px;overflow:hidden;aspect-ratio:4/3;background:var(--soft)}.thumb svg{display:block;width:100%;height:100%;transition:transform .45s ease}.product:hover .thumb svg,.place:hover .thumb svg,.post:hover .thumb svg{transform:scale(1.05)}.place .thumb,.post .thumb{aspect-ratio:16/9;margin-bottom:12px}[data-ico]::before{content:attr(data-ico);margin-right:7px}`;

function regexSafe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(value) {
  return String(value).replace(/&(amp|lt|gt|quot|#39);/g, (all, entity) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" }[entity]));
}

function figure(item, kind, palette) {
  return artFigure({ name: item?.name || item?.title, note: item?.note || item?.excerpt || item?.body, kind, emoji: item?.emoji, seed: (item?.name || item?.title || "atoms") + kind, palette });
}

export function patchHtmlArt(html, spec) {
  if (!html || !spec || typeof html !== "string") return null;
  if (html.includes('class="thumb"') || html.includes('id="art-css"')) return null;
  const palette = PALETTES[spec.palette] ? spec.palette : "cobalt";
  let out = html;
  let touched = false;

  if (out.includes('<div class="swatch"></div>')) {
    const products = Array.isArray(spec.products) ? spec.products : [];
    let index = 0;
    out = out.replace(/<div class="swatch"><\/div>/g, (match, offset) => {
      const item = products[index];
      index += 1;
      if (item) return figure(item, "store", palette);
      const tail = /<h3>([^<]{1,48})<\/h3>/.exec(out.slice(offset, offset + 400));
      const name = tail ? decodeEntities(tail[1]) : `商品${index}`;
      return figure({ name }, "store", palette);
    });
    touched = true;
  }

  if (spec.kind === "blog" && Array.isArray(spec.posts)) {
    for (const post of spec.posts) {
      if (!post?.title) continue;
      const pattern = new RegExp(`(<article class="post" data-post="${regexSafe(escapeHtml(post.title))}">)`);
      if (pattern.test(out)) {
        out = out.replace(pattern, `$1${figure(post, "blog", palette)}`);
        touched = true;
      }
    }
  }

  if (spec.kind === "recommend" && Array.isArray(spec.places)) {
    for (const [index, place] of spec.places.entries()) {
      if (!place?.name) continue;
      const key = regexSafe(escapeHtml(`${place.name}${place.area || ""}${place.note || ""}`));
      const pattern = new RegExp(`(<article class="place" data-place="${key}" data-id="p${index}">)`);
      if (pattern.test(out)) {
        out = out.replace(pattern, `$1${figure(place, "recommend", palette)}`);
        touched = true;
      }
    }
  }

  if (spec.kind === "booking" && Array.isArray(spec.services)) {
    for (const service of spec.services) {
      if (!service?.name) continue;
      const pattern = new RegExp(`<button[^>]*\\bdata-service="${regexSafe(escapeHtml(service.name))}">`);
      if (pattern.test(out)) {
        const icon = pickEmoji({ name: service.name, note: service.note, kind: "booking", emoji: service.emoji });
        out = out.replace(pattern, (tag) => `${tag.slice(0, -1)} data-ico="${escapeHtml(icon)}">`);
        touched = true;
      }
    }
  }

  if (!touched) return null;
  if (!out.includes("</head>")) return null;
  return out.replace("</head>", `<style id="art-css">${ART_CSS}</style></head>`);
}

function patchTable(selectAll, update) {
  let changed = 0;
  for (const row of selectAll()) {
    let spec = null;
    try { spec = JSON.parse(row.spec_json || "{}"); } catch { spec = null; }
    const next = patchHtmlArt(row.html, spec);
    if (next) {
      update(row.id, next);
      changed += 1;
    }
  }
  return changed;
}

export function patchLegacyArtwork() {
  return (
    patchTable(
      () => db.prepare("SELECT id, html, spec_json FROM versions").all(),
      (id, html) => db.prepare("UPDATE versions SET html = ? WHERE id = ?").run(html, id),
    ) +
    patchTable(
      () => db.prepare("SELECT key AS id, html, '{}' AS spec_json FROM example_cache").all(),
      (id, html) => db.prepare("UPDATE example_cache SET html = ? WHERE key = ?").run(html, id),
    )
  );
}
