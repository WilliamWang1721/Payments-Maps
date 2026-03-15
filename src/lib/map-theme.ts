export type MapThemeKey =
  | "normal"
  | "dark"
  | "light"
  | "whitesmoke"
  | "fresh"
  | "grey"
  | "graffiti"
  | "macaron"
  | "blue"
  | "darkblue"
  | "wine"
  | "apple";

export type MarkerVariant = "badge" | "pin" | "minimal" | "apple";

export interface MapThemePreset {
  key: MapThemeKey;
  label: string;
  mapStyle: string;
  markerVariant: MarkerVariant;
}

export const MAP_THEME_STORAGE_KEY = "fluxa_map_theme";
export const DEFAULT_MAP_THEME: MapThemeKey = "macaron";

export const MAP_THEME_PRESETS: Record<MapThemeKey, MapThemePreset> = {
  normal: { key: "normal", label: "默认", mapStyle: "amap://styles/normal", markerVariant: "badge" },
  dark: { key: "dark", label: "深色", mapStyle: "amap://styles/dark", markerVariant: "minimal" },
  light: { key: "light", label: "明亮", mapStyle: "amap://styles/light", markerVariant: "badge" },
  whitesmoke: { key: "whitesmoke", label: "浅色", mapStyle: "amap://styles/whitesmoke", markerVariant: "badge" },
  fresh: { key: "fresh", label: "清爽", mapStyle: "amap://styles/fresh", markerVariant: "pin" },
  grey: { key: "grey", label: "灰阶", mapStyle: "amap://styles/grey", markerVariant: "minimal" },
  graffiti: { key: "graffiti", label: "涂鸦", mapStyle: "amap://styles/graffiti", markerVariant: "pin" },
  macaron: { key: "macaron", label: "马卡龙", mapStyle: "amap://styles/macaron", markerVariant: "badge" },
  blue: { key: "blue", label: "蓝调", mapStyle: "amap://styles/blue", markerVariant: "pin" },
  darkblue: { key: "darkblue", label: "暗蓝", mapStyle: "amap://styles/darkblue", markerVariant: "minimal" },
  wine: { key: "wine", label: "酒红", mapStyle: "amap://styles/wine", markerVariant: "pin" },
  apple: { key: "apple", label: "Apple 风格（推荐）", mapStyle: "amap://styles/whitesmoke", markerVariant: "apple" }
};

export const MAP_THEME_OPTIONS = (Object.keys(MAP_THEME_PRESETS) as MapThemeKey[]).map((key) => ({
  value: key,
  label: MAP_THEME_PRESETS[key].label
}));

export function isMapThemeKey(value: string): value is MapThemeKey {
  return value in MAP_THEME_PRESETS;
}
