#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseArgs } from "node:util";
import { listVersions, resolveLatest, download } from "./github.js";
import { untar } from "./tar.js";
import { changesBetween } from "./changelog.js";

const DEFAULT_REPO = "uboddot/LAF";
const CONFIG = "laf.json";

const USAGE = `Usage:
  npm create laf@latest <dir> [-- --version <ref>]   create a new LAF project
  npx create-laf update [ref] [--force]              switch this project's laf/ to <ref> (default: latest)
  npx create-laf versions                            list released versions

Options:
  --version, -v <ref>   tag, branch or commit (default: newest vX.Y.Z tag)
  --repo <owner/name>   GitHub repo to download from (default: ${DEFAULT_REPO})
  --url <template>      mirror tarball URL containing "{ref}", e.g. https://host/laf-{ref}.tar.gz
  --force               update even if laf/ has local changes
`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    version: { type: "string", short: "v" },
    repo: { type: "string" },
    url: { type: "string" },
    force: { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
});

function fail(message) {
  throw new Error(message);
}

/** Downloads `ref` (or the latest release) and splits out laf/ and template/. */
async function fetchRelease(source, ref) {
  if (!ref) {
    if (source.url) fail("--url needs an explicit --version");
    ref = await resolveLatest(source.repo);
  }
  console.log(`Downloading LAF ${ref} from ${source.url ?? source.repo} ...`);
  const { files, commit } = untar(await download({ ...source, ref }));

  const pick = (dir) =>
    new Map(
      [...files]
        .filter(([p]) => p.startsWith(`${dir}/`))
        .map(([p, data]) => [p.slice(dir.length + 1), data]),
    );

  const laf = pick("laf");
  if (!laf.size) fail(`Version "${ref}" contains no laf/ folder`);

  // Ship the changelog inside laf/ so every project has it locally.
  const changelog = files.get("CHANGELOG.md");
  if (changelog) laf.set("CHANGELOG.md", changelog);

  return { ref, commit, laf, template: pick("template"), changelog };
}

function writeFiles(dir, files) {
  const root = path.resolve(dir);
  for (const [rel, data] of files) {
    const dest = path.resolve(root, rel);
    if (!dest.startsWith(root + path.sep)) fail(`Unsafe path in archive: ${rel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  }
}

/** Order-independent fingerprint of a set of files. */
function hashFiles(files) {
  const hash = crypto.createHash("sha256");
  for (const rel of [...files.keys()].sort()) {
    hash.update(rel).update("\0").update(files.get(rel)).update("\0");
  }
  return hash.digest("hex");
}

function readDir(dir, base = dir, out = new Map()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) readDir(full, base, out);
    else out.set(path.relative(base, full).split(path.sep).join("/"), fs.readFileSync(full));
  }
  return out;
}

function readConfig(dir) {
  const file = path.join(dir, CONFIG);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function writeConfig(dir, source, release) {
  const config = {
    repo: source.repo,
    url: source.url,
    version: release.ref,
    commit: release.commit ?? undefined,
    hash: hashFiles(release.laf),
  };
  fs.writeFileSync(path.join(dir, CONFIG), JSON.stringify(config, null, 2) + "\n");
}

async function create(dirArg) {
  const target = path.resolve(dirArg);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    fail(`"${dirArg}" already exists and is not empty`);
  }

  const source = { repo: opts.repo ?? DEFAULT_REPO, url: opts.url };
  const release = await fetchRelease(source, opts.version);

  if (release.template.size) writeFiles(target, release.template);
  else console.warn(`Warning: ${release.ref} has no template/, only laf/ was created.`);
  writeFiles(path.join(target, "laf"), release.laf);
  writeConfig(target, source, release);

  console.log(`
Created ${dirArg} with LAF ${release.ref}.

  cd ${dirArg}
  serve the folder with any static file server and open index.html
  (ES modules don't load from file://)

Update later with:  npx create-laf update [version]`);
}

async function update(ref) {
  const root = process.cwd();
  const config = readConfig(root);
  if (!config) fail(`No ${CONFIG} found here. Run this inside a LAF project.`);

  const lafDir = path.join(root, "laf");
  if (!opts.force && config.hash && fs.existsSync(lafDir) && hashFiles(readDir(lafDir)) !== config.hash) {
    fail("laf/ has local changes that would be overwritten. Re-run with --force to discard them.");
  }

  const source = {
    repo: opts.repo ?? config.repo ?? DEFAULT_REPO,
    url: opts.url ?? config.url,
  };
  const release = await fetchRelease(source, ref);

  if (!opts.force && release.commit && release.commit === config.commit) {
    console.log(`Already on ${release.ref} (${release.commit.slice(0, 7)}).`);
    return;
  }

  fs.rmSync(lafDir, { recursive: true, force: true });
  writeFiles(lafDir, release.laf);
  writeConfig(root, source, release);
  console.log(`Updated LAF ${config.version} -> ${release.ref}.`);
  printChanges(release.changelog, config.version, release.ref);
}

function printChanges(changelog, from, to) {
  if (!changelog) return;
  const changes = changesBetween(changelog.toString("utf8"), from, to);
  if (!changes?.sections.length) {
    console.log("See laf/CHANGELOG.md for what changed.");
    return;
  }
  console.log(changes.rolledBack ? "\nRolled back:\n" : "\nWhat changed:\n");
  console.log(changes.sections.join("\n\n"));
}

async function versions() {
  const config = readConfig(process.cwd());
  const repo = opts.repo ?? config?.repo ?? DEFAULT_REPO;
  const tags = await listVersions(repo);
  if (!tags.length) return console.log(`No releases tagged in ${repo} yet.`);
  for (const tag of tags) {
    console.log(`${tag}${tag === config?.version ? "  (current)" : ""}`);
  }
}

async function main() {
  const [command, arg] = positionals;
  if (opts.help || !command) return console.log(USAGE);
  if (command === "update") return update(arg ?? opts.version);
  if (command === "versions") return versions();
  return create(command);
}

main().catch((err) => {
  console.error(`create-laf: ${err.message}`);
  process.exit(1);
});
