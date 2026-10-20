import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { applyCsp, buildPolicy, inlineScriptHashes } from "../../scripts/csp-hash";

const sha = (text: string) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

const page = `<!DOCTYPE html><html><head><meta charSet="utf-8"/><script src="/a.js" async=""></script></head><body><script>self.__next_f.push([1,"x"])</script><script id="_R_">theme()</script><script>self.__next_f.push([1,"x"])</script></body></html>`;

test("hashes every inline script once, skips scripts with src", () => {
  assert.deepEqual(inlineScriptHashes(page), [sha('self.__next_f.push([1,"x"])'), sha("theme()")]);
});

test("the policy never allows inline or eval'd scripts, plugins or framing", () => {
  const policy = buildPolicy(["'sha256-abc'"]);
  const scriptSrc = policy.split("; ").find((d) => d.startsWith("script-src "))!;
  assert.equal(scriptSrc, "script-src 'self' 'sha256-abc'");
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-src 'none'/);
  assert.match(policy, /img-src 'self' https:(;|$)/);
  // Directives a <meta> policy ignores (and would log console errors for) aren't used.
  assert.doesNotMatch(policy, /frame-ancestors|report-uri|sandbox/);
});

test("the meta tag goes right after <meta charset>, before any script, and re-running is safe", () => {
  const once = applyCsp(page);
  assert.ok(once.indexOf("Content-Security-Policy") < once.indexOf("<script"));
  assert.ok(
    once.startsWith(
      `<!DOCTYPE html><html><head><meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy"`,
    ),
  );
  assert.equal(applyCsp(once), once);
  assert.equal(once.match(/Content-Security-Policy/g)?.length, 1);
});
