import { SITE_NAME } from "../identity"

// The deploy's contract (the port's; the template has only `/`): the site's
// name and the environment whose config the Worker runs — wrangler's
// `env.<name>.vars.ENVIRONMENT`, which Nitro's cloudflare_module preset hands
// every request as `event.context.cloudflare.env` — so a 200 here is this
// site, deployed to that environment. `process.env` is the fallback for Node
// (the tests serve the same routes there).
export default defineEventHandler((event) => {
  const env = (event.context as { cloudflare?: { env?: Record<string, unknown> } }).cloudflare?.env
  const environment = env?.ENVIRONMENT ?? process.env.ENVIRONMENT ?? "unknown"
  return { status: "ok", name: SITE_NAME, environment }
})
