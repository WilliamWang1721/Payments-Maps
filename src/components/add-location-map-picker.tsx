import { useEffect, useRef, useState } from "react";
import type React from "react";
import { AlertCircle, LocateFixed, LoaderCircle } from "lucide-react";

import { useI18n } from "@/i18n";
import { loadAMap } from "@/lib/amap";
import { MAP_THEME_PRESETS, type MapThemeKey } from "@/lib/map-theme";
import { inferMerchantName } from "@/services/ai-service";

interface AddLocationMapPickerProps {
  autoReadMerchantNameEnabled?: boolean;
  lat: number;
  lng: number;
  mapTheme: MapThemeKey;
  autoLocateOnMount?: boolean;
  onAutoLocateHandled?: () => void;
  onMerchantInferenceStateChange?: (state: MerchantInferenceState) => void;
  onSelectionStateChange?: (selected: boolean) => void;
  onTraceEvent?: (event: TraceBannerEvent) => void;
  onChange: (next: { lat: number; lng: number; address?: string; city?: string; merchantName?: string | null }) => void;
}

interface AddressPayload {
  address?: string;
  city?: string;
  merchantName?: string | null;
}

interface PoiCandidate {
  name: string;
  type?: string;
  distance?: number | null;
}

interface ReverseGeocodePayload extends AddressPayload {
  poiCandidates: PoiCandidate[];
}

type DebugStatus = "info" | "running" | "success" | "error";

export interface TraceBannerEvent {
  status: DebugStatus;
  title: string;
  detail?: string;
}

export interface MerchantInferenceState {
  status: "idle" | "loading" | "success" | "empty" | "error" | "disabled";
  merchantName?: string | null;
  error?: string;
}

interface ApplyPointOptions {
  center?: boolean;
  resolveAddress?: boolean;
  requestId?: number;
  sourceLabel?: string;
  preserveDebugFlow?: boolean;
}

