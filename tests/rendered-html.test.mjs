import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Korean AI Video Studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /AI Video Studio/i);
  assert.match(html, /수동 무료 모드/);
  assert.match(html, /Google 품질 API/);
  assert.match(html, /로컬 후반 작업/);
  assert.match(html, /프롬프트 디렉터/);
  assert.match(html, /권리를 보유한 파일/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
