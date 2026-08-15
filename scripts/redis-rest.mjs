#!/usr/bin/env node
/** Ponte HTTP estilo Upstash → Redis local (127.0.0.1:6379). */
import net from "node:net";
import http from "node:http";

const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const HTTP_PORT = Number(process.env.REDIS_REST_PORT || 6380);

function encode(cmd) {
  const parts = cmd.map((c) => {
    const s = String(c);
    const buf = Buffer.from(s);
    return `$${buf.length}\r\n${s}\r\n`;
  });
  return `*${cmd.length}\r\n${parts.join("")}`;
}

function decode(buf) {
  const text = buf.toString("utf8");
  if (text.startsWith("+")) return text.slice(1).split("\r\n")[0];
  if (text.startsWith("-")) throw new Error(text.slice(1).split("\r\n")[0]);
  if (text.startsWith(":")) return Number(text.slice(1).split("\r\n")[0]);
  if (text.startsWith("$-1")) return null;
  if (text.startsWith("$")) {
    const nl = text.indexOf("\r\n");
    return text.slice(nl + 2, text.lastIndexOf("\r\n"));
  }
  if (text.startsWith("*")) return text;
  return text.trim();
}

function redisCall(cmd) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: REDIS_PORT });
    const chunks = [];
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("redis_timeout"));
    }, 2000);
    socket.on("connect", () => socket.write(encode(cmd)));
    socket.on("data", (d) => {
      chunks.push(d);
      clearTimeout(timer);
      try {
        resolve(decode(Buffer.concat(chunks)));
      } catch (err) {
        reject(err);
      }
      socket.end();
    });
    socket.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/ping" && req.method === "GET") {
    try {
      const pong = await redisCall(["PING"]);
      res.end(JSON.stringify({ result: pong, ok: true }));
    } catch (err) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method" }));
    return;
  }
  const body = await new Promise((resolve) => {
    const acc = [];
    req.on("data", (c) => acc.push(c));
    req.on("end", () => resolve(Buffer.concat(acc).toString("utf8")));
  });
  let cmd;
  try {
    cmd = JSON.parse(body);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "json" }));
    return;
  }
  if (!Array.isArray(cmd) || !cmd.length) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "cmd" }));
    return;
  }
  try {
    const result = await redisCall(cmd);
    res.end(JSON.stringify({ result }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
});

server.listen(HTTP_PORT, "127.0.0.1", () => {
  process.stdout.write(`redis-rest :${HTTP_PORT} → :${REDIS_PORT}\n`);
});