function normalizeCity(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const merged = value.join("").trim();
    return merged || undefined;
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

function extractAddressPayload(result: any): ReverseGeocodePayload {
  const regeocode = result?.regeocode;
  if (!regeocode) {
    return {
      poiCandidates: []
    };
  }

  const component = regeocode.addressComponent || {};
  const address = typeof regeocode.formattedAddress === "string" ? regeocode.formattedAddress.trim() : "";
  const city = normalizeCity(component.city) || normalizeCity(component.province);

  const poiCandidates = Array.isArray(regeocode.pois)
    ? regeocode.pois.slice(0, 5).map((poi: any) => ({
        name: typeof poi?.name === "string" ? poi.name.trim() : "",
        type: typeof poi?.type === "string" ? poi.type.trim() : undefined,
        distance: typeof poi?.distance === "number" ? poi.distance : Number(poi?.distance)
      })).filter((poi: { name: string }) => Boolean(poi.name))
    : [];

  return {
    address: address || undefined,
    city,
    poiCandidates
  };
}

export function AddLocationMapPicker({
  autoReadMerchantNameEnabled = false,
  lat,
  lng,
  mapTheme,
  autoLocateOnMount = false,
  onAutoLocateHandled,
  onMerchantInferenceStateChange,
  onSelectionStateChange,
  onTraceEvent,
  onChange
}: AddLocationMapPickerProps): React.JSX.Element {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const lastSyncedPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasTriggeredAutoLocateRef = useRef(false);
  const geocodeRequestIdRef = useRef(0);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const themePreset = MAP_THEME_PRESETS[mapTheme];

  const startDebugFlow = (requestId: number, title: string, detail?: string) => {
    if (geocodeRequestIdRef.current !== requestId) {
      return;
    }

    onTraceEvent?.({
      status: "info",
      title,
      detail
    });
  };

  const appendDebugEvent = (requestId: number, status: DebugStatus, title: string, detail?: string) => {
    if (geocodeRequestIdRef.current !== requestId) {
      return;
    }

    onTraceEvent?.({
      status,
      title,
      detail
    });
  };

  const resolveAddress = async (nextLng: number, nextLat: number): Promise<ReverseGeocodePayload> => {
    const AMap = window.AMap;
    if (!AMap) {
      return {
        poiCandidates: []
      };
    }

    const geocoder =
      geocoderRef.current ||
      (await new Promise<any>((resolve) => {
        AMap.plugin("AMap.Geocoder", () => {
          try {
            if (!geocoderRef.current) {
              geocoderRef.current = new AMap.Geocoder({
                radius: 1000,
                extensions: "all"
              });
            }
            resolve(geocoderRef.current);
          } catch {
            resolve(null);
          }
        });
      }));

    if (!geocoder) {
      return {
        poiCandidates: []
      };
    }

    return new Promise((resolve) => {
      geocoder.getAddress([nextLng, nextLat], (status: string, result: any) => {
        if (status !== "complete" || !result?.regeocode) {
          resolve({
            poiCandidates: []
          });
          return;
        }

        resolve(extractAddressPayload(result));
      });
    });
  };

  const applyPoint = async (nextLng: number, nextLat: number, options?: ApplyPointOptions) => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !Number.isFinite(nextLng) || !Number.isFinite(nextLat)) {
      return;
    }

    marker.setPosition([nextLng, nextLat]);
    if (options?.center !== false) {
      map.setZoomAndCenter?.(16, [nextLng, nextLat]);
    }

    const requestId = options?.requestId ?? ++geocodeRequestIdRef.current;
    if (options?.requestId) {
      geocodeRequestIdRef.current = requestId;
    }
    const sourceLabel = options?.sourceLabel || "已在地图上选择位置";
    if (!options?.preserveDebugFlow) {
      startDebugFlow(requestId, sourceLabel, `${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`);
    }
    appendDebugEvent(requestId, "success", "地点位置已更新", `${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`);
    onSelectionStateChange?.(true);
    if (autoReadMerchantNameEnabled && options?.resolveAddress !== false) {
      onMerchantInferenceStateChange?.({ status: "loading" });
    }
    onChange({ lat: nextLat, lng: nextLng });

    if (options?.resolveAddress === false) {
      appendDebugEvent(requestId, "info", "已跳过地址补全");
      lastSyncedPointRef.current = { lat: nextLat, lng: nextLng };
      return;
    }

    appendDebugEvent(requestId, "running", "正在完善地点信息", "正在补全地址和周边地点信息...");
    const nextAddress = await resolveAddress(nextLng, nextLat);
    if (geocodeRequestIdRef.current !== requestId) {
      return;
    }

    onChange({
      lat: nextLat,
      lng: nextLng,
      address: nextAddress.address,
      city: nextAddress.city,
      merchantName: null
    });
    lastSyncedPointRef.current = { lat: nextLat, lng: nextLng };

    if (nextAddress.address) {
      appendDebugEvent(requestId, "success", "地址已补全", nextAddress.address);
    } else {
      appendDebugEvent(requestId, "error", "暂未识别出详细地址", "你仍然可以继续手动补充地点信息。");
    }

    if (!nextAddress.address) {
      appendDebugEvent(requestId, "info", "已跳过商户识别", "需要先拿到更完整的地址信息。");
      onMerchantInferenceStateChange?.({ status: "idle" });
      return;
    }

    if (!autoReadMerchantNameEnabled) {
      appendDebugEvent(requestId, "info", "商户智能识别未开启", "你可以稍后在设置里的 AI 板块开启这个 Beta 功能。");
      onMerchantInferenceStateChange?.({ status: "disabled" });
      return;
    }

    appendDebugEvent(requestId, "running", "正在识别商户名称", "我正在根据地址和周边地点自动补全商户。");
    void inferMerchantName({
      formattedAddress: nextAddress.address,
      city: nextAddress.city,
      poiCandidates: nextAddress.poiCandidates
    }).then(({ merchantName, error }) => {
      if (geocodeRequestIdRef.current !== requestId) {
        return;
      }

      if (error) {
        appendDebugEvent(requestId, "error", "商户名称识别失败", error);
        onMerchantInferenceStateChange?.({ status: "error", error });
      } else if (merchantName) {
        appendDebugEvent(requestId, "success", "商户名称已识别", merchantName);
        onMerchantInferenceStateChange?.({ status: "success", merchantName });
      } else {
        appendDebugEvent(requestId, "success", "这里暂未识别出明确商户");
        onMerchantInferenceStateChange?.({ status: "empty" });
      }

      onChange({
        lat: nextLat,
        lng: nextLng,
        address: nextAddress.address,
        city: nextAddress.city,
        merchantName
      });
    });
  };

  useEffect(() => {
    let disposed = false;

    const initializeMap = async () => {
      if (!containerRef.current) {
        return;
      }

      setMapLoading(true);
      setMapError(null);

      try {
        const AMap = await loadAMap();
        if (disposed || !containerRef.current) {
          return;
        }

        const map = new AMap.Map(containerRef.current, {
          zoom: 15,
          center: [lng, lat],
          mapStyle: themePreset.mapStyle,
          viewMode: "2D",
          resizeEnable: true,
          dragEnable: true,
          zoomEnable: true
        });

        const marker = new AMap.Marker({
          position: [lng, lat],
          map,
          draggable: true,
          anchor: "bottom-center"
        });

        map.on("click", (event: any) => {
          const nextLng = event?.lnglat?.getLng?.();
          const nextLat = event?.lnglat?.getLat?.();
          if (typeof nextLng === "number" && typeof nextLat === "number") {
            void applyPoint(nextLng, nextLat, { center: false, sourceLabel: "已在地图上选择位置" });
          }
        });

        marker.on("dragend", (event: any) => {
          const nextLng = event?.lnglat?.getLng?.();
          const nextLat = event?.lnglat?.getLat?.();
          if (typeof nextLng === "number" && typeof nextLat === "number") {
            void applyPoint(nextLng, nextLat, { center: false, sourceLabel: "已调整地点位置" });
          }
        });

        mapRef.current = map;
        markerRef.current = marker;
        lastSyncedPointRef.current = { lat, lng };
        setMapLoading(false);
      } catch (error) {
        if (disposed) {
          return;
        }

        setMapError(error instanceof Error ? error.message : "地图暂时不可用，请稍后重试。");
        setMapLoading(false);
      }
    };

    void initializeMap();

    return () => {
      disposed = true;
      try {
        markerRef.current?.setMap?.(null);
      } catch {
        // ignore cleanup failures
      }
      try {
        mapRef.current?.destroy?.();
      } catch {
        // ignore cleanup failures
      }

      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const lastSyncedPoint = lastSyncedPointRef.current;
    if (!map || !marker) {
      return;
    }

    if (lastSyncedPoint && Math.abs(lastSyncedPoint.lat - lat) < 0.000001 && Math.abs(lastSyncedPoint.lng - lng) < 0.000001) {
      return;
    }

    marker.setPosition([lng, lat]);
    map.setCenter?.([lng, lat]);
    lastSyncedPointRef.current = { lat, lng };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.setMapStyle) {
      return;
    }

    map.setMapStyle(themePreset.mapStyle);
  }, [themePreset.mapStyle]);

  useEffect(() => {
    if (!autoLocateOnMount || mapLoading || mapError || hasTriggeredAutoLocateRef.current) {
      return;
    }

    hasTriggeredAutoLocateRef.current = true;
    onAutoLocateHandled?.();
    void handleLocate();
  }, [autoLocateOnMount, mapError, mapLoading, onAutoLocateHandled]);

  const handleLocate = async (): Promise<void> => {
    if (!navigator.geolocation) {
      const requestId = geocodeRequestIdRef.current + 1;
      geocodeRequestIdRef.current = requestId;
      startDebugFlow(requestId, "正在定位当前位置");
      appendDebugEvent(requestId, "error", "当前位置不可用", "当前浏览器暂不支持定位。");
      setLocateError("当前浏览器暂不支持定位。");
      return;
    }

    setLocating(true);
    setLocateError(null);
    const requestId = geocodeRequestIdRef.current + 1;
    geocodeRequestIdRef.current = requestId;
    startDebugFlow(requestId, "正在定位当前位置", "正在请求定位权限并获取当前位置。");
    appendDebugEvent(requestId, "running", "正在等待定位结果");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      appendDebugEvent(
        requestId,
        "success",
        "已获取当前位置",
        `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
      );
      await applyPoint(position.coords.longitude, position.coords.latitude, {
        requestId,
        sourceLabel: "已定位到当前位置",
        preserveDebugFlow: true
      });
    } catch (error) {
      appendDebugEvent(
        requestId,
        "error",
        "定位失败",
        error instanceof Error ? error.message : "暂时无法获取当前位置，请检查浏览器权限后重试。"
      );
      setLocateError(error instanceof Error ? error.message : "暂时无法获取当前位置，请检查浏览器权限后重试。");
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute bottom-6 right-6 z-10 flex flex-col items-end gap-2">
        {locateError ? (
          <div className="flex max-w-[280px] items-start gap-2 rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-3 py-2 text-xs leading-5 text-[#8f291a] shadow-[0_12px_32px_-24px_rgba(143,41,26,0.4)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t(locateError)}</span>
          </div>
        ) : null}

        <button
          className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-[rgba(255,255,255,0.94)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]"
          disabled={locating}
          onClick={() => void handleLocate()}
          type="button"
        >
          {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            <span>{locating ? t("定位中...") : t("定位当前位置")}</span>
        </button>
      </div>

      {mapLoading ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[linear-gradient(180deg,#fafafacc,#f3f4f6f0)]">
          <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
            <LoaderCircle className="h-7 w-7 animate-spin" />
            <p className="text-sm">{t("正在载入地图...")}</p>
          </div>
        </div>
      ) : null}

      {mapError ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[linear-gradient(180deg,#fafafae6,#f3f4f6f2)] px-6">
          <div className="max-w-[420px] rounded-m border border-[#f3bbb2] bg-white px-5 py-4 text-center shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-semibold text-[#8f291a]">{t("地图加载失败")}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{t(mapError)}</p>
          </div>
        </div>
      ) : null}

      <div className="h-full w-full" ref={containerRef} />
    </div>
  );
}
