import { CLIENT_JS } from "./runtime.js";
import { KIND_LABEL, PALETTES, escapeHtml, themeCss } from "./spec.js";
import { artFigure, pickEmoji } from "./art.js";

const h = escapeHtml;

function jsonScript(data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/json" id="app-data">${json}</script>`;
}

const BASE_CSS = `
*{box-sizing:border-box}
[hidden]{display:none !important}
html,body{margin:0;padding:0}
body{font-family:"IBM Plex Sans","PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--ink);line-height:1.6}
a{color:inherit}
button,input,textarea{font:inherit}
button{cursor:pointer}
img{max-width:100%}
.wrap{width:min(1080px,calc(100% - 32px));margin:0 auto}
.nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px)}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:-.02em;text-decoration:none}
.dot{width:10px;height:10px;border-radius:99px;background:var(--accent)}
.nav-links{display:flex;gap:18px;align-items:center;color:var(--muted);font-size:14px}
.nav-links a{text-decoration:none}
.nav-toggle{display:none;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 12px}
.hero{display:grid;grid-template-columns:1.2fr .8fr;gap:32px;align-items:center;padding:42px 0 20px}
.layout-bold .hero{grid-template-columns:1fr}
.layout-bold h1{font-size:clamp(48px,8vw,84px);line-height:.98;letter-spacing:-.045em}
h1{font-size:clamp(36px,5vw,60px);line-height:1.05;letter-spacing:-.04em;margin:0 0 12px}
.sub{font-size:18px;color:var(--muted);max-width:46ch}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.btn{border:0;border-radius:999px;padding:12px 18px;background:var(--accent);color:var(--on);text-decoration:none;display:inline-flex;align-items:center}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:18px;box-shadow:0 16px 40px rgba(0,0,0,.04)}
.hero-card{min-height:240px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(160deg,var(--soft),var(--surface) 55%)}
.kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-2)}
.section{padding:28px 0}
.section h2{font-size:28px;letter-spacing:-.03em;margin:0 0 8px}
.grid-3,.price-grid,.shop-grid,.place-grid,.post-list{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.place-grid,.post-list{grid-template-columns:1fr 1fr}
.card,.price,.place,.post{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px}
.card h3,.price h3,.place h3{margin:8px 0}
.muted{color:var(--muted)}
.price strong,.product strong{font-size:28px;letter-spacing:-.03em}
.bill{display:inline-flex;padding:4px;border-radius:999px;background:var(--soft);margin:8px 0 14px}
.bill button,.seg button,.choice button,.filters button{border:0;background:transparent;border-radius:999px;padding:8px 12px;color:var(--muted)}
.bill button.is-on,.seg button.is-on,.choice button.is-on,.filters button.is-on,.chip-btn.is-on{background:var(--surface);color:var(--ink);box-shadow:0 1px 0 var(--line)}
.choice{display:flex;flex-wrap:wrap;gap:8px}
.choice button{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.choice button small{color:var(--muted)}
.hero-single{grid-template-columns:1fr}
.choice button,.filters button{border:1px solid var(--line);background:var(--surface)}
ul.clean{padding-left:18px;margin:8px 0;color:var(--muted)}
details, .acc{border-top:1px solid var(--line)}
.acc button{width:100%;text-align:left;background:transparent;border:0;padding:14px 0;font-weight:650}
.acc .acc-panel{padding:0 0 14px;color:var(--muted)}
form.stack{display:grid;gap:10px}
input,textarea{width:100%;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:12px 14px}
.msg{min-height:1.2em;color:var(--accent-2);font-weight:650}
.footer{padding:28px 0 40px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.shop-grid{grid-template-columns:repeat(3,1fr)}
.product{display:flex;flex-direction:column;gap:6px}
.thumb{margin:0 0 10px;border-radius:14px;overflow:hidden;aspect-ratio:4/3;background:var(--soft)}
.thumb svg{display:block;width:100%;height:100%;transition:transform .45s ease}
.product:hover .thumb svg,.place:hover .thumb svg,.post:hover .thumb svg{transform:scale(1.05)}
.place .thumb,.post .thumb{aspect-ratio:16/9;margin-bottom:12px}
[data-ico]::before{content:attr(data-ico);margin-right:7px}
.cart{position:sticky;bottom:12px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;gap:8px}
.cart-row{display:flex;justify-content:space-between;gap:8px}
.appbar{display:flex;justify-content:space-between;align-items:center;padding:18px 0}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kpis article{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px}
.kpis strong{display:block;font-size:28px}
table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:16px;overflow:hidden}
th,td{text-align:left;padding:12px;border-bottom:1px solid var(--line);font-size:14px}
.todo-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.todo-row.is-done span{text-decoration:line-through;color:var(--muted)}
.arena{position:relative;height:420px;border-radius:24px;background:radial-gradient(circle at 30% 20%,var(--soft),var(--bg) 55%);border:1px solid var(--line);overflow:hidden}
.target{position:absolute;width:54px;height:54px;border-radius:50%;border:0;background:var(--accent);color:var(--on);font-size:20px}
.scoreline{display:flex;gap:18px;align-items:end}
.scoreline strong{font-size:42px;letter-spacing:-.04em}
.reader{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:12px}
.layout-split .hero-card{order:-1}
body.is-editing [data-eid]:hover{outline:2px solid var(--accent);outline-offset:3px;cursor:text}
body.is-editing [data-eid].is-picked{outline:2px solid var(--accent);outline-offset:3px}
[data-eid].is-sourced{outline:2px solid var(--accent);outline-offset:4px;background:color-mix(in srgb,var(--accent) 14%,transparent)}
@media (max-width:800px){
  .hero,.grid-3,.price-grid,.shop-grid,.place-grid,.post-list,.kpis{grid-template-columns:1fr}
  .nav-toggle{display:inline-flex}
  .nav-links{display:none;position:absolute;top:58px;left:16px;right:16px;flex-direction:column;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px}
  .nav-links.is-open{display:flex}
}
@media (max-width:560px){
  h1{font-size:27px;letter-spacing:-.02em}
  .layout-bold h1{font-size:32px}
  .section h2{font-size:21px}
  .sub{font-size:15px}
  .appbar{flex-wrap:wrap;gap:10px}
  .appbar h1{margin-bottom:4px}
  .kpis strong{font-size:22px}
  .scoreline strong{font-size:30px}
  .arena{height:300px}
  th,td{padding:9px;font-size:13px}
  .wrap{width:calc(100% - 24px)}
}
`;

