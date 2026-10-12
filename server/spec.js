export const PALETTES = {
  cobalt: { name: "钴蓝", bg: "#f4f6fb", surface: "#ffffff", ink: "#141820", muted: "#5d6878", line: "#e5e9f2", accent: "#2f64f6", accent2: "#173ea5", soft: "#e7eeff", on: "#ffffff" },
  forest: { name: "墨绿", bg: "#f3f6f4", surface: "#ffffff", ink: "#14211b", muted: "#5c6b63", line: "#e1ebe6", accent: "#1f7a4d", accent2: "#0e3d28", soft: "#e5f4ec", on: "#ffffff" },
  coffee: { name: "焦糖", bg: "#f7f3ee", surface: "#fffdf9", ink: "#2a2118", muted: "#6f6256", line: "#eadfd2", accent: "#8a5a32", accent2: "#4e3118", soft: "#f3e6d8", on: "#ffffff" },
  ink: { name: "墨色", bg: "#f5f5f6", surface: "#ffffff", ink: "#111113", muted: "#5e6168", line: "#e6e6e8", accent: "#111113", accent2: "#333333", soft: "#ececee", on: "#ffffff" },
  rose: { name: "莓粉", bg: "#fbf6f7", surface: "#ffffff", ink: "#241418", muted: "#725860", line: "#f0e2e6", accent: "#d4537e", accent2: "#8c2348", soft: "#ffe4ee", on: "#ffffff" },
  violet: { name: "鸢尾", bg: "#f6f5fb", surface: "#ffffff", ink: "#1c1730", muted: "#655e78", line: "#e7e4f2", accent: "#6d5ef5", accent2: "#3a2e9e", soft: "#ece8ff", on: "#ffffff" },
  amber: { name: "琥珀", bg: "#fbf7f1", surface: "#ffffff", ink: "#241c12", muted: "#6e624f", line: "#efe4d4", accent: "#e08a1e", accent2: "#8a4e0a", soft: "#fff1dc", on: "#241c12" },
  night: { name: "夜航", bg: "#0e1218", surface: "#171d27", ink: "#f2f5f8", muted: "#a7b0bd", line: "#2a3342", accent: "#7aa2ff", accent2: "#c9d8ff", soft: "#1d2838", on: "#0e1218" },
};

export const KIND_LABEL = {
  saas: "落地页",
  brand: "品牌站",
  store: "网店",
  booking: "预约页",
  dashboard: "管理后台",
  todo: "任务板",
  blog: "博客",
  game: "小游戏",
  recommend: "推荐平台",
};

export const EXAMPLES = [
  {
    key: "saas",
    title: "SaaS 落地页",
    prompt: "创建一个名为 Northstar 的 SaaS 落地页，帮助独立咨询师管理客户项目。页面需要定价、常见问题和邮件订阅，主色蓝色。",
  },
  {
    key: "brand",
    title: "独立品牌",
    prompt: "为独立花店「野柚」做品牌官网，气质温柔，展示三组花束，并可以预约到店取花。",
  },
  {
    key: "film",
    title: "电影工作室",
    prompt: "做一个电影工作室网站，名字叫光粒影像。副标题必须是一句完整通顺的服务承诺（不要关键词罗列），例如「把你的故事拍成值得重看的画面」，然后展示代表作和拍摄服务，并留下片单联系。",
  },
  {
    key: "recommend",
    title: "推荐平台",
    prompt: "做一个城市咖啡馆推荐平台，可以搜索店名、标记喜欢，并看到一句推荐理由。",
  },
  {
    key: "store",
    title: "手作网店",
    prompt: "做一个手作陶瓷网店，品牌叫厚土，访客可以把器物加入购物袋并完成演示结算。",
  },
  {
    key: "game",
    title: "射击小游戏",
    prompt: "做一个轻松的点击射击小游戏，名字叫星屑打靶，限时二十秒，记录最高分。",
  },
];

export function themeCss(palette) {
  const item = typeof palette === "string" ? PALETTES[palette] : palette;
  return `:root{--bg:${item.bg};--surface:${item.surface};--ink:${item.ink};--muted:${item.muted};--line:${item.line};--accent:${item.accent};--accent-2:${item.accent2};--soft:${item.soft};--on:${item.on}}`;
}

export function applyPalette(html, paletteKey) {
  const css = themeCss(PALETTES[paletteKey] || PALETTES.cobalt);
  if (!html.includes('id="theme"')) return html;
  return html.replace(/<style id="theme">[\s\S]*?<\/style>/, `<style id="theme">${css}</style>`);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function replaceHeading(html, text) {
  const safe = escapeHtml(text);
  return html
    .replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/, `$1${safe}$2`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${safe}</title>`);
}
