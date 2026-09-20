// Mimics Python's json.dumps(obj, sort_keys=True) exactly (default separators ", " / ": ",
// ensure_ascii=True escaping of non-ASCII chars) so the md5 hash matches src/scenario_compile.py.

function escapeString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20) out += "\\u" + code.toString(16).padStart(4, "0");
    else if (code > 0x7e) {
      if (code > 0xffff) {
        // surrogate pair escaping to match Python's ensure_ascii
        const c = code - 0x10000;
        const hi = 0xd800 + (c >> 10);
        const lo = 0xdc00 + (c & 0x3ff);
        out += "\\u" + hi.toString(16).padStart(4, "0");
        out += "\\u" + lo.toString(16).padStart(4, "0");
      } else {
        out += "\\u" + code.toString(16).padStart(4, "0");
      }
    } else out += ch;
  }
  return out + '"';
}

function pyNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

export function pyDumpsSorted(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return pyNumber(value);
  if (typeof value === "string") return escapeString(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => pyDumpsSorted(v)).join(", ") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const parts = keys.map(
      (k) => escapeString(k) + ": " + pyDumpsSorted((value as Record<string, unknown>)[k])
    );
    return "{" + parts.join(", ") + "}";
  }
  throw new Error("Unsupported value in pyDumpsSorted");
}
