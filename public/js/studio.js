import { api, esc, toast } from "./api.js";
import { setPath } from "./router.js";
import { agentById, state } from "./state.js";

const KIND = { saas: "落地页", brand: "品牌站", store: "网店", booking: "预约", dashboard: "后台", todo: "任务板", blog: "博客", game: "小游戏", recommend: "推荐" };

let playToken = 0;
let editing = false;
let editForked = false;
let selected = null;
let streamAbort = null;

export async function renderStudio(root) {
  playToken += 1;
  streamAbort?.abort();
  streamAbort = null;
  editing = false;
  editForked = false;
  selected = null;
  root.innerHTML = `<div class="studio">
    <header class="studio-top">
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn-soft mobile-only" type="button" data-rail>项目</button>
        <a class="brand" href="/" data-link><img src="/favicon.svg" alt="" />Atoms Lab</a>
        <input data-name aria-label="项目名称" hidden style="border:1px solid var(--line);border-radius:10px;padding:6px 8px;background:white" />
        <button class="btn-ghost" type="button" data-delete hidden>删除</button>
      </div>
      <div class="nav-actions">
        <span class="credits" data-credits data-with-plan>${state.me?.credits ?? 0} 积分 · ${esc(state.me?.plan || "free")}</span>
        <a class="btn-ghost" href="/help" data-link>帮助</a>
        <button class="btn-ghost" type="button" data-logout>退出</button>
      </div>
    </header>
    <aside class="rail" data-rail-panel>
      <div class="rail-head"><strong>项目</strong><button class="btn-soft" type="button" data-new>新建</button></div>
      <div class="project-list" data-projects></div>
    </aside>
    <section class="thread">
      <div class="messages" data-messages></div>
      <form class="composer dock" data-compose>
        <textarea name="prompt" aria-label="给团队的说明" placeholder="描述一个新产品，或让当前项目改一版"></textarea>
        <div class="composer-row">
          <div class="composer-tools">
            <button class="chip" type="button" data-contest aria-pressed="false">竞赛 · 30 积分</button>
            <span class="muted" data-cost>生成 · 15 积分</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-ghost" type="button" data-skip hidden>跳过过程</button>
            <button class="btn-primary" type="submit">发送</button>
          </div>
        </div>
      </form>
    </section>
    <section class="stage">
      <div class="stage-bar">
        <div class="tabs"><button type="button" data-tab="preview" class="is-on">预览</button><button type="button" data-tab="code">代码</button></div>
        <div class="tabs"><button type="button" data-device="desktop" class="is-on">桌面</button><button type="button" data-device="phone">手机</button></div>
        <button class="btn-soft" type="button" data-edit>编辑文字</button>
        <button class="btn-ghost" type="button" data-download>导出</button>
        <button class="btn-ghost" type="button" data-versions hidden>版本 <b data-versions-n>0</b></button>
        <button class="btn-ghost" type="button" data-stats hidden>浏览 <b data-stat-n>0</b></button>
        <button class="btn-primary" type="button" data-publish>发布</button>
        <a data-published hidden target="_blank" rel="noopener">打开发布页</a>
      </div>
      <div class="versions-panel" data-versions-panel hidden>
        <strong>版本时间线 <span class="muted" style="font-weight:400">点「选用」退回到任何一版，已发布链接不受影响</span></strong>
        <div class="versions-list" data-versions-list></div>
      </div>
      <div class="stats-panel" data-stats-panel hidden>
        <strong>过去 7 天真实浏览 <b data-stat-n2></b></strong>
        <div class="stat-bars" data-stat-bars></div>
        <p class="muted" data-stat-meta>每次有人打开发布链接，这里的数字就会增加。数据来自本机服务，不是演示值。</p>
        <div class="serp" data-serp>
          <span class="kicker">Sarah · 搜索结果预览</span>
          <div class="serp-card">
            <span class="serp-site">Atoms Lab › p › <span data-serp-slug></span></span>
            <strong data-serp-title></strong>
            <p data-serp-desc></p>
          </div>
        </div>
      </div>
      <div class="editbar" data-editbar hidden>
        <span data-edit-label>选中文字</span>
        <input data-edit-text aria-label="替换选中的文字" />
        <button class="btn-primary" type="button" data-edit-apply>应用</button>
      </div>
      <div class="refine-pop" data-refine hidden>
        <p class="refine-now" data-refine-now></p>
        <textarea data-refine-input rows="2" placeholder="告诉团队这句要怎么改，例如：更短，并强调明天闭店"></textarea>
        <div class="refine-actions">
          <button class="btn-soft" type="button" data-refine-manual>手动改字</button>
          <button class="btn-primary" type="button" data-refine-ai>让团队改</button>
        </div>
      </div>
      <div class="picker" data-picker hidden></div>
      <div class="frame-wrap">
        <div class="frame" data-frame hidden><iframe title="应用预览" data-preview></iframe></div>
        <pre class="code" data-code hidden></pre>
        <div class="stage-empty" data-empty>生成完成后，页面会出现在这里。</div>
      </div>
    </section>
  </div>`;
  document.title = "工作室 · Atoms Lab";
  const ui = bind(root);
  await refreshProjects(ui);
  const id = location.pathname.split("/")[2];
  if (id) {
    await openProject(ui, id, null);
  } else if (sessionStorage.getItem("atoms.autostart") === "1") {
    const prompt = sessionStorage.getItem("atoms.prompt") || "";
    const contest = sessionStorage.getItem("atoms.contest") === "1";
    sessionStorage.removeItem("atoms.autostart");
    sessionStorage.removeItem("atoms.prompt");
    sessionStorage.removeItem("atoms.contest");
    ui.area.value = prompt;
    ui.contest.setAttribute("aria-pressed", contest ? "true" : "false");
    ui.contest.classList.toggle("is-on", contest);
    if (prompt) await runStream(ui, { prompt, contest });
    else showDraft(ui);
  } else {
    showDraft(ui);
  }
}

