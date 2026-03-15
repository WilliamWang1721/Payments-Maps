import { useMemo, useState } from "react";
import type React from "react";
import { ChevronLeft, ChevronRight, Globe, Grid3X3, LayoutList, Plus, Search, UserRound, X } from "lucide-react";

import { useI18n } from "@/i18n";

type CardScope = "public" | "my";
type ViewMode = "grid" | "list";

interface CardAlbumItem {
  id: string;
  issuer: string;
  network: string;
  name: string;
  type: string;
  scope: CardScope;
  active: boolean;
}

const CARD_ITEMS: CardAlbumItem[] = [
  {
    id: "card-1",
    issuer: "美国 · 摩根大通",
    network: "VISA",
    name: "蓝宝石 Reserve",
    type: "Virtual Credit Card",
    scope: "my",
    active: true
  },
  {
    id: "card-2",
    issuer: "美国 · 美国运通",
    network: "AMEX",
    name: "白金卡",
    type: "Physical Charge Card",
    scope: "public",
    active: true
  },
  {
    id: "card-3",
    issuer: "中国香港 · 花旗银行",
    network: "MasterCard",
    name: "寰宇里程卡",
    type: "World Elite Card",
    scope: "public",
    active: false
  },
  {
    id: "card-4",
    issuer: "美国 · 高盛",
    network: "MasterCard",
    name: "Apple Card",
    type: "Virtual Credit Card",
    scope: "my",
    active: false
  },
  {
    id: "card-5",
    issuer: "中国 · 工商银行",
    network: "UnionPay",
    name: "黑金卡",
    type: "Physical Credit Card",
    scope: "my",
    active: false
  },
  {
    id: "card-6",
    issuer: "日本 · 乐天银行",
    network: "JCB",
    name: "尊享卡",
    type: "Physical Credit Card",
    scope: "public",
    active: false
  }
];

function matchesSearch(card: CardAlbumItem, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  return `${card.issuer} ${card.network} ${card.name} ${card.type}`.toLowerCase().includes(normalized);
}

export function CardsAlbumWeb(): React.JSX.Element {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<CardScope>("my");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({});

  const filteredCards = useMemo(
    () => CARD_ITEMS.filter((card) => card.scope === scope).filter((card) => matchesSearch(card, search)),
    [scope, search]
  );

  const pageSize = viewMode === "grid" ? 6 : 3;
  const pageCount = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedCards = filteredCards.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = filteredCards.filter((card) => card.active).length;

  const handleAdd = (id: string): void => {
    setAddedCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-[var(--background)] p-3 sm:p-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 rounded-m bg-[var(--background)]">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex h-8 w-full min-w-0 items-center gap-2 px-0 py-1.5 xl:max-w-[560px]">
            <Search className="h-4 w-4 text-[var(--foreground)]" />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-sm leading-[1.4286] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("Search cards by last 4 digits, alias...")}
              value={search}
            />
            <button
              aria-label={t("Clear")}
              className="inline-flex h-4 w-4 items-center justify-center text-[var(--foreground)]"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
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
              onClick={() => {
                setScope("public");
                setPage(1);
              }}
              type="button"
            >
              <Globe className="h-4 w-4" />
              <span>{t("Public Card")}</span>
            </button>
            <button
              className={`ui-hover-shadow inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-200 sm:w-auto ${
                scope === "my"
                  ? "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
                  : "bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-hover)]"
              }`}
              onClick={() => {
                setScope("my");
                setPage(1);
              }}
              type="button"
            >
              <UserRound className="h-4 w-4" />
              <span>{t("My Card")}</span>
            </button>
            <button
              className="ui-hover-shadow inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--accent-hover)] sm:w-auto"
              onClick={() => {
                setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
                setPage(1);
              }}
              type="button"
            >
              {viewMode === "grid" ? <LayoutList className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              <span>{viewMode === "grid" ? t("List") : t("Grid")}</span>
            </button>
          </div>
        </div>

        <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-[repeat(auto-fit,minmax(260px,1fr))]" : "grid-cols-1"}`}>
          {pagedCards.map((card) => (
            <article className="flex min-h-[200px] min-w-0 flex-col justify-between rounded-[40px] border border-[var(--border)] bg-[var(--card)] p-6" key={card.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[13px] font-semibold tracking-[0.5px] text-[var(--muted-foreground)]">{card.issuer}</p>
                <p className="shrink-0 text-lg font-extrabold italic text-[var(--foreground)]">{card.network}</p>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[24px] font-semibold leading-[1.2] text-[var(--foreground)]">{card.name}</h3>
                  <p className="mt-2 truncate text-[13px] font-medium text-[var(--muted-foreground)]">{t(card.type)}</p>
                  {(addedCounts[card.id] ?? 0) > 0 ? (
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      {t("Added")} {(addedCounts[card.id] ?? 0)} {t((addedCounts[card.id] ?? 0) > 1 ? "times" : "time")}
                    </p>
                  ) : null}
                </div>
                <button
                  aria-label={`${t("Add")} ${card.name}`}
                  className="ui-hover-shadow inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[16px] bg-[var(--primary)] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73] [--hover-outline-active:#372cb8a6]"
                  onClick={() => handleAdd(card.id)}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-auto flex w-full flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            {t("Showing")} {activeCount} {t("active cards")}
          </p>
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
        </div>
      </div>
    </section>
  );
}
