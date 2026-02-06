import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "alphaclaw", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "alphaclaw", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "alphaclaw", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "alphaclaw", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "alphaclaw", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "alphaclaw", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "alphaclaw", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "alphaclaw"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "alphaclaw", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "alphaclaw", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "alphaclaw", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "alphaclaw", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "alphaclaw", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "alphaclaw", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "alphaclaw", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "alphaclaw", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "alphaclaw", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "alphaclaw", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "alphaclaw", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "alphaclaw", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "alphaclaw", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "alphaclaw", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["node", "alphaclaw", "status"],
    });
    expect(nodeArgv).toEqual(["node", "alphaclaw", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["node-22", "alphaclaw", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "alphaclaw", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["node-22.2.0.exe", "alphaclaw", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "alphaclaw", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["node-22.2", "alphaclaw", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "alphaclaw", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["node-22.2.exe", "alphaclaw", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "alphaclaw", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["/usr/bin/node-22.2.0", "alphaclaw", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "alphaclaw", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["nodejs", "alphaclaw", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "alphaclaw", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["node-dev", "alphaclaw", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "alphaclaw", "node-dev", "alphaclaw", "status"]);

    const directArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["alphaclaw", "status"],
    });
    expect(directArgv).toEqual(["node", "alphaclaw", "status"]);

    const bunArgv = buildParseArgv({
      programName: "alphaclaw",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "alphaclaw",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "alphaclaw", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "alphaclaw", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "alphaclaw", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "alphaclaw", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "alphaclaw", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "alphaclaw", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "alphaclaw", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "alphaclaw", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