function bind(root) {
  const ui = {
    root,
    list: root.querySelector("[data-projects]"),
    messages: root.querySelector("[data-messages]"),
    area: root.querySelector("textarea"),
    form: root.querySelector("[data-compose]"),
    contest: root.querySelector("[data-contest]"),
    cost: root.querySelector("[data-cost]"),
    skip: root.querySelector("[data-skip]"),
    frame: root.querySelector("[data-frame]"),
    iframe: root.querySelector("[data-preview]"),
    code: root.querySelector("[data-code]"),
    empty: root.querySelector("[data-empty]"),
    picker: root.querySelector("[data-picker]"),
    editbar: root.querySelector("[data-editbar]"),
    editText: root.querySelector("[data-edit-text]"),
    refine: root.querySelector("[data-refine]"),
    refineNow: root.querySelector("[data-refine-now]"),
    refineInput: root.querySelector("[data-refine-input]"),
    delete: root.querySelector("[data-delete]"),
    name: root.querySelector("[data-name]"),
    statsBtn: root.querySelector("[data-stats]"),
    statsPanel: root.querySelector("[data-stats-panel]"),
    versionsBtn: root.querySelector("[data-versions]"),
    versionsPanel: root.querySelector("[data-versions-panel]"),
    project: null,
    versions: [],
    publication: null,
  };
  root.querySelector("[data-rail]").addEventListener("click", () => root.querySelector("[data-rail-panel]").classList.toggle("open"));
  root.querySelector("[data-new]").addEventListener("click", () => {
    streamAbort?.abort();
    ui.project = null;
    setPath("/studio");
    showDraft(ui);
    markList(ui);
  });
  root.querySelector("[data-logout]").addEventListener("click", async () => {
    if (state.me?.email?.endsWith("@lab.local") && !confirm("访客退出后不能再回到这个身份。确定退出？")) return;
    await api("/api/auth/logout", { method: "POST", body: {} });
    location.href = "/";
  });
  ui.contest.addEventListener("click", () => {
    if (ui.project) return;
    const on = ui.contest.getAttribute("aria-pressed") !== "true";
    ui.contest.setAttribute("aria-pressed", on ? "true" : "false");
    ui.contest.classList.toggle("is-on", on);
    paintCost(ui);
  });
  ui.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = ui.area.value.trim();
    if (text.length < 2) return;
    ui.area.value = "";
    await runStream(ui, ui.project ? { projectId: ui.project.id, content: text } : { prompt: text, contest: ui.contest.getAttribute("aria-pressed") === "true" });
  });
  ui.area.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      ui.form.requestSubmit();
    }
  });
  ui.skip.addEventListener("click", () => {
    streamAbort?.abort();
  });
  root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
    root.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-on", item === button));
    const code = button.dataset.tab === "code";
    const has = Boolean(ui.project?.currentVersionId);
    ui.code.hidden = !code || !has;
    ui.frame.hidden = code || !has;
    ui.empty.hidden = has;
    if (code && has) ui.code.textContent = currentHtml(ui) || "还没有可导出的页面。";
  }));
  root.querySelectorAll("[data-device]").forEach((button) => button.addEventListener("click", () => {
    root.querySelectorAll("[data-device]").forEach((item) => item.classList.toggle("is-on", item === button));
    ui.frame.classList.toggle("phone", button.dataset.device === "phone");
  }));
  root.querySelector("[data-edit]").addEventListener("click", () => { hideRefine(ui); toggleEdit(ui); });
  root.querySelector("[data-edit-apply]").addEventListener("click", () => applyEdit(ui));
  root.querySelector("[data-download]").addEventListener("click", () => download(ui));
  root.querySelector("[data-publish]").addEventListener("click", () => publish(ui));
  ui.statsBtn.addEventListener("click", () => {
    ui.statsPanel.hidden = !ui.statsPanel.hidden;
    ui.versionsPanel.hidden = true;
    if (!ui.statsPanel.hidden) paintStats(ui);
  });
  ui.versionsBtn.addEventListener("click", () => {
    ui.versionsPanel.hidden = !ui.versionsPanel.hidden;
    ui.statsPanel.hidden = true;
    if (!ui.versionsPanel.hidden) paintVersions(ui);
  });
  ui.refine.querySelector("[data-refine-manual]").addEventListener("click", () => {
    const target = ui.refine.dataset.target;
    hideRefine(ui);
    manualPick(ui, target);
  });
  ui.refine.querySelector("[data-refine-ai]").addEventListener("click", () => refineApply(ui));
  ui.name.addEventListener("change", async () => {
    if (!ui.project) return;
    try {
      await api(`/api/projects/${ui.project.id}`, { method: "PATCH", body: { name: ui.name.value.trim() } });
      await refreshProjects(ui);
    } catch (error) {
      toast(error.message, "bad");
    }
  });
  ui.iframe.addEventListener("load", () => bindPreview(ui));
  ui.delete.addEventListener("click", async () => {
    if (!ui.project) return;
    if (!confirm(`删除「${ui.project.name}」？发布链接也会失效。`)) return;
    try {
      await api(`/api/projects/${ui.project.id}`, { method: "DELETE" });
      ui.project = null;
      setPath("/studio");
      await refreshProjects(ui);
      showDraft(ui);
      toast("项目已删除");
    } catch (error) {
      toast(error.message, "bad");
    }
  });
  return ui;
}

