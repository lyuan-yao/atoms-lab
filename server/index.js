import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  createSession,
  cryptoRandom,
  db,
  grantPlan,
  hashPassword,
  mePayload,
  spendCredits,
  userFromToken,
  verifyPassword,
  withTx,
} from "./db.js";
import { EXAMPLES } from "./spec.js";
import { COSTS, createRun, createRunStages, iterateRun, iterateRunStages, extractEditableText } from "./pipeline.js";
import { askModel, llmStatus, pingModel, saveLlm } from "./llm.js";
import { sendMail, makeCode, hashCode } from "./smtp.js";
import { patchLegacyArtwork } from "./migrate.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const PORT = Number(process.env.PORT || 4173);
const PLAN_GRANTS = { pro: 400, max: 1200 };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) continue;
    out[key] = decodeURIComponent(rest.join("="));
  }
  return out;
}

function sessionCookie(token) {
  return `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
}

function readBody(req, limit = 3_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("内容太大了"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("请求格式不正确"), { status: 400 });
  }
}

function requireUser(req) {
  if (!req.user) throw Object.assign(new Error("请先登录"), { status: 401 });
  return req.user;
}

function ownProject(userId, projectId) {
  const project = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!project) throw Object.assign(new Error("找不到这个项目"), { status: 404 });
  return project;
}

function ownVersion(userId, versionId) {
  const version = db
    .prepare(
      `SELECT v.*, p.user_id FROM versions v
       JOIN projects p ON p.id = v.project_id
       WHERE v.id = ? AND p.user_id = ?`,
    )
    .get(versionId, userId);
  if (!version) throw Object.assign(new Error("找不到这个版本"), { status: 404 });
  return version;
}

function listProjects(userId) {
  return db
    .prepare(
      `SELECT p.id, p.name, p.kind, p.status, p.prompt, p.updated_at AS updatedAt,
              p.current_version_id AS currentVersionId, pub.slug
       FROM projects p
       LEFT JOIN publications pub ON pub.project_id = p.id
       WHERE p.user_id = ?
       ORDER BY p.updated_at DESC`,
    )
    .all(userId);
}

function projectPayload(projectId) {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  const messages = db
    .prepare("SELECT id, role, agent, title, body, created_at AS createdAt FROM messages WHERE project_id = ? ORDER BY created_at ASC, rowid ASC")
    .all(projectId);
  const versions = db
    .prepare("SELECT id, label, html, kind, created_at AS createdAt FROM versions WHERE project_id = ? ORDER BY created_at ASC, rowid ASC")
    .all(projectId);
  const publication = db.prepare("SELECT pub.slug, pub.title, pub.version_id AS versionId, pub.views, pub.updated_at AS updatedAt, COALESCE(pf.likes, 0) AS likes FROM publications pub LEFT JOIN pub_feedback pf ON pf.slug = pub.slug WHERE pub.project_id = ?").get(projectId);
  if (publication) {
    publication.week = weekViews(publication.slug);
    publication.comments = db.prepare("SELECT COUNT(*) AS n FROM pub_comments WHERE slug = ?").get(publication.slug).n;
    const check = db.prepare("SELECT title, body FROM messages WHERE project_id = ? AND role = 'check' ORDER BY created_at DESC LIMIT 1").get(projectId);
    if (check) {
      const total = (check.body.match(/^[✓✗]/gm) || []).length;
      const passed = (check.body.match(/^✓/gm) || []).length;
      if (total) publication.health = { score: Math.round((passed / total) * 100), passed, total };
    }
  }
  return {
    project: {
      id: project.id,
      name: project.name,
      prompt: project.prompt,
      kind: project.kind,
      status: project.status,
      currentVersionId: project.current_version_id,
      spec: JSON.parse(project.spec_json),
      updatedAt: project.updated_at,
    },
    messages,
    versions,
    publication,
  };
}

function weekViews(slug) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`);
  }
  const rows = db.prepare(`SELECT day, count FROM pub_views WHERE slug = ? AND day >= ?`).all(slug, days[0]);
  const map = new Map(rows.map((row) => [row.day, row.count]));
  return days.map((day) => ({ day, count: map.get(day) || 0 }));
}

function insertMessage(projectId, message, createdAt) {
  const id = cryptoRandom();
  db.prepare("INSERT INTO messages (id, project_id, role, agent, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id,
    projectId,
    message.role,
    message.agent || null,
    message.title || null,
    message.body,
    createdAt,
  );
  return id;
}

