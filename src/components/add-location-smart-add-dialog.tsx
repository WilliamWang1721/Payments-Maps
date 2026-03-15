import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { AlertCircle, Bot, CheckCircle2, ChevronDown, LoaderCircle, MapPinned, Send, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { loadAMap } from "@/lib/amap";
import { searchAMapPlaces } from "@/lib/amap-place-search";
import { normalizeCardOrganizationToNetwork, searchSmartAddCardCandidates, type SmartAddCardCandidate } from "@/lib/smart-add-card-search";
import { buildDefaultSmartAddReviewPrompt, computeSmartAddMissingFields, type SmartAddReviewPrompt } from "@/lib/smart-add-review";
import { cardAlbumService } from "@/services/card-album-service";
import { runSmartAddAssistant } from "@/services/ai-service";
import type {
  AMapPlaceSearchResult,
  AddLocationAssistantDraft,
  AddLocationAssistantMessage,
  AddLocationAssistantPatch
} from "@/types/add-location-assistant";
import type { CardAlbumCard } from "@/types/card-album";

interface AddLocationSmartAddDialogProps {
  brandOptions: string[];
  currentDraft: AddLocationAssistantDraft;
  enabled: boolean;
  onApplyPatch: (patch: AddLocationAssistantPatch) => void;
  onApplyPlaceSelection: (place: AMapPlaceSearchResult, preferredName?: string | null) => void;
  onOpenChange: (open: boolean) => void;
  onSubmitDraft: (draft: AddLocationAssistantDraft) => Promise<void>;
  open: boolean;
}

type ConversationItem =
  | {
      id: string;
      type: "text";
      message: AddLocationAssistantMessage;
    }
  | {
      id: string;
      type: "search-results";
      expanded: boolean;
      query: string;
      results: AMapPlaceSearchResult[];
    };

const SUGGESTED_PROMPTS = [
  "帮我添加上海凡斯附近的星巴克，Apple Pay 成功，Visa。",
  "添加浦东机场 T2 的麦当劳，MasterCard 插卡成功。"
];

const MISSING_FIELD_LABELS: Record<string, string> = {
  location: "地点",
  merchantName: "商户名称",
  transactionStatus: "支付结果",
  paymentMethod: "支付方式",
  network: "交易网络",
  bin: "卡 BIN",
  acquirer: "收单机构",
  deviceStatus: "设备状态"
};

function createConversationId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `smart-add-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildInitialMessages(enabled: boolean): AddLocationAssistantMessage[] {
  if (!enabled) {
    return [
      {
        role: "assistant",
        content: "智能添加目前处于关闭状态。你可以去设置页的 AI 板块开启 Beta，再回来用自然语言让我补全地点信息。"
      }
    ];
  }

  return [
    {
      role: "assistant",
      content: "告诉我你想添加的地点、支付结果和支付方式。我会先一步步追问，再把候选地点和确认卡片整理给你。"
    }
  ];
}

function buildInitialConversation(enabled: boolean): ConversationItem[] {
  return buildInitialMessages(enabled).map((message) => ({
    id: createConversationId(),
    type: "text",
    message
  }));
}

function mergeDraft(
  currentDraft: AddLocationAssistantDraft,
  patch: AddLocationAssistantPatch,
  place: AMapPlaceSearchResult | null,
  preferredName?: string | null
): AddLocationAssistantDraft {
  const nextDraft: AddLocationAssistantDraft = {
    ...currentDraft,
    ...patch
  };

  if (place) {
    nextDraft.lat = place.lat;
    nextDraft.lng = place.lng;
    nextDraft.address = place.address || nextDraft.address;
    nextDraft.city = place.city || place.district || place.province || nextDraft.city;
    nextDraft.name = preferredName?.trim() || nextDraft.name || place.name;
  }

  return nextDraft;
}

function formatDraftValue(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized || fallback;
}

function buildAttemptDateLabel(draft: AddLocationAssistantDraft): string {
  if (draft.attemptYear.trim() && draft.attemptMonth.trim() && draft.attemptDay.trim()) {
    return `${draft.attemptYear.trim()}-${draft.attemptMonth.trim()}-${draft.attemptDay.trim()}`;
  }

  return "待补全";
}

function TextBubble({
  message
}: {
  message: AddLocationAssistantMessage;
}): React.JSX.Element {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-[24px] px-4 py-3 text-sm leading-[1.6] shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)] ${
          isAssistant ? "bg-[var(--card)] text-[var(--foreground)]" : "bg-[var(--primary)] text-[var(--primary-foreground)]"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function SmartAddMapPreview({
  place
}: {
  place: AMapPlaceSearchResult;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const mountPreviewMap = async () => {
      if (!containerRef.current) {
        return;
      }

      try {
        const AMap = await loadAMap();
        if (cancelled || !containerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new AMap.Map(containerRef.current, {
            center: [place.lng, place.lat],
            dragEnable: false,
            doubleClickZoom: false,
            jogEnable: false,
            keyboardEnable: false,
            pitchEnable: false,
            rotateEnable: false,
            scrollWheel: false,
            touchZoom: false,
            zoom: 16,
            zoomEnable: false
          });

          markerRef.current = new AMap.Marker({
            anchor: "bottom-center",
            position: [place.lng, place.lat]
          });
          mapRef.current.add(markerRef.current);
        }

        markerRef.current?.setPosition?.([place.lng, place.lat]);
        mapRef.current?.setZoomAndCenter?.(16, [place.lng, place.lat]);
        setMapError(null);
      } catch (error) {
        setMapError(error instanceof Error ? error.message : "地图预览暂时不可用。");
      }
    };

    void mountPreviewMap();

    return () => {
      cancelled = true;
    };
  }, [place.id, place.lat, place.lng]);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap?.(null);
      mapRef.current?.destroy?.();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <MapPinned className="h-3.5 w-3.5 text-black" />
        <p className="text-sm font-semibold text-[var(--foreground)]">地点地图卡片</p>
      </div>

      <div className="smart-add-map-preview relative overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
        <div className="h-[168px] w-full" ref={containerRef} />
        {mapError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/92 px-5 text-center text-sm leading-[1.6] text-[var(--muted-foreground)]">
            {mapError}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{place.name}</p>
        <p className="text-xs leading-[1.5] text-[var(--muted-foreground)]">{place.address}</p>
        <p className="text-[11px] leading-[1.5] text-[var(--muted-foreground)]">
          {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
        </p>
      </div>
    </div>
  );
}

function SearchResultsBubble({
  entry,
  onSelect,
  onToggle,
  selectedPlace,
  selectedPlaceId
}: {
  entry: Extract<ConversationItem, { type: "search-results" }>;
  onSelect: (place: AMapPlaceSearchResult) => void;
  onToggle: (id: string) => void;
  selectedPlace: AMapPlaceSearchResult | null;
  selectedPlaceId: string | null;
}): React.JSX.Element {
  const previewPlace = selectedPlace && entry.results.some((item) => item.id === selectedPlace.id) ? selectedPlace : (entry.results[0] ?? null);

  return (
    <div className="flex justify-start">
      <div className="max-w-[82%] rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 text-left shadow-[0_18px_42px_-32px_rgba(15,23,42,0.16)]">
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => onToggle(entry.id)}
          type="button"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPinned className="h-3.5 w-3.5 text-black" />
              <p className="text-sm font-semibold text-[var(--foreground)]">地图搜索结果</p>
            </div>
            <p className="mt-1 text-xs leading-[1.5] text-[var(--muted-foreground)]">
              共找到 {entry.results.length} 个候选地点，可展开后直接选择。
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${
              entry.expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {entry.expanded ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {entry.results.map((item) => {
                const selected = item.id === selectedPlaceId;
                return (
                  <button
                    className={`ui-hover-shadow flex w-full flex-col items-start gap-2 rounded-[18px] border px-4 py-3 text-left transition-colors duration-200 ${
                      selected
                        ? "border-[var(--primary)] bg-[rgba(87,73,244,0.06)]"
                        : "border-[rgba(15,23,42,0.08)] bg-[var(--card)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    }`}
                    key={item.id}
                    onClick={() => onSelect(item)}
                    type="button"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{item.name}</p>
                        <p className="mt-1 text-xs leading-[1.5] text-[var(--muted-foreground)]">{item.address}</p>
                      </div>
                      {selected ? (
                        <span className="inline-flex h-7 items-center rounded-pill bg-[var(--primary)] px-3 text-[11px] font-semibold text-[var(--primary-foreground)]">
                          已选中
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] leading-[1.5] text-[var(--muted-foreground)]">
                      {item.city ? <span>{item.city}</span> : null}
                      {item.district ? <span>{item.district}</span> : null}
                      {item.type ? <span>{item.type}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="self-start">
              {previewPlace ? (
                <SmartAddMapPreview place={previewPlace} />
              ) : (
                <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--card)] p-4 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                  暂时没有可以展示的地点预览。
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AddLocationSmartAddDialog({
  brandOptions,
  currentDraft,
  enabled,
  onApplyPatch,
  onApplyPlaceSelection,
  onOpenChange,
  onSubmitDraft,
  open
}: AddLocationSmartAddDialogProps): React.JSX.Element {
  const [assistantMessages, setAssistantMessages] = useState<AddLocationAssistantMessage[]>(() => buildInitialMessages(enabled));
  const [conversationItems, setConversationItems] = useState<ConversationItem[]>(() => buildInitialConversation(enabled));
  const [prompt, setPrompt] = useState("");
  const [working, setWorking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCards, setAvailableCards] = useState<CardAlbumCard[]>([]);
  const [placeResults, setPlaceResults] = useState<AMapPlaceSearchResult[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [resolvedCard, setResolvedCard] = useState<SmartAddCardCandidate | null>(null);
  const [confirmationDraft, setConfirmationDraft] = useState<AddLocationAssistantDraft | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState<SmartAddReviewPrompt>(buildDefaultSmartAddReviewPrompt);
  const conversationViewportRef = useRef<HTMLDivElement | null>(null);

  const selectedPlace = useMemo(
    () => placeResults.find((item) => item.id === selectedPlaceId) || null,
    [placeResults, selectedPlaceId]
  );

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setWorking(false);
      setSubmitting(false);
      setError(null);
      setAvailableCards([]);
      setPlaceResults([]);
      setSelectedPlaceId(null);
      setMissingFields([]);
      setResolvedCard(null);
      setConfirmationDraft(null);
      setReviewPrompt(buildDefaultSmartAddReviewPrompt());
      setAssistantMessages(buildInitialMessages(enabled));
      setConversationItems(buildInitialConversation(enabled));
    }
  }, [enabled, open]);

  useEffect(() => {
    if (!open || !enabled) {
      return;
    }

    let active = true;
    void cardAlbumService
      .listCards()
      .then((cards) => {
        if (active) {
          setAvailableCards(cards);
        }
      })
      .catch(() => {
        if (active) {
          setAvailableCards([]);
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, open]);

  useEffect(() => {
    document.body.classList.toggle("smart-add-open", open);
    return () => {
      document.body.classList.remove("smart-add-open");
    };
  }, [open]);

  useEffect(() => {
    if (!conversationViewportRef.current) {
      return;
    }

    conversationViewportRef.current.scrollTo({
      top: conversationViewportRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [conversationItems, working, confirmationDraft]);

  const confirmationItems = confirmationDraft
    ? [
        ...(resolvedCard
          ? [
              {
                label: "卡册匹配",
                value: `${resolvedCard.issuer} · ${resolvedCard.title} · ${resolvedCard.organization} · BIN ${resolvedCard.bin}`
              }
            ]
          : []),
        { label: "地点", value: formatDraftValue(confirmationDraft.name, "待补全") },
        { label: "地址", value: formatDraftValue(confirmationDraft.address, "待检索") },
        { label: "城市", value: formatDraftValue(confirmationDraft.city, "待补全") },
        { label: "设备状态", value: confirmationDraft.status === "active" ? "可用" : "不可用" },
        { label: "支付结果", value: formatDraftValue(confirmationDraft.transactionStatus, "待补全") },
        { label: "支付方式", value: formatDraftValue(confirmationDraft.paymentMethod, "待补全") },
        { label: "交易网络", value: formatDraftValue(confirmationDraft.network, "待补全") },
        { label: "卡 BIN", value: formatDraftValue(confirmationDraft.bin, "待补全") },
        { label: "收单机构", value: formatDraftValue(confirmationDraft.acquirer, "待补全") },
        { label: "尝试日期", value: buildAttemptDateLabel(confirmationDraft) }
      ]
    : [];

  const handlePlaceSelection = (place: AMapPlaceSearchResult, preferredName?: string | null): void => {
    setSelectedPlaceId(place.id);
    onApplyPlaceSelection(place, preferredName);
    setConfirmationDraft((previousDraft) =>
      previousDraft ? mergeDraft(previousDraft, {}, place, preferredName || previousDraft.name || place.name) : previousDraft
    );
  };

  const toggleSearchResults = (id: string): void => {
    setConversationItems((previousItems) =>
      previousItems.map((item) => (item.type === "search-results" && item.id === id ? { ...item, expanded: !item.expanded } : item))
    );
  };

  const handleSend = async (nextPrompt?: string): Promise<void> => {
    const content = (nextPrompt ?? prompt).trim();
    if (!content || working || submitting) {
      return;
    }

    if (!enabled) {
      setAssistantMessages(buildInitialMessages(false));
      setConversationItems(buildInitialConversation(false));
      return;
    }

    const userMessage = { role: "user", content } satisfies AddLocationAssistantMessage;
    const nextAssistantMessages = [...assistantMessages, userMessage];
    const nextCardCandidates = searchSmartAddCardCandidates(content, availableCards);
    setAssistantMessages(nextAssistantMessages);
    setConversationItems((previousItems) => [
      ...previousItems,
      {
        id: createConversationId(),
        type: "text",
        message: userMessage
      }
    ]);
    setPrompt("");
    setWorking(true);
    setError(null);
    setConfirmationDraft(null);

    try {
      const response = await runSmartAddAssistant({
        brandCandidates: brandOptions,
        draft: currentDraft,
        messages: nextAssistantMessages,
        cardCandidates: nextCardCandidates
      });

      const nextResolvedCard =
        response.matchedCardId
          ? nextCardCandidates.find((candidate) => candidate.id === response.matchedCardId) || null
          : nextCardCandidates.length > 0
            ? null
            : resolvedCard;
      const resolvedCardPatch = nextResolvedCard && response.matchedCardId
        ? {
            bin: nextResolvedCard.bin,
            network: normalizeCardOrganizationToNetwork(nextResolvedCard.organization)
          }
        : {};
      const combinedDraftPatch = {
        ...response.draftPatch,
        ...resolvedCardPatch
      } satisfies AddLocationAssistantPatch;

      onApplyPatch(combinedDraftPatch);
      setResolvedCard(nextResolvedCard);

      let nextSelectedPlace: AMapPlaceSearchResult | null = selectedPlace;
      let nextSearchResults: AMapPlaceSearchResult[] = [];
      if (response.searchQuery) {
        const results = await searchAMapPlaces({
          city: combinedDraftPatch.city || currentDraft.city,
          keywords: response.searchQuery
        });

        nextSearchResults = results;
        setPlaceResults(results);

        if (results[0]) {
          nextSelectedPlace = results[0];
          handlePlaceSelection(results[0], combinedDraftPatch.name || currentDraft.name || results[0].name);
        } else {
          nextSelectedPlace = null;
          setSelectedPlaceId(null);
        }
      }

      const assistantContent =
        response.searchQuery && nextSelectedPlace
          ? `${response.assistantMessage}\n\n我已经先整理出一组候选地点，并预选了最可能的一条。`
          : response.searchQuery && !nextSelectedPlace
            ? `${response.assistantMessage}\n\n我尝试搜索了地图，但这次没有找到可靠结果。你可以补充更具体的城市、商圈或路名。`
            : response.assistantMessage;

      const assistantMessage = {
        role: "assistant",
        content:
          response.readyToSubmit
            ? `${assistantContent}\n\n我已经收齐主要信息，接下来会自动切到确认步骤。`
            : assistantContent
      } satisfies AddLocationAssistantMessage;

      setAssistantMessages((previousMessages) => [...previousMessages, assistantMessage]);
      setConversationItems((previousItems) => {
        const nextItems: ConversationItem[] = [
          ...previousItems,
          {
            id: createConversationId(),
            type: "text",
            message: assistantMessage
          }
        ];

        if (response.searchQuery && nextSearchResults.length > 0) {
          nextItems.push({
            id: createConversationId(),
            type: "search-results",
            expanded: true,
            query: response.searchQuery,
            results: nextSearchResults
          });
        }

        return nextItems;
      });

      const nextDraft = mergeDraft(currentDraft, combinedDraftPatch, nextSelectedPlace, combinedDraftPatch.name || currentDraft.name);
      const localMissingFields = computeSmartAddMissingFields(nextDraft);
      const canConfirm = response.readyToSubmit && localMissingFields.length === 0;
      setMissingFields(localMissingFields.length > 0 ? localMissingFields : response.missingFields);
      setReviewPrompt(response.confirmationPrompt ?? buildDefaultSmartAddReviewPrompt());
      setConfirmationDraft(canConfirm ? nextDraft : null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "智能添加暂时不可用。";
      setError(message);
      setConversationItems((previousItems) => [
        ...previousItems,
        {
          id: createConversationId(),
          type: "text",
          message: {
            role: "assistant",
            content: `这次智能添加没有成功：${message}`
          }
        }
      ]);
    } finally {
      setWorking(false);
      setSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (): Promise<void> => {
    if (!confirmationDraft || working || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      setConversationItems((previousItems) => [
        ...previousItems,
        {
          id: createConversationId(),
          type: "text",
          message: {
            role: "assistant",
            content: "已收到你的确认，我现在提交这条地点记录。"
          }
        }
      ]);
      await onSubmitDraft(confirmationDraft);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "提交失败，请稍后重试。";
      setError(message);
      setConversationItems((previousItems) => [
        ...previousItems,
        {
          id: createConversationId(),
          type: "text",
          message: {
            role: "assistant",
            content: `提交失败：${message}`
          }
        }
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const showReviewPanel = Boolean(confirmationDraft);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="h-[min(76vh,780px)] max-h-[calc(100vh-2.5rem)] w-[min(56vw,980px)] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-[30px] border border-[var(--border)] p-0 [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:bg-white/92 [&>button]:p-2 [&>button]:shadow-[0_18px_36px_-30px_rgba(15,23,42,0.4)] [&>button_svg]:h-5 [&>button_svg]:w-5">
        <DialogHeader className="px-6 pt-5 pb-3 sm:px-7">
          <div className="min-w-0 pr-16">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-[24px] font-semibold tracking-[-0.02em]">智能添加</DialogTitle>
              <span className="inline-flex h-6 items-center rounded-pill border border-[rgba(234,179,8,0.32)] bg-[rgba(254,249,195,0.9)] px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#854d0e]">
                Beta
              </span>
            </div>
            <DialogDescription className="mt-2 max-w-[760px] text-sm leading-[1.6] text-[var(--muted-foreground)]">
              用自然语言描述地点、支付结果和设备信息。AI 会先逐步追问，再整理地点候选和确认卡片给你。
            </DialogDescription>
            <div className="mt-3 h-px w-full bg-[var(--border)]" />
          </div>
        </DialogHeader>

        {!showReviewPanel ? (
          <section className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)]">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-7" ref={conversationViewportRef}>
              <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
                {conversationItems.map((item) => {
                  if (item.type === "text") {
                    return <TextBubble key={item.id} message={item.message} />;
                  }

                  return (
                    <SearchResultsBubble
                      entry={item}
                      key={item.id}
                      onSelect={(place) => handlePlaceSelection(place, currentDraft.name || place.name)}
                      onToggle={toggleSearchResults}
                      selectedPlace={selectedPlace}
                      selectedPlaceId={selectedPlaceId}
                    />
                  );
                })}

                {error ? (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-[24px] border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {working ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-pill border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2 text-sm text-[var(--muted-foreground)] shadow-[0_18px_42px_-32px_rgba(15,23,42,0.18)]">
                      <LoaderCircle className="h-4 w-4 animate-spin text-[var(--primary)]" />
                      <span>AI 正在整理你的描述并查找地点…</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[var(--border)] px-6 py-5 sm:px-7">
              <div className="mx-auto w-full max-w-[760px]">
                <div className="mb-3 flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((item) => (
                    <button
                      className="ui-hover-shadow inline-flex items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-3 py-2 text-xs text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                      key={item}
                      onClick={() => {
                        void handleSend(item);
                      }}
                      type="button"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-[26px] border border-[var(--border)] bg-white px-4 py-3 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.28)]">
                  <div className="flex items-end gap-3">
                    <textarea
                      className="min-h-[88px] flex-1 resize-none bg-transparent text-sm leading-[1.6] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                      disabled={!enabled || working || submitting}
                      onChange={(event) => setPrompt(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder={enabled ? "例如：帮我添加陆家嘴 Apple Store，Apple Pay 成功，Visa，今天中午测试。" : "请先去设置页开启 AI Beta 功能。"}
                      rows={4}
                      value={prompt}
                    />
                    <button
                      className="ui-hover-shadow inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:opacity-50"
                      disabled={!enabled || !prompt.trim() || working || submitting}
                      onClick={() => {
                        void handleSend();
                      }}
                      type="button"
                    >
                      {working || submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-[1.5] text-[var(--muted-foreground)]">
                    <span>支持直接提地点、支付结果、支付方式，也支持简略提到卡册里的卡。</span>
                    <span>Command + Return 发送</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)]">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-7">
              <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
                <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.22)]">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-black" />
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{reviewPrompt.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-[1.6] text-[var(--muted-foreground)]">{reviewPrompt.description}</p>

                  {missingFields.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {missingFields.map((field) => (
                        <span
                          className="inline-flex h-8 items-center rounded-pill border border-[rgba(148,163,184,0.18)] bg-white px-3 text-xs font-medium text-[var(--foreground)]"
                          key={field}
                        >
                          {MISSING_FIELD_LABELS[field] || field}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {selectedPlace ? (
                    <div className="mt-4">
                      <SmartAddMapPreview place={selectedPlace} />
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {confirmationItems.map((item) => (
                      <div className="rounded-[16px] border border-[rgba(148,163,184,0.14)] bg-[var(--card)] px-4 py-3" key={item.label}>
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{item.label}</p>
                        <p className="mt-1 text-sm leading-[1.55] text-[var(--foreground)]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {confirmationDraft?.notes.trim() ? (
                    <div className="mt-3 rounded-[16px] border border-[rgba(148,163,184,0.14)] bg-[var(--card)] px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">备注</p>
                      <p className="mt-1 text-sm leading-[1.55] text-[var(--foreground)]">{confirmationDraft.notes.trim()}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] px-6 py-4 sm:px-7">
              <div className="mx-auto flex w-full max-w-[760px] flex-wrap gap-2">
                <button
                  className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  disabled={working || submitting}
                  onClick={() => {
                    void handleConfirmSubmit();
                  }}
                  type="button"
                >
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{submitting ? "正在提交" : reviewPrompt.confirmLabel}</span>
                </button>
                <button
                  className="ui-hover-shadow inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                  disabled={working || submitting}
                  onClick={() => setConfirmationDraft(null)}
                  type="button"
                >
                  {reviewPrompt.reviseLabel}
                </button>
              </div>
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
