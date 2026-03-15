import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Check, ChevronLeft, ChevronRight, Globe, Grid3X3, LayoutList, Plus, Search, UserRound, X } from "lucide-react";

import { useCardAlbum } from "@/hooks/use-card-album";
import { useI18n } from "@/i18n";
import type { CardAlbumCard, CardAlbumScope, CreateCardAlbumCardInput } from "@/types/card-album";

type ViewMode = "grid" | "list";

interface CardsAlbumWebProps {
  onCreateModeChange?: (next: boolean) => void;
  startInCreateMode?: boolean;
}

const INITIAL_FORM: CreateCardAlbumCardInput = {
  issuer: "",
  title: "",
  bin: "",
  organization: "",
  groupName: "",
  description: ""
};

function getCardIdentityKey(card: Pick<CardAlbumCard, "issuer" | "title" | "bin" | "organization">): string {
  return [card.issuer.trim(), card.title.trim(), card.bin.trim(), card.organization.trim()].join("::").toLowerCase();
}

function matchesSearch(card: CardAlbumCard, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;

  return [card.issuer, card.organization, card.title, card.groupName, card.description, card.bin].join(" ").toLowerCase().includes(normalized);
}

export function CardsAlbumWeb({ onCreateModeChange, startInCreateMode = false }: CardsAlbumWebProps): React.JSX.Element {
  const { t } = useI18n();
  const { cards, loading, error, addingCardId, personalCardKeys, addToPersonal, createPersonalCard } = useCardAlbum();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<CardAlbumScope>("personal");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(startInCreateMode);
  const [form, setForm] = useState<CreateCardAlbumCardInput>(INITIAL_FORM);

  const filteredCards = useMemo(
    () => cards.filter((card) => card.scope === scope).filter((card) => matchesSearch(card, search)),
    [cards, scope, search]
  );

  const pageSize = viewMode === "grid" ? 6 : 3;
  const pageCount = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedCards = filteredCards.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isSubmitting = addingCardId === "new";

  useEffect(() => {
    if (startInCreateMode) {
      setScope("personal");
      setIsCreating(true);
    }
  }, [startInCreateMode]);

  useEffect(() => {
    setPage(1);
  }, [scope, search, viewMode]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const openCreatePanel = (): void => {
    setFeedback(null);
    setScope("personal");
    setIsCreating(true);
    onCreateModeChange?.(true);
  };

  const closeCreatePanel = (): void => {
    setIsCreating(false);
    setForm(INITIAL_FORM);
    onCreateModeChange?.(false);
  };

  const handleFormChange = (field: keyof CreateCardAlbumCardInput, value: string): void => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddToPersonal = async (card: CardAlbumCard): Promise<void> => {
    try {
      const result = await addToPersonal(card);
      setFeedback(result.added ? "已添加到我的卡册" : "这张卡已经在我的卡册里");
      setScope("personal");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "添加卡片失败。");
    }
  };

  const handleCreateCard = async (): Promise<void> => {
    try {
      await createPersonalCard(form);
      setFeedback("新卡片已写入我的卡册");
      closeCreatePanel();
      setScope("personal");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "添加卡片失败。");
    }
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-[var(--background)] p-3 sm:p-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 rounded-m bg-[var(--background)]">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex h-8 w-full min-w-0 items-center gap-2 px-0 py-1.5 xl:max-w-[560px]">
            <Search className="h-4 w-4 text-[var(--foreground)]" />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-sm leading-[1.4286] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search cards by last 4 digits, alias...")}
              value={search}
            />
            <button
              aria-label={t("Clear")}
              className="inline-flex h-4 w-4 items-center justify-center text-[var(--foreground)]"
              onClick={() => setSearch("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            <button
              className={`ui-hover-shadow inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-200 sm:w-auto ${
                scope === "public"
                  ? "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
                  : "bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-hover)]"
              }`}
              onClick={() => setScope("public")}
              type="button"
            >
              <Globe className="h-4 w-4" />
              <span>{t("Public Card")}</span>
            </button>
            <button
              className={`ui-hover-shadow inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-200 sm:w-auto ${
                scope === "personal"
                  ? "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
                  : "bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-hover)]"
              }`}
              onClick={() => setScope("personal")}
              type="button"
            >
              <UserRound className="h-4 w-4" />
              <span>{t("My Card")}</span>
            </button>
            <button
              className="ui-hover-shadow inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--accent-hover)] sm:w-auto"
              onClick={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
              type="button"
            >
              {viewMode === "grid" ? <LayoutList className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              <span>{viewMode === "grid" ? t("List") : t("Grid")}</span>
            </button>
            <button
              className="ui-hover-shadow inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] sm:w-auto"
              onClick={openCreatePanel}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>新增个人卡片</span>
            </button>
          </div>
        </div>

        {isCreating ? (
          <article className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">添加个人卡片</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">填写后会直接写入 Supabase 的个人卡册数据。</p>
              </div>
              <button
                className="ui-hover-shadow inline-flex h-10 items-center justify-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={closeCreatePanel}
                type="button"
              >
                取消
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-[var(--foreground)]">
                <span>发卡行</span>
                <input
                  className="rounded-2xl border border-[var(--input)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--primary)]"
                  onChange={(event) => handleFormChange("issuer", event.target.value)}
                  placeholder="例如：招商银行"
                  type="text"
                  value={form.issuer}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-[var(--foreground)]">
                <span>卡片名称</span>
                <input
                  className="rounded-2xl border border-[var(--input)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--primary)]"
                  onChange={(event) => handleFormChange("title", event.target.value)}
                  placeholder="例如：经典白金卡"
                  type="text"
                  value={form.title}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-[var(--foreground)]">
                <span>BIN</span>
                <input
                  className="rounded-2xl border border-[var(--input)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--primary)]"
                  onChange={(event) => handleFormChange("bin", event.target.value)}
                  placeholder="例如：622848"
                  type="text"
                  value={form.bin}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-[var(--foreground)]">
                <span>卡组织</span>
                <input
                  className="rounded-2xl border border-[var(--input)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--primary)]"
                  onChange={(event) => handleFormChange("organization", event.target.value)}
                  placeholder="例如：MasterCard"
                  type="text"
                  value={form.organization}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-[var(--foreground)]">
                <span>卡片等级</span>
                <input
                  className="rounded-2xl border border-[var(--input)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--primary)]"
                  onChange={(event) => handleFormChange("groupName", event.target.value)}
                  placeholder="例如：白金卡"
                  type="text"
                  value={form.groupName}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-[var(--foreground)] md:col-span-2">
                <span>描述</span>
                <textarea
                  className="min-h-[96px] rounded-2xl border border-[var(--input)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--primary)]"
                  onChange={(event) => handleFormChange("description", event.target.value)}
                  placeholder="选填：补充权益、用途或备注"
                  rows={4}
                  value={form.description || ""}
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                className="ui-hover-shadow inline-flex h-11 items-center justify-center rounded-pill bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:opacity-60"
                disabled={isSubmitting}
                onClick={() => void handleCreateCard()}
                type="button"
              >
                {isSubmitting ? "正在保存..." : "保存到我的卡册"}
              </button>
            </div>
          </article>
        ) : null}

        {error ? (
          <div className="rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{error}</div>
        ) : null}
        {feedback ? (
          <div className="rounded-m border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)]">{feedback}</div>
        ) : null}

        {loading ? (
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
            正在加载卡册数据...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
            {scope === "public" ? "公共卡册暂无数据。" : "我的卡册还没有卡片。"}
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-[repeat(auto-fit,minmax(260px,1fr))]" : "grid-cols-1"}`}>
            {pagedCards.map((card) => {
              const personalCardExists = personalCardKeys.has(getCardIdentityKey(card));
              const isAdding = addingCardId === card.id;

              return (
                <article className="flex min-h-[200px] min-w-0 flex-col justify-between rounded-[40px] border border-[var(--border)] bg-[var(--card)] p-6" key={card.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[13px] font-semibold tracking-[0.5px] text-[var(--muted-foreground)]">{card.issuer}</p>
                    <p className="shrink-0 text-lg font-extrabold italic text-[var(--foreground)]">{card.organization}</p>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[24px] font-semibold leading-[1.2] text-[var(--foreground)]">{card.title}</h3>
                      <p className="mt-2 truncate text-[13px] font-medium text-[var(--muted-foreground)]">{card.groupName}</p>
                      <p className="mt-2 truncate text-xs text-[var(--muted-foreground)]">BIN {card.bin} · 更新于 {card.updatedAt}</p>
                      {card.description ? <p className="mt-2 line-clamp-2 text-xs text-[var(--muted-foreground)]">{card.description}</p> : null}
                    </div>

                    {scope === "public" ? (
                      <button
                        aria-label={personalCardExists ? "已在我的卡册中" : `添加 ${card.title} 到我的卡册`}
                        className={`ui-hover-shadow inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[16px] transition-colors duration-200 ${
                          personalCardExists
                            ? "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
                            : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73] [--hover-outline-active:#372cb8a6]"
                        }`}
                        disabled={personalCardExists || isAdding}
                        onClick={() => void handleAddToPersonal(card)}
                        type="button"
                      >
                        {personalCardExists ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex w-full flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13px] text-[var(--muted-foreground)]">共 {filteredCards.length} 张卡片</p>
          {pageCount > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
                disabled={safePage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                type="button"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>{t("Previous")}</span>
              </button>

              {Array.from({ length: pageCount }, (_, index) => index + 1).map((itemPage) => (
                <button
                  className={`ui-hover-shadow inline-flex h-10 w-10 items-center justify-center rounded-pill border text-sm transition-colors duration-200 ${
                    safePage === itemPage
                      ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                      : "border-transparent text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                  }`}
                  key={itemPage}
                  onClick={() => setPage(itemPage)}
                  type="button"
                >
                  {itemPage}
                </button>
              ))}

              <button
                className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
                disabled={safePage === pageCount}
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                type="button"
              >
                <span>{t("Next")}</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
