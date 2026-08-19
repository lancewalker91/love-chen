import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const distRoot = new URL("../pages-dist/", import.meta.url);
const manifestUrl = new URL("../app/photo-manifest.json", import.meta.url);

test("static Pages build contains the Qixi experience and custom-domain files", async () => {
  const [html, cname, noJekyll] = await Promise.all([
    readFile(new URL("index.html", distRoot), "utf8"),
    readFile(new URL("CNAME", distRoot), "utf8"),
    stat(new URL(".nojekyll", distRoot)),
  ]);

  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /付晨，七夕快乐/);
  assert.match(html, /id="root"/);
  assert.equal(cname.trim(), "chen.litao.ink");
  assert.ok(noJekyll.isFile());
});

test("photo manifest and generated assets stay in sync", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const sourceFiles = (await readdir(new URL("../public/photos/", import.meta.url)))
    .filter((file) => /^\d+\.jpg$/i.test(file))
    .sort();
  const builtFiles = (await readdir(new URL("photos/", distRoot)))
    .filter((file) => /^\d+\.jpg$/i.test(file))
    .sort();

  assert.ok(manifest.count > 0);
  assert.equal(manifest.photos.length, manifest.count);
  assert.deepEqual(sourceFiles, builtFiles);
  assert.equal(sourceFiles.length, manifest.count);

  for (const [index, photo] of manifest.photos.entries()) {
    const fileName = `${String(index + 1).padStart(Math.max(2, String(manifest.count).length), "0")}.jpg`;
    assert.equal(photo.src, `/photos/${fileName}`);
    assert.ok(photo.width > 0 && photo.height > 0);
    assert.ok(photo.bytes > 0);
    assert.ok((await stat(new URL(`../public${photo.src}`, import.meta.url))).isFile());
  }
});

test("source keeps the required interactions and personal copy", async () => {
  const [page, css, packageJson, devScript] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/dev.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<h1>晨晨，<em>这束花只为你盛开<\/em><\/h1>/);
  assert.match(page, /SCROLL TO ROTATE/);
  assert.match(page, /qixi-fireworks/);
  assert.match(page, /qixi-heart-burst/);
  assert.match(page, /onPointerDown=\{pointerDown\}/);
  assert.match(page, /event.key === "Escape"/);
  assert.match(page, /爱意满格 · 永远喜欢付晨/);
  assert.match(css, /transform-style:\s*preserve-3d/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(packageJson, /node scripts\/dev\.mjs/);
  assert.ok(devScript.includes('spawn(vinext, ["dev", "--port", "3007", "--hostname", "0.0.0.0"]'));
});
