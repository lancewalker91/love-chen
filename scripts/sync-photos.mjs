import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = "/Users/litao/Downloads/七夕快乐";
const sourceDirectory = path.resolve(process.argv[2] ?? process.env.QIXI_PHOTO_SOURCE ?? defaultSource);
const photosDirectory = path.join(projectRoot, "public", "photos");
const stagedDirectory = path.join(projectRoot, "public", `.photos-sync-${process.pid}`);
const backupDirectory = path.join(projectRoot, "public", `.photos-backup-${process.pid}`);
const manifestPath = path.join(projectRoot, "app", "photo-manifest.json");
const temporaryManifestPath = `${manifestPath}.sync-${process.pid}`;
const backupManifestPath = `${manifestPath}.backup-${process.pid}`;
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function imageDimensions(file) {
  const output = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!width || !height) throw new Error(`Could not read image dimensions for ${file}`);
  return { width, height };
}

async function main() {
  if (!(await exists(sourceDirectory))) {
    throw new Error(`Photo source directory does not exist: ${sourceDirectory}`);
  }

  const candidates = await Promise.all(
    (await readdir(sourceDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const absolutePath = path.join(sourceDirectory, entry.name);
        const metadata = await stat(absolutePath);
        return {
          absolutePath,
          name: entry.name,
          timestamp: metadata.birthtimeMs || metadata.mtimeMs,
        };
      }),
  );

  candidates.sort((left, right) =>
    left.timestamp - right.timestamp || left.name.localeCompare(right.name, "zh-CN", { numeric: true }),
  );

  if (candidates.length === 0) {
    throw new Error(`No supported photos found in ${sourceDirectory}`);
  }

  await rm(stagedDirectory, { force: true, recursive: true });
  await rm(backupDirectory, { force: true, recursive: true });
  await rm(backupManifestPath, { force: true });
  await mkdir(stagedDirectory, { recursive: true });

  const digits = Math.max(2, String(candidates.length).length);
  const photos = [];
  let photosSwapped = false;
  let manifestSwapped = false;

  try {
    for (const [index, photo] of candidates.entries()) {
      const sequence = String(index + 1).padStart(digits, "0");
      const fileName = `${sequence}.jpg`;
      const outputPath = path.join(stagedDirectory, fileName);

      execFileSync("/usr/bin/sips", [
        "--setProperty", "format", "jpeg",
        "--setProperty", "formatOptions", "78",
        "--resampleHeightWidthMax", "1800",
        "--out", outputPath,
        photo.absolutePath,
      ], { stdio: ["ignore", "ignore", "pipe"] });

      const dimensions = imageDimensions(outputPath);
      const outputStat = await stat(outputPath);
      photos.push({
        src: `/photos/${fileName}`,
        alt: `晨晨与我的珍藏回忆 ${sequence}`,
        width: dimensions.width,
        height: dimensions.height,
        bytes: outputStat.size,
      });
      process.stdout.write(`Synced ${sequence}/${candidates.length}: ${photo.name}\n`);
    }

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      count: photos.length,
      photos,
    };
    const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(temporaryManifestPath, serializedManifest);

    if (await exists(photosDirectory)) await rename(photosDirectory, backupDirectory);
    if (await exists(manifestPath)) await rename(manifestPath, backupManifestPath);
    await rename(stagedDirectory, photosDirectory);
    photosSwapped = true;
    await rename(temporaryManifestPath, manifestPath);
    manifestSwapped = true;
    await rm(backupDirectory, { force: true, recursive: true });
    await rm(backupManifestPath, { force: true });

    const totalBytes = photos.reduce((total, photo) => total + photo.bytes, 0);
    process.stdout.write(`Done: ${photos.length} photos, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total.\n`);
  } catch (error) {
    await rm(stagedDirectory, { force: true, recursive: true });
    await rm(temporaryManifestPath, { force: true });
    if (photosSwapped) await rm(photosDirectory, { force: true, recursive: true });
    if (await exists(backupDirectory)) {
      await rename(backupDirectory, photosDirectory);
    }
    if (manifestSwapped) await rm(manifestPath, { force: true });
    if (await exists(backupManifestPath)) await rename(backupManifestPath, manifestPath);
    throw error;
  }
}

await main();
