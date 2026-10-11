import { db } from "./db.js";

function get(key) {
  return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value || "";
}

function set(key, value) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

function mask(key) {
  if (key.length <= 8) return "已保存";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

export function llmStatus() {
  const key = get("llm_key");
  return {
    configured: Boolean(key && get("llm_base") && get("llm_model")),
    base: get("llm_base"),
    model: get("llm_model"),
    keyHint: key ? mask(key) : "",
  };
}

export function saveLlm({ base, model, key }) {
  const nextBase = String(base || "").trim().replace(/\/$/, "");
  const nextModel = String(model || "").trim();
  const nextKey = String(key || "").trim();
  if (!nextBase || !nextModel) {
    throw Object.assign(new Error("请填写接口地址和模型名"), { status: 400 });
  }
  if (!/^https?:\/\//.test(nextBase)) {
    throw Object.assign(new Error("接口地址需要以 http:// 或 https:// 开头"), { status: 400 });
  }
  if (!nextKey && !get("llm_key")) {
    throw Object.assign(new Error("请填写密钥"), { status: 400 });
  }
  set("llm_base", nextBase);
  set("llm_model", nextModel);
  if (nextKey) set("llm_key", nextKey);
  return llmStatus();
}

function parseJson(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("模型没有返回 JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function askModel(userPrompt, { timeout = 90000, temperature = 0.4, system } = {}) {
  const status = llmStatus();
  if (!status.configured) {
    throw Object.assign(new Error("还没有配置模型。打开设置，填入兼容 OpenAI 的接口、模型和密钥。未配置时不会用模板内容冒充生成。"), { status: 400 });
  }
  const response = await fetch(`${status.base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${get("llm_key")}`,
    },
    body: JSON.stringify({
      model: status.model,
      temperature,
      messages: [
        {
          role: "system",
          content: system || "你是产品团队的编译器。只返回一个 JSON 对象，不要 Markdown。文案必须来自用户需求，禁止套用示例里的店名、价格和句子。",
        },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeout),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || payload.message || `模型接口返回 ${response.status}`;
    throw Object.assign(new Error(message), { status: 502 });
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error("模型没有返回内容"), { status: 502 });
  try {
    return parseJson(content);
  } catch (error) {
    throw Object.assign(new Error(`模型返回无法解析：${error.message}`), { status: 502 });
  }
}

export async function pingModel() {
  const started = Date.now();
  const raw = await askModel('连接测试。只返回 JSON：{"ok":true}', { timeout: 20000, temperature: 0 });
  return { ok: raw?.ok === true, latency: Date.now() - started };
}
