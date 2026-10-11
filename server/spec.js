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

const KIND_RULES = [
  [/射击|打靶|小游戏/, "game"],
  [/待办|任务板|看板|todo/i, "todo"],
  [/仪表盘|管理后台|数据看板|crm/i, "dashboard"],
  [/预约|预订|订位|挂号|约课|到店/, "booking"],
  [/网店|电商|商城|加购|商店|零售|批发/, "store"],
  [/博客|专栏|杂志/, "blog"],
  [/推荐|发现平台|榜单/, "recommend"],
  [/作品集|品牌|花店|电影|摄影|工作室|官网/, "brand"],
  [/saas|落地页|订阅/i, "saas"],
];

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

const PACKS = [
  {
    id: "coffee",
    test: /咖啡|cafe/i,
    palette: "coffee",
    audience: "住在附近、想来坐一会儿或顺路外带的人",
    offer: "选豆、留座和到店时间放在同一页",
    features: [
      { title: "先看今天的豆子", body: "三种烘焙写清楚，不讲黑话。" },
      { title: "选一个能坐下的时间", body: "靠窗或吧台，提交后立刻给出回执。" },
      { title: "外带不用现场问", body: "先选好，再走过来取。" },
    ],
    products: [
      { name: "花香手冲", price: 32, note: "浅烘，适合慢慢喝" },
      { name: "燕麦拿铁", price: 28, note: "热的或冰的" },
      { name: "每日烘焙豆 200g", price: 78, note: "本周配方" },
    ],
    services: [
      { name: "吧台座位 60 分钟", price: 0, note: "适合一个人" },
      { name: "靠窗双人座", price: 0, note: "90 分钟" },
      { name: "手冲体验", price: 128, note: "周末下午" },
    ],
  },
  {
    id: "flower",
    test: /花店|鲜花|花艺|花束/,
    palette: "rose",
    audience: "想送一束花、又不想在橱窗前犹豫太久的人",
    offer: "按场合选花，并约好取花时间",
    features: [
      { title: "按场合挑选", body: "生日、探望、自己插，三种入口。" },
      { title: "看到大概的气质", body: "色系和花材写在名字旁边。" },
      { title: "约好再出门", body: "避免白跑一趟。" },
    ],
    products: [
      { name: "一小把季节花", price: 89, note: "当天搭配" },
      { name: "桌面花器", price: 168, note: "可以复用" },
      { name: "周末花束", price: 228, note: "适合送人" },
    ],
    services: [
      { name: "到店自取", price: 0, note: "提前两小时" },
      { name: "上门插花课", price: 260, note: "两人以内" },
    ],
  },
  {
    id: "film",
    test: /电影|影像|摄影|视频|片单/,
    palette: "ink",
    audience: "正在找一支小团队拍形象片或纪录短片的人",
    offer: "用作品而不是形容词说明拍摄方式",
    features: [
      { title: "先看完成片", body: "三支代表作，每支只有一句话。" },
      { title: "知道谁在现场", body: "导演、摄影、后期写清楚。" },
      { title: "留下片单", body: "预算范围和拍摄城市就够了。" },
    ],
    products: [
      { name: "品牌短片", price: 18000, note: "1 分钟内" },
      { name: "采访半日", price: 8000, note: "含粗剪" },
      { name: "活动快剪", price: 5000, note: "48 小时交付" },
    ],
    services: [
      { name: "线上沟通 30 分钟", price: 0, note: "先判断是否合适" },
      { name: "堪景半日", price: 1500, note: "同城" },
    ],
  },
  {
    id: "ceramic",
    test: /陶瓷|手作|器物|器皿/,
    palette: "amber",
    audience: "想买一件会每天用到的器物的人",
    offer: "看尺寸、釉色，再放进购物袋",
    features: [
      { title: "尺寸写在名字下", body: "不用猜能不能进洗碗机。" },
      { title: "一次看完釉色", body: "三件代表作，不无限滚动。" },
      { title: "购物袋里能改数量", body: "结算前看得到合计。" },
    ],
    products: [
      { name: "日用杯", price: 128, note: "约 200ml" },
      { name: "浅盘", price: 168, note: "直径 18cm" },
      { name: "小花器", price: 210, note: "单支花" },
    ],
  },
  {
    id: "fitness",
    test: /健身|瑜伽|普拉提|课程/,
    palette: "forest",
    audience: "想固定一个每周都能来的时段的人",
    offer: "先选课程，再占住时间",
    features: [
      { title: "课程不超过四种", body: "新手也能看懂差别。" },
      { title: "时间是可选的", body: "选中才出现确认按钮。" },
      { title: "回执里有编号", body: "到店报编号即可。" },
    ],
    services: [
      { name: "基础课 60 分钟", price: 89, note: "8 人小班" },
      { name: "一对一评估", price: 199, note: "首次" },
      { name: "晚间放松", price: 69, note: "45 分钟" },
    ],
  },
  {
    id: "consult",
    test: /咨询|顾问|自由职业|客户项目/,
    palette: "cobalt",
    audience: "一个人做项目、客户却散落在聊天记录里的顾问",
    offer: "把提案、进度和收款状态放在客户看得到的页面",
    features: [
      { title: "一个链接说明服务", body: "客户不用再要 PDF。" },
      { title: "价格写在页面上", body: "减少来回询价。" },
      { title: "留下邮箱就能开始", body: "先进入名单，不强制注册。" },
    ],
  },
];

