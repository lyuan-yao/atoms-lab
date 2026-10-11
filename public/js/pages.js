import { api, esc, toast } from "./api.js";
import { navigate } from "./router.js";
import { AGENTS, setMe, state } from "./state.js";

const PLANS = {
  year: [
    { id: "free", name: "Free", price: "$0", unit: "/月", note: "入门", points: ["注册赠送 120 积分", "流式多智能体生成", "版本、发布与导出"] },
    { id: "pro", name: "Pro", price: "$15.8", unit: "/月", note: "演示价，年付相当于月付 $20", points: ["包含 Free", "再赠送 400 积分", "用量流水"], featured: true },
    { id: "max", name: "Max", price: "$79", unit: "/月", note: "演示价，年付相当于月付 $100", points: ["包含 Pro", "再赠送 1200 积分", "适合连续打磨多个想法"], featured: true },
  ],
  month: [
    { id: "free", name: "Free", price: "$0", unit: "/月", note: "入门", points: ["注册赠送 120 积分", "流式多智能体生成", "版本、发布与导出"] },
    { id: "pro", name: "Pro", price: "$20", unit: "/月", note: "按月演示价", points: ["包含 Free", "再赠送 400 积分", "用量流水"], featured: true },
    { id: "max", name: "Max", price: "$100", unit: "/月", note: "按月演示价", points: ["包含 Pro", "再赠送 1200 积分", "适合连续打磨多个想法"], featured: true },
  ],
};

function orbs() {
  return `<div class="orbs">${AGENTS.map((agent) => `<span style="background:${agent.color}">${agent.id.slice(0, 1)}</span>`).join("")}</div>`;
}

function nav() {
  const me = state.me;
  const account = me
    ? `<span class="credits" data-credits>${me.credits} 积分</span>
       <a class="btn-soft" href="/studio" data-link>工作室</a>
       <a class="btn-ghost" href="/settings" data-link>设置</a>
       <details class="menu">
         <summary>${esc(me.name)}</summary>
         <div class="menu-pop">
           <div class="ledger">${(me.ledger || []).slice(0, 6).map((row) => `<div>${row.delta > 0 ? "+" : ""}${row.delta} · ${esc(row.reason)}</div>`).join("") || "<div>还没有用量</div>"}</div>
           <button type="button" data-logout>退出</button>
         </div>
       </details>`
    : `<a class="btn-ghost" href="/login" data-link>登录</a><a class="btn-primary" href="/register" data-link>注册</a>`;
  return `<header class="topnav">
    <a class="brand" href="/" data-link><img src="/favicon.svg" alt="" />Atoms Lab</a>
    <nav class="nav-links">
      <a href="/explore" data-link>探索</a>
      <a href="/agents" data-link>智能体</a>
      <a href="/pricing" data-link>定价</a>
      <details class="menu"><summary>资源</summary><div class="menu-pop">
        <a href="/help" data-link>帮助</a>
        <a href="/about" data-link>关于</a>
      </div></details>
    </nav>
    <div class="nav-actions">${account}</div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><strong>Atoms Lab</strong><span>把想法编译成可点击的页面。</span></div>
    <div><a href="/explore" data-link>探索</a><a href="/pricing" data-link>定价</a><a href="/agents" data-link>智能体</a></div>
    <div><a href="/help" data-link>帮助</a><a href="/about" data-link>关于</a><a href="/studio" data-link>工作室</a></div>
  </footer>`;
}

function bindLogout(root) {
  root.querySelector("[data-logout]")?.addEventListener("click", async () => {
    if (state.me?.email?.endsWith("@lab.local") && !confirm("访客退出后不能再回到这个身份。确定退出？")) return;
    await api("/api/auth/logout", { method: "POST", body: {} });
    setMe(null);
    toast("已退出");
    navigate("/");
  });
}

function shell(title, body) {
  document.title = title;
  return `${nav()}${body}`;
}

