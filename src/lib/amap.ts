const normalizeEnvValue = (value: unknown, stripAllWhitespace = false): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  const normalized = stripAllWhitespace ? unquoted.replace(/\s+/g, "") : unquoted;
  return normalized || undefined;
};

const amapKey = normalizeEnvValue(import.meta.env.VITE_AMAP_KEY, true);
const securityJsCode =
  normalizeEnvValue(import.meta.env.VITE_AMAP_SECURITY_JS_CODE, true) ||
  normalizeEnvValue(import.meta.env.VITE_AMAP_SECURITY_KEY, true);

let amapLoadPromise: Promise<any> | null = null;
const globalWindow = window as unknown as Record<string, unknown>;
const AMAP_LOAD_TIMEOUT_MS = 15000;
const AMAP_PROXY_PATH = "/api/amap/js";

export const DEFAULT_FLUXA_MAP_CENTER: [number, number] = [121.4737, 31.2304];
export const SHANGHAI_GOVERNMENT_FALLBACK = {
  name: "上海市人民政府",
  address: "上海市黄浦区人民大道200号",
  center: [121.4737, 31.2304] as [number, number]
};

export function getAMapConfig() {
  return {
    key: amapKey,
    version: "2.0",
    plugins: ["AMap.Scale", "AMap.ToolBar"],
    securityJsCode
  };
}

function mapErrorMessage(message: string): Error {
  if (message.includes("INVALID_USER_KEY")) {
    return new Error("高德地图 Key 无效，请检查 VITE_AMAP_KEY。");
  }
  if (message.includes("INVALID_USER_SCODE")) {
    return new Error("高德地图安全密钥无效，请检查 VITE_AMAP_SECURITY_JS_CODE。");
  }
  if (message.includes("USERKEY_PLAT_NOMATCH")) {
    return new Error("高德地图域名白名单不匹配，请把当前访问域名加入高德控制台白名单。");
  }
  return new Error(message);
}

function buildAMapScriptSearchParams(callbackName: string): URLSearchParams {
  const config = getAMapConfig();
  const searchParams = new URLSearchParams({
    v: config.version,
    key: config.key ?? "",
    callback: callbackName
  });

  if (config.plugins.length > 0) {
    searchParams.set("plugin", config.plugins.join(","));
  }

  return searchParams;
}

function buildAMapScriptUrl(callbackName: string, useProxy: boolean): string {
  const searchParams = buildAMapScriptSearchParams(callbackName);
  const query = searchParams.toString();
  return useProxy ? `${AMAP_PROXY_PATH}?${query}` : `https://webapi.amap.com/maps?${query}`;
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Script load failed: ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function injectProxyScript(src: string): Promise<void> {
  const response = await fetch(src, {
    cache: "no-store",
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new Error(`同源代理返回 ${response.status}`);
  }

  const scriptText = await response.text();
  const normalizedScript = scriptText.trimStart();
  if (!normalizedScript) {
    throw new Error("同源代理返回空脚本");
  }
  if (normalizedScript.startsWith("<!DOCTYPE") || normalizedScript.startsWith("<html")) {
    throw new Error("同源代理返回了 HTML，而不是 JS SDK");
  }

  const blobUrl = URL.createObjectURL(new Blob([scriptText], { type: "application/javascript" }));

  try {
    await injectScript(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function loadAMapScript(callbackName: string): Promise<void> {
  const errors: string[] = [];

  try {
    await injectProxyScript(buildAMapScriptUrl(callbackName, true));
    return;
  } catch (error) {
    errors.push(`同源代理失败：${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await injectScript(buildAMapScriptUrl(callbackName, false));
    return;
  } catch (error) {
    errors.push(`官方域名失败：${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error(
    `高德地图脚本加载失败。${errors.join("；")}。请检查浏览器拦截、企业代理或 CSP；如果控制台显示 ERR_CONNECTION_CLOSED，请优先排查对 webapi.amap.com 的拦截。`
  );
}

export const loadAMap = async (): Promise<any> => {
  if (window.AMap) {
    return window.AMap;
  }

  if (amapLoadPromise) {
    return amapLoadPromise;
  }

  amapLoadPromise = new Promise((resolve, reject) => {
    if (!amapKey) {
      reject(new Error("高德地图未配置：缺少 VITE_AMAP_KEY。"));
      return;
    }

    if (securityJsCode) {
      window._AMapSecurityConfig = {
        securityJsCode
      };
    }

    const callbackName = `fluxaAmapInit_${Date.now()}`;
    const timeoutId = window.setTimeout(() => {
      delete globalWindow[callbackName];
      reject(new Error("高德地图加载超时，请检查网络或 Key 配置。"));
    }, AMAP_LOAD_TIMEOUT_MS);

    globalWindow[callbackName] = () => {
      window.clearTimeout(timeoutId);
      delete globalWindow[callbackName];
      if (!window.AMap) {
        reject(new Error("高德地图脚本已返回，但 AMap 对象不存在。"));
        return;
      }
      resolve(window.AMap);
    };

    void loadAMapScript(callbackName).catch((error) => {
      window.clearTimeout(timeoutId);
      delete globalWindow[callbackName];
      reject(error);
    });
  }).catch((error) => {
    amapLoadPromise = null;
    throw mapErrorMessage(error instanceof Error ? error.message : String(error));
  });

  return amapLoadPromise;
};

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_AMAP_KEY?: string;
    readonly VITE_AMAP_SECURITY_JS_CODE?: string;
    readonly VITE_AMAP_SECURITY_KEY?: string;
  }
}