function paintCost(ui) {
  if (ui.project) ui.cost.textContent = "修改 · 8 积分";
  else ui.cost.textContent = ui.contest.getAttribute("aria-pressed") === "true" ? "竞赛 · 30 积分" : "生成 · 15 积分";
  ui.contest.hidden = Boolean(ui.project);
}

function resetEditing(ui) {
  editing = false;
  editForked = false;
  selected = null;
  ui.editbar.hidden = true;
  ui.root.querySelector("[data-edit]")?.classList.remove("is-on");
}

function showDraft(ui) {
  resetEditing(ui);
  ui.project = null;
  ui.delete.hidden = true;
  ui.name.hidden = true;
  ui.root.querySelector("[data-published]").hidden = true;
  ui.statsBtn.hidden = true;
  ui.statsPanel.hidden = true;
  ui.versionsBtn.hidden = true;
  ui.versionsPanel.hidden = true;
  ui.picker.hidden = true;
  hideRefine(ui);
  ui.iframe.src = "about:blank";
  ui.frame.hidden = true;
  ui.code.hidden = true;
  ui.empty.hidden = false;
  ui.empty.textContent = "生成完成后，页面会出现在这里。";
  ui.messages.innerHTML = `<div class="draft-hint"><h2>今天想让团队做什么？</h2><p class="muted">写清名字、对象，以及一个必须能点完的动作。发送后你会看到八位角色实时分工。</p></div>`;
  paintCost(ui);
  ui.area.focus();
}

async function refreshProjects(ui) {
  const { projects } = await api("/api/projects");
  ui.list.innerHTML = projects.length ? projects.map((project) => `<button type="button" data-id="${project.id}">
      <strong>${esc(project.name)}</strong>
      <small>${KIND[project.kind] || project.kind}${project.slug ? " · 已发布" : ""}</small>
    </button>`).join("") : `<p class="muted">还没有项目。</p>`;
  ui.list.querySelectorAll("[data-id]").forEach((button) => button.addEventListener("click", () => {
    ui.root.querySelector("[data-rail-panel]").classList.remove("open");
    openProject(ui, button.dataset.id, null);
  }));
  markList(ui);
}

function markList(ui) {
  ui.list.querySelectorAll("[data-id]").forEach((button) => button.classList.toggle("is-on", button.dataset.id === ui.project?.id));
}

async function openProject(ui, id, payload) {
  try {
    const data = payload || await api(`/api/projects/${id}`);
    resetEditing(ui);
    ui.project = data.project;
    ui.versions = data.versions;
    ui.publication = data.publication;
    ui.delete.hidden = false;
    ui.name.hidden = false;
    ui.name.value = data.project.name;
    paintPublication(ui);
    setPath(`/studio/${id}`);
    document.title = `${data.project.name} · Atoms Lab`;
    paintCost(ui);
    markList(ui);
    const animateFrom = payload && payload.animateFrom != null ? payload.animateFrom : data.messages.length;
    if (animateFrom < data.messages.length) {
      ui.frame.hidden = true;
      ui.empty.hidden = false;
      ui.empty.textContent = "团队还在把页面编译出来。可以跳过过程。";
    }
    await play(ui, data.messages, animateFrom);
    if (!ui.root.isConnected) return;
    paintStage(ui);
  } catch (error) {
    toast(error.message, "bad");
    showDraft(ui);
  }
}

function paintPublication(ui) {
  const publishedLink = ui.root.querySelector("[data-published]");
  const has = Boolean(ui.publication);
  publishedLink.hidden = !has;
  if (has) {
    publishedLink.href = `/p/${ui.publication.slug}`;
    publishedLink.textContent = "打开发布页";
  }
  ui.statsBtn.hidden = !has;
  if (has) ui.statsBtn.querySelector("[data-stat-n]").textContent = String(ui.publication.views ?? 0);
  paintVersions(ui);
  if (has) paintStats(ui);
  else ui.statsPanel.hidden = true;
}

