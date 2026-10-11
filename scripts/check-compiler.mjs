import { applyPalette, replaceHeading } from "../server/spec.js";
import { renderApp } from "../server/render.js";
import { specFromModel, mergeStageRaw, extractEditableText } from "../server/pipeline.js";

const AGENTS = ["Mike", "Iris", "Emma", "Bob", "Alex", "Sarah", "David", "Adrian"];

function fixture(overrides = {}) {
  const base = {
    kind: "booking",
    palette: "forest",
    brand: "晨雾",
    audience: "附近想安静坐一会儿的人",
    offer: "选时段后当场拿到回执",
    headline: "晨雾，今晚还有空位",
    subhead: "两个人也能坐下，不用排队",
    layout: "studio",
    features: [
      { title: "选时段", body: "只显示今天还空着的座位" },
      { title: "当场回执", body: "提交后页面给出回执编号" },
      { title: "到店核销", body: "把编号给店员即可入座" },
    ],
    faqs: [
      { q: "可以改时间吗", a: "提交前可以重选时段" },
      { q: "需要定金吗", a: "演示里不收取定金" },
      { q: "营业到几点", a: "以页面上的时段为准" },
    ],
    plans: [
      { name: "单人", year: "¥28", month: "¥32", points: ["靠窗", "一杯美式"] },
      { name: "双人", year: "¥48", month: "¥56", points: ["两人座", "可以续杯"] },
      { name: "包厢", year: "¥88", month: "¥98", points: ["四小时", "可投影"] },
    ],
    services: [
      { name: "手冲", price: 32, note: "单品豆" },
      { name: "拿铁", price: 28, note: "燕麦奶可换" },
    ],
    seo: { title: "晨雾预约", description: "今晚的空位和回执", keywords: "咖啡,预约" },
    growth: { headline: "今晚还有空位", audience: "住在附近的人" },
    metric: { name: "回执数", why: "看有多少人真正订上" },
    atoms: AGENTS.map((agent, index) => ({
      agent,
      title: "核对文案",
      body: "这句出现在标题或服务名里，用来定位。",
      evidence: index % 2 === 0 ? "今晚还有空位" : "手冲",
    })),
  };
  return { ...base, ...overrides };
}

let failed = 0;

function expectThrow(label, fn) {
  try {
    fn();
    console.error("EXPECTED THROW", label);
    failed += 1;
  } catch (error) {
    if (!error.status) {
      console.error("MISSING STATUS", label, error.message);
      failed += 1;
    }
  }
}

const spec = specFromModel("创建一个咖啡店预约页，店名晨雾", fixture());
const view = renderApp(spec, { variant: 0 });
if (!view.html.includes(spec.brand) || !view.html.includes("今晚还有空位") || !view.html.includes("手冲")) {
  console.error("RENDER MISS");
  failed += 1;
}
if (!view.html.includes('data-eid="e1"')) {
  console.error("STAMP");
  failed += 1;
}
for (const atom of spec.atoms) {
  const evidence = atom.body.split("\n\n⟦依据⟧")[1];
  if (!view.html.includes(evidence)) {
    console.error("EVIDENCE NOT IN HTML", evidence);
    failed += 1;
  }
}

expectThrow("bad kind", () => specFromModel("x", fixture({ kind: "flyer" })));
expectThrow("loose evidence", () => specFromModel("x", fixture({
  atoms: AGENTS.map((agent) => ({
    agent,
    title: "核对文案",
    body: "这句没有写进页面，应该被拒绝。",
    evidence: "并不存在的句子",
  })),
})));
expectThrow("short store", () => specFromModel("x", fixture({ kind: "store", products: [{ name: "杯子", price: 40, note: "一只" }] })));

const painted = applyPalette(view.html, "rose");
const headed = replaceHeading(painted, "只换标题");
if (!headed.includes("只换标题") || !headed.includes("--accent:#d4537e")) {
  console.error("HELPERS");
  failed += 1;
}

const merged = mergeStageRaw(
  "创建一个咖啡店预约页，店名晨雾",
  { brand: "晨雾", kind: "booking", palette: "forest", layout: "studio", audience: "附近的人", offer: "当场回执", headline: "晨雾，今晚还有空位", subhead: "两个人也能坐下", features: fixture().features },
  { faqs: fixture().faqs, plans: fixture().plans, services: fixture().services, seo: fixture().seo, growth: fixture().growth, metric: fixture().metric, layout: "split" },
  fixture().atoms.slice(0, 3),
  fixture().atoms.slice(3),
);
const mergedSpec = specFromModel("创建一个咖啡店预约页，店名晨雾", merged);
if (mergedSpec.brand !== "晨雾" || mergedSpec.palette !== "forest" || mergedSpec.atoms.length !== 8) {
  console.error("STAGE MERGE");
  failed += 1;
}

const texts = extractEditableText(view.html);
const eids = Object.keys(texts);
if (!eids.length || !view.html.includes(`data-eid="${eids[0]}"`)) {
  console.error("EXTRACT");
  failed += 1;
}

if (failed) {
  console.error(`failed ${failed}`);
  process.exit(1);
}
console.log("compiler ok");