async function persistRun({ user, prompt, contest, previousProject, run }) {
  const cost = previousProject ? COSTS.iterate : run.cost;
  const reason = previousProject ? "继续修改" : run.reason;
  return withTx(() => {
    spendCredits(user.id, cost, reason);
    const now = Date.now();
    const projectId = previousProject ? previousProject.id : cryptoRandom();
    const spec = run.spec;
    if (!previousProject) {
      db.prepare(
        `INSERT INTO projects (id, user_id, name, prompt, spec_json, kind, status, current_version_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ready', NULL, ?, ?)`,
      ).run(projectId, user.id, spec.brand, spec.prompt, JSON.stringify(spec), spec.kind, now, now);
    } else {
      db.prepare("UPDATE projects SET name = ?, prompt = ?, spec_json = ?, kind = ?, updated_at = ? WHERE id = ?").run(
        spec.brand,
        spec.prompt,
        JSON.stringify(spec),
        spec.kind,
        now,
        projectId,
      );
    }
    const before = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE project_id = ?").get(projectId).n;
    insertMessage(projectId, { role: "user", body: previousProject ? prompt : spec.prompt }, now);
    run.atoms.forEach((atom, index) => insertMessage(projectId, atom, now + index + 1));
    const versionIds = run.versions.map((version, index) => {
      const id = cryptoRandom();
      db.prepare("INSERT INTO versions (id, project_id, label, html, spec_json, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        id,
        projectId,
        version.label,
        version.html,
        JSON.stringify(spec),
        spec.kind,
        now + 100 + index,
      );
      return id;
    });
    const current = run.versions.length === 1 ? versionIds[0] : null;
    db.prepare("UPDATE projects SET current_version_id = ?, updated_at = ? WHERE id = ?").run(current, now + 200, projectId);
    return { projectId, animateFrom: before, user: mePayload(user.id) };
  });
}

async function saveRun({ user, prompt, contest, previousProject }) {
  const run = previousProject ? await iterateRun(JSON.parse(previousProject.spec_json), currentHtml(previousProject), prompt) : await createRun(prompt, { contest });
  return persistRun({ user, prompt, contest, previousProject, run });
}