const DEFAULT_FEATURES = {
  saas: [
    { title: "打开就能看懂", body: "第一屏只回答这是什么、给谁用。" },
    { title: "价格不再另附", body: "方案和差异放在同一页。" },
    { title: "留下联系方式", body: "邮箱存在这台浏览器里，方便演示。" },
  ],
  brand: [
    { title: "气质先于目录", body: "大标题和一段短故事就够了。" },
    { title: "作品可以点开", body: "不要只放一张大图。" },
    { title: "联系方式很短", body: "城市、档期、预算三件事。" },
  ],
  store: [
    { title: "三件代表作", body: "先卖得清楚，再考虑上新。" },
    { title: "购物袋看得见", body: "数量和合计同时更新。" },
    { title: "结算有回执", body: "这是演示订单，不会真实扣款。" },
  ],
  booking: [
    { title: "服务先选好", body: "时间按钮在选中服务后更有意义。" },
    { title: "最近几天", body: "日期按打开页面的当天计算。" },
    { title: "确认编号", body: "提交后立刻看到，可截图。" },
  ],
  dashboard: [
    { title: "今天的三件数字", body: "切换本周和本月会变化。" },
    { title: "表格可以搜", body: "按客户或状态过滤。" },
    { title: "状态用词统一", body: "进行中、待回复、已完成。" },
  ],
  todo: [
    { title: "加一条只要回车", body: "任务立刻出现在列表里。" },
    { title: "完成不是删除", body: "过滤项把它们分开。" },
    { title: "刷新还在", body: "记在这台浏览器的本地存储里。" },
  ],
  blog: [
    { title: "三篇就够看", body: "目录清楚，点开才是正文。" },
    { title: "返回目录", body: "阅读时不会迷路。" },
    { title: "标题可以检索", body: "搜索框过滤篇名。" },
  ],
  game: [
    { title: "二十秒一局", body: "点中目标得分，点空不算。" },
    { title: "最高分留下", body: "存在这台浏览器里。" },
    { title: "可以马上再来", body: "结束后按钮还在。" },
  ],
  recommend: [
    { title: "先搜再逛", body: "名字和区域都能过滤。" },
    { title: "喜欢会留下", body: "心形按钮记在本地。" },
    { title: "理由只有一句", body: "不写成长文。" },
  ],
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
    prompt: "做一个电影工作室网站，名字叫光粒影像，展示代表作和拍摄服务，并留下片单联系。",
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

function matchKind(text) {
  for (const [rule, kind] of KIND_RULES) {
    if (rule.test(text)) return kind;
  }
  return null;
}

export function classify(prompt) {
  const text = String(prompt || "");
  if (text.includes("补充要求：")) {
    const extraKind = matchKind(text.split("补充要求：").slice(1).join("补充要求："));
    if (extraKind) return extraKind;
  }
  return matchKind(text) || "saas";
}

function supplement(prompt) {
  const text = String(prompt || "");
  if (!text.includes("补充要求：")) return "";
  return text.split("补充要求：").slice(1).join("补充要求：");
}

function matchPack(prompt) {
  const extra = supplement(prompt);
  if (extra) {
    const found = PACKS.find((pack) => pack.test.test(extra));
    if (found) return found;
  }
  return PACKS.find((pack) => pack.test.test(String(prompt || ""))) || null;
}

function mapColorWord(text) {
  const table = [
    [/墨绿|深绿/, "forest"],
    [/蓝/, "cobalt"],
    [/粉|玫/, "rose"],
    [/紫/, "violet"],
    [/橙|琥珀|黄/, "amber"],
    [/黑|墨/, "ink"],
    [/夜|暗/, "night"],
    [/绿/, "forest"],
    [/棕|褐|焦糖/, "coffee"],
  ];
  for (const [rule, key] of table) {
    if (rule.test(text)) return key;
  }
  return null;
}

export function explicitPalette(prompt) {
  const text = String(prompt || "");
  const scoped = supplement(text) || text;
  const named = scoped.match(/(?:主色|配色|颜色)\s*[:：为]?\s*([\u4e00-\u9fa5]{1,4})/);
  if (named) return mapColorWord(named[1]);
  if (supplement(text)) return null;
  return null;
}

export function paletteFromMessage(message) {
  return mapColorWord(message) || explicitPalette(message);
}

function extractBrand(prompt) {
  return brandIn(supplement(prompt)) || brandIn(prompt);
}

function brandIn(prompt) {
  const text = String(prompt || "");
  const quoted = text.match(/[「“"]([^」”"]{2,18})[」”"]/);
  if (quoted) return quoted[1].trim();
  const named = text.match(/(?:名为|叫做|名叫|品牌叫|店名|名字叫|名字是)\s*([A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 ·]{0,18})/);
  if (named) return named[1].replace(/的.*/, "").trim();
  return null;
}

function coinBrand(prompt) {
  const seeds = ["北窗", "澄光", "小山", "半日", "慢潮", "折页", "青石", "未央"];
  const n = [...String(prompt)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seeds[n % seeds.length];
}

function hashKey(text) {
  const n = [...String(text)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `app${(n % 100000).toString(36)}`;
}

function featureSet(prompt, pack, kind) {
  const defaults = pack?.features || DEFAULT_FEATURES[kind] || DEFAULT_FEATURES.saas;
  const bits = String(prompt)
    .split(/[，。；、\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4 && part.length <= 16 && !/创建|做一个|帮我|主色|名为|叫做/.test(part));
  return defaults.map((item, index) => ({
    title: bits[index] || item.title,
    body: item.body,
  }));
}

function voice(kind, brand, pack) {
  const offer = pack?.offer || "把最重要的一步放在第一屏";
  const audience = pack?.audience || "第一次打开、还在判断要不要继续的人";
  const headlines = {
    saas: `${brand}，把客户项目从聊天记录里拿出来`,
    brand: brand,
    store: brand,
    booking: `来 ${brand} 之前，先把时间订好`,
    dashboard: `${brand} 今天的进度`,
    todo: `${brand} 的任务板`,
    blog: `${brand} 的笔记`,
    game: brand,
    recommend: `在 ${brand} 找到值得去的地方`,
  };
  const subheads = {
    saas: offer,
    brand: offer,
    store: offer,
    booking: offer,
    dashboard: "三件数字、一张可以搜索的表。切换时间范围时，数字会变。",
    todo: "加上、完成、过滤。刷新之后，这些任务还在。",
    blog: "目录很短。点开一篇，读完再回到目录。",
    game: "二十秒。点中出现的星屑，躲开空白。最高分会留下来。",
    recommend: "搜索店名，点一下喜欢。理由只有一句话。",
  };
  return {
    audience,
    offer,
    headline: headlines[kind] || brand,
    subhead: subheads[kind] || offer,
  };
}

function rowsFor(brand) {
  return [
    { name: "河西工作室", owner: "周宁", status: "进行中", amount: "¥12,800" },
    { name: "半日咨询", owner: "林可", status: "待回复", amount: "¥6,400" },
    { name: "旧街餐厅", owner: "赵启", status: "已完成", amount: "¥3,200" },
    { name: "北窗设计", owner: "何曼", status: "进行中", amount: "¥9,600" },
    { name: "码头书店", owner: "陈夏", status: "待回复", amount: "¥1,800" },
    { name: `${brand} 内部`, owner: "你", status: "已完成", amount: "¥0" },
  ];
}

function placesFor(prompt) {
  if (/咖啡/.test(prompt)) {
    return [
      { name: "窗边慢煮", area: "城南", note: "适合上午一个人坐很久。" },
      { name: "河堤手冲", area: "河西", note: "豆子写在黑板上，选择很少。" },
      { name: "旧邮局", area: "旧街", note: "座位硬，但光线稳定。" },
      { name: "夜航咖啡", area: "码头", note: "晚上八点后才开始安静。" },
    ];
  }
  return [
    { name: "城南小馆", area: "城南", note: "适合把一场谈话放在晚饭里。" },
    { name: "河西书店", area: "河西", note: "二楼有可以打开电脑的桌子。" },
    { name: "旧街工作室", area: "旧街", note: "周末有小型放映。" },
    { name: "码头步道", area: "码头", note: "傍晚的风比风景有用。" },
  ];
}

function postsFor(brand) {
  return [
    { title: `${brand} 为什么只做三件事`, excerpt: "功能一多，第一屏就不再诚实。", body: "我们把第一版限制在访客真正会点的动作上。能预约就不要先做会员，能加购就不要先做社区。等这一个动作有人重复使用，再加下一块。" },
    { title: "价格写在页面上", excerpt: "询价邮件通常只是在补页面没说的话。", body: "把范围、不包含什么、以及开始的方式写清楚。访客可以不同意，但不应该猜。" },
    { title: "演示数据留在浏览器里", excerpt: "刷新之后还在，换一台电脑就没有。", body: "这是为了让预览可以被亲手点开。正式产品会换成真正的账号和数据库，而不是本地存储。" },
  ];
}

function todosFor(kind, brand) {
  const common = {
    booking: ["确认本周可约时段", "把回执文案写短", "检查手机上的按钮尺寸"],
    store: ["核对三件商品的价格", "写一句退换说明", "用手机点一遍购物袋"],
    game: ["试玩一局并看结束文案", "确认最高分会保留", "让目标不要重叠"],
    dashboard: ["核对状态用词", "让搜索能找到负责人", "切换本月看数字"],
  };
  const list = common[kind] || [`写清 ${brand} 的第一句话`, "自己点一遍主要按钮", "删掉一句多余的说明"];
  return list.map((title, index) => ({ title, done: index === 2 }));
}

export function compileSpec(prompt, previous = null) {
  const text = String(prompt || "").trim();
  const pack = matchPack(text) || (previous?.domainId ? PACKS.find((item) => item.id === previous.domainId) : null);
  const kind = classify(text);
  const brand = extractBrand(text) || previous?.brand || (pack?.id === "coffee" ? "晨雾咖啡" : coinBrand(text));
  const spoken = voice(kind, brand, pack);
  const explicit = explicitPalette(text);
  const palette = explicit || previous?.palette || pack?.palette || (kind === "game" ? "night" : "cobalt");
  const features = featureSet(text, pack, kind);
  const headline = previous?.headlineLocked ? previous.headline : spoken.headline;
  const spec = {
    prompt: text,
    kind,
    brand,
    domainId: pack?.id || previous?.domainId || null,
    audience: spoken.audience,
    offer: spoken.offer,
    headline,
    headlineLocked: Boolean(previous?.headlineLocked),
    subhead: spoken.subhead,
    features,
    palette,
    storageKey: previous?.storageKey || hashKey(`${brand}:${kind}:${text.slice(0, 40)}`),
    products: pack?.products || [
      { name: `${brand} 入门`, price: 49, note: "先用起来" },
      { name: `${brand} 日常`, price: 129, note: "大多数人会留在这里" },
      { name: `${brand} 团队`, price: 299, note: "一起看进度" },
    ],
    services: pack?.services || [
      { name: "首次沟通 25 分钟", price: 0, note: "判断是否合适" },
      { name: "半天工作坊", price: 1600, note: "把范围定下来" },
      { name: "两周陪跑", price: 4800, note: "含一次复盘" },
    ],
    places: placesFor(text),
    posts: postsFor(brand),
    rows: rowsFor(brand),
    todos: todosFor(kind, brand),
    plans: [
      { name: "开始", year: "¥0", month: "¥0", points: ["公开说明", "一个主要动作"] },
      { name: "常用", year: "¥99", month: "¥129", points: ["去掉演示水印感", "邮件回执"] },
      { name: "一起", year: "¥199", month: "¥259", points: ["最多 5 人", "共享进度"] },
    ],
  };
  spec.faqs = [
    { q: `${brand} 是给谁的？`, a: spec.audience + "。" },
    { q: "我现在能做什么？", a: `这一版聚焦在「${KIND_LABEL[kind]}」。${spec.features.map((item) => item.title).join("、")}都可以直接点。` },
    { q: "数据会去哪里？", a: "预览里的订阅、购物袋、任务和分数保存在这台浏览器中。工作室里的项目和版本保存在本机数据库。" },
  ];
  spec.seo = {
    title: `${brand} · ${KIND_LABEL[kind]}`,
    description: `${spec.subhead}`.slice(0, 90),
    keywords: [brand, KIND_LABEL[kind], "Atoms Lab"].join(", "),
  };
  spec.growth = {
    headline: `${brand}：${spec.offer}`,
    audience: spec.audience,
    channel: "搜索广告草案",
  };
  spec.metric = metricFor(kind);
  return spec;
}

function metricFor(kind) {
  const table = {
    saas: ["订阅按钮点击率", "先看有没有人愿意留下邮箱，再看访问量。"],
    brand: ["联系表单完成率", "作品被看到不算数，留下档期才算。"],
    store: ["加购后的结算完成率", "只被点开的商品，还不是订单。"],
    booking: ["选中时间后的提交率", "停在选时间，说明回执还不够清楚。"],
    dashboard: ["搜索后的停留", "如果没人搜，表格的默认排序就要更好。"],
    todo: ["次日仍在的未完成任务", "刷新还在，只说明存储有效。"],
    blog: ["从目录点进正文的比例", "目录本身不是阅读。"],
    game: ["结束后再开一局的比例", "最高分只会讨好已经喜欢它的人。"],
    recommend: ["搜索后的喜欢次数", "没有搜索就喜欢，列表可能太长了。"],
  };
  const [name, why] = table[kind] || table.saas;
  return { name, why };
}

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
