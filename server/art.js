import { PALETTES } from "./spec.js";

// 生成式配图：不依赖外部图片，也不使用模板素材。
// 每张图由「模型选出的 emoji + 页面文案哈希 + 配色」确定性生成，同一内容永远得到同一张图。

const KEYWORD_EMOJI = [
  ["望远镜", "🔭"],
  ["面筋", "🍢"], ["烤串", "🍢"], ["炸串", "🍢"], ["串", "🍢"], ["鱿鱼", "🦑"], ["章鱼", "🐙"],
  ["火锅", "🍲"], ["麻辣烫", "🍲"], ["汤", "🥣"], ["面", "🍜"], ["米线", "🍜"], ["粉", "🍝"],
  ["粥", "🥣"], ["饭", "🍚"], ["包子", "🥟"], ["饺子", "🥟"], ["小笼", "🥟"], ["蒸", "🥟"],
  ["汉堡", "🍔"], ["披萨", "🍕"], ["三明治", "🥪"], ["热狗", "🌭"], ["肠", "🌭"],
  ["炸鸡", "🍗"], ["鸡腿", "🍗"], ["鸡翅", "🍗"], ["鸡", "🐔"], ["鸭", "🦆"], ["牛", "🥩"], ["羊", "🍖"], ["肉", "🍖"],
  ["虾", "🍤"], ["蟹", "🦀"], ["鱼", "🐟"], ["蛋", "🍳"], ["饼", "🫓"], ["粽", "🍃"],
  ["蛋糕", "🍰"], ["甜品", "🍮"], ["布丁", "🍮"], ["糕", "🍰"], ["面包", "🍞"], ["吐司", "🍞"],
  ["冰淇淋", "🍦"], ["雪糕", "🍦"], ["冰", "🍧"], ["奶茶", "🧋"], ["咖啡", "☕"], ["拿铁", "☕"],
  ["柠檬", "🍋"], ["果汁", "🧃"], ["西瓜", "🍉"], ["莓", "🍓"], ["葡", "🍇"], ["橘", "🍊"], ["橙", "🍊"], ["苹果", "🍎"],
  ["茶", "🍵"], ["酒", "🍺"], ["汽水", "🥤"], ["豆", "🥛"], ["奶", "🥛"],
  ["麻辣", "🌶"], ["辣", "🌶"], ["凉菜", "🥗"], ["沙拉", "🥗"], ["菜", "🥬"], ["瓜", "🥒"], ["菌", "🍄"], ["菇", "🍄"],
  ["夜宵", "🌙"], ["宵夜", "🌙"], ["早餐", "🥪"], ["午市", "🍱"], ["套餐", "🍱"], ["拼盘", "🍱"], ["卤味", "🍖"],
  ["陶瓷", "🏺"], ["陶", "🏺"], ["瓷器", "🏺"], ["壶", "🫖"], ["杯", "🍵"], ["碗", "🥣"], ["瓶", "🏺"], ["盘", "🍽"],
  ["花", "💐"], ["束", "💐"], ["戒指", "💍"], ["项链", "📿"], ["手链", "📿"], ["耳", "💎"],
  ["织", "🧶"], ["毛线", "🧶"], ["布", "🧵"], ["香", "🕯"], ["蜡烛", "🕯"], ["灯", "💡"],
  ["椅", "🪑"], ["凳", "🪑"], ["木", "🪵"], ["皮", "👛"], ["钱包", "👛"], ["背包", "🎒"], ["包", "👜"],
  ["帽", "🧢"], ["衣", "👕"], ["衫", "👕"], ["裙", "👗"], ["袜", "🧦"], ["鞋", "👟"], ["墨镜", "🕶"], ["眼镜", "🕶"], ["镜", "🕶"], ["伞", "☂"],
  ["玩具", "🧸"], ["熊", "🧸"], ["积木", "🧩"], ["拼图", "🧩"], ["乐器", "🎸"], ["琴", "🎹"],
  ["相机", "📷"], ["手机", "📱"], ["电脑", "💻"], ["耳机", "🎧"], ["键盘", "⌨"], ["音箱", "🔊"],
  ["观测", "🔭"], ["天文", "🔭"], ["星空", "🌌"], ["流星", "☄"], ["月亮", "🌙"], ["星球", "🪐"], ["太阳", "☀"],
  ["植物", "🪴"], ["绿植", "🪴"], ["多肉", "🌵"], ["仙人掌", "🌵"], ["花盆", "🪴"], ["种子", "🌱"],
  ["猫", "🐱"], ["狗", "🐶"], ["宠物", "🐾"], ["鱼缸", "🐠"], ["鸟", "🐦"],
  ["按摩", "💆"], ["瑜伽", "🧘"], ["健身", "🏋"], ["游泳", "🏊"], ["跑步", "🏃"], ["球", "⚽"], ["骑行", "🚴"],
  ["理发", "💈"], ["美甲", "💅"], ["美容", "🧖"], ["护肤", "🧴"], ["香氛", "🌸"], ["洗", "🧼"], ["浴", "🛁"],
  ["维修", "🔧"], ["洗车", "🚗"], ["搬家", "📦"], ["快递", "📦"], ["代驾", "🚕"], ["租车", "🚙"],
  ["课程", "📖"], ["辅导", "📝"], ["外语", "🗣"], ["编程", "💻"], ["美术", "🎨"], ["舞蹈", "💃"],
  ["咨询", "💬"], ["法律", "⚖"], ["牙", "🦷"], ["体检", "🩺"], ["医疗", "🏥"], ["心理", "🧠"],
  ["门票", "🎟"], ["演出", "🎭"], ["电影", "🎬"], ["展览", "🖼"], ["派对", "🎉"], ["婚礼", "💒"],
  ["露营", "⛺"], ["徒步", "🥾"], ["旅行", "🧳"], ["民宿", "🏠"], ["酒店", "🏨"], ["咖啡馆", "☕"],
  ["采摘", "🍒"], ["农场", "🚜"], ["蜂蜜", "🍯"], ["烘焙", "🧁"], ["厨", "🍳"],
];

