import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import { spawn } from "node:child_process";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const sourcePath = new URL("./ben10-seller-motion-ad.html", import.meta.url).pathname.replace(/^\//, "");
const outputPath = new URL("../public/ben10-seller-10-percent.webm", import.meta.url).pathname.replace(/^\//, "");
const port = 9222;

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
      });
    }).on("error", reject);
  });
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { return await getJson(`http://127.0.0.1:${port}/json/list`); } catch { await pause(500); }
  }
  throw new Error("Chrome remote debugger did not start.");
}

async function evaluate(webSocketUrl, expression) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const responses = new Map();
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) responses.get(message.id)?.(message);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    responses.set(id, (message) => {
      responses.delete(id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  socket.close();
  return result.result?.value;
}

await mkdir(new URL("../public", import.meta.url), { recursive: true });
const chrome = spawn(chromePath, [
  "--headless=new",
  "--autoplay-policy=no-user-gesture-required",
  `--remote-debugging-port=${port}`,
  "--remote-allow-origins=*",
  "--window-size=1920,1080",
  `file:///${sourcePath.replace(/\\/g, "/")}?render=1`,
], { stdio: "ignore", windowsHide: true });

try {
  const targets = await waitForDebugger();
  const page = targets.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("No Chrome page target was available.");
  let status = "";
  while (status !== "complete") {
    await pause(1200);
    status = await evaluate(page.webSocketDebuggerUrl, "window.__ben10AdStatus");
    process.stdout.write(`Render status: ${status}\n`);
  }
  const base64 = await evaluate(page.webSocketDebuggerUrl, "window.__ben10AdBase64");
  await writeFile(outputPath, Buffer.from(base64, "base64"));
  process.stdout.write(`Created ${outputPath}\n`);
} finally {
  chrome.kill();
}