function paintStats(ui) {
  const week = ui.publication?.week || [];
  const bars = ui.root.querySelector("[data-stat-bars]");
  const max = Math.max(1, ...week.map((item) => item.count));
  bars.innerHTML = week.map((item) => `<div class="stat-col"><i style="height:${Math.round((item.count / max) * 64) + 3}px"></i><span>${item.day.slice(5)}</span><b>${item.count}</b></div>`).join("");
  const likes = Number(ui.publication?.likes ?? 0);
  const comments = Number(ui.publication?.comments ?? 0);
  const health = ui.publication?.health;
  const meta = ui.root.querySelector("[data-stat-meta]");
  if (meta) {
    let text = "每次有人打开发布链接，这里的数字就会增加。数据来自本机服务，不是演示值。";
    const parts = [];
    if (likes) parts.push(`${likes} 位访客点了「有用」`);
    if (comments) parts.push(`${comments} 条访客留言`);
    if (health) parts.push(`团队自检 ${health.score} 分（${health.passed}/${health.total}）`);
    if (parts.length) text += ` 已有${parts.join("，")}。`;
    meta.textContent = text;
  }
  const seo = ui.project?.spec?.seo || {};
  const serp = ui.root.querySelector("[data-serp]");
  if (serp) {
    if (seo.title || seo.description) {
      serp.hidden = false;
      serp.querySelector("[data-serp-slug]").textContent = ui.publication?.slug || "";
      serp.querySelector("[data-serp-title]").textContent = seo.title || ui.project?.name || "";
      serp.querySelector("[data-serp-desc]").textContent = seo.description || "";
    } else {
      serp.hidden = true;
    }
  }
}

function paintVersions(ui) {
  const btn = ui.root.querySelector("[data-versions]");
  const list = ui.root.querySelector("[data-versions-list]");
  btn.hidden = ui.versions.length < 2;
  btn.querySelector("[data-versions-n]").textContent = String(ui.versions.length);
  const comparing = Boolean(ui.compare?.on);
  list.innerHTML = [
    `<div class="compare-bar"><button class="btn-soft" type="button" data-compare-toggle>${comparing ? "退出对比" : "对比模式"}</button>${comparing ? '<span class="muted">在两行上点「选作对比」</span>' : '<span class="muted">把任意两版并排放在一起看区别</span>'}</div>`,
    ...[...ui.versions].reverse().map((version) => {
      const isCurrent = version.id === ui.project?.currentVersionId;
      const selected = comparing && (ui.compare.a === version.id || ui.compare.b === version.id);
      return `<div class="version-row ${isCurrent ? "is-current" : ""} ${selected ? "is-picked-c" : ""}">
        <div><b>${esc(version.label)}</b><span class="muted">${new Date(version.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}${isCurrent ? " · 当前" : ""}</span></div>
        <div class="version-actions">
          ${comparing ? `<button class="btn-soft" type="button" data-compare-pick="${version.id}">${ui.compare.a === version.id ? "对比左" : ui.compare.b === version.id ? "对比右" : "选作对比"}</button>` : ""}
          ${!isCurrent && !comparing ? `<button class="btn-soft" type="button" data-rollback="${version.id}">选用</button>` : ""}
        </div>
      </div>`;
    }),
    comparing && ui.compare.a && ui.compare.b ? `<div class="compare-grid">
      <div><span class="kicker">版本 A</span><iframe src="/api/versions/${ui.compare.a}/preview" title="版本 A"></iframe></div>
      <div><span class="kicker">版本 B</span><iframe src="/api/versions/${ui.compare.b}/preview" title="版本 B"></iframe></div>
    </div>` : "",
  ].join("");
  const toggle = list.querySelector("[data-compare-toggle]");
  if (toggle) toggle.addEventListener("click", () => {
    ui.compare = ui.compare && ui.compare.on ? { on: false } : { on: true, a: null, b: null };
    paintVersions(ui);
  });
  list.querySelectorAll("[data-rollback]").forEach((button) => button.addEventListener("click", async () => {
    try {
      const data = await api(`/api/projects/${ui.project.id}/current`, { method: "POST", body: { versionId: button.dataset.rollback } });
      ui.project = data.project;
      ui.versions = data.versions;
      ui.publication = data.publication;
      paintStage(ui);
      paintVersions(ui);
      toast(`已退回到「${data.versions.find((v) => v.id === data.project.currentVersionId)?.label || "该版本"}」`);
    } catch (error) {
      toast(error.message, "bad");
    }
  }));
  list.querySelectorAll("[data-compare-pick]").forEach((button) => button.addEventListener("click", () => {
    if (!ui.compare.a || ui.compare.a === button.dataset.comparePick) {
      ui.compare.a = button.dataset.comparePick;
    } else if (!ui.compare.b) {
      ui.compare.b = button.dataset.comparePick;
    } else {
      ui.compare = { on: true, a: button.dataset.comparePick, b: null };
    }
    if (ui.compare.a && ui.compare.b && ui.compare.a === ui.compare.b) ui.compare.b = null;
    paintVersions(ui);
  }));
}

function suggestNext(ui) {
  const atoms = [...ui.messages.querySelectorAll(".atom")].slice(-8);
  const picks = [];
  for (const role of ["Adrian", "David", "Sarah", "Emma", "Iris"]) {
    const atom = atoms.find((a) => (a.querySelector("h3")?.textContent || "").startsWith(role));
    const body = atom?.querySelector("p")?.textContent || "";
    if (!body) continue;
    const idea = body.split(/[。；]/)[0].trim().slice(0, 44);
    if (idea.length < 8) continue;
    picks.push({ role, text: `按 ${role} 的建议改一版：${idea}` });
    if (picks.length >= 3) break;
  }
  if (!picks.length) return;
  const row = document.createElement("div");
  row.className = "suggest-row";
  row.innerHTML = `<span class="kicker">团队建议的下一步</span><div class="suggest-chips"></div>`;
  const chips = row.querySelector(".suggest-chips");
  picks.forEach((pick) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = `${pick.role}：${pick.text.slice(8, 30)}…`;
    chip.addEventListener("click", () => {
      ui.area.value = pick.text;
      ui.area.focus();
      ui.area.scrollIntoView({ block: "center", behavior: "smooth" });
      toast("建议已填入输入框，可直接发送");
    });
    chips.appendChild(chip);
  });
  ui.messages.appendChild(row);
  ui.messages.scrollTop = ui.messages.scrollHeight;
}

