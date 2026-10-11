import { PALETTES } from "./spec.js";
import { renderApp } from "./render.js";
import { askModel } from "./llm.js";

async function askWithFeedback(buildPrompt, validate, options = {}) {
  const { attempts = 2, ...askOptions } = options;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const prompt = attempt === 0
        ? buildPrompt
        : `${buildPrompt}\n注意：上一次返回未通过校验（${lastError.message}）。请修正这些问题，重新返回完整 JSON。`;
      return validate(await askModel(prompt, askOptions));
    } catch (error) {
      if (error.status !== 502) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export const COSTS = { run: 15, contest: 30, iterate: 8 };

const KINDS = new Set(["saas", "brand", "store", "booking", "dashboard", "todo", "blog", "game", "recommend"]);
const LAYOUTS = new Set(["studio", "split", "bold"]);
const AGENTS = ["Mike", "Iris", "Emma", "Bob", "Alex", "Sarah", "David", "Adrian"];

function text(value, min, max, label) {
  const clean = String(value ?? "").trim();
  if (clean.length < min || clean.length > max) {
    throw Object.assign(new Error(`模型返回的${label}不可用`), { status: 502 });
  }
  return clean;
}

function list(value, size, label) {
  if (!Array.isArray(value) || value.length < size) {
    throw Object.assign(new Error(`模型返回的${label}不够`), { status: 502 });
  }
  return value;
}

function storageKey(brand, kind) {
  const n = [...`${brand}:${kind}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `app${(n % 100000).toString(36)}`;
}

function resolveAgentRows(items, expectedAgents) {
  const byId = new Map(items.map((item) => [item?.agent, item]));
  const complete = expectedAgents.every((id) => byId.has(id));
  const rows = complete ? expectedAgents.map((id) => byId.get(id)) : items.slice(0, expectedAgents.length);
  if (rows.length < expectedAgents.length) {
    throw Object.assign(new Error("模型返回的团队结论不够"), { status: 502 });
  }
  return rows;
}

export function specFromModel(prompt, raw) {
  const kind = KINDS.has(raw?.kind) ? raw.kind : null;
  if (!kind) throw Object.assign(new Error("模型没有返回可用的页面类型"), { status: 502 });
  const palette = PALETTES[raw?.palette] ? raw.palette : null;
  if (!palette) throw Object.assign(new Error("模型没有返回可用的配色"), { status: 502 });
  const brand = text(raw.brand, 1, 24, "名字");
  const features = list(raw.features, 3, "功能").slice(0, 3).map((item) => ({
    title: text(item?.title, 2, 24, "功能标题"),
    body: text(item?.body, 4, 80, "功能说明"),
  }));
  const faqs = list(raw.faqs, 3, "问题").slice(0, 3).map((item) => ({
    q: text(item?.q, 2, 40, "问题"),
    a: text(item?.a, 4, 160, "回答"),
  }));
  const plans = list(raw.plans, 3, "价格").slice(0, 3).map((item) => ({
    name: text(item?.name, 1, 12, "方案名"),
    year: text(item?.year, 1, 16, "年付价格"),
    month: text(item?.month, 1, 16, "月付价格"),
    points: list(item?.points, 2, "方案说明").slice(0, 3).map((point) => text(point, 1, 40, "方案说明")),
  }));
  const money = (item, label) => ({
    name: text(item?.name, 1, 24, label),
    price: Number(item?.price),
    note: text(item?.note, 1, 40, label),
  });
  const products = Array.isArray(raw.products) ? raw.products.slice(0, 6).map((item) => money(item, "商品")) : [];
  const services = Array.isArray(raw.services) ? raw.services.slice(0, 6).map((item) => money(item, "服务")) : [];
  for (const item of [...products, ...services]) {
    if (!Number.isFinite(item.price) || item.price < 0) throw Object.assign(new Error("模型返回的价格不是数字"), { status: 502 });
  }
  if (kind === "store" && products.length < 3) throw Object.assign(new Error("网店至少需要三件模型写出的商品"), { status: 502 });
  if (kind === "booking" && services.length < 2) throw Object.assign(new Error("预约页至少需要两项模型写出的服务"), { status: 502 });
  const atoms = resolveAgentRows(list(raw.atoms, 8, "团队结论"), AGENTS).map((item, index) => {
    const id = AGENTS[index];
    const evidence = text(item.evidence, 2, 40, "依据");
    return {
      role: "agent",
      agent: id,
      title: text(item.title, 2, 16, "结论标题"),
      body: `${text(item.body, 8, 220, "结论")}\n\n⟦依据⟧${evidence}`,
      evidence,
    };
  });
  const corpus = [
    raw.brand, raw.headline, raw.subhead, raw.audience, raw.offer,
    ...features.map((item) => item.title),
    ...features.map((item) => item.body),
    ...faqs.flatMap((item) => [item.q, item.a]),
    ...plans.flatMap((item) => [item.name, ...item.points]),
    ...products.map((item) => item.name),
    ...products.map((item) => item.note),
    ...services.map((item) => item.name),
    ...services.map((item) => item.note),
  ].join("\n");
  for (const atom of atoms) {
    if (!corpus.includes(atom.evidence)) {
      throw Object.assign(new Error(`「${atom.evidence}」没有出现在页面文案里，已拒绝这版生成`), { status: 502 });
    }
  }
  const places = Array.isArray(raw.places) ? raw.places.slice(0, 6).map((item) => ({
    name: text(item?.name, 1, 24, "地点"),
    area: text(item?.area, 1, 12, "区域"),
    note: text(item?.note, 4, 40, "推荐理由"),
  })) : [];
  const posts = Array.isArray(raw.posts) ? raw.posts.slice(0, 4).map((item) => ({
    title: text(item?.title, 2, 32, "篇名"),
    excerpt: text(item?.excerpt, 4, 60, "摘要"),
    body: text(item?.body, 8, 280, "正文"),
  })) : [];
  const rows = Array.isArray(raw.rows) ? raw.rows.slice(0, 8).map((item) => ({
    name: text(item?.name, 1, 24, "客户"),
    owner: text(item?.owner, 1, 12, "负责人"),
    status: text(item?.status, 1, 8, "状态"),
    amount: text(item?.amount, 1, 16, "金额"),
  })) : [];
  const todos = Array.isArray(raw.todos) ? raw.todos.slice(0, 8).map((item) => ({
    title: text(item?.title, 2, 32, "任务"),
    done: Boolean(item?.done),
  })) : [];
  if (kind === "recommend" && places.length < 4) throw Object.assign(new Error("推荐页至少需要四个模型写出的地点"), { status: 502 });
  if (kind === "blog" && posts.length < 3) throw Object.assign(new Error("博客至少需要三篇模型写出的文章"), { status: 502 });
  if (kind === "dashboard" && rows.length < 6) throw Object.assign(new Error("后台至少需要六行模型写出的数据"), { status: 502 });
  if (kind === "todo" && todos.length < 3) throw Object.assign(new Error("任务板至少需要三条模型写出的任务"), { status: 502 });
  return {
    prompt: String(prompt || "").trim(),
    kind,
    brand,
    palette,
    audience: text(raw.audience, 4, 80, "受众"),
    offer: text(raw.offer, 4, 80, "承诺"),
    headline: text(raw.headline, 2, 40, "标题"),
    subhead: text(raw.subhead, 4, 90, "副标题"),
    features,
    faqs,
    plans,
    products,
    services,
    places,
    posts,
    rows,
    todos,
    seo: {
      title: text(raw.seo?.title, 2, 40, "搜索标题"),
      description: text(raw.seo?.description, 4, 90, "搜索描述"),
      keywords: text(raw.seo?.keywords, 2, 40, "关键词"),
    },
    growth: {
      headline: text(raw.growth?.headline, 2, 60, "广告标题"),
      audience: text(raw.growth?.audience, 2, 60, "广告受众"),
      channel: "搜索广告",
    },
    metric: {
      name: text(raw.metric?.name, 2, 24, "指标"),
      why: text(raw.metric?.why, 4, 80, "指标原因"),
    },
    storageKey: storageKey(brand, kind),
    atoms,
    layout: LAYOUTS.has(raw.layout) ? raw.layout : "studio",
  };
}

function directionsFrom(raw, spec, contest) {
  if (!contest) return [{ palette: spec.palette, layout: spec.layout, label: "当前方案" }];
  const rows = list(raw.directions, 3, "竞赛方案").slice(0, 3).map((item, index) => {
    if (!PALETTES[item?.palette] || !LAYOUTS.has(item?.layout)) {
      throw Object.assign(new Error("竞赛方案的配色或版式不可用"), { status: 502 });
    }
    return { palette: item.palette, layout: item.layout, label: text(item.label, 2, 24, "方案名") || `方案 ${index + 1}` };
  });
  return rows;
}

const SCHEMA = `只返回 JSON。kind 只能是 saas、brand、store、booking、dashboard、todo、blog、game、recommend 之一。palette 只能是 cobalt、forest、coffee、ink、rose、violet、amber、night。
字段：brand, audience, offer, headline, subhead, palette, kind,
features 正好 3 个 {title, body},
faqs 正好 3 个 {q, a},
plans 正好 3 个 {name, year, month, points}，points 至少 2 条，价格用人民币，
products 为 {name, price, note} 且 price 是数字，store 至少 3 个，
services 为 {name, price, note}，booking 至少 2 个，
places 为 {name, area, note}，recommend 至少 4 个，
posts 为 {title, excerpt, body}，blog 至少 3 个，
rows 为 {name, owner, status, amount}，dashboard 至少 6 个，
todos 为 {title, done}，todo 至少 3 个，
seo {title, description, keywords}，growth {headline, audience}，metric {name, why}，
atoms 正好 8 个，这是八位团队角色的工作结论，agent 顺序固定为 Mike（团队领导，定范围）、Iris（深度研究，讲受众）、Emma（产品经理，列必须做对的三件事）、Bob（定页面结构）、Alex（编译页面内容与交互）、Sarah（准备搜索广告文案）、David（定数据与指标）、Adrian（提增长建议），每项含 title（2-16 字的结论标题）、body（8-220 字的具体结论，不要只写职责）、evidence。
evidence 必须从页面正文文案（headline、subhead、offer、audience、feature 的 title 或 body、faq、plan、product.name、service.name 等）里原样摘出，并且这句话会出现在页面正文里。`;

export async function createRun(prompt, { contest = false } = {}) {
  const { raw, spec } = await askWithFeedback(`${SCHEMA}
${contest ? "另外给出 directions 正好 3 个 {palette, layout, label}，layout 只能是 studio、split、bold，三套 palette 不能相同。" : "layout 填 studio。"}
用户需求：${prompt}
文案只能依据这段需求，不要套用任何固定品牌或示例价格。`, (modelRaw) => {
    const spec = specFromModel(prompt, modelRaw);
    return { raw: modelRaw, spec };
  });
  const directions = directionsFrom(raw, spec, contest);
  const versions = directions.map((direction) => {
    const variant = direction.layout === "bold" ? 2 : direction.layout === "split" ? 1 : 0;
    const rendered = renderApp(spec, { variant, palette: direction.palette });
    return { ...rendered, label: direction.label };
  });
  return { spec, versions, atoms: spec.atoms, cost: contest ? COSTS.contest : COSTS.run, reason: contest ? "竞赛模式" : "生成应用" };
}

export async function iterateRun(previousSpec, _html, message) {
  const brief = {
    prompt: previousSpec.prompt,
    kind: previousSpec.kind,
    brand: previousSpec.brand,
    headline: previousSpec.headline,
    subhead: previousSpec.subhead,
    palette: previousSpec.palette,
    features: previousSpec.features,
  };
  const { spec } = await askWithFeedback(`${SCHEMA}
layout 填 studio。这是在已有版本上的修改，请返回完整的新 JSON，保留没有被要求改掉的事实。
已有版本：${JSON.stringify(brief)}
修改要求：${message}`, (raw) => ({ spec: specFromModel(`${previousSpec.prompt}\n补充要求：${message}`, raw) }));
  const rendered = renderApp(spec, { variant: 0, palette: spec.palette });
  return { spec, versions: [{ ...rendered, label: "模型修订" }], atoms: spec.atoms, mode: "model" };
}

const BRIEF_SCHEMA = `只返回 JSON，不要 Markdown。你是八人团队的定向阶段，先由 Mike 定范围，Iris 研究受众，Emma 定出必须做对的三件事。
字段：
brand（1-24 字的名字，从需求里取，不要编英文代号）、
kind 只能是 saas、brand、store、booking、dashboard、todo、blog、game、recommend 之一、
palette 只能是 cobalt、forest、coffee、ink、rose、violet、amber、night 之一、
layout 只能是 studio、split、bold 之一、
audience（这段产品写给谁，4-80 字）、
offer（一句话承诺，4-80 字）、
headline（主标题，2-40 字，会出现在页面第一屏）、
subhead（副标题，4-90 字）、
features 正好 3 个 {title(2-24字), body(4-80字)}，
mike {title(2-16字), body(8-220字), evidence(从 headline、subhead、offer、features.title 里原样摘出一句)}，
iris {同上}，emma {同上}。
evidence 必须是那几句文案里的原句，一个字都不能改。`;

const BUILD_SCHEMA = `只返回 JSON。这一步把已定的方向编译成页面内容。
字段：
faqs 正好 3 个 {q(2-40字), a(4-160字)}，
plans 正好 3 个 {name(1-12字), year(1-16字), month(1-16字), points 至少 2 条(1-40字)}，价格用人民币，
products 为 {name(1-24字), price 数字, note(1-40字)}，store 至少 3 个，
services 为 {name(1-24字), price 数字, note(1-40字)}，booking 至少 2 个，
places 为 {name, area(1-12字), note(4-40字)}，recommend 至少 4 个，
posts 为 {title(2-32字), excerpt(4-60字), body(8-280字)}，blog 至少 3 个，
rows 为 {name(1-24字), owner(1-12字), status(1-8字), amount(1-16字)}，dashboard 至少 6 个，
todos 为 {title(2-32字), done}，todo 至少 3 个，
seo {title(2-40字), description(4-90字), keywords(2-40字)}，growth {headline(2-60字), audience(2-60字)}，metric {name(2-24字), why(4-80字)}，
atoms 正好 5 个，agent 顺序固定为 Bob、Alex、Sarah、David、Adrian，每项含 title(2-16字)、body(8-220字)、evidence。
evidence 必须从 headline、subhead、offer、features.title、products.name 或 services.name 里原样摘出，并且这句话会出现在页面正文里。`;

function atomMessage(atom) {
  return {
    role: "agent",
    agent: atom.agent,
    title: atom.title,
    body: `${atom.body}\n\n⟦依据⟧${atom.evidence}`,
    evidence: atom.evidence,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createRunStages(prompt, { contest = false, emit = () => {} } = {}) {
  emit("stage", { agents: ["Mike", "Iris", "Emma"], status: "working", text: "Mike 正在定范围，Iris 在研究受众，Emma 在列范围。" });
  let brief;
  try {
    brief = await askWithFeedback(`${BRIEF_SCHEMA}\n用户需求：${prompt}\n文案只能依据这段需求。`, (raw) => raw, { temperature: 0.5 });
  } catch (error) {
    throw Object.assign(new Error(`定向阶段失败：${error.message}`), { status: error.status || 502 });
  }
  const leadAgents = [
    { agent: "Mike", role: "团队领导", raw: brief.mike },
    { agent: "Iris", role: "深度研究", raw: brief.iris },
    { agent: "Emma", role: "产品经理", raw: brief.emma },
  ];
  const leadAtoms = leadAgents.map(({ agent, role, raw: item }) => {
    const title = text(item?.title, 2, 16, `${role}结论标题`);
    const body = text(item?.body, 8, 220, `${role}结论`);
    const evidence = text(item?.evidence, 2, 40, `${role}依据`);
    return { agent, title, body, evidence, role };
  });
  for (const [index, atom] of leadAtoms.entries()) {
    if (index) await sleep(260);
    emit("agent", { ...atomMessage(atom), role: atom.role });
  }

  emit("stage", { agents: ["Bob", "Alex", "Sarah", "David", "Adrian"], status: "working", text: "Bob 在定结构，Alex 在编译页面，Sarah、David、Adrian 在准备搜索、数据和增长。" });
  const briefForBuild = {
    brand: brief.brand, kind: brief.kind, palette: brief.palette, layout: brief.layout,
    audience: brief.audience, offer: brief.offer, headline: brief.headline, subhead: brief.subhead,
    features: brief.features,
  };
  let build;
  try {
    build = await askWithFeedback(`${BUILD_SCHEMA}
已定方向：${JSON.stringify(briefForBuild)}
${contest ? "另外给出 directions 正好 3 个 {palette, layout, label}，layout 只能是 studio、split、bold，三套 palette 不能相同。" : "layout 填 studio。"}
用户需求：${prompt}
商品、服务、价格必须贴合这个需求，不要套用任何固定品牌或示例价格。`, (raw) => raw, { temperature: 0.4 });
  } catch (error) {
    throw Object.assign(new Error(`编译阶段失败：${error.message}`), { status: error.status || 502 });
  }
  const buildAgents = ["Bob", "Alex", "Sarah", "David", "Adrian"];
  const buildAtoms = resolveAgentRows(list(build.atoms, 5, "团队结论"), buildAgents).map((item, index) => {
    const evidence = text(item.evidence, 2, 40, "依据");
    return { agent: buildAgents[index], title: text(item.title, 2, 16, "结论标题"), body: text(item.body, 8, 220, "结论"), evidence };
  });
  for (const [index, atom] of buildAtoms.entries()) {
    if (index) await sleep(260);
    emit("agent", { ...atomMessage(atom) });
  }

  const raw = mergeStageRaw(prompt, briefForBuild, build, leadAtoms, buildAtoms);
  const spec = specFromModel(prompt, raw);
  const directions = directionsFrom(build, spec, contest);
  emit("stage", { agents: [], status: "building", text: "正在把范围编译成页面…" });
  const versions = directions.map((direction) => {
    const variant = direction.layout === "bold" ? 2 : direction.layout === "split" ? 1 : 0;
    const rendered = renderApp(spec, { variant, palette: direction.palette });
    return { ...rendered, label: direction.label };
  });
  return {
    spec,
    versions,
    atoms: spec.atoms,
    cost: contest ? COSTS.contest : COSTS.run,
    reason: contest ? "竞赛模式" : "生成应用",
  };
}

export function mergeStageRaw(prompt, brief, build, leadAtoms, buildAtoms) {
  return {
    ...build,
    ...brief,
    prompt: String(prompt || "").trim(),
    atoms: [...leadAtoms, ...buildAtoms],
  };
}

export async function iterateRunStages(previousSpec, previousHtml, message, { emit = () => {} } = {}) {
  const run = await iterateRun(previousSpec, previousHtml, message);
  for (const [index, atom] of run.atoms.entries()) {
    if (index) await sleep(200);
    emit("agent", atom);
  }
  emit("stage", { agents: [], status: "building", text: "正在把修改编译进新版本…" });
  const before = extractEditableText(previousHtml);
  const after = extractEditableText(run.versions[0].html);
  const changes = [];
  for (const [eid, next] of Object.entries(after)) {
    const prev = before[eid];
    if (prev !== undefined && prev !== next) changes.push({ eid, before: prev, after: next });
    if (changes.length >= 12) break;
  }
  return { ...run, changes };
}

export function extractEditableText(html) {
  const out = {};
  const pattern = /<(h1|h2|h3|p|button|a)\b([^>]*\bdata-eid="(e\d+)"[^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = pattern.exec(String(html || "")))) {
    out[match[3]] = match[4].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
  return out;
}
