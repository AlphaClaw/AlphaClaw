import type { AlphaClawPluginApi } from "../../src/plugins/types.js";
import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: AlphaClawPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
}