const KIND_EMOJI = {
  store: ["🛍", "🫖", "🍯", "🧺", "🎁", "🏺", "🧁", "🪴", "🍰", "🍜"],
  booking: ["📅", "⏰", "🗓", "📍", "🕐", "📋", "🎯", "🔔"],
  saas: ["⚡", "🚀", "🧩", "📊", "🛠", "📈", "🤖", "🔐"],
  brand: ["✨", "🎨", "🌿", "💫", "🪷", "🫧", "🎭", "🕊"],
  dashboard: ["📊", "🗂", "📈", "🧮", "🗄", "📑", "💼", "🔍"],
  todo: ["✅", "📝", "🗂", "⏱", "📌", "🗒", "🔖", "🧭"],
  blog: ["📝", "📖", "✍", "📰", "🔖", "📄", "💡", "🌍"],
  game: ["🎯", "🕹", "🎮", "🎲", "🏆", "👾", "✦", "⚡"],
  recommend: ["📍", "🌟", "🧭", "🗺", "💬", "🏷", "🪄", "🫶"],
};

const GLYPH = /(\p{Extended_Pictographic})(\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u;

function hash32(value) {
  let out = 2166136261;
  const text = String(value || "atoms");
  for (let i = 0; i < text.length; i += 1) {
    out ^= text.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 1831565813) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToHsl(hex) {
  const clean = String(hex || "#2f64f6").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hsl(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const lig = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let rgb = [c, x, 0];
  if (hue >= 60 && hue < 120) rgb = [x, c, 0];
  else if (hue >= 120 && hue < 180) rgb = [0, c, x];
  else if (hue >= 180 && hue < 240) rgb = [0, x, c];
  else if (hue >= 240 && hue < 300) rgb = [x, 0, c];
  else if (hue >= 300) rgb = [c, 0, x];
  const hex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
}

let uid = 0;

export function pickGlyph(value) {
  const match = GLYPH.exec(String(value ?? "").trim());
  if (!match) return "";
  return match[0].slice(0, 12);
}

export function pickEmoji({ name, note, kind, emoji } = {}) {
  const explicit = pickGlyph(emoji);
  if (explicit) return explicit;
  const haystack = `${name || ""}${note || ""}`;
  for (const [word, glyph] of KEYWORD_EMOJI) {
    if (haystack.includes(word)) return glyph;
  }
  const themed = KIND_EMOJI[kind] || KIND_EMOJI.brand;
  return themed[hash32(String(name || "") + kind) % themed.length];
}

export function artSvg({ seed, emoji, palette } = {}) {
  const colors = PALETTES[palette] || PALETTES.cobalt;
  const rnd = mulberry32(hash32(`${seed}:${palette}`));
  uid = (uid + 1) % 100000;
  const id = `art${uid.toString(36)}${(hash32(String(seed)) % 1679616).toString(36)}`;
  const anchor = hexToHsl(colors.accent);
  const rot = Math.round(rnd() * 44 - 22);
  const baseHue = anchor.s < 14 ? Math.round(rnd() * 360) : anchor.h;
  const sat = anchor.s < 14 ? 54 : clamp(anchor.s, 42, 74);
  const top = hsl(baseHue + rot, sat - 6, 66);
  const bottom = hsl(baseHue + rot + 34, sat + 8, 36);
  const blobA = hsl(baseHue + rot + 52, sat, 70);
  const blobB = hsl(baseHue + rot - 30, sat + 6, 26);
  const glow = hsl(baseHue + rot + 90, sat - 18, 82);
  const cx = 200 + Math.round(rnd() * 60 - 30);
  const cy = 150 + Math.round(rnd() * 40 - 20);
  const tilt = (rnd() * 9 - 4.5).toFixed(1);
  const dots = Array.from({ length: 9 }, () => {
    const x = Math.round(rnd() * 380 + 10);
    const y = Math.round(rnd() * 280 + 10);
    const r = (rnd() * 2.4 + 1.4).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${(rnd() * 0.25 + 0.12).toFixed(2)}"/>`;
  }).join("");
  const glyph = emoji || "✦";
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<filter id="${id}b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="30"/></filter>
</defs>
<rect width="400" height="300" fill="url(#${id}g)"/>
<g filter="url(#${id}b)"><ellipse cx="${cx - 90}" cy="${cy - 60}" rx="120" ry="90" fill="${blobA}" opacity=".55"/><ellipse cx="${cx + 110}" cy="${cy + 70}" rx="130" ry="95" fill="${blobB}" opacity=".5"/><ellipse cx="${cx + 40}" cy="${cy - 90}" rx="90" ry="70" fill="${glow}" opacity=".38"/></g>
${dots}
<circle cx="${cx}" cy="${cy}" r="92" fill="#ffffff" opacity=".24"/>
<circle cx="${cx}" cy="${cy}" r="92" fill="none" stroke="#ffffff" opacity=".5" stroke-width="1.6"/>
<circle cx="${cx}" cy="${cy}" r="76" fill="none" stroke="#ffffff" opacity=".32" stroke-width="1" stroke-dasharray="3 7"/>
<text x="${cx}" y="${cy}" font-size="88" text-anchor="middle" dominant-baseline="central" dy=".08em" transform="rotate(${tilt} ${cx} ${cy})" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${glyph}</text>
</svg>`;
}

export function artFigure({ name, note, kind, emoji, seed, palette }) {
  const glyph = pickEmoji({ name, note, kind, emoji });
  return `<figure class="thumb" aria-hidden="true">${artSvg({ seed: seed || name || "atoms", emoji: glyph, palette })}</figure>`;
}
