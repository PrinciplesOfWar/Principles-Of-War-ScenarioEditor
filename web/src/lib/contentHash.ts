function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Truncated SHA-256 of the decoded image bytes — used as the unit_icons key so
// uploading the same icon twice (even under a different filename) dedupes automatically.
export async function contentHash(base64: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", base64ToBytes(base64) as BufferSource);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}