export function renderHome(root) {
  root.innerHTML = shell("Atoms Lab", `<main class="page">
    <section class="hero">
      <div class="notice" data-notice>生成内容来自你配置的模型，实时流式分工，不用预制文案 <a href="/settings" data-link>设置</a> <button type="button" aria-label="关闭提示">×</button></div>
      ${orbs()}
      <h1>把想法变成可运行的产品</h1>
      <p class="lede">一支 AI 团队负责研究、规划、构建和发布。你负责判断它能不能用。</p>
      <form class="composer" data-compose>
        <textarea name="prompt" placeholder="创建一个有预约回执的咖啡店页面，店名晨雾，主色墨绿" aria-label="描述你想做的产品"></textarea>
        <div class="composer-row">
          <div class="composer-tools">
            <details class="plus"><summary aria-label="更多">+</summary>
              <div class="menu-pop">
                <button type="button" data-fill="做一个团队任务板，可以添加、完成和过滤，刷新后还在。">插入任务板示例</button>
                <button type="button" data-fill="做一个客户项目仪表盘，可以搜索客户，并在本周和本月之间切换数字。">插入后台示例</button>
              </div>
            </details>
            <button class="chip" type="button" data-contest aria-pressed="false">竞赛模式 · 30 积分</button>
          </div>
          <button class="btn-primary" type="submit">开始</button>
        </div>
      </form>
      <div class="chips" data-chips></div>
    </section>
    <section class="section" id="gallery">
      <h2>Atoms Lab 能构建什么？</h2>
      <p class="sub">点开后按你配置的模型现编译。没有密钥时，这里不会放模板页面。</p>
      <div class="gallery" data-gallery></div>
    </section>
    <section class="section">
      <h2>实时看到团队分工</h2>
      <p class="sub">发送需求后，八位角色的结论以真实流式返回逐个出现：先定向，再编译，最后交付。每位角色的依据必须是页面上的原句，对不上的生成会被整版丢弃。</p>
      <div class="steps steps-3">
        <article class="card"><span>定向</span><h3>Mike · Iris · Emma</h3><p class="muted">范围、受众和三件必须做对的事，来自第一次真实模型调用。</p></article>
        <article class="card"><span>编译</span><h3>Bob · Alex</h3><p class="muted">结构与页面内容来自第二次真实调用，商品、价格都贴合你的需求。</p></article>
        <article class="card"><span>交付</span><h3>Sarah · David · Adrian</h3><p class="muted">搜索、指标和增长结论一并写入，点「定位到页面」可以核对依据。</p></article>
      </div>
    </section>
    <section class="section">
      <h2>四步看到一个能点的页面</h2>
      <div class="steps">
        <article class="card"><span>01</span><h3>描述</h3><p class="muted">店名、对象、主色、必须能完成的动作。</p></article>
        <article class="card"><span>02</span><h3>分工</h3><p class="muted">八位角色留下依据，而不是只转圈。</p></article>
        <article class="card"><span>03</span><h3>亲手点</h3><p class="muted">预约、购物袋、任务和分数在预览里就是真的。</p></article>
        <article class="card"><span>04</span><h3>留下</h3><p class="muted">版本、积分、浏览量和发布链接写在本机数据库。</p></article>
      </div>
    </section>
    <section class="section">
      <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap">
        <h2>你的 AI 团队</h2>
        <a class="btn-primary" href="/agents" data-link>看他们怎么分工</a>
      </div>
      <div class="team">${AGENTS.map((agent) => `<article class="agent-card"><b class="orb" style="background:${agent.color};margin:0">${agent.id.slice(0, 1)}</b><div><strong>${agent.id}</strong><p>${agent.role} · ${agent.line}</p></div></article>`).join("")}</div>
    </section>
    <section class="section center">
      <h2>发布出去，被人点开</h2>
      <p class="sub">发布得到独立链接，浏览量按天真实累计。已发布的应用会出现在探索页。</p>
      <p><a class="btn-primary" href="/explore" data-link>去探索页看看</a></p>
    </section>
    ${faqBlock([
      ["Atoms Lab 是什么？", "一个可运行的 Atoms 风格工作室。你用一句话提出产品，智能体团队把它流式编译成网页，并在右侧预览里打开。"],
      ["需要编程吗？", "不需要。想改字可以点选页面文字，或点任何一句让团队 AI 改写。想看实现可以打开代码并导出 HTML。"],
      ["积分怎么扣？", "生成 15，竞赛模式 30，继续修改 8。余额、流水和项目都保存在本机 SQLite。"],
      ["发布后的链接是真的吗？", "是。它由本机服务提供，每次被打开都会真实计数，工作室里能看到过去 7 天的浏览曲线。"],
    ])}
    ${footer()}
  </main>
  <div class="modal" data-modal hidden>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="example-title">
      <header><h3 id="example-title">示例</h3><button class="btn-ghost" type="button" data-close>关闭</button></header>
      <iframe title="示例预览" data-example-frame></iframe>
      <footer><span class="muted" data-example-note></span><button class="btn-primary" type="button" data-clone>用这个想法开始</button></footer>
    </div>
  </div>`);
  bindLogout(root);
  const dismissed = localStorage.getItem("atoms.notice") === "0";
  if (dismissed) root.querySelector("[data-notice]").hidden = true;
  root.querySelector("[data-notice] button")?.addEventListener("click", () => {
    localStorage.setItem("atoms.notice", "0");
    root.querySelector("[data-notice]").hidden = true;
  });
  const form = root.querySelector("[data-compose]");
  const area = form.querySelector("textarea");
  const contest = root.querySelector("[data-contest]");
  contest.addEventListener("click", () => {
    const on = contest.getAttribute("aria-pressed") !== "true";
    contest.setAttribute("aria-pressed", on ? "true" : "false");
    contest.classList.toggle("is-on", on);
  });
  root.querySelectorAll("[data-fill]").forEach((button) => button.addEventListener("click", () => {
    area.value = button.dataset.fill;
    area.focus();
    button.closest("details").open = false;
  }));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = area.value.trim();
    if (prompt.length < 4) {
      area.focus();
      toast("再多写一点，至少说清要做什么", "bad");
      return;
    }
    beginPrompt(prompt, contest.getAttribute("aria-pressed") === "true");
  });
  bindFaq(root);
  loadExamples(root, area);
  rotatePlaceholder(area);
}

