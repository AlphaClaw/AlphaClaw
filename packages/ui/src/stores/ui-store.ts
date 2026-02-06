import { create } from "zustand";
import { type UiSettings, type ThemeMode, type ResolvedTheme, loadSettings, saveSettings, resolveTheme } from "../utils/storage";

export type UiStore = {
  settings: UiSettings;
  theme: ThemeMode;
  themeResolved: ResolvedTheme;
  navCollapsed: boolean;
  navGroupsCollapsed: Record<string, boolean>;

  // Actions
  updateSettings: (patch: Partial<UiSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleNav: () => void;
  toggleNavGroup: (group: string) => void;
};

export const useUiStore = create<UiStore>((set, get) => {
  const initial = loadSettings();
  return {
    settings: initial,
    theme: initial.theme,
    themeResolved: resolveTheme(initial.theme),
    navCollapsed: initial.navCollapsed,
    navGroupsCollapsed: initial.navGroupsCollapsed,

    updateSettings: (patch) => {
      const next = { ...get().settings, ...patch };
      saveSettings(next);
      set({
        settings: next,
        theme: next.theme,
        themeResolved: resolveTheme(next.theme),
        navCollapsed: next.navCollapsed,
        navGroupsCollapsed: next.navGroupsCollapsed,
      });
    },

    setTheme: (theme) => {
      const s = get();
      const next = { ...s.settings, theme };
      saveSettings(next);
      const resolved = resolveTheme(theme);
      set({ settings: next, theme, themeResolved: resolved });
      // Apply to document
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.classList.toggle("light", resolved === "light");
    },

    toggleNav: () => {
      const s = get();
      const navCollapsed = !s.navCollapsed;
      const next = { ...s.settings, navCollapsed };
      saveSettings(next);
      set({ settings: next, navCollapsed });
    },

    toggleNavGroup: (group) => {
      const s = get();
      const navGroupsCollapsed = {
        ...s.navGroupsCollapsed,
        [group]: !s.navGroupsCollapsed[group],
      };
      const next = { ...s.settings, navGroupsCollapsed };
      saveSettings(next);
      set({ settings: next, navGroupsCollapsed });
    },
  };
});
