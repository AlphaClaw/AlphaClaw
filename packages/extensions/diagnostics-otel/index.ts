import type { AlphaClawPluginApi } from "alphaclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "alphaclaw/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: AlphaClawPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
