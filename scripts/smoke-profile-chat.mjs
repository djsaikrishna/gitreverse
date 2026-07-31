/**
 * Smoke test for profile chat API.
 * Usage: npx tsx --env-file=.env.local scripts/smoke-profile-chat.mjs [login]
 */
const login = process.argv[2] ?? "theo";
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const body = {
  login,
  messages: [
    {
      id: "smoke-1",
      role: "user",
      parts: [{ type: "text", text: "Reply in one short sentence: what do you build?" }],
    },
  ],
};

const res = await fetch(`${base}/api/profile-chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const contentType = res.headers.get("content-type") ?? "";
console.log("status:", res.status, "content-type:", contentType);

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

if (!contentType.includes("text/event-stream") && !contentType.includes("text/plain")) {
  const text = await res.text();
  console.log("body:", text.slice(0, 500));
  if (!text.includes("text-delta") && !text.includes("data:")) {
    console.error("expected streaming response");
    process.exit(1);
  }
  process.exit(0);
}

const reader = res.body?.getReader();
if (!reader) {
  console.error("no response body");
  process.exit(1);
}

const dec = new TextDecoder();
let chunks = 0;
let text = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = dec.decode(value, { stream: true });
  chunks += 1;
  text += chunk;
  if (chunks <= 3) {
    console.log("chunk", chunks, chunk.slice(0, 120).replace(/\n/g, "\\n"));
  }
}

console.log("chunks:", chunks);
console.log("stream ok, sample:", text.slice(0, 300).replace(/\n/g, "\\n"));
if (!text.includes("text-delta") && !text.includes("0:")) {
  console.error("stream did not include expected UI message chunks");
  process.exit(1);
}
console.log("smoke ok");
