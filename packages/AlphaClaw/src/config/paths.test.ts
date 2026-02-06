import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  resolveDefaultConfigCandidates,
  resolveConfigPath,
  resolveOAuthDir,
  resolveOAuthPath,
  resolveStateDir,
} from "./paths.js";

describe("oauth paths", () => {
  it("prefers ALPHACLAW_OAUTH_DIR over ALPHACLAW_STATE_DIR", () => {
    const env = {
      ALPHACLAW_OAUTH_DIR: "/custom/oauth",
      ALPHACLAW_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.resolve("/custom/oauth"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join(path.resolve("/custom/oauth"), "oauth.json"),
    );
  });

  it("derives oauth path from ALPHACLAW_STATE_DIR when unset", () => {
    const env = {
      ALPHACLAW_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.join("/custom/state", "credentials"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join("/custom/state", "credentials", "oauth.json"),
    );
  });
});

describe("state + config path candidates", () => {
  it("uses ALPHACLAW_STATE_DIR when set", () => {
    const env = {
      ALPHACLAW_STATE_DIR: "/new/state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, () => "/home/test")).toBe(path.resolve("/new/state"));
  });

  it("orders default config candidates in a stable order", () => {
    const home = "/home/test";
    const candidates = resolveDefaultConfigCandidates({} as NodeJS.ProcessEnv, () => home);
    const expected = [
      path.join(home, ".alphaclaw", "alphaclaw.json"),
      path.join(home, ".alphaclaw", "clawdbot.json"),
      path.join(home, ".alphaclaw", "moltbot.json"),
      path.join(home, ".alphaclaw", "moldbot.json"),
      path.join(home, ".clawdbot", "alphaclaw.json"),
      path.join(home, ".clawdbot", "clawdbot.json"),
      path.join(home, ".clawdbot", "moltbot.json"),
      path.join(home, ".clawdbot", "moldbot.json"),
      path.join(home, ".moltbot", "alphaclaw.json"),
      path.join(home, ".moltbot", "clawdbot.json"),
      path.join(home, ".moltbot", "moltbot.json"),
      path.join(home, ".moltbot", "moldbot.json"),
      path.join(home, ".moldbot", "alphaclaw.json"),
      path.join(home, ".moldbot", "clawdbot.json"),
      path.join(home, ".moldbot", "moltbot.json"),
      path.join(home, ".moldbot", "moldbot.json"),
    ];
    expect(candidates).toEqual(expected);
  });

  it("prefers ~/.alphaclaw when it exists and legacy dir is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "alphaclaw-state-"));
    try {
      const newDir = path.join(root, ".alphaclaw");
      await fs.mkdir(newDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("CONFIG_PATH prefers existing config when present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "alphaclaw-config-"));
    const previousHome = process.env.HOME;
    const previousUserProfile = process.env.USERPROFILE;
    const previousHomeDrive = process.env.HOMEDRIVE;
    const previousHomePath = process.env.HOMEPATH;
    const previousAlphaClawConfig = process.env.ALPHACLAW_CONFIG_PATH;
    const previousAlphaClawState = process.env.ALPHACLAW_STATE_DIR;
    try {
      const legacyDir = path.join(root, ".alphaclaw");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyPath = path.join(legacyDir, "alphaclaw.json");
      await fs.writeFile(legacyPath, "{}", "utf-8");

      process.env.HOME = root;
      if (process.platform === "win32") {
        process.env.USERPROFILE = root;
        const parsed = path.win32.parse(root);
        process.env.HOMEDRIVE = parsed.root.replace(/\\$/, "");
        process.env.HOMEPATH = root.slice(parsed.root.length - 1);
      }
      delete process.env.ALPHACLAW_CONFIG_PATH;
      delete process.env.ALPHACLAW_STATE_DIR;

      vi.resetModules();
      const { CONFIG_PATH } = await import("./paths.js");
      expect(CONFIG_PATH).toBe(legacyPath);
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
      if (previousUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = previousUserProfile;
      }
      if (previousHomeDrive === undefined) {
        delete process.env.HOMEDRIVE;
      } else {
        process.env.HOMEDRIVE = previousHomeDrive;
      }
      if (previousHomePath === undefined) {
        delete process.env.HOMEPATH;
      } else {
        process.env.HOMEPATH = previousHomePath;
      }
      if (previousAlphaClawConfig === undefined) {
        delete process.env.ALPHACLAW_CONFIG_PATH;
      } else {
        process.env.ALPHACLAW_CONFIG_PATH = previousAlphaClawConfig;
      }
      if (previousAlphaClawConfig === undefined) {
        delete process.env.ALPHACLAW_CONFIG_PATH;
      } else {
        process.env.ALPHACLAW_CONFIG_PATH = previousAlphaClawConfig;
      }
      if (previousAlphaClawState === undefined) {
        delete process.env.ALPHACLAW_STATE_DIR;
      } else {
        process.env.ALPHACLAW_STATE_DIR = previousAlphaClawState;
      }
      if (previousAlphaClawState === undefined) {
        delete process.env.ALPHACLAW_STATE_DIR;
      } else {
        process.env.ALPHACLAW_STATE_DIR = previousAlphaClawState;
      }
      await fs.rm(root, { recursive: true, force: true });
      vi.resetModules();
    }
  });

  it("respects state dir overrides when config is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "alphaclaw-config-override-"));
    try {
      const legacyDir = path.join(root, ".alphaclaw");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyConfig = path.join(legacyDir, "alphaclaw.json");
      await fs.writeFile(legacyConfig, "{}", "utf-8");

      const overrideDir = path.join(root, "override");
      const env = { ALPHACLAW_STATE_DIR: overrideDir } as NodeJS.ProcessEnv;
      const resolved = resolveConfigPath(env, overrideDir, () => root);
      expect(resolved).toBe(path.join(overrideDir, "alphaclaw.json"));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
