import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".alphaclaw"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", ALPHACLAW_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".alphaclaw-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", ALPHACLAW_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".alphaclaw"));
  });

  it("uses ALPHACLAW_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", ALPHACLAW_STATE_DIR: "/var/lib/alphaclaw" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/alphaclaw"));
  });

  it("expands ~ in ALPHACLAW_STATE_DIR", () => {
    const env = { HOME: "/Users/test", ALPHACLAW_STATE_DIR: "~/alphaclaw-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/alphaclaw-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { ALPHACLAW_STATE_DIR: "C:\\State\\alphaclaw" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\alphaclaw");
  });
});
