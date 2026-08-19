export const THEME_STORAGE_KEY = "linear-pointing-theme";
const THEME_CHANGE_EVENT = "linear-pointing-theme-change";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function resolveThemePreference(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  return preference === "system" ? (prefersDark ? "dark" : "light") : preference;
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function getServerThemePreference(): ThemePreference {
  return "system";
}

export function subscribeThemePreference(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveThemePreference(preference, prefersDark);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;

  return resolved;
}

export function saveThemePreference(preference: ThemePreference): ResolvedTheme {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The preference still applies for this page when storage is unavailable.
  }

  const resolved = applyThemePreference(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  return resolved;
}

export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var root = document.documentElement;
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var normalize = function (value) {
      return value === "light" || value === "dark" || value === "system" ? value : "system";
    };
    var read = function () {
      return normalize(window.localStorage.getItem(key));
    };
    var apply = function (preference) {
      var resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      root.dataset.theme = resolved;
      root.dataset.themePreference = preference;
      root.style.colorScheme = resolved;
    };

    apply(read());
    media.addEventListener("change", function () {
      var preference = read();
      if (preference === "system") apply(preference);
    });
    window.addEventListener("storage", function (event) {
      if (event.key === key) apply(normalize(event.newValue));
    });
  } catch (error) {}
})();
`;
