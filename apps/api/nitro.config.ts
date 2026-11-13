//https://nitro.unjs.io/config
//
// The template's config (srcDir) plus the one change Cloudflare needs: Nitro's
// `cloudflare_module` preset in place of Vercel's zero-config detection. The
// build emits .output/server/index.mjs (the Worker, an ES module) and
// .output/public (the static assets), which the committed wrangler.jsonc
// deploys. `deployConfig: false`: Nitro does not write a wrangler.json of its
// own beside that one, so the committed file is the only config a deploy
// reads. `nodeCompat`: the output imports node: builtins (process, events,
// buffer, timers), which the Worker's nodejs_compat flag provides.
export default defineNitroConfig({
  srcDir: "server",
  preset: "cloudflare_module",
  compatibilityDate: "2026-10-01",
  cloudflare: {
    deployConfig: false,
    nodeCompat: true,
  },
});
