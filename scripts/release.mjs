#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const VALID_BUMPS = new Set(["major", "minor", "patch"]);
const VERSION_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, options = {}) {
  return execSync(command, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runStreaming(command, args = []) {
  execFileSync(command, args, { stdio: "inherit" });
}

function resolveRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function parseVersion(version) {
  const [core] = version.split("-", 1);
  const parts = core.split(".");
  if (parts.length !== 3) {
    fail(`Invalid current version in package.json: ${version}`);
  }
  const [major, minor, patch] = parts.map((item) => Number(item));
  if ([major, minor, patch].some((item) => Number.isNaN(item))) {
    fail(`Invalid numeric version in package.json: ${version}`);
  }
  return { major, minor, patch };
}

function bumpVersion(currentVersion, bumpType) {
  const parsed = parseVersion(currentVersion);
  if (bumpType === "major") {
    return `${parsed.major + 1}.0.0`;
  }
  if (bumpType === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function parseCliArgs(argv) {
  const [versionArg, ...rest] = argv;
  const options = {
    versionArg,
    notesFile: "",
    shouldGenerateNotes: false,
    rawNotesParts: [],
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--notes-file") {
      const filePath = rest[index + 1];
      if (!filePath) {
        fail("Missing file path after --notes-file");
      }
      options.notesFile = filePath;
      index += 1;
      continue;
    }
    if (arg === "--generate-notes") {
      options.shouldGenerateNotes = true;
      continue;
    }
    options.rawNotesParts.push(arg);
  }

  return options;
}

function readNotesFile(notesFile) {
  if (!notesFile) {
    return "";
  }

  const resolvedPath = path.resolve(repoRoot, notesFile);
  if (!fs.existsSync(resolvedPath)) {
    fail(`Release notes file does not exist: ${notesFile}`);
  }
  return fs.readFileSync(resolvedPath, "utf8").trim();
}

function writeTempNotesFile(filePath, notes) {
  fs.writeFileSync(filePath, `${notes.trim()}\n`, "utf8");
}

function getPreviousTag() {
  try {
    return run("git describe --tags --abbrev=0");
  } catch {
    return "";
  }
}

function listCommitSubjects(previousTag) {
  const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
  const output = run(`git log --format=%s ${range}`);
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^chore\(release\):\s*v\d+\.\d+\.\d+$/i.test(item))
    .filter((item) => !/^chore\(release\):\s*发布 v\d+\.\d+\.\d+$/i.test(item))
    .filter((item) => !/^release:\s*v\d+\.\d+\.\d+$/i.test(item))
    .filter((item) => !/^发布:\s*v\d+\.\d+\.\d+$/i.test(item));
}

function classifyCommit(subject) {
  if (subject.startsWith("新增")) {
    return "新增";
  }
  if (subject.startsWith("修复")) {
    return "修复";
  }
  if (subject.startsWith("优化") || subject.startsWith("完善")) {
    return "优化";
  }
  return "其他";
}

function buildGeneratedReleaseNotes(tag) {
  const previousTag = getPreviousTag();
  const commitSubjects = listCommitSubjects(previousTag);
  if (commitSubjects.length === 0) {
    return `# ${tag}\n\n- 本次版本主要为常规发布整理。`;
  }

  const sections = new Map([
    ["新增", []],
    ["优化", []],
    ["修复", []],
    ["其他", []],
  ]);

  for (const subject of commitSubjects) {
    sections.get(classifyCommit(subject)).push(subject);
  }

  const lines = [`# ${tag}`, ""];
  if (previousTag) {
    lines.push(`基于 ${previousTag} 之后的 ${commitSubjects.length} 个提交整理。`, "");
  }

  for (const [sectionName, subjects] of sections) {
    if (subjects.length === 0) {
      continue;
    }
    lines.push(`## ${sectionName}`, "");
    for (const subject of subjects) {
      lines.push(`- ${subject}`);
    }
    lines.push("");
  }

  lines.push("## 完整提交", "");
  for (const subject of commitSubjects) {
    lines.push(`- ${subject}`);
  }
  lines.push("");

  return lines.join("\n").trim();
}

function buildReleaseNotes({ rawNotes, notesFile, shouldGenerateNotes, tag }) {
  const fileNotes = readNotesFile(notesFile);
  if (fileNotes) {
    return fileNotes;
  }

  const trimmed = rawNotes.trim();
  if (trimmed) {
    return trimmed;
  }

  if (shouldGenerateNotes) {
    return buildGeneratedReleaseNotes(tag);
  }

  return buildGeneratedReleaseNotes(tag);
}

const repoRoot = resolveRepoRoot();
process.chdir(repoRoot);

const args = process.argv.slice(2);
const { versionArg, notesFile, shouldGenerateNotes, rawNotesParts } = parseCliArgs(args);

if (!versionArg) {
  fail(
    "Usage: npm run release -- <patch|minor|major|x.y.z> [release notes] [--notes-file docs/releases/v0.1.12.md] [--generate-notes]\nExample: npm run release -- patch --notes-file docs/releases/v0.1.12.md",
  );
}

const status = run("git status --porcelain");
if (status) {
  fail("Working tree is not clean. Please commit or stash changes before release.");
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const currentVersion = packageJson.version;

const nextVersion = VALID_BUMPS.has(versionArg)
  ? bumpVersion(currentVersion, versionArg)
  : versionArg;

if (!VERSION_PATTERN.test(nextVersion)) {
  fail(`Invalid target version: ${nextVersion}`);
}

if (nextVersion === currentVersion) {
  fail(`Target version equals current version (${currentVersion}).`);
}

const branch = run("git rev-parse --abbrev-ref HEAD");
if (!branch || branch === "HEAD") {
  fail("Detached HEAD is not supported for release. Please checkout a branch first.");
}

const tag = `v${nextVersion}`;
const rawNotes = rawNotesParts.join(" ");
const notes = buildReleaseNotes({ rawNotes, notesFile, shouldGenerateNotes, tag });
const tempNotesFile = path.join(repoRoot, ".release-notes.tmp.md");

try {
  run(`git rev-parse -q --verify refs/tags/${tag}`);
  fail(`Tag ${tag} already exists.`);
} catch {
  // expected when tag does not exist
}

runStreaming(process.execPath, ["scripts/sync-version.mjs", nextVersion]);

runStreaming("git", [
  "add",
  "package.json",
  "package-lock.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "src-tauri/tauri.conf.json",
]);
runStreaming("git", ["commit", "-m", `chore(release): 发布 ${tag}`]);
try {
  writeTempNotesFile(tempNotesFile, notes);
  runStreaming("git", ["tag", "-a", tag, "-F", tempNotesFile, "--cleanup=verbatim"]);
} finally {
  fs.rmSync(tempNotesFile, { force: true });
}
runStreaming("git", ["push", "origin", branch]);
runStreaming("git", ["push", "origin", tag]);

console.log(`Release triggered: ${tag}`);
console.log("GitHub Actions will build artifacts and publish the Release automatically.");
