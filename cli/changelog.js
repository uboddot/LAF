import { SEMVER, compareSemver } from "./github.js";

const HEADING = /^##\s+\[?(v?\d+\.\d+\.\d+)\]?/;
const LINK_REF = /^\[[^\]]+\]:\s/;

/**
 * Splits a Keep-a-Changelog file into its version sections.
 * @returns {Map<string, string>} version -> section text (including heading)
 */
export function parseChangelog(text) {
  const sections = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const match = line.match(HEADING);
      current = match ? [line] : null; // "## [Unreleased]" etc. is skipped
      if (match) sections.set(match[1], current);
    } else if (current && !LINK_REF.test(line)) {
      current.push(line);
    }
  }
  return new Map(
    [...sections].map(([version, lines]) => [version, lines.join("\n").trim()]),
  );
}

/**
 * Changelog sections between two versions.
 * Upgrade: versions in (from, to]. Downgrade: versions in (to, from], marked as rolled back.
 * @returns {{ rolledBack: boolean, sections: string[] } | null} null if a ref isn't a version tag
 */
export function changesBetween(text, from, to) {
  if (!SEMVER.test(from ?? "") || !SEMVER.test(to)) return null;
  const rolledBack = compareSemver(to, from) < 0;
  const [low, high] = rolledBack ? [to, from] : [from, to];

  const sections = [...parseChangelog(text)]
    .filter(([v]) => compareSemver(v, low) > 0 && compareSemver(v, high) <= 0)
    .sort(([a], [b]) => compareSemver(b, a))
    .map(([, section]) => section);

  return { rolledBack, sections };
}
