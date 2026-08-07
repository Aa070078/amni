#!/usr/bin/env node
/**
 * agent-sync: one-command session start for multi-agent coordination.
 *
 *  1. fetch origin + checkout dev + pull --rebase  (always start from latest)
 *  2. print top of CHANGELOG [Unreleased]
 *  3. print WORKBOARD (claims/status)
 *
 * Usage: pnpm agent:sync   (from repo root)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => {
  try {
    return execSync(cmd, { cwd: root, stdio: "pipe" }).toString();
  } catch (e) {
    return `[failed] ${e.stderr?.toString() || e.message}\n`;
  }
};

const isClean = () => {
  try {
    return execSync("git status --porcelain", { cwd: root }).toString().trim() === "";
  } catch {
    return false;
  }
};

const section = (title) => `\n===== ${title} =====\n`;

let out = "";

out += section("1. Sync to latest dev");
out += run("git fetch origin");
const cur = run("git branch --show-current").trim();
if (cur !== "dev") {
  out += run("git checkout dev");
}
if (isClean()) {
  out += run("git pull --rebase origin dev");
} else {
  out += "[skip] working tree is dirty — commit/stash first, then `git pull --rebase origin dev` yourself.\n";
}

out += section("2. CHANGELOG — what already landed (top of [Unreleased])");
try {
  const cl = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  const unreleased = cl.split("## [Unreleased]")[1] ?? cl;
  out += unreleased.split("\n## ")[0].slice(0, 2500) + "\n";
} catch {
  out += "CHANGELOG.md not found\n";
}

out += section("3. WORKBOARD — who works on what");
try {
  const wb = readFileSync(join(root, "docs", "coordination", "WORKBOARD.md"), "utf8");
  out += wb + "\n";
} catch {
  out += "WORKBOARD.md not found (run from repo root)\n";
}

out += section("4. Next step — claim before you build");
out += "Read docs/coordination/README.md, pick an unclaimed task on the board,\n";
out += "set Owner/Status/Branch, commit the claim FIRST, then build.\n";

process.stdout.write(out);