const PLACEHOLDERS = [
  "创建一个有预约回执的咖啡店页面，店名晨雾，主色墨绿",
  "为咨询品牌 Northstar 做落地页，包含定价、问题和邮箱订阅",
  "做一个手作陶瓷网店，可以加购并演示结算",
  "做一个二十秒的点击射击小游戏，并记住最高分",
];

function rotatePlaceholder(area) {
  let index = 0;
  const timer = setInterval(() => {
    if (!area.isConnected) {
      clearInterval(timer);
      return;
    }
    if (area.value) return;
    index = (index + 1) % PLACEHOLDERS.length;
    area.placeholder = PLACEHOLDERS[index];
  }, 3200);
}

function beginPrompt(prompt, contest) {
  sessionStorage.setItem("atoms.prompt", prompt);
  sessionStorage.setItem("atoms.contest", contest ? "1" : "0");
  sessionStorage.setItem("atoms.autostart", "1");
  if (!state.me) {
    navigate("/login");
    return;
  }
  navigate("/studio");
}

async function loadExamples(root, area) {
  const gallery = root.querySelector("[data-gallery]");
  const chips = root.querySelector("[data-chips]");
  try {
    const { examples } = await api("/api/examples");
    chips.innerHTML = examples.map((item) => `<button class="chip" type="button" data-prompt="${esc(item.prompt)}">${esc(item.title)}</button>`).join("");
    gallery.innerHTML = examples.map((item) => `<button class="shot" type="button" data-open="${item.key}" data-title="${esc(item.title)}" data-prompt="${esc(item.prompt)}">
      <span class="shot-face"><b></b><em></em><span><i></i><i></i></span></span>
      <strong>${esc(item.title)}</strong>
    </button>`).join("");
    chips.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
      area.value = button.dataset.prompt;
      area.focus();
    }));
    const modal = root.querySelector("[data-modal]");
    const frame = root.querySelector("[data-example-frame]");
    gallery.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => {
      root.querySelector("#example-title").textContent = button.dataset.title;
      root.querySelector("[data-example-note]").textContent = "正在向模型请求这一页";
      frame.src = `/api/examples/${button.dataset.open}/preview`;
      modal.hidden = false;
      modal.dataset.prompt = button.dataset.prompt;
    }));
    frame.addEventListener("load", () => {
      if (!frame.src || frame.src === "about:blank") return;
      const text = frame.contentDocument?.body?.innerText || "";
      root.querySelector("[data-example-note]").textContent = text.includes("还没有真实内容")
        ? "还没有模型，这里不会放模板页"
        : "可以直接在里面点击";
    });
    root.querySelector("[data-close]").addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeModal();
    });
    function closeModal() {
      modal.hidden = true;
      frame.src = "about:blank";
    }
    root.querySelector("[data-clone]").addEventListener("click", () => beginPrompt(modal.dataset.prompt || area.value, false));
  } catch (error) {
    gallery.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
  }
}

