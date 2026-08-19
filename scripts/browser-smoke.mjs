import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import process from "node:process";

const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = `/private/tmp/qixi-chrome-${process.pid}`;
const screenshot = `/private/tmp/qixi-mobile-interactions-${process.pid}.png`;
const galleryScreenshot = `/private/tmp/qixi-mobile-gallery-${process.pid}.png`;
const port = 9333;
const previewUrl = "http://127.0.0.1:3007/";
const browser = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function json(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function waitForDebugging() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await json(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await pause(100);
    }
  }
  throw new Error("Chrome debugging endpoint did not become ready");
}

let socket;
try {
  const previewResponse = await fetch(previewUrl);
  if (!previewResponse.ok) throw new Error(`Preview returned HTTP ${previewResponse.status}: ${previewUrl}`);
  await mkdir(profile, { recursive: true });
  await waitForDebugging();
  const target = await json(`http://127.0.0.1:${port}/json/new?${previewUrl}`, { method: "PUT" });
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let requestId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 375,
    screenHeight: 812,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Network.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0",
  });
  await send("Page.reload", { ignoreCache: true });
  await send("Page.bringToFront");

  let pageReady = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    pageReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('.receive-button'))");
    if (pageReady) break;
    await pause(100);
  }
  if (!pageReady) throw new Error(`Qixi page did not mount at ${previewUrl}`);

  const viewport = await evaluate("({ width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, title: document.title })");
  if (viewport.width !== 375 || viewport.clientWidth !== 375 || viewport.scrollWidth > 375) {
    throw new Error(`Mobile viewport mismatch: ${JSON.stringify(viewport)}`);
  }

  await evaluate(`Promise.race([
    Promise.all([...document.images].filter((image) => image.loading !== 'lazy').map((image) => image.decode?.().catch(() => undefined))),
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]).then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))`);
  await pause(250);
  const image = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await import("node:fs/promises").then(({ writeFile }) => writeFile(screenshot, Buffer.from(image.data, "base64")));

  const galleryState = await evaluate(`(async () => {
    document.querySelector('.skip-intro').click();
    await new Promise((resolve) => setTimeout(resolve, 1150));
    const gallery = document.querySelector('.gallery-section');
    window.scrollTo(0, gallery.offsetTop + gallery.offsetHeight * .48);
    await new Promise((resolve) => setTimeout(resolve, 420));
    await Promise.race([
      Promise.all([...document.querySelectorAll('.photo-card img')].map((image) => image.decode?.().catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    return {
      before: document.querySelector('.counter strong').textContent.trim(),
      progress: document.querySelector('.scroll-orbit b')?.style.transform,
    };
  })()`);

  const galleryImage = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await import("node:fs/promises").then(({ writeFile }) => writeFile(galleryScreenshot, Buffer.from(galleryImage.data, "base64")));

  const interactions = await evaluate(`(async () => {
    const before = document.querySelector('.counter strong').textContent.trim();
    document.querySelector("[aria-label='下一张']").click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const after = document.querySelector('.counter strong').textContent.trim();
    document.querySelector('.photo-card.is-active').click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const lightboxOpened = Boolean(document.querySelector('.lightbox'));
    document.querySelector('.lightbox-close').click();
    const meter = document.querySelector('.love-meter');
    meter.click(); meter.click(); meter.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return {
      before, after, lightboxOpened,
      lightboxClosed: !document.querySelector('.lightbox'),
      secret: document.querySelector('.secret-wish')?.textContent.trim(),
      progress: document.querySelector('.scroll-orbit b')?.style.transform,
    };
  })()`);

  if (interactions.before === interactions.after) throw new Error(`Next button did not change the active photo: ${JSON.stringify(interactions)}`);
  if (!interactions.lightboxOpened || !interactions.lightboxClosed) throw new Error(`Lightbox flow failed: ${JSON.stringify(interactions)}`);
  if (interactions.secret !== "爱意满格 · 永远喜欢付晨") throw new Error(`Love surprise failed: ${JSON.stringify(interactions)}`);
  if (!interactions.progress?.startsWith("scaleX(")) throw new Error(`Scroll progress missing: ${JSON.stringify(interactions)}`);

  process.stdout.write(`${JSON.stringify({ viewport, galleryState, interactions, screenshot, galleryScreenshot }, null, 2)}\n`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  const browserExit = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill("SIGTERM");
  await Promise.race([browserExit, pause(2000)]);
  await rm(profile, { force: true, recursive: true, maxRetries: 5, retryDelay: 200 });
}