async function runStream(ui, request) {
  const submit = ui.form.querySelector("[type=submit]");
  submit.disabled = true;
  ui.skip.hidden = false;
  const token = ++playToken;
  const isIterate = Boolean(request.content);
  if (!isIterate) {
    ui.project = null;
    ui.delete.hidden = true;
    ui.name.hidden = true;
    ui.picker.hidden = true;
    ui.iframe.src = "about:blank";
    ui.frame.hidden = true;
    ui.code.hidden = true;
    ui.empty.hidden = false;
    ui.empty.textContent = "团队正在开工。每位角色的结论会实时出现在左边。";
    paintCost(ui);
  }
  if (isIterate) {
    ui.messages.appendChild(userNode(request.content));
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }
  const stageLine = stageNode();
  ui.messages.appendChild(stageLine);
  ui.messages.scrollTop = ui.messages.scrollHeight;
  streamAbort = new AbortController();
  let hadError = null;
  let donePayload = null;
  try {
    const response = await fetch("/api/generate/stream", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: streamAbort.signal,
    });
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `请求失败（${response.status}）`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let splitAt;
      while ((splitAt = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, splitAt);
        buffer = buffer.slice(splitAt + 2);
        const event = parseFrame(frame);
        if (!event) continue;
        if (token !== playToken) { reader.cancel().catch(() => {}); break; }
        if (event.name === "agent") {
          stageLine.remove();
          ui.messages.appendChild(atomNode(event.data, ui));
          ui.messages.scrollTop = ui.messages.scrollHeight;
        } else if (event.name === "stage") {
          stageLine.querySelector("span").textContent = event.data.text || "";
          ui.messages.scrollTop = ui.messages.scrollHeight;
        } else if (event.name === "done") {
          donePayload = event.data;
        } else if (event.name === "error") {
          hadError = new Error(event.data.message);
        }
      }
      if (hadError || donePayload) break;
    }
  } catch (error) {
    if (error.name !== "AbortError") hadError = hadError || error;
  }
  stageLine.remove();
  ui.skip.hidden = true;
  streamAbort = null;
  if (donePayload && !hadError) {
    if (donePayload.user) {
      Object.assign(state.me, donePayload.user);
      document.dispatchEvent(new CustomEvent("atoms-me"));
    }
    if (isIterate) {
      ui.project = donePayload.project;
      ui.versions = donePayload.versions;
      ui.publication = donePayload.publication;
      const data = donePayload;
      ui.messages.replaceChildren();
      data.messages.slice(0, data.messages.length).forEach((message, index, arr) => {
        ui.messages.appendChild(messageNode(message, ui));
        if (index === arr.length - 1 && data.changes?.length) ui.messages.appendChild(diffNode(data.changes, ui));
      });
      ui.messages.scrollTop = ui.messages.scrollHeight;
      paintPublication(ui);
      paintStage(ui);
      if (data.changes?.length) toast(`改了 ${data.changes.length} 处，点改动卡片可以定位`);
      await runSelfCheck(ui);
      suggestNext(ui);
    } else {
      await refreshProjects(ui);
      await openProject(ui, donePayload.projectId, donePayload);
      await runSelfCheck(ui);
      suggestNext(ui);
    }
  } else if (hadError) {
    toast(hadError.message, "bad");
    if (!isIterate) showDraft(ui);
    if (isIterate && ui.project) {
      const data = await api(`/api/projects/${ui.project.id}`).catch(() => null);
      if (data) {
        ui.project = data.project;
        ui.versions = data.versions;
        ui.publication = data.publication;
        paintStage(ui);
      }
    }
  }
  submit.disabled = false;
}

async function runSelfCheck(ui) {
  const html = currentHtml(ui);
  if (!html || !ui.project) return;
  const { details } = await probeInteractions(html);
  if (!details.length) return;
  try {
    const data = await api(`/api/projects/${ui.project.id}/selfcheck`, { method: "POST", body: { details } });
    ui.messages.appendChild(checkNode(data.message));
    ui.messages.scrollTop = ui.messages.scrollHeight;
    const passed = (data.message.body.match(/^✓/gm) || []).length;
    const total = (data.message.body.match(/^[✓✗]/gm) || []).length;
    toast(total ? `团队自检：${total} 处交互，${passed} 处有真实响应` : "自检完成", passed === total ? "ok" : "bad");
  } catch {
    // 自检失败不影响生成结果
  }
}

