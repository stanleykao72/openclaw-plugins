import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setOdooDiscussRuntime(next: PluginRuntime) {
  runtime = next;
}

export function getOdooDiscussRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("Odoo Discuss runtime not initialized");
  }
  return runtime;
}
