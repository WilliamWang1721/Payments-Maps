import type { AddLocationAssistantDraft } from "@/types/add-location-assistant";

export interface SmartAddReviewPrompt {
  title: string;
  description: string;
  confirmLabel: string;
  reviseLabel: string;
}

function includesMcDonaldsKeyword(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("mcdonald") || normalized.includes("麦当劳");
}

export function requiresAcquirerConfirmation(draft: AddLocationAssistantDraft): boolean {
  return includesMcDonaldsKeyword(draft.brand) || includesMcDonaldsKeyword(draft.name);
}

export function computeSmartAddMissingFields(draft: AddLocationAssistantDraft): string[] {
  const missing = new Set<string>();

  if (!draft.name.trim()) {
    missing.add("merchantName");
  }

  if (!draft.address.trim() || !draft.city.trim()) {
    missing.add("location");
  }

  if (!draft.paymentMethod.trim()) {
    missing.add("paymentMethod");
  }

  if (!draft.network.trim()) {
    missing.add("network");
  }

  if (!draft.transactionStatus.trim()) {
    missing.add("transactionStatus");
  }

  if (!draft.status.trim()) {
    missing.add("deviceStatus");
  }

  if (requiresAcquirerConfirmation(draft) && !draft.acquirer.trim()) {
    missing.add("acquirer");
  }

  return [...missing];
}

export function buildDefaultSmartAddReviewPrompt(): SmartAddReviewPrompt {
  return {
    title: "请确认这条地点信息",
    description: "所有关键字段已经收齐。确认无误后即可直接提交；如果有偏差，可以返回继续补充。",
    confirmLabel: "确认并提交",
    reviseLabel: "继续补充"
  };
}
