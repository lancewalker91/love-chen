import { readdir, mkdir, rm, copyFile, writeFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const source = process.env.PHOTO_SOURCE || '/Users/litao/Downloads/七夕快乐';
const output = new URL('./public/photos/', import.meta.url).pathname;
const dataFile = new URL('./app/photos.ts', import.meta.url).pathname;
const supported = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp']);

await mkdir(output, { recursive: true });
const entries = (await readdir(source))
  .filter(name => supported.has(extname(name).toLowerCase()))
  .map(name => ({ name, mtime: statSync(join(source, name)).mtimeMs }))
  .sort((a, b) => a.mtime - b.mtime || a.name.localeCompare(b.name, 'zh-CN'));

if (!entries.length) throw new Error(`没有在 ${source} 找到照片`);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (let i = 0; i < entries.length; i++) {
  const src = join(source, entries[i].name);
  const filename = `${String(i + 1).padStart(2, '0')}.jpg`;
  const dest = join(output, filename);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1800', src, '--out', dest], { stdio: 'ignore' });
  } catch {
    await copyFile(src, dest);
  }
}

const files = entries.map((_, i) => `${String(i + 1).padStart(2, '0')}.jpg`);
await writeFile(dataFile, `export const photoFiles = ${JSON.stringify(files, null, 2)} as const;\n`, 'utf8');
console.log(`已同步 ${files.length} 张照片到 public/photos`);