function probeInteractions(html) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:-9999px;top:0;width:1024px;height:768px;visibility:hidden;border:0";
    let settled = false;
    const finish = (details) => {
      if (settled) return;
      settled = true;
      frame.remove();
      resolve({ details });
    };
    frame.addEventListener("load", async () => {
      if (settled) return;
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return finish([]);
        const details = [];
        const order = (el) => {
          if (el.matches("[data-service]")) return 0;
          if (el.matches("[data-time]")) return 1;
          if (el.matches("[data-add]")) return 2;
          if (el.matches("[data-filter]")) return 3;
          if (el.closest("[data-todo-add],[data-book-form]")) return 4;
          if (el.matches("[data-task],[data-post],[data-read]")) return 5;
          return 6;
        };
        const targets = [...doc.querySelectorAll("button,[role=button]")]
          .filter((el) => !el.disabled && el.getClientRects().length && !el.closest("nav"))
          .sort((a, b) => order(a) - order(b))
          .slice(0, 16);
        for (const el of targets) {
          const label = (el.getAttribute("aria-label") || el.textContent || "按钮").trim().replace(/\s+/g, " ").slice(0, 16) || "按钮";
          let hits = 0;
          const mo = new MutationObserver((list) => { hits += list.length; });
          mo.observe(doc.body, { subtree: true, childList: true, attributes: true, characterData: true });
          await new Promise((r) => setTimeout(r, 120));
          const baseline = hits;
          hits = 0;
          el.click();
          await new Promise((r) => setTimeout(r, 170));
          mo.disconnect();
          details.push({ label, ok: hits > baseline });
        }
        for (const form of [...doc.querySelectorAll("form[data-todo-add],form[data-book-form]")].slice(0, 1)) {
          let hits = 0;
          const mo = new MutationObserver((list) => { hits += list.length; });
          mo.observe(doc.body, { subtree: true, childList: true, characterData: true });
          await new Promise((r) => setTimeout(r, 120));
          const baseline = hits;
          hits = 0;
          const input = form.querySelector("input[name]");
          if (input) {
            const proto = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, "value").set.call(input, "自检探针");
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await new Promise((r) => setTimeout(r, 220));
          mo.disconnect();
          const label = (input?.placeholder || "表单提交").slice(0, 16);
          details.push({ label: input && input.placeholder ? label : "表单提交", ok: hits > baseline });
        }
        frame.style.width = "390px";
        await new Promise((r) => setTimeout(r, 320));
        const overflowX = doc.documentElement.scrollWidth - doc.documentElement.clientWidth;
        details.push({ label: "手机版无横向溢出", ok: overflowX <= 2 });
        let outCount = 0;
        for (const el of doc.body.querySelectorAll("*")) {
          if (outCount > 6) break;
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.right > 392 && getComputedStyle(el).position !== "fixed") outCount += 1;
        }
        details.push({ label: outCount ? `手机端 ${outCount} 处元素出屏` : "手机端元素不出屏", ok: outCount === 0 });
        frame.style.width = "1024px";
        finish(details);
      } catch {
        finish([]);
      }
    });
    frame.srcdoc = html;
    document.body.appendChild(frame);
    setTimeout(() => finish([]), 8000);
  });
}

