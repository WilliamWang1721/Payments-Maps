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
    }, 15000);

    globalWindow[callbackName] = () => {
      window.clearTimeout(timeoutId);
      delete globalWindow[callbackName];
      if (!window.AMap) {
        reject(new Error("高德地图脚本已返回，但 AMap 对象不存在。"));
        return;
      }
      resolve(window.AMap);
    };

    const script = document.createElement("script");
    const config = getAMapConfig();
    script.src = `https://webapi.amap.com/maps?v=${config.version}&key=${config.key}&plugin=${config.plugins.join(",")}&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      delete globalWindow[callbackName];
      reject(new Error("高德地图脚本加载失败，请检查网络、CSP 或浏览器拦截。"));
    };
    document.head.appendChild(script);
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
