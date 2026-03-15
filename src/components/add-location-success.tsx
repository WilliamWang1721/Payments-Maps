import type React from "react";
import { CheckCircle2, List, MapPinPlus, MoveRight } from "lucide-react";

import { useI18n } from "@/i18n";
import type { LocationRecord } from "@/types/location";

interface AddLocationSuccessProps {
  location: LocationRecord | null;
  onAddAnother: () => void;
  onBack: () => void;
  onViewDetail: () => void;
}

export function AddLocationSuccess({ location, onAddAnother, onBack, onViewDetail }: AddLocationSuccessProps): React.JSX.Element {
  const { t } = useI18n();
  const merchantName = location?.name || "地点";
  const networkLabel = location?.brand || "未知";
  const statusLabel = location?.status === "inactive" ? t("Inactive") : t("Active");

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="flex h-full w-full min-w-0 flex-1 flex-col">
        <div className="flex h-full min-h-0 flex-1 flex-col justify-center rounded-[32px] border border-[var(--border)] bg-[var(--card)] px-6 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)] text-[var(--color-success-foreground)]">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.4px] text-[var(--foreground)]">{t("Location Added Successfully")}</h1>
            <p className="max-w-[680px] text-sm leading-[1.45] text-[var(--muted-foreground)]">{t("Your location has been saved and is now available in the list and map views. You can continue adding another location, jump to detail, or return to your previous page.")}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Merchant")}</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{merchantName}</p>
            </article>
            <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Network")}</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{networkLabel}</p>
            </article>
            <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Status")}</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{statusLabel}</p>
            </article>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] bg-white px-5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]"
              onClick={onBack}
              type="button"
            >
              <List className="h-4 w-4" />
              <span>{t("Back to List")}</span>
            </button>

            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] bg-[var(--secondary)] px-5 text-sm font-medium text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)] [--hover-outline:#2a293336]"
              onClick={onViewDetail}
              type="button"
            >
              <MoveRight className="h-4 w-4" />
              <span>{t("View Detail")}</span>
            </button>

            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73]"
              onClick={onAddAnother}
              type="button"
            >
              <MapPinPlus className="h-4 w-4" />
              <span>{t("Add Another Location")}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
