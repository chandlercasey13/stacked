// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://www.swecontractinggroup.com",
  output: "server",
  adapter: node({ mode: "standalone" }),
  trailingSlash: "never",
});
