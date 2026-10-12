import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";

// Minimal zero-dependency SMTP client: implicit TLS on 465, STARTTLS on 587/25.
// Just enough for verification-code mail via QQ/163/enterprise SMTP relays.

function makeReader(socket) {
  let buffer = "";
  const waiters = [];
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const waiter = waiters[i];
      const match = buffer.match(/(?:^|\r\n)(\d{3})([ -])(([^\r\n]*))\r\n/);
      if (match && (match[2] === " " || buffer.length > 4096)) {
        waiters.splice(i, 1);
        const consumed = match.index + match[0].length;
        buffer = buffer.slice(consumed);
        waiter.resolve({ code: Number(match[1]), more: match[2] === "-", line: match[3], text: buffer });
      }
    }
  });
  return () => new Promise((resolve, reject) => {
    const match = buffer.match(/(?:^|\r\n)(\d{3})([ -])(([^\r\n]*))\r\n/);
    if (match) {
      buffer = buffer.slice(match.index + match[0].length);
      resolve({ code: Number(match[1]), more: match[2] === "-", line: match[3] });
      return;
    }
    const timer = setTimeout(() => reject(new Error("SMTP 响应超时")), 20000);
    waiters.push({
      resolve: (reply) => { clearTimeout(timer); resolve(reply); },
    });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    socket.once("close", () => { clearTimeout(timer); reject(new Error("SMTP 连接被关闭")); });
  });
}

export async function sendMail({ host, port, user, pass, from, to, subject, text }) {
  const implicit = Number(port) === 465;
  const socket = implicit
    ? tls.connect({ host, port: Number(port) || 465, servername: host })
    : net.connect({ host, port: Number(port) || 587 });
  socket.setTimeout(25000);
  await new Promise((resolve, reject) => {
    socket.once(implicit ? "secureConnect" : "connect", resolve);
    socket.once("error", reject);
  });
  const read = makeReader(socket);
  const send = (line) => new Promise((resolve, reject) => {
    socket.write(`${line}\r\n`, "utf8", (error) => (error ? reject(error) : resolve()));
  });
  const talk = async (line, ok) => {
    if (line !== null) await send(line);
    const reply = await read();
    if (!ok.includes(reply.code)) {
      throw new Error(`SMTP ${reply.code}：${(reply.line || "").slice(0, 120)}`);
    }
    return reply;
  };
  const session = async (sock) => {
    const readS = makeReader(sock);
    const sendS = (line) => new Promise((resolve, reject) => {
      sock.write(`${line}\r\n`, "utf8", (error) => (error ? reject(error) : resolve()));
    });
    const talkS = async (line, ok) => {
      if (line !== null) await sendS(line);
      const reply = await readS();
      if (!ok.includes(reply.code)) throw new Error(`SMTP ${reply.code}：${(reply.line || "").slice(0, 120)}`);
      return reply;
    };
    await talkS(null, [220]);
    await talkS("EHLO atoms-lab", [250]);
    const auth = Buffer.from(`\u0000${user}\u0000${pass}`).toString("base64");
    await talkS(`AUTH PLAIN ${auth}`, [235, 503]);
    await talkS(`MAIL FROM:<${from}>`, [250]);
    await talkS(`RCPT TO:<${to}>`, [250, 251]);
    await talkS("DATA", [354]);
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
    const body = [
      `From: Atoms Lab <${from}>`,
      `To: <${to}>`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n"),
    ].join("\r\n");
    sock.write(`${body}\r\n.\r\n`);
    await talkS(null, [250]);
    sock.write("QUIT\r\n");
    return { ok: true };
  };
  try {
    if (implicit) return await session(socket);
    await talk(null, [220]);
    await talk("EHLO atoms-lab", [250]);
    await talk("STARTTLS", [220]);
    const tlsSocket = await new Promise((resolve, reject) => {
      const upgraded = tls.connect({ socket, servername: host }, () => resolve(upgraded));
      upgraded.once("error", reject);
      setTimeout(() => reject(new Error("TLS 升级超时")), 15000);
    });
    return await session(tlsSocket);
  } finally {
    socket.destroy();
  }
}

export function makeCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

export function hashCode(email, code) {
  return crypto.createHash("sha256").update(`${String(email).toLowerCase()}:${code}:atoms-lab`).digest("hex");
}
