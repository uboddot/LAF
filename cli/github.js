const headers = {
  "User-Agent": "create-laf",
  ...(process.env.GITHUB_TOKEN && {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }),
};

async function getJSON(url) {
  const res = await fetch(url, {
    headers: { ...headers, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub request failed (${res.status}): ${url}`);
  return res.json();
}

export const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;

export function compareSemver(a, b) {
  const pa = a.match(SEMVER).slice(1).map(Number);
  const pb = b.match(SEMVER).slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Release tags (vX.Y.Z), newest first. */
export async function listVersions(repo) {
  const tags = await getJSON(
    `https://api.github.com/repos/${repo}/tags?per_page=100`,
  );
  return tags
    .map((t) => t.name)
    .filter((name) => SEMVER.test(name))
    .sort((a, b) => compareSemver(b, a));
}

/** Newest release tag, or the default branch if no release was tagged yet. */
export async function resolveLatest(repo) {
  const [latest] = await listVersions(repo);
  if (latest) return latest;
  const info = await getJSON(`https://api.github.com/repos/${repo}`);
  return info.default_branch;
}

/**
 * Downloads the repo at `ref` (tag, branch or commit) as .tar.gz.
 * `url` is an optional mirror template containing "{ref}".
 */
export async function download({ repo, url, ref }) {
  const src = url
    ? url.replaceAll("{ref}", ref)
    : `https://codeload.github.com/${repo}/tar.gz/${encodeURI(ref)}`;
  const res = await fetch(src, { headers });
  if (res.status === 404) throw new Error(`Version "${ref}" not found (${src})`);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${src}`);
  return Buffer.from(await res.arrayBuffer());
}
