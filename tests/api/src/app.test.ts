import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { build, copyPublicAssets, createNitro, prepare } from "nitropack";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

// The Nitro app on Node, built by Nitro itself — the app's own nitro.config.ts
// and server/ routes, with the `node-listener` preset in place of the
// Worker's cloudflare_module — and served by a real HTTP server on a free
// port, called over fetch. So this is the template's behaviour (Nitro's
// file-based routing, its 404), independent of the runtime. The e2e tier
// serves the cloudflare_module build under workerd.
const appDir = path.resolve(__dirname, "../../../apps/api");
let out: string;
let server: Server;
let base: string;

beforeAll(async () => {
  out = mkdtempSync(path.join(tmpdir(), "nitro-api-test-"));
  const nitro = await createNitro({
    rootDir: appDir,
    dev: false,
    preset: "node-listener",
    buildDir: path.join(out, ".nitro"),
    output: { dir: path.join(out, ".output") },
    logLevel: 1,
  });
  await prepare(nitro);
  await copyPublicAssets(nitro);
  await build(nitro);
  await nitro.close();
  const entry = path.join(out, ".output/server/index.mjs");
  const { listener } = (await import(pathToFileURL(entry).href)) as { listener: RequestListener };
  server = await new Promise<Server>((resolve) => {
    const s = createServer(listener).listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  if (out) rmSync(out, { recursive: true, force: true });
});

const get = (route: string, init?: RequestInit) => fetch(base + route, init);

describe("the Nitro app (apps/api/server/routes)", () => {
  it("answers / with the template's page, named by the site's name", async () => {
    const { SITE_NAME } = await import("@/identity");
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
    const html = await res.text();
    // The name is text in the page: escaped, so a name with `&` or `<` in it
    // (an owner's, after the rename) stays text.
    const name = SITE_NAME.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    expect(html).toContain(`<title>${name}</title>`);
    expect(html).toContain(`<h1>Welcome to ${name}</h1>`);
    expect(html).toContain('<img src="https://nitro.build/icon.svg" alt="Nitro logo" class="logo" />');
    expect(html).toContain("A fast, lightweight server framework running on Cloudflare Workers");
    expect(html).toContain('href="https://nitro.build/deploy/providers/cloudflare"');
    expect(html).toContain('href="https://developers.cloudflare.com/workers/"');
    expect(html).not.toMatch(/vercel/i);
  });

  it("answers HEAD / without a body", async () => {
    const res = await get("/", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("answers an unknown path with Nitro's own 404", async () => {
    const res = await get("/nope", { headers: { accept: "application/json" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: true,
      statusCode: 404,
      statusMessage: "Cannot find any route matching /nope.",
    });
  });
});

describe("GET /health — what the deploy's smoke and the bootstrap's probe read", () => {
  const saved = process.env.ENVIRONMENT;
  afterEach(() => {
    if (saved === undefined) delete process.env.ENVIRONMENT;
    else process.env.ENVIRONMENT = saved;
  });

  it("names the site and the environment the app runs as", async () => {
    const { SITE_NAME } = await import("@/identity");
    // On Node the environment comes from process.env; on the Worker, from
    // wrangler's `env.stage.vars` in event.context.cloudflare.env (the e2e
    // tier reads that one).
    process.env.ENVIRONMENT = "stage";
    const res = await get("/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await res.json()).toEqual({ status: "ok", name: SITE_NAME, environment: "stage" });
  });

  it("still answers when no ENVIRONMENT is set", async () => {
    delete process.env.ENVIRONMENT;
    const res = await get("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", environment: "unknown" });
  });
});

describe("the site's identity (apps/api/server/identity.ts)", () => {
  it("names the site", async () => {
    const { SITE_NAME } = await import("@/identity");
    expect(SITE_NAME.trim()).not.toBe("");
  });
});