function faqBlock(items) {
  return `<section class="section"><h2>常见问题</h2><div class="faq">${items.map(([q, a]) => `<div><button type="button" data-faq aria-expanded="false">${esc(q)}</button><div class="panel" hidden><p>${esc(a)}</p></div></div>`).join("")}</div></section>`;
}

function bindFaq(root) {
  root.querySelectorAll("[data-faq]").forEach((button) => button.addEventListener("click", () => {
    const panel = button.nextElementSibling;
    const open = panel.hasAttribute("hidden");
    panel.toggleAttribute("hidden", !open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }));
}

export function renderPricing(root) {
  root.innerHTML = shell("定价 · Atoms Lab", `<main class="page">
    <section class="hero">
      <h1>适合把想法做成第一版的套餐</h1>
      <p class="lede">免费开始。这里的价格是演示，点击升级只会增加本机积分。</p>
      <div class="seg" data-cycle><button type="button" data-cycle-mode="year" class="is-on">按年 · 最多可节省 21%</button><button type="button" data-cycle-mode="month">按月</button></div>
    </section>
    <div class="price-grid" data-plans></div>
    ${faqBlock([
      ["Free、Pro 和 Max 差在哪里？", "能力相同，差别是演示积分。生成、竞赛和修改都会扣积分，避免无限空转。"],
      ["可以重复领取吗？", "每个套餐每个账号只能领取一次，流水里看得到。"],
      ["未使用的积分会清零吗？", "不会。它们留在本机数据库，直到你删掉 data 目录。"],
      ["这会扣我的银行卡吗？", "不会。没有支付网关。正式的 Atoms 才处理真实账单。"],
    ])}
    ${footer()}
  </main>`);
  bindLogout(root);
  bindFaq(root);
  const grid = root.querySelector("[data-plans]");
  const paint = (mode) => {
    grid.innerHTML = PLANS[mode].map((plan) => `<article class="price ${plan.id === "max" ? "featured" : ""}">
      ${plan.id === "max" ? '<span class="badge">推荐</span>' : ""}
      <h3>${plan.name}</h3><strong>${plan.price}</strong><p class="muted">${plan.unit} · ${plan.note}</p>
      <button class="btn-${plan.id === "free" ? "soft" : "primary"}" type="button" data-plan="${plan.id}">${plan.id === "free" ? "开始" : "领取演示额度"}</button>
      <ul>${plan.points.map((point) => `<li>${point}</li>`).join("")}</ul>
    </article>`).join("");
    grid.querySelectorAll("[data-plan]").forEach((button) => button.addEventListener("click", () => choosePlan(button.dataset.plan)));
  };
  paint("year");
  root.querySelectorAll("[data-cycle-mode]").forEach((button) => button.addEventListener("click", () => {
    root.querySelectorAll("[data-cycle-mode]").forEach((item) => item.classList.toggle("is-on", item === button));
    paint(button.dataset.cycleMode);
  }));
}

async function choosePlan(plan) {
  if (!state.me) {
    sessionStorage.setItem("atoms.plan", plan);
    navigate("/register");
    return;
  }
  if (plan === "free") {
    navigate("/studio");
    return;
  }
  try {
    await api("/api/billing/plan", { method: "POST", body: { plan } });
    toast(plan === "pro" ? "已领取 Pro 的 400 积分" : "已领取 Max 的 1200 积分");
    navigate("/studio");
  } catch (error) {
    toast(error.message, "bad");
  }
}

export function renderAgents(root) {
  root.innerHTML = shell("智能体 · Atoms Lab", `<main class="page">
    <section class="band-dark">
      <div>
        <p class="kicker">Atoms Lab 团队 · 8 位角色</p>
        <h1 style="font-size:clamp(36px,5vw,64px);letter-spacing:-.045em;line-height:1.02;margin:12px 0">一个提示词，整支团队开始工作</h1>
        <p>他们不是八次闲聊。研究员、产品、架构、工程、搜索和增长各自留下一段能核对的结论，然后你在预览里验收。</p>
        <p style="margin-top:18px"><a class="btn-primary" href="/studio" data-link>开始构建</a></p>
      </div>
      <div class="agent-board">${AGENTS.map((agent) => `<article><b class="orb" style="background:${agent.color};margin:0">${agent.id.slice(0, 1)}</b><div><strong>${agent.id}</strong><small>${agent.role}</small></div></article>`).join("")}</div>
    </section>
    <section class="section team">${AGENTS.map((agent) => `<article class="card"><h3>${agent.id}</h3><p class="muted">${agent.role}</p><p>${agent.line}</p></article>`).join("")}</section>
    ${footer()}
  </main>`);
  bindLogout(root);
}

export function renderAbout(root) {
  root.innerHTML = shell("关于 · Atoms Lab", `<main class="page">
    <section class="hero" style="text-align:left">
      <h1>这是一个能交出去试用的工作室</h1>
      <p class="lede">界面和工作流参考 Atoms：一句话开始、登录后进入团队、流式分工、预览和发布分开。生成引擎跑在你自己的机器上，密钥由你保管。</p>
    </section>
    <section class="help-grid">
      <article><h3>做了什么</h3><p class="muted">注册登录、访客、项目持久化、流式多智能体编译、九类可交互页面、竞赛三方案、点选让 AI 改写、手动改字、版本 diff、发布链接、真实浏览统计、探索页、积分和演示套餐。</p></article>
      <article><h3>生成为什么是真的</h3><p class="muted">两次真实的模型调用分别负责定向和编译，角色结论流式出现在对话里。没有密钥时系统会明确告诉你，而不是拿模板冒充。</p></article>
      <article><h3>数据都在哪</h3><p class="muted">项目、版本、消息、积分和浏览量写在本机 SQLite；预览里的订阅、购物袋和分数写在那台浏览器的本地存储。密钥永不离开服务器。</p></article>
      <article><h3>如果继续做</h3><p class="muted">优先做多人协作与云端域名，其次是给发布页加自定义域名和更多统计维度。预览里的主路径已经值得先打磨。</p></article>
    </section>
    ${footer()}
  </main>`);
  bindLogout(root);
}

export function renderHelp(root) {
  root.innerHTML = shell("帮助 · Atoms Lab", `<main class="page">
    <section class="hero" style="text-align:left"><h1>从一句话到一个链接</h1><p class="lede">下面每一步都可以在这个 Demo 里点到。</p></section>
    <section class="help-grid">
      <article><h3>1. 写清动作</h3><p>不要只说"做一个网站"。加上对象、名字，以及必须能完成的事，比如预约、加购或记分。</p></article>
      <article><h3>2. 看实时分工</h3><p>发送后团队流式工作：Mike 定范围，Iris 研究受众，Emma 列功能，Bob 定结构，Alex 编译页面。每位角色的依据可以定位到预览里的原句。</p></article>
      <article><h3>3. 在预览里点</h3><p>切换手机宽度。预约要选出服务、日期和时间；网店要进购物袋；游戏要能打完一局。</p></article>
      <article><h3>4. 用一句话改</h3><p>"把主色改成墨绿"只换颜色。"标题改成今晚打烊"只换标题。改完会出现改动清单，点一条就能在预览里看到改动位置。</p></article>
      <article><h3>5. 点一句让 AI 改</h3><p>在预览里点任何标题或段落，写一句要求（例如"更短，并强调今天截止"），团队会改写这一句并写入新版本。</p></article>
      <article><h3>6. 竞赛模式</h3><p>同一范围出三套配色和版式。选定之后才能发布，避免发出一版你没看过的页面。</p></article>
      <article><h3>7. 发布与统计</h3><p>得到 /p/ 开头的链接。每次被打开都会真实计数，工作室里能看到过去 7 天的浏览柱状图。</p></article>
      <article><h3>8. 积分</h3><p>生成 15，竞赛 30，修改 8。不够就到定价页领取演示套餐。</p></article>
    </section>
    ${footer()}
  </main>`);
  bindLogout(root);
}

export async function renderExplore(root) {
  root.innerHTML = shell("探索 · Atoms Lab", `<main class="page">
    <section class="hero">
      <h1>探索别人编译出的应用</h1>
      <p class="lede">这里全是发布链接的真实数据：标题、类型和浏览量来自本机数据库。</p>
    </section>
    <div class="explore-grid" data-grid><p class="muted center">正在加载…</p></div>
    ${footer()}
  </main>`);
  bindLogout(root);
  const grid = root.querySelector("[data-grid]");
  try {
    const { apps } = await api("/api/explore");
    if (!apps.length) {
      grid.innerHTML = `<div class="empty-explore"><h3>还没有人发布</h3><p class="muted">到工作室生成一个应用并发布，它就会出现在这里。</p><p><a class="btn-primary" href="/studio" data-link>去工作室</a></p></div>`;
      return;
    }
    grid.innerHTML = apps.map((app) => `<a class="explore-card" href="${esc(app.url)}" target="_blank" rel="noopener">
      <span class="kicker">${esc(KIND_LABEL(app.kind))} · ${app.views} 次浏览</span>
      <strong>${esc(app.name)}</strong>
      <p class="muted">${esc((app.prompt || "").slice(0, 60))}</p>
      <span class="muted open-hint">打开发布页 →</span>
    </a>`).join("");
  } catch (error) {
    grid.innerHTML = `<p class="muted center">${esc(error.message)}</p>`;
  }
}

function KIND_LABEL(kind) {
  return { saas: "落地页", brand: "品牌站", store: "网店", booking: "预约页", dashboard: "管理后台", todo: "任务板", blog: "博客", game: "小游戏", recommend: "推荐平台" }[kind] || kind;
}

export function renderSettings(root) {
  root.innerHTML = shell("设置 · Atoms Lab", `<main class="page">
    <section class="hero" style="text-align:left">
      <h1>模型接口</h1>
      <p class="lede">页面文案、价格和团队结论都从这里的模型返回。密钥只保存在本机数据库，界面上只显示前后几位。</p>
    </section>
    <form class="card stack-form" data-settings>
      <p class="form-error" data-status></p>
      <label class="field"><span>接口地址</span><input name="base" placeholder="https://api.deepseek.com/v1" required /></label>
      <label class="field"><span>模型名</span><input name="model" placeholder="deepseek-chat" required /></label>
      <label class="field"><span>密钥</span><input name="key" type="password" placeholder="留空则保持已保存的密钥" autocomplete="off" /></label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-primary" type="submit">保存</button>
        <button class="btn-soft" type="button" data-test>测试连接</button>
      </div>
    </form>
  </main>`);
  bindLogout(root);
  const form = root.querySelector("[data-settings]");
  const status = root.querySelector("[data-status]");
  api("/api/settings").then((data) => {
    if (data.base) form.elements.base.value = data.base;
    if (data.model) form.elements.model.value = data.model;
    status.textContent = data.configured ? `已配置 ${data.keyHint}` : "还没有密钥，生成会停在这里，不会用模板填页面。";
  }).catch((error) => { status.textContent = error.message; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      const saved = await api("/api/settings", { method: "POST", body: data });
      status.textContent = `已保存 ${saved.keyHint}`;
      form.key.value = "";
      toast("模型接口已保存");
    } catch (error) {
      status.textContent = error.message;
    }
  });
  form.querySelector("[data-test]").addEventListener("click", async () => {
    const button = form.querySelector("[data-test]");
    button.disabled = true;
    button.textContent = "正在连接…";
    status.textContent = "";
    try {
      const result = await api("/api/settings/test", { method: "POST", body: {} });
      status.textContent = result.message;
      if (result.ok) toast("模型连接正常");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "测试连接";
    }
  });
}