function documentWrap({ spec, palette, layout, main, data }) {
  const colors = PALETTES[palette] || PALETTES.cobalt;
  const payload = data ? jsonScript(data) : "";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${h(spec.seo.title)}</title>
  <meta name="description" content="${h(spec.seo.description)}" />
  <meta name="keywords" content="${h(spec.seo.keywords)}" />
  <style id="theme">${themeCss(colors)}</style>
  <style>${BASE_CSS}</style>
</head>
<body class="layout-${layout}" data-storage="${h(spec.storageKey)}" data-kind="${h(spec.kind)}">
  ${main}
  ${payload}
  <script>${CLIENT_JS}</script>
</body>
</html>`;
}

function nav(spec, links) {
  const items = links.map(([href, label]) => `<a href="${href}">${h(label)}</a>`).join("");
  return `<header class="wrap nav">
    <a class="brand" href="#top"><i class="dot"></i>${h(spec.brand)}</a>
    <button class="nav-toggle" type="button" data-nav-toggle>菜单</button>
    <nav class="nav-links" data-nav-links>${items}</nav>
  </header>`;
}

function footer(spec) {
  return `<footer class="wrap footer"><span>${h(spec.brand)} · ${h(KIND_LABEL[spec.kind])}</span><span>由 Atoms Lab 编译，可独立打开</span></footer>`;
}

function marketing(spec, paletteKey) {
  const features = spec.features
    .map((item, index) => {
      const icon = item.emoji ? ` data-ico="${h(item.emoji)}"` : "";
      return `<article class="card"><p class="kicker">0${index + 1}</p><h3${icon}>${h(item.title)}</h3><p class="muted">${h(item.body)}</p></article>`;
    })
    .join("");
  const plans = spec.plans
    .map(
      (plan) => `<article class="price"><h3>${h(plan.name)}</h3><strong data-price data-year="${h(plan.year)}" data-month="${h(plan.month)}">${h(plan.year)}</strong><ul class="clean">${plan.points.map((point) => `<li>${h(point)}</li>`).join("")}</ul></article>`,
    )
    .join("");
  const faqs = spec.faqs
    .map(
      (item) => `<div class="acc"><button type="button" data-acc aria-expanded="false">${h(item.q)}</button><div class="acc-panel" hidden><p>${h(item.a)}</p></div></div>`,
    )
    .join("");
  return `<div id="top"></div>
    ${nav(spec, [["#story", "介绍"], ["#price", "价格"], ["#faq", "问题"], ["#join", "联系"]])}
    <main>
      <section class="wrap hero">
        <div>
          <p class="kicker">${h(KIND_LABEL[spec.kind])}</p>
          <h1>${h(spec.headline)}</h1>
          <p class="sub">${h(spec.subhead)}</p>
          <div class="actions"><a class="btn" href="#join">开始</a><a class="btn ghost" href="#story">先看三件事</a></div>
        </div>
        <aside class="panel hero-card">
          <p class="kicker">给谁</p>
          <h2>${h(spec.audience)}</h2>
          <p class="muted">${h(spec.offer)}</p>
        </aside>
      </section>
      <section class="wrap section" id="story">
        <h2>第一版只做这三件事</h2>
        <div class="grid-3">${features}</div>
      </section>
      <section class="wrap section" id="price">
        <h2>价格</h2>
        <div class="bill"><button type="button" data-bill="year" class="is-on">按年</button><button type="button" data-bill="month">按月</button></div>
        <div class="price-grid">${plans}</div>
      </section>
      <section class="wrap section" id="faq">
        <h2>常见问题</h2>
        ${faqs}
      </section>
      <section class="wrap section" id="join">
        <div class="panel">
          <h2>留下邮箱</h2>
          <p class="muted">提交后写进这台浏览器的本地存储，刷新还在。不会发信，也不会写入我们的服务器。</p>
          <form class="stack" data-subscribe>
            <input name="email" type="email" placeholder="you@studio.com" aria-label="邮箱" required />
            <button class="btn" type="submit">订阅更新</button>
            <p class="msg" data-form-msg></p>
          </form>
        </div>
      </section>
    </main>
    ${footer(spec)}`;
}

function storePage(spec, paletteKey) {
  const cards = spec.products
    .map(
      (item) => `<article class="card product">${artFigure({ name: item.name, note: item.note, kind: "store", emoji: item.emoji, seed: `${item.name}·${spec.brand}`, palette: paletteKey })}<h3>${h(item.name)}</h3><p class="muted">${h(item.note)}</p><strong>¥${item.price}</strong><button class="btn" type="button" data-add data-name="${h(item.name)}" data-price="${item.price}">加入购物袋</button></article>`,
    )
    .join("");
  return `<div id="top"></div>
    ${nav(spec, [["#goods", "器物"], ["#cart-anchor", "购物袋"]])}
    <main class="wrap">
      <section class="hero hero-single">
        <div>
          <p class="kicker">网店</p>
          <h1>${h(spec.headline)}</h1>
          <p class="sub">${h(spec.subhead)}</p>
        </div>
      </section>
      <section id="goods" class="section shop-grid">${cards}</section>
      <section id="cart-anchor" class="cart" data-cart hidden>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>购物袋 <span data-cart-count>0</span></strong>
          <button class="btn ghost" type="button" data-open-cart>收起</button>
        </div>
        <div data-cart-lines></div>
        <form class="stack" data-checkout>
          <input name="person" placeholder="收件人姓名" aria-label="姓名" required />
          <input name="contact" type="email" placeholder="邮箱" aria-label="邮箱" required />
          <button class="btn" type="submit">演示结算</button>
        </form>
        <p class="msg" data-cart-msg></p>
      </section>
    </main>
    ${footer(spec)}
    <button class="btn" type="button" data-open-cart style="position:fixed;right:16px;bottom:16px">购物袋 <span data-cart-count>0</span></button>`;
}

function bookingPage(spec) {
  const services = spec.services
    .map((item) => {
      const icon = pickEmoji({ name: item.name, note: item.note, kind: "booking", emoji: item.emoji });
      return `<button type="button" data-service="${h(item.name)}" data-ico="${h(icon)}">${h(item.name)}<small class="muted"> ${item.price ? "¥" + item.price : "免费"} · ${h(item.note)}</small></button>`;
    })
    .join("");
  const times = ["10:00", "11:30", "14:00", "16:00", "19:00"]
    .map((time) => `<button type="button" data-time="${time}">${time}</button>`)
    .join("");
  return `<div id="top"></div>
    ${nav(spec, [["#book", "预约"]])}
    <main class="wrap" data-booking>
      <section class="hero">
        <div>
          <p class="kicker">预约</p>
          <h1>${h(spec.headline)}</h1>
          <p class="sub">${h(spec.subhead)}</p>
        </div>
        <aside class="panel"><p class="kicker">给谁</p><h2>${h(spec.audience)}</h2></aside>
      </section>
      <section class="section" id="book">
        <h2>1. 服务</h2>
        <div class="choice">${services}</div>
        <h2>2. 日期</h2>
        <div class="choice" data-dates></div>
        <h2>3. 时间</h2>
        <div class="choice">${times}</div>
        <form class="stack panel" data-book-form style="margin-top:16px">
          <h2>4. 留下姓名</h2>
          <input name="person" placeholder="怎么称呼你" aria-label="姓名" required />
          <button class="btn" type="submit">确认预约</button>
          <p class="msg" data-book-msg></p>
        </form>
      </section>
    </main>
    ${footer(spec)}`;
}

function dashboardPage(spec) {
  return `<main class="wrap" data-dash>
      <header class="appbar">
        <div><p class="kicker">后台</p><h1>${h(spec.headline)}</h1></div>
        <div class="seg"><button type="button" data-range="week" class="is-on">本周</button><button type="button" data-range="month">本月</button></div>
      </header>
      <section class="kpis" data-kpis></section>
      <section class="section">
        <input data-dash-q placeholder="搜索客户、负责人或状态" aria-label="搜索" />
        <table><thead><tr><th>客户</th><th>负责人</th><th>状态</th><th>金额</th></tr></thead><tbody data-rows></tbody></table>
      </section>
    </main>
    ${footer(spec)}`;
}

function todoPage(spec) {
  return `<main class="wrap" data-todo>
      <header class="appbar"><div><p class="kicker">任务板</p><h1>${h(spec.headline)}</h1><p class="sub">${h(spec.subhead)}</p></div></header>
      <form class="stack" data-todo-add><input name="title" placeholder="加上一件今天要做的事" aria-label="新任务" /></form>
      <div class="filters" style="display:flex;gap:8px;margin:12px 0">
        <button type="button" data-filter="open" class="is-on">未完成</button>
        <button type="button" data-filter="done">已完成</button>
        <button type="button" data-filter="all">全部</button>
      </div>
      <div data-todo-list></div>
    </main>
    ${footer(spec)}`;
}

function blogPage(spec, paletteKey) {
  const posts = spec.posts
    .map(
      (post) => `<article class="post" data-post="${h(post.title)}">${artFigure({ name: post.title, note: post.excerpt, kind: "blog", emoji: post.emoji, seed: `${post.title}·${spec.brand}`, palette: paletteKey })}<h3>${h(post.title)}</h3><p class="muted">${h(post.excerpt)}</p><button class="btn ghost" type="button" data-read="${h(post.title)}">阅读</button></article>`,
    )
    .join("");
  return `<main class="wrap">
      <header class="appbar"><div><p class="kicker">笔记</p><h1>${h(spec.headline)}</h1></div></header>
      <input data-post-q placeholder="搜索篇名" aria-label="搜索篇名" />
      <section class="section post-list">${posts}</section>
      <section class="reader" data-reader hidden></section>
    </main>
    ${footer(spec)}`;
}

function gamePage(spec) {
  return `<main class="wrap">
      <header class="appbar">
        <div><p class="kicker">小游戏</p><h1>${h(spec.headline)}</h1><p class="sub">${h(spec.subhead)}</p></div>
        <button class="btn" type="button" data-start>开始</button>
      </header>
      <section data-game>
        <div class="scoreline"><div><span class="muted">分数</span><strong data-score>0</strong></div><div><span class="muted">最高</span><strong data-best>0</strong></div><div><span class="muted">剩余秒</span><strong data-time-left>20</strong></div></div>
        <p class="msg" data-game-msg>按下开始。点中星屑得分。</p>
        <div class="arena" data-arena></div>
      </section>
    </main>
    ${footer(spec)}`;
}

function recommendPage(spec, paletteKey) {
  const cards = spec.places
    .map(
      (place, index) => `<article class="place" data-place="${h(place.name + place.area + place.note)}" data-id="p${index}">${artFigure({ name: place.name, note: place.note, kind: "recommend", emoji: place.emoji, seed: `${place.name}·${spec.brand}`, palette: paletteKey })}<p class="kicker">${h(place.area)}</p><h3>${h(place.name)}</h3><p class="muted">${h(place.note)}</p><button class="btn ghost" type="button" data-like>喜欢</button></article>`,
    )
    .join("");
  return `<main class="wrap">
      <header class="hero hero-single">
        <div><p class="kicker">推荐</p><h1>${h(spec.headline)}</h1><p class="sub">${h(spec.subhead)}</p></div>
      </header>
      <input data-find placeholder="搜索名字或区域" aria-label="搜索" />
      <section class="section place-grid">${cards}</section>
    </main>
    ${footer(spec)}`;
}

const LAYOUTS = ["studio", "split", "bold"];

function stamp(html) {
  const scriptAt = html.indexOf("<script");
  const cut = scriptAt === -1 ? html.length : scriptAt;
  let count = 0;
  const stamped = html.slice(0, cut).replace(/<(h1|h2|h3|p|button|a|li)\b([^>]*)>/gi, (match, tag, rest) => {
    if (/\sdata-eid=/.test(rest)) return match;
    count += 1;
    return `<${tag} data-eid="e${count}"${rest}>`;
  });
  return stamped + html.slice(cut);
}

export function renderApp(spec, { variant = 0, palette } = {}) {
  const paletteKey = palette || spec.palette;
  const layout = LAYOUTS[variant] || "studio";
  const colors = PALETTES[paletteKey] || PALETTES.cobalt;
  let main = marketing(spec, paletteKey);
  let data = null;
  if (spec.kind === "store") main = storePage(spec, paletteKey);
  if (spec.kind === "booking" || (spec.kind === "brand" && /预约|取花|到店/.test(spec.prompt))) main = bookingPage(spec);
  if (spec.kind === "dashboard") {
    main = dashboardPage(spec);
    data = { rows: spec.rows };
  }
  if (spec.kind === "todo") {
    main = todoPage(spec);
    data = { todos: spec.todos };
  }
  if (spec.kind === "blog") {
    main = blogPage(spec, paletteKey);
    data = { posts: spec.posts };
  }
  if (spec.kind === "game") main = gamePage(spec);
  if (spec.kind === "recommend") main = recommendPage(spec, paletteKey);
  const html = stamp(documentWrap({ spec, palette: paletteKey, layout, main, data }));
  const letters = ["A", "B", "C"];
  return {
    html,
    label: `方案 ${letters[variant] || variant + 1} · ${colors.name} · ${layout === "bold" ? "大标题" : layout === "split" ? "对开" : "工作室"}`,
    blurb: `已编译「${spec.brand}」的${KIND_LABEL[spec.kind]}，主色是${colors.name}。`,
    paletteName: colors.name,
    paletteKey,
    layout,
  };
}

export function variantPalette(spec, variant) {
  if (variant === 0) return spec.palette;
  const order = Object.keys(PALETTES).filter((key) => key !== spec.palette);
  return order[(variant - 1) % order.length];
}