function parseFrame(frame) {
  let name = "message";
  const dataLines = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { name, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

function userNode(body) {
  const node = document.createElement("div");
  node.className = "bubble user";
  node.textContent = body;
  return node;
}

function stageNode() {
  const node = document.createElement("div");
  node.className = "stage-line";
  node.innerHTML = `<span class="stage-dots"><i></i><i></i><i></i></span><span>团队正在分工…</span>`;
  return node;
}

function messageNode(message, ui) {
  if (message.role === "user") return userNode(message.body);
  if (message.role === "check") return checkNode(message);
  return atomNode(message, ui);
}

function checkNode(message) {
  const node = document.createElement("article");
  node.className = "diff-card check-card";
  const passed = (message.body.match(/^✓/gm) || []).length;
  const total = (message.body.match(/^[✓✗]/gm) || []).length;
  node.innerHTML = `<h3>${esc(message.title || `交互自检 ${passed}/${total} 通过`)}<span class="check-badge ${passed === total ? "is-all" : ""}">${passed === total ? "全部可用" : "部分无响应"}</span></h3><div class="check-list"></div>`;
  const list = node.querySelector(".check-list");
  message.body.split("\n").forEach((line) => {
    const row = document.createElement("div");
    row.className = `check-row ${line.startsWith("✓") ? "ok" : "bad"}`;
    row.innerHTML = `<b></b><span></span>`;
    row.querySelector("b").textContent = line.slice(0, 1);
    row.querySelector("span").textContent = line.slice(1).trim();
    list.appendChild(row);
  });
  return node;
}

function atomNode(message, ui) {
  const agent = agentById(message.agent);
  const marker = "\n\n⟦依据⟧";
  const splitAt = message.body.lastIndexOf(marker);
  const body = splitAt >= 0 ? message.body.slice(0, splitAt) : message.body;
  const evidence = splitAt >= 0 ? message.body.slice(splitAt + marker.length) : "";
  const node = document.createElement("article");
  node.className = "atom";
  node.innerHTML = `<b class="orb" style="background:${agent.color};margin:0">${esc(agent.id.slice(0, 1))}</b><div><h3>${esc(agent.id)} · ${esc(message.title || agent.role)}</h3><p></p></div>`;
  node.querySelector("p").textContent = body;
  if (evidence) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "evidence";
    button.textContent = "定位到页面";
    button.addEventListener("click", () => highlightEvidence(ui, evidence));
    node.querySelector("div").appendChild(button);
  }
  return node;
}

function diffNode(changes, ui) {
  const node = document.createElement("article");
  node.className = "diff-card";
  node.innerHTML = `<h3>这次改了 ${changes.length} 处</h3><div class="diff-list"></div>`;
  const list = node.querySelector(".diff-list");
  changes.forEach((change) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "diff-row";
    row.innerHTML = `<s></s><i></i>`;
    row.querySelector("s").textContent = change.before;
    row.querySelector("i").textContent = change.after;
    row.addEventListener("click", () => {
      const doc = ui.iframe.contentDocument;
      const target = doc?.querySelector(`[data-eid="${change.eid}"]`);
      if (!target) {
        toast("这一处不在当前预览里", "bad");
        return;
      }
      doc.querySelectorAll(".is-sourced").forEach((item) => item.classList.remove("is-sourced"));
      target.classList.add("is-sourced");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    list.appendChild(row);
  });
  return node;
}

function highlightEvidence(ui, text) {
  const doc = ui.iframe.contentDocument;
  if (!doc?.body) {
    toast("先打开预览，再定位", "bad");
    return;
  }
  doc.querySelectorAll(".is-sourced").forEach((node) => node.classList.remove("is-sourced"));
  const hit = [...doc.querySelectorAll("[data-eid]")].find((node) => node.textContent.includes(text));
  if (!hit) {
    toast("这一句没有出现在当前预览里", "bad");
    return;
  }
  hit.classList.add("is-sourced");
  hit.scrollIntoView({ block: "center", behavior: "smooth" });
}

function flushMessages(ui, messages) {
  if (!ui.messages.isConnected) return;
  ui.messages.replaceChildren();
  messages.forEach((item) => ui.messages.appendChild(messageNode(item, ui)));
  ui.skip.hidden = true;
  ui.messages.scrollTop = ui.messages.scrollHeight;
}

async function play(ui, messages, from) {
  const token = ++playToken;
  ui.messages.replaceChildren();
  messages.slice(0, from).forEach((message) => ui.messages.appendChild(messageNode(message, ui)));
  const fresh = messages.slice(from);
  ui.skip.hidden = fresh.length === 0;
  for (const message of fresh) {
    if (token !== playToken || !ui.root.isConnected) {
      flushMessages(ui, messages);
      return;
    }
    await wait(message.role === "user" ? 120 : 360);
    if (token !== playToken || !ui.root.isConnected) {
      flushMessages(ui, messages);
      return;
    }
    ui.messages.appendChild(messageNode(message, ui));
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }
  ui.skip.hidden = true;
}

function paintStage(ui) {
  const current = ui.project?.currentVersionId;
  const pending = !current && ui.versions.length > 1;
  ui.picker.hidden = !pending;
  if (pending) {
    ui.picker.innerHTML = ui.versions.slice(-3).map((version) => `<article>
      <div class="thumb"><iframe src="/api/versions/${version.id}/preview" title="${esc(version.label)}"></iframe></div>
      <span>${esc(version.label)}</span>
      <button class="btn-primary" type="button" data-pick="${version.id}">选用</button>
    </article>`).join("");
    ui.picker.querySelectorAll("[data-pick]").forEach((button) => button.addEventListener("click", async () => {
      const data = await api(`/api/projects/${ui.project.id}/current`, { method: "POST", body: { versionId: button.dataset.pick } });
      ui.project = data.project;
      ui.versions = data.versions;
      ui.publication = data.publication;
      paintStage(ui);
      paintVersions(ui);
      await runSelfCheck(ui);
    }));
    ui.frame.hidden = true;
    ui.empty.hidden = false;
    ui.empty.textContent = "三个方向已经做好。选一个，预览才会打开。";
    return;
  }
  if (!current) {
    ui.frame.hidden = true;
    ui.empty.hidden = false;
    return;
  }
  ui.empty.hidden = true;
  ui.frame.hidden = ui.root.querySelector('[data-tab="code"]').classList.contains("is-on");
  ui.iframe.src = `/api/versions/${current}/preview?ts=${Date.now()}`;
  ui.code.textContent = currentHtml(ui);
}

function currentHtml(ui) {
  return ui.versions.find((version) => version.id === ui.project?.currentVersionId)?.html || "";
}

function bindPreview(ui) {
  const doc = ui.iframe.contentDocument;
  if (!doc || !doc.body) return;
  doc.body.classList.toggle("is-editing", editing);
  if (doc.__atomsEdit) return;
  doc.__atomsEdit = true;
  doc.addEventListener("click", (event) => {
    if (editing) {
      const target = event.target.closest("[data-eid]");
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      doc.querySelectorAll(".is-picked").forEach((node) => node.classList.remove("is-picked"));
      target.classList.add("is-picked");
      selected = target;
      ui.editText.value = target.textContent.trim();
      ui.editbar.hidden = false;
      return;
    }
    const target = event.target.closest("h1[data-eid],h2[data-eid],h3[data-eid],p[data-eid]");
    if (!target) return;
    if (!target.textContent.trim()) return;
    showRefine(ui, target, event);
  }, true);
}

function showRefine(ui, target, event) {
  if (ui.refine.hidden && ui.lastRefineTarget && ui.lastRefineTarget.isConnected) return;
  ui.lastRefineTarget = target;
  ui.refine.dataset.target = target.dataset.eid;
  ui.refineNow.textContent = `「${target.textContent.trim().slice(0, 42)}」`;
  ui.refineInput.value = "";
  const rect = ui.iframe.getBoundingClientRect();
  const x = Math.min(rect.left + (event?.clientX || rect.width / 2), window.innerWidth - 300);
  const y = Math.min(rect.top + (event?.clientY || 100) + 14, window.innerHeight - 190);
  ui.refine.style.left = `${Math.max(12, x)}px`;
  ui.refine.style.top = `${Math.max(70, y)}px`;
  ui.refine.hidden = false;
  ui.refineInput.focus();
}

function hideRefine(ui) {
  ui.refine.hidden = true;
  ui.lastRefineTarget = null;
}

function manualPick(ui, eid) {
  const doc = ui.iframe.contentDocument;
  const target = doc?.querySelector(`[data-eid="${eid}"]`);
  if (!target) {
    toast("找不到这个元素", "bad");
    return;
  }
  editing = true;
  editForked = false;
  ui.root.querySelector("[data-edit]").classList.add("is-on");
  ui.editbar.hidden = false;
  doc.body.classList.add("is-editing");
  doc.querySelectorAll(".is-picked").forEach((node) => node.classList.remove("is-picked"));
  target.classList.add("is-picked");
  selected = target;
  ui.editText.value = target.textContent.trim();
}

async function ensureFork(ui) {
  if (editForked) return;
  const forked = await api(`/api/versions/${ui.project.currentVersionId}/fork`, { method: "POST", body: {} });
  forked.html = currentHtml(ui);
  ui.versions.push(forked);
  ui.project.currentVersionId = forked.id;
  editForked = true;
  await refreshProjects(ui);
}

async function refineApply(ui) {
  const eid = ui.refine.dataset.target;
  const instruction = ui.refineInput.value.trim();
  if (!eid || !instruction) {
    toast("先写一句要怎么改", "bad");
    return;
  }
  if (!ui.project?.currentVersionId) {
    toast("先有一个预览", "bad");
    return;
  }
  const button = ui.refine.querySelector("[data-refine-ai]");
  button.disabled = true;
  button.textContent = "团队在改…";
  try {
    await ensureFork(ui);
    const result = await api(`/api/versions/${ui.project.currentVersionId}/refine`, {
      method: "POST",
      body: { eid, instruction },
    });
    const version = ui.versions.find((item) => item.id === ui.project.currentVersionId);
    if (version) version.html = result.html;
    hideRefine(ui);
    ui.iframe.src = `/api/versions/${ui.project.currentVersionId}/preview?ts=${Date.now()}`;
    ui.code.textContent = result.html;
    toast(`已改好：「${result.after}」`);
  } catch (error) {
    toast(error.message, "bad");
  } finally {
    button.disabled = false;
    button.textContent = "让团队改";
  }
}

async function toggleEdit(ui) {
  if (!ui.project?.currentVersionId) {
    toast("先有一个预览，才能改字", "bad");
    return;
  }
  editing = !editing;
  ui.root.querySelector("[data-edit]").classList.toggle("is-on", editing);
  ui.editbar.hidden = !editing;
  if (editing && !editForked) {
    try {
      await ensureFork(ui);
    } catch (error) {
      editing = false;
      toast(error.message, "bad");
      return;
    }
  }
  bindPreview(ui);
  ui.iframe.contentDocument?.body.classList.toggle("is-editing", editing);
}

async function applyEdit(ui) {
  if (!selected) {
    toast("先在预览里点一段文字", "bad");
    return;
  }
  const text = ui.editText.value.trim();
  if (!text) return;
  selected.textContent = text;
  const doc = ui.iframe.contentDocument;
  doc.body.classList.remove("is-editing");
  doc.querySelectorAll(".is-picked").forEach((node) => node.classList.remove("is-picked"));
  const html = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  if (editing) doc.body.classList.add("is-editing");
  selected.classList.add("is-picked");
  try {
    await api(`/api/versions/${ui.project.currentVersionId}`, { method: "PATCH", body: { html } });
    const version = ui.versions.find((item) => item.id === ui.project.currentVersionId);
    if (version) version.html = html;
    ui.code.textContent = html;
    toast("已写入当前版本");
  } catch (error) {
    toast(error.message, "bad");
  }
}

function download(ui) {
  const html = currentHtml(ui);
  if (!html) {
    toast("还没有可导出的页面", "bad");
    return;
  }
  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${ui.project?.name || "atoms-lab"}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function publish(ui) {
  if (!ui.project?.currentVersionId) {
    toast("先选定一个方案", "bad");
    return;
  }
  try {
    const data = await api(`/api/projects/${ui.project.id}/publish`, { method: "POST", body: {} });
    ui.project = data.project;
    ui.versions = data.versions;
    ui.publication = data.publication;
    const link = ui.root.querySelector("[data-published]");
    link.hidden = false;
    link.href = `/p/${data.publication.slug}`;
    link.textContent = "打开发布页";
    ui.statsBtn.hidden = false;
    paintPublication(ui);
    await refreshProjects(ui);
    toast("已发布，浏览数据会真实累计");
    window.open(`/p/${data.publication.slug}`, "_blank", "noopener");
  } catch (error) {
    toast(error.message, "bad");
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
