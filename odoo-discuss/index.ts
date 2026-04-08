import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { odooDiscussPlugin } from "./src/channel.js";
import { setOdooDiscussRuntime } from "./src/runtime.js";

const plugin = {
  id: "odoo-discuss",
  name: "Odoo Discuss",
  description: "Odoo Discuss channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setOdooDiscussRuntime(api.runtime);
    api.registerChannel({ plugin: odooDiscussPlugin });
  },
};

export default plugin;