export function renderLogin(root) {
  const register = location.pathname === "/register";
  const pending = sessionStorage.getItem("atoms.prompt");
  root.innerHTML = shell(register ? "注册 · Atoms Lab" : "登录 · Atoms Lab", `<main class="auth">
    <form class="auth-card" data-auth>
      <a href="/" data-link>← 返回</a>
      <h1>${register ? "创建账号" : "登录或注册"}</h1>
      <p class="muted">${register ? "项目、版本和积分会留在这台电脑上。" : "开始使用 Atoms Lab 创作。"}</p>
      ${pending ? `<div class="banner">登录后将开始：${esc(pending.slice(0, 72))}</div>` : ""}
      ${register ? '<label class="field"><span>名字</span><input name="name" autocomplete="nickname" required /></label>' : ""}
      <label class="field"><span>邮箱</span><input name="email" type="email" autocomplete="email" placeholder="you@studio.com" required /></label>
      <label class="field"><span>密码</span><input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="6" required /></label>
      <p class="form-error" data-error></p>
      <button class="btn-primary continue" type="submit">${register ? "创建并进入" : "继续"}</button>
      <button class="btn-soft continue" type="button" data-guest>以访客身份进入</button>
      <p class="muted" style="margin-top:12px">${register ? "已有账号？" : "还没有账号？"} <a href="${register ? "/login" : "/register"}" data-link>${register ? "登录" : "注册"}</a></p>
    </form>
    <aside class="auth-side">
      <h2>登录之后你能验收的事</h2>
      <ul>
        <li>实时看到八位角色流式分工</li>
        <li>预览里的按钮会真的记住结果</li>
        <li>点一句文字让 AI 当场改写</li>
        <li>发布后得到独立链接和真实浏览统计</li>
        <li>版本可以退回，代码可以导出</li>
      </ul>
      <div class="blob" style="width:140px;height:140px;right:30px;bottom:40px"></div>
      <div class="blob" style="width:80px;height:80px;right:150px;bottom:120px"></div>
    </aside>
  </main>`);
  bindLogout(root);
  const form = root.querySelector("[data-auth]");
  const error = root.querySelector("[data-error]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    try {
      await api(register ? "/api/auth/register" : "/api/auth/login", { method: "POST", body: data });
      await afterAuth();
    } catch (err) {
      error.textContent = err.message;
    }
  });
  root.querySelector("[data-guest]").addEventListener("click", async () => {
    error.textContent = "";
    try {
      await api("/api/auth/guest", { method: "POST", body: {} });
      await afterAuth();
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

async function afterAuth() {
  const plan = sessionStorage.getItem("atoms.plan");
  sessionStorage.removeItem("atoms.plan");
  if (plan && plan !== "free") {
    try {
      await api("/api/billing/plan", { method: "POST", body: { plan } });
    } catch (error) {
      toast(error.message, "bad");
    }
  }
  const next = sessionStorage.getItem("atoms.autostart") ? "/studio" : sessionStorage.getItem("atoms.return") || "/studio";
  sessionStorage.removeItem("atoms.return");
  navigate(next);
}

export function renderNotFound(root) {
  root.innerHTML = shell("未找到 · Atoms Lab", `<main class="page hero"><h1>没有这一页</h1><p><a class="btn-primary" href="/" data-link>回首页</a></p></main>`);
  bindLogout(root);
}
