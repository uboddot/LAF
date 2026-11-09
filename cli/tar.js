import { gunzipSync } from "node:zlib";

/**
 * Minimal reader for .tar.gz archives as served by GitHub (ustar + pax headers).
 * Returns every regular file with the archive's top-level folder stripped,
 * plus the commit sha GitHub stores in the global pax header.
 *
 * @param {Buffer} gz
 * @returns {{ files: Map<string, Buffer>, commit: string | null }}
 */
export function untar(gz) {
  const buf = gunzipSync(gz);
  const files = new Map();
  let commit = null;
  let longName = null;
  let offset = 0;

  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break; // end-of-archive marker

    const field = (start, len) => {
      const raw = header.subarray(start, start + len);
      const end = raw.indexOf(0);
      return raw.subarray(0, end === -1 ? len : end).toString("utf8");
    };

    const size = parseInt(field(124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156]);
    const prefix = field(345, 155);
    let name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);

    const data = buf.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;

    if (type === "g" || type === "x") {
      const pax = parsePax(data);
      if (type === "g" && pax.comment) commit = pax.comment;
      if (type === "x" && pax.path) longName = pax.path;
      continue;
    }
    if (type === "L") {
      longName = data.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (longName) {
      name = longName;
      longName = null;
    }
    if (type === "0" || type === "\0") {
      const rel = name.split("/").slice(1).join("/"); // strip "LAF-<ref>/"
      if (rel) files.set(rel, Buffer.from(data));
    }
  }

  return { files, commit };
}

/** pax records look like "<len> <key>=<value>\n" */
function parsePax(data) {
  const out = {};
  let i = 0;
  while (i < data.length) {
    const space = data.indexOf(0x20, i);
    if (space === -1) break;
    const len = parseInt(data.subarray(i, space).toString(), 10);
    if (!len) break;
    const record = data.subarray(space + 1, i + len - 1).toString("utf8");
    const eq = record.indexOf("=");
    out[record.slice(0, eq)] = record.slice(eq + 1);
    i += len;
  }
  return out;
}