function sseInit(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  return (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

async function handleStream(req, res, pathname) {
  if (req.method !== "POST" || pathname !== "/api/generate/stream") return false;
  const user = requireUser(req);
  const body = await readJson(req);
  const emit = sseInit(res);
  try {
    let run;
    let prompt;
    let previousProject = null;
    if (body.projectId) {
      previousProject = ownProject(user.id, String(body.projectId));
      prompt = String(body.content || "").trim();
      if (prompt.length < 2 || prompt.length > 2000) throw Object.assign(new Error("再说具体一点，团队才知道改哪里"), { status: 400 });
      emit("stage", { agents: [], status: "working", text: "团队收到了新的修改要求。" });
      run = await iterateRunStages(JSON.parse(previousProject.spec_json), currentHtml(previousProject), prompt, { emit });
    } else {
      prompt = String(body.prompt || "").trim();
      if (prompt.length < 4 || prompt.length > 2000) throw Object.assign(new Error("请用至少 4 个字描述你想做的产品"), { status: 400 });
      run = await createRunStages(prompt, { contest: Boolean(body.contest), emit });
    }
    const saved = await persistRun({ user, prompt, contest: Boolean(body.contest), previousProject, run });
    const payload = projectPayload(saved.projectId);
    emit("done", {
      projectId: saved.projectId,
      animateFrom: saved.animateFrom,
      user: saved.user,
      project: payload.project,
      messages: payload.messages,
      versions: payload.versions,
      publication: payload.publication,
      changes: run.changes || [],
    });
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    emit("error", { message: status === 500 ? "服务器出错了，这次生成没有扣积分" : error.message });
  }
  res.end();
  return true;
}

function currentHtml(project) {
  if (!project.current_version_id) {
    const latest = db.prepare("SELECT html FROM versions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").get(project.id);
    return latest?.html || "";
  }
  const version = db.prepare("SELECT html FROM versions WHERE id = ?").get(project.current_version_id);
  return version?.html || "";
}

function fileFor(pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = path.normalize(path.join(publicDir, rel));
  if (!full.startsWith(publicDir)) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  req.user = userFromToken(cookies(req).sid);

  if (await handleStream(req, res, pathname)) return;

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/p/")) {
    const slug = pathname.slice(3);
    const row = db.prepare("SELECT v.html, pub.slug, pub.title, p.spec_json FROM publications pub JOIN versions v ON v.id = pub.version_id JOIN projects p ON p.id = pub.project_id WHERE pub.slug = ?").get(slug);
    if (!row) {
      send(res, 404, `<!doctype html><meta charset="utf-8"><title>未发布</title><body style="font-family:sans-serif;padding:48px"><h1>这个链接还没有页面</h1><p><a href="/">回到 Atoms Lab</a></p></body>`, {
        "content-type": "text/html; charset=utf-8",
      });
      return;
    }
    let seo = {};
    try { seo = JSON.parse(row.spec_json || "{}")?.seo || {}; } catch {}
    const host = req.headers.host || "47.107.164.7:4173";
    const og = `<meta property="og:title" content="${String(seo.title || row.title || "Atoms Lab 应用").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]))}" />\n<meta property="og:description" content="${String(seo.description || "由 Atoms Lab 八位智能体真实编译").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]))}" />\n<meta property="og:url" content="http://${host}/p/${slug}" />\n<meta property="og:type" content="website" />\n`;
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    withTx(() => {
      db.prepare("UPDATE publications SET views = views + 1, last_viewed_at = ? WHERE slug = ?").run(Date.now(), slug);
      db.prepare(
        "INSERT INTO pub_views (slug, day, count) VALUES (?, ?, 1) ON CONFLICT(slug, day) DO UPDATE SET count = count + 1",
      ).run(slug, day);
    });
    const likes = db.prepare("SELECT likes FROM pub_feedback WHERE slug = ?").get(slug)?.likes || 0;
    const comments = db.prepare("SELECT COUNT(*) AS n FROM pub_comments WHERE slug = ?").get(slug).n;
    const bar = `<div style="position:fixed;right:14px;bottom:14px;z-index:2147483000;font-family:system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;display:flex;flex-direction:column;align-items:end;gap:8px"><div id="atoms-comments" hidden style="width:min(300px,calc(100vw - 32px));max-height:300px;overflow:auto;background:rgba(18,20,26,.96);color:#fff;border-radius:16px;padding:12px;box-shadow:0 12px 36px rgba(0,0,0,.3)"><div id="atoms-comment-list" style="display:grid;gap:8px;font-size:13px"></div><div style="display:flex;gap:6px;margin-top:10px"><input id="atoms-comment-input" placeholder="留下你的反馈…" maxlength="120" style="flex:1;min-width:0;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:8px 10px;font-size:13px;outline:none"/><button id="atoms-comment-send" style="border:0;background:#4f5af0;color:#fff;border-radius:10px;padding:8px 12px;font-size:13px;cursor:pointer">发送</button></div></div><div style="display:flex;gap:8px"><button id="atoms-comment-btn" style="display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.14);background:rgba(18,20,26,.9);color:#fff;border-radius:999px;padding:9px 15px;font-size:13px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.22)"><span>💬</span><span>留言</span><b style="font-weight:600">${comments}</b></button><button id="atoms-like" style="display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.14);background:rgba(18,20,26,.9);color:#fff;border-radius:999px;padding:9px 15px;font-size:13px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.22)"><span>👍</span><span>有用</span><b id="atoms-like-n" style="font-weight:600">${likes}</b></button></div></div><script>(function(){var s=${JSON.stringify(slug)};var key="atoms-liked:"+s;var btn=document.getElementById("atoms-like");var n=document.getElementById("atoms-like-n");if(localStorage.getItem(key)){btn.querySelectorAll("span")[1].textContent="已赞";btn.style.opacity=".72";}btn.addEventListener("click",function(){if(localStorage.getItem(key))return;fetch("/api/pub/"+s+"/like",{method:"POST"}).then(function(r){return r.json();}).then(function(d){n.textContent=d.likes;localStorage.setItem(key,"1");btn.querySelectorAll("span")[1].textContent="已赞";btn.style.opacity=".72";}).catch(function(){});});var cbtn=document.getElementById("atoms-comment-btn");var panel=document.getElementById("atoms-comments");var list=document.getElementById("atoms-comment-list");var input=document.getElementById("atoms-comment-input");function render(rows){list.textContent="";if(!rows.length){var empty=document.createElement("div");empty.style.cssText="opacity:.6;font-size:12px";empty.textContent="还没有留言，来抢第一条";list.appendChild(empty);return;}rows.forEach(function(r){var item=document.createElement("div");item.style.cssText="border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px";var time=document.createElement("div");time.style.cssText="opacity:.55;font-size:11px";time.textContent=new Date(r.createdAt).toLocaleString();var body=document.createElement("div");body.style.cssText="margin-top:2px;word-break:break-word";body.textContent=r.body;item.appendChild(time);item.appendChild(body);list.appendChild(item);});}function load(){fetch("/api/pub/"+s+"/comments").then(function(r){return r.json();}).then(function(d){render(d.comments||[]);}).catch(function(){});}cbtn.addEventListener("click",function(){panel.hidden=!panel.hidden;if(!panel.hidden)load();});document.getElementById("atoms-comment-send").addEventListener("click",function(){var t=input.value.trim();if(t.length<2)return;fetch("/api/pub/"+s+"/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t})}).then(function(r){return r.json();}).then(function(d){input.value="";render(d.comments||[]);cbtn.querySelector("b").textContent=(d.comments||[]).length;}).catch(function(){});});})();<\/script>`;
    const html = row.html.includes("</head>") ? row.html.replace("</head>", `${og}</head>`) : og + row.html;
    const withBar = html.includes("</body>") ? html.replace("</body>", `${bar}</body>`) : html + bar;
    send(res, 200, withBar, { "content-type": "text/html; charset=utf-8" });
    return;
  }

  const asset = fileFor(pathname);
  if (asset && pathname !== "/") {
    const ext = path.extname(asset);
    const stat = fs.statSync(asset);
    const etag = `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
    if (req.headers["if-none-match"] === etag) {
      send(res, 304, "", { etag });
      return;
    }
    send(res, 200, fs.readFileSync(asset), {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-cache",
      etag,
    });
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "不支持这个操作" });
    return;
  }
  send(res, 200, fs.readFileSync(path.join(publicDir, "index.html")), {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache",
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && pathname === "/api/settings") {
    sendJson(res, 200, llmStatus());
    return;
  }
  if (req.method === "POST" && pathname === "/api/settings") {
    requireUser(req);
    const body = await readJson(req);
    sendJson(res, 200, saveLlm(body));
    return;
  }
  if (req.method === "POST" && pathname === "/api/settings/test") {
    requireUser(req);
    await readBody(req);
    try {
      const result = await pingModel();
      sendJson(res, 200, { ok: true, latency: result.latency, message: `连接正常，模型回应耗时 ${result.latency}ms` });
    } catch (error) {
      sendJson(res, 200, { ok: false, message: error.message });
    }
    return;
  }
  const commentMatch = pathname.match(/^\/api\/pub\/([a-z0-9-]+)\/comments$/);
  if (commentMatch && req.method === "GET") {
    const rows = db.prepare("SELECT id, body, created_at AS createdAt FROM pub_comments WHERE slug = ? ORDER BY created_at DESC LIMIT 20").all(commentMatch[1]);
    sendJson(res, 200, { comments: rows });
    return;
  }
  if (commentMatch && req.method === "POST") {
    const body = await readJson(req);
    const text = String(body.text || "").trim().slice(0, 120);
    if (text.length < 2) throw Object.assign(new Error("留言至少 2 个字"), { status: 400 });
    if (!db.prepare("SELECT slug FROM publications WHERE slug = ?").get(commentMatch[1])) throw Object.assign(new Error("没有这个发布页"), { status: 404 });
    const id = cryptoRandom();
    db.prepare("INSERT INTO pub_comments (id, slug, body, created_at) VALUES (?, ?, ?, ?)").run(id, commentMatch[1], text, Date.now());
    const rows = db.prepare("SELECT id, body, created_at AS createdAt FROM pub_comments WHERE slug = ? ORDER BY created_at DESC LIMIT 20").all(commentMatch[1]);
    sendJson(res, 201, { ok: true, comments: rows });
    return;
  }
  const likeMatch = pathname.match(/^\/api\/pub\/([a-z0-9-]+)\/like$/);
  if (likeMatch && req.method === "POST") {
    await readBody(req);
    const pub = db.prepare("SELECT slug FROM publications WHERE slug = ?").get(likeMatch[1]);
    if (!pub) throw Object.assign(new Error("没有这个发布页"), { status: 404 });
    withTx(() => {
      db.prepare("INSERT INTO pub_feedback (slug, likes) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET likes = likes + 1").run(pub.slug);
    });
    const likes = db.prepare("SELECT likes FROM pub_feedback WHERE slug = ?").get(pub.slug).likes;
    sendJson(res, 200, { ok: true, likes });
    return;
  }
  if (req.method === "GET" && pathname === "/api/explore") {
    const rows = db
      .prepare(
        `SELECT pub.slug, pub.title, pub.views, pub.updated_at AS updatedAt,
                p.name, p.kind, p.prompt, COALESCE(pf.likes, 0) AS likes
         FROM publications pub
         JOIN projects p ON p.id = pub.project_id
         JOIN versions v ON v.id = pub.version_id
         LEFT JOIN pub_feedback pf ON pf.slug = pub.slug
         ORDER BY pub.updated_at DESC
         LIMIT 24`,
      )
      .all();
    sendJson(res, 200, {
      apps: rows.map((row) => {
        const check = db.prepare("SELECT body FROM messages m JOIN projects p ON p.id = m.project_id WHERE p.current_version_id IS NOT NULL AND m.role = 'check' AND m.project_id = (SELECT project_id FROM publications WHERE slug = ?) ORDER BY m.created_at DESC LIMIT 1").get(row.slug);
        let health = null;
        if (check) {
          const total = (check.body.match(/^[✓✗]/gm) || []).length;
          const passed = (check.body.match(/^✓/gm) || []).length;
          if (total) health = Math.round((passed / total) * 100);
        }
        const comments = db.prepare("SELECT COUNT(*) AS n FROM pub_comments WHERE slug = ?").get(row.slug).n;
        return {
          slug: row.slug,
          title: row.title,
          name: row.name,
          kind: row.kind,
          prompt: row.prompt,
          views: row.views,
          likes: row.likes,
          health,
          comments,
          updatedAt: row.updated_at,
          url: `/p/${row.slug}`,
        };
      }),
    });
    return;
  }
  if (req.method === "GET" && pathname === "/api/examples") {
    sendJson(res, 200, { examples: EXAMPLES.map(({ key, title, prompt }) => ({ key, title, prompt })) });
    return;
  }
  const examplePreview = pathname.match(/^\/api\/examples\/([a-z0-9-]+)\/preview$/);
  if (req.method === "GET" && examplePreview) {
    const example = EXAMPLES.find((item) => item.key === examplePreview[1]);
    if (!example) throw Object.assign(new Error("没有这个示例"), { status: 404 });
    if (!llmStatus().configured) {
      send(res, 200, `<!doctype html><meta charset="utf-8"><title>需要模型</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:Segoe UI,sans-serif;background:#f6f6f6;color:#141820"><main style="max-width:440px;padding:32px"><h1 style="font-size:28px;letter-spacing:-.04em">这个预览还没有真实内容</h1><p style="color:#5d6878;line-height:1.6">先在设置里保存模型接口。未配置时不会展示模板页面。</p><p><a href="/settings" target="_top">去设置</a></p></main></body>`, { "content-type": "text/html; charset=utf-8" });
      return;
    }
    const cached = db.prepare("SELECT html FROM example_cache WHERE key = ?").get(example.key);
    if (cached) {
      send(res, 200, cached.html, { "content-type": "text/html; charset=utf-8" });
      return;
    }
    const run = await createRun(example.prompt, { attempts: 3 });
    db.prepare("INSERT INTO example_cache (key, html, created_at) VALUES (?, ?, ?)").run(example.key, run.versions[0].html, Date.now());
    send(res, 200, run.versions[0].html, { "content-type": "text/html; charset=utf-8" });
    return;
  }
  if (req.method === "GET" && pathname === "/api/me") {
    if (!req.user) {
      sendJson(res, 200, { user: null });
      return;
    }
    sendJson(res, 200, { user: mePayload(req.user.id) });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/register") {
    const body = await readJson(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const code = String(body.code || "").trim();
    if (name.length < 1 || name.length > 32) throw Object.assign(new Error("请填写 1 到 32 字的名字"), { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("邮箱格式不正确"), { status: 400 });
    if (password.length < 6 || password.length > 72) throw Object.assign(new Error("密码至少 6 位"), { status: 400 });
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) throw Object.assign(new Error("这个邮箱已经注册过了"), { status: 400 });
    const record = db.prepare("SELECT * FROM email_codes WHERE email = ?").get(email);
    if (!record) throw Object.assign(new Error("请先获取邮箱验证码"), { status: 400 });
    if (record.expires_at < Date.now()) throw Object.assign(new Error("验证码已过期，请重新获取"), { status: 400 });
    if (record.attempts >= 5) throw Object.assign(new Error("尝试次数过多，请重新获取验证码"), { status: 429 });
    if (record.code_hash !== hashCode(email, code)) {
      db.prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
      throw Object.assign(new Error("验证码不正确"), { status: 400 });
    }
    db.prepare("DELETE FROM email_codes WHERE email = ?").run(email);
    const id = cryptoRandom();
    const now = Date.now();
    withTx(() => {
      db.prepare("INSERT INTO users (id, email, name, password_hash, plan, credits, grants, created_at) VALUES (?, ?, ?, ?, 'free', 120, '', ?)").run(id, email, name, hashPassword(password), now);
      db.prepare("INSERT INTO ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, 120, '注册赠送', ?)").run(cryptoRandom(), id, now);
    });
    const token = createSession(id);
    send(res, 201, JSON.stringify({ user: mePayload(id) }), {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": sessionCookie(token),
    });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/request-code") {
    const body = await readJson(req).catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("邮箱格式不正确"), { status: 400 });
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) throw Object.assign(new Error("这个邮箱已经注册过了，直接登录即可"), { status: 400 });
    const previous = db.prepare("SELECT last_sent_at FROM email_codes WHERE email = ?").get(email);
    if (previous && Date.now() - previous.last_sent_at < 60_000) {
      const wait = Math.ceil((60_000 - (Date.now() - previous.last_sent_at)) / 1000);
      throw Object.assign(new Error(`发送太频繁，${wait} 秒后再试`), { status: 429 });
    }
    const code = makeCode();
    const now = Date.now();
    db.prepare(
      "INSERT INTO email_codes (email, code_hash, expires_at, attempts, last_sent_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, last_sent_at = excluded.last_sent_at",
    ).run(email, hashCode(email, code), now + 10 * 60_000, now);
    const smtp = {
      host: process.env.ATOMS_SMTP_HOST || "",
      port: process.env.ATOMS_SMTP_PORT || "",
      user: process.env.ATOMS_SMTP_USER || "",
      pass: process.env.ATOMS_SMTP_PASS || "",
      from: process.env.ATOMS_SMTP_FROM || "",
    };
    if (smtp.host && smtp.user && smtp.pass && smtp.from) {
      try {
        await sendMail({
          host: smtp.host,
          port: smtp.port,
          user: smtp.user,
          pass: smtp.pass,
          from: smtp.from,
          to: email,
          subject: `Atoms Lab 验证码：${code}`,
          text: `你的 Atoms Lab 注册验证码是 ${code}，10 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
        });
        sendJson(res, 200, { ok: true, channel: "email", message: `验证码已发送到 ${email}，10 分钟内有效` });
      } catch (error) {
        db.prepare("DELETE FROM email_codes WHERE email = ?").run(email);
        throw Object.assign(new Error(`验证码邮件发送失败：${error.message}`), { status: 502 });
      }
      return;
    }
    sendJson(res, 200, { ok: true, channel: "demo", devCode: code, message: "邮件服务未配置：本机演示通道显示验证码，10 分钟内有效" });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !verifyPassword(password, user.password_hash)) throw Object.assign(new Error("邮箱或密码不正确"), { status: 400 });
    const token = createSession(user.id);
    send(res, 200, JSON.stringify({ user: mePayload(user.id) }), {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": sessionCookie(token),
    });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/guest") {
    const id = cryptoRandom();
    const now = Date.now();
    const email = `guest_${id.slice(0, 8)}@lab.local`;
    withTx(() => {
      db.prepare("INSERT INTO users (id, email, name, password_hash, plan, credits, grants, created_at) VALUES (?, ?, '访客', ?, 'free', 120, '', ?)").run(id, email, hashPassword(randomBytes(12).toString("hex")), now);
      db.prepare("INSERT INTO ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, 120, '访客赠送', ?)").run(cryptoRandom(), id, now);
    });
    const token = createSession(id);
    send(res, 201, JSON.stringify({ user: mePayload(id) }), {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": sessionCookie(token),
    });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/logout") {
    await readBody(req);
    const token = cookies(req).sid;
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    send(res, 200, JSON.stringify({ ok: true }), {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    });
    return;
  }
  if (req.method === "POST" && pathname === "/api/billing/plan") {
    const user = requireUser(req);
    const body = await readJson(req);
    const plan = body.plan === "max" ? "max" : body.plan === "pro" ? "pro" : null;
    if (!plan) throw Object.assign(new Error("请选择 Pro 或 Max"), { status: 400 });
    grantPlan(user.id, plan, PLAN_GRANTS[plan]);
    sendJson(res, 200, { user: mePayload(user.id) });
    return;
  }
  if (req.method === "GET" && pathname === "/api/projects") {
    const user = requireUser(req);
    sendJson(res, 200, { projects: listProjects(user.id) });
    return;
  }
  if (req.method === "POST" && pathname === "/api/projects") {
    const user = requireUser(req);
    const body = await readJson(req);
    const prompt = String(body.prompt || "").trim();
    if (prompt.length < 4 || prompt.length > 2000) throw Object.assign(new Error("请用至少 4 个字描述你想做的产品"), { status: 400 });
    const saved = await saveRun({ user, prompt, contest: Boolean(body.contest) });
    sendJson(res, 201, { ...projectPayload(saved.projectId), animateFrom: saved.animateFrom, user: saved.user });
    return;
  }
  const projectMatch = pathname.match(/^\/api\/projects\/([a-f0-9]+)$/);
  if (projectMatch && req.method === "GET") {
    const user = requireUser(req);
    ownProject(user.id, projectMatch[1]);
    sendJson(res, 200, projectPayload(projectMatch[1]));
    return;
  }
  if (projectMatch && req.method === "PATCH") {
    const user = requireUser(req);
    ownProject(user.id, projectMatch[1]);
    const body = await readJson(req);
    const name = String(body.name || "").trim();
    if (name.length < 1 || name.length > 32) throw Object.assign(new Error("名字请控制在 32 字以内"), { status: 400 });
    db.prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?").run(name, Date.now(), projectMatch[1]);
    sendJson(res, 200, { ok: true, name });
    return;
  }
  if (projectMatch && req.method === "DELETE") {
    const user = requireUser(req);
    ownProject(user.id, projectMatch[1]);
    withTx(() => {
      db.prepare("DELETE FROM publications WHERE project_id = ?").run(projectMatch[1]);
      db.prepare("DELETE FROM messages WHERE project_id = ?").run(projectMatch[1]);
      db.prepare("DELETE FROM versions WHERE project_id = ?").run(projectMatch[1]);
      db.prepare("DELETE FROM projects WHERE id = ?").run(projectMatch[1]);
    });
    sendJson(res, 200, { ok: true });
    return;
  }
  const messageMatch = pathname.match(/^\/api\/projects\/([a-f0-9]+)\/messages$/);
  if (messageMatch && req.method === "POST") {
    const user = requireUser(req);
    const project = ownProject(user.id, messageMatch[1]);
    const body = await readJson(req);
    const content = String(body.content || "").trim();
    if (content.length < 2 || content.length > 2000) throw Object.assign(new Error("再说具体一点，团队才知道改哪里"), { status: 400 });
    const saved = await saveRun({ user, prompt: content, previousProject: project });
    sendJson(res, 200, { ...projectPayload(saved.projectId), animateFrom: saved.animateFrom, user: saved.user });
    return;
  }
  const selfcheckMatch = pathname.match(/^\/api\/projects\/([a-f0-9]+)\/selfcheck$/);
  if (selfcheckMatch && req.method === "POST") {
    const user = requireUser(req);
    const project = ownProject(user.id, selfcheckMatch[1]);
    const body = await readJson(req);
    const rows = Array.isArray(body.details) ? body.details.slice(0, 24) : [];
    const clean = rows
      .map((row) => ({ label: String(row?.label || "").trim().slice(0, 24), ok: Boolean(row?.ok) }))
      .filter((row) => row.label);
    if (!clean.length) throw Object.assign(new Error("自检没有覆盖任何交互"), { status: 400 });
    const passed = clean.filter((row) => row.ok).length;
    const id = cryptoRandom();
    const now = Date.now();
    const title = `交互自检 ${passed}/${clean.length} 通过`;
    const lines = clean.map((row) => `${row.ok ? "✓" : "✗"} ${row.label}`).join("\n");
    db.prepare("INSERT INTO messages (id, project_id, role, agent, title, body, created_at) VALUES (?, ?, 'check', NULL, ?, ?, ?)").run(id, project.id, title, lines, now);
    sendJson(res, 201, { ok: true, message: { id, role: "check", agent: null, title, body: lines, createdAt: now } });
    return;
  }
  const currentMatch = pathname.match(/^\/api\/projects\/([a-f0-9]+)\/current$/);
  if (currentMatch && req.method === "POST") {
    const user = requireUser(req);
    ownProject(user.id, currentMatch[1]);
    const body = await readJson(req);
    const version = db.prepare("SELECT id FROM versions WHERE id = ? AND project_id = ?").get(body.versionId, currentMatch[1]);
    if (!version) throw Object.assign(new Error("这个方案不属于当前项目"), { status: 404 });
    db.prepare("UPDATE projects SET current_version_id = ?, status = 'ready', updated_at = ? WHERE id = ?").run(version.id, Date.now(), currentMatch[1]);
    sendJson(res, 200, projectPayload(currentMatch[1]));
    return;
  }
  const publishMatch = pathname.match(/^\/api\/projects\/([a-f0-9]+)\/publish$/);
  if (publishMatch && req.method === "POST") {
    await readBody(req);
    const user = requireUser(req);
    const project = ownProject(user.id, publishMatch[1]);
    if (!project.current_version_id) throw Object.assign(new Error("先选定一个方案，再发布"), { status: 400 });
    const spec = JSON.parse(project.spec_json);
    const existing = db.prepare("SELECT slug FROM publications WHERE project_id = ?").get(project.id);
    const slug = existing?.slug || `${spec.storageKey}-${randomBytes(2).toString("hex")}`;
    const now = Date.now();
    if (existing) {
      db.prepare("UPDATE publications SET version_id = ?, title = ?, updated_at = ? WHERE project_id = ?").run(project.current_version_id, spec.seo.title, now, project.id);
    } else {
      db.prepare("INSERT INTO publications (slug, project_id, version_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(slug, project.id, project.current_version_id, spec.seo.title, now, now);
    }
    db.prepare("UPDATE projects SET status = 'published', updated_at = ? WHERE id = ?").run(now, project.id);
    sendJson(res, 200, projectPayload(project.id));
    return;
  }
  const previewMatch = pathname.match(/^\/api\/versions\/([a-f0-9]+)\/preview$/);
  if (previewMatch && req.method === "GET") {
    const user = requireUser(req);
    const version = ownVersion(user.id, previewMatch[1]);
    send(res, 200, version.html, { "content-type": "text/html; charset=utf-8" });
    return;
  }
  const forkMatch = pathname.match(/^\/api\/versions\/([a-f0-9]+)\/fork$/);
  if (forkMatch && req.method === "POST") {
    await readBody(req);
    const user = requireUser(req);
    const version = ownVersion(user.id, forkMatch[1]);
    const id = cryptoRandom();
    const now = Date.now();
    db.prepare("INSERT INTO versions (id, project_id, label, html, spec_json, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id,
      version.project_id,
      `${version.label} · 手动修订`,
      version.html,
      version.spec_json,
      version.kind,
      now,
    );
    db.prepare("UPDATE projects SET current_version_id = ?, updated_at = ? WHERE id = ?").run(id, now, version.project_id);
    sendJson(res, 201, { id, label: `${version.label} · 手动修订`, html: version.html, kind: version.kind, createdAt: now });
    return;
  }
  const versionMatch = pathname.match(/^\/api\/versions\/([a-f0-9]+)$/);
  if (versionMatch && req.method === "PATCH") {
    const user = requireUser(req);
    ownVersion(user.id, versionMatch[1]);
    const body = await readJson(req);
    const html = String(body.html || "");
    if (!html.includes("<html") || html.length > 2_500_000) throw Object.assign(new Error("这一版页面不完整，没有写入"), { status: 400 });
    db.prepare("UPDATE versions SET html = ? WHERE id = ?").run(html, versionMatch[1]);
    sendJson(res, 200, { ok: true });
    return;
  }
  const refineMatch = pathname.match(/^\/api\/versions\/([a-f0-9]+)\/refine$/);
  if (refineMatch && req.method === "POST") {
    const user = requireUser(req);
    const version = ownVersion(user.id, refineMatch[1]);
    const body = await readJson(req);
    const eid = String(body.eid || "");
    const instruction = String(body.instruction || "").trim();
    if (!/^e\d+$/.test(eid)) throw Object.assign(new Error("没有找到这个元素"), { status: 400 });
    if (instruction.length < 2 || instruction.length > 200) throw Object.assign(new Error("请说清楚要怎么改这句"), { status: 400 });
    const pattern = new RegExp(`(<(h1|h2|h3|p|button|a)\\b[^>]*\\bdata-eid="${eid}"[^>]*>)([\\s\\S]*?)(</\\2>)`);
    const match = version.html.match(pattern);
    if (!match) throw Object.assign(new Error("这个元素不在当前版本里"), { status: 404 });
    const inner = match[3];
    if (inner.includes("<")) throw Object.assign(new Error("这个元素里有子结构，请用「编辑文字」手动修改"), { status: 400 });
    const before = inner.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    if (!before) throw Object.assign(new Error("这个元素没有文字"), { status: 400 });
    const result = await askModel(
      `你是界面文案编辑。只返回 JSON {"text": "..."}。
当前这句界面文字：「${before}」
修改要求：${instruction}
要求：保持原意可以微调，长度不超过 ${Math.max(12, before.length + 20)} 字，不要加引号、句号以外的标点堆叠，不要输出解释。`,
      { timeout: 30000, temperature: 0.6, system: "你只输出一个 JSON 对象。" },
    );
    const next = String(result?.text || "").trim();
    if (!next || next.length > 160 || /[<>]/.test(next)) throw Object.assign(new Error("模型没有给出可用的改写"), { status: 502 });
    const html = version.html.replace(pattern, `$1${next.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]))}$4`);
    db.prepare("UPDATE versions SET html = ? WHERE id = ?").run(html, version.id);
    sendJson(res, 200, { ok: true, eid, before, after: next, html });
    return;
  }
  sendJson(res, 404, { error: "没有这个接口" });
}

const server = http.createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (error) {
    const status = error.status || 500;
    const message = status === 500 ? "服务器出错了" : error.message;
    if (status === 500) console.error(error);
    if (!res.headersSent) sendJson(res, status, { error: message });
  }
});

for (const [envKey, setting] of [["ATOMS_LLM_BASE", "llm_base"], ["ATOMS_LLM_MODEL", "llm_model"], ["ATOMS_LLM_KEY", "llm_key"]]) {
  if (process.env[envKey]) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(setting, process.env[envKey]);
  }
}

try {
  const patched = patchLegacyArtwork();
  if (patched) console.log(`已为 ${patched} 个旧页面就地补上生成式配图`);
} catch (error) {
  console.error("旧页面配图迁移失败（不影响启动）:", error.message);
}

server.listen(PORT, () => {
  console.log(`Atoms Lab http://localhost:${PORT} · 模型${llmStatus().configured ? "已配置" : "未配置"}`);
});
