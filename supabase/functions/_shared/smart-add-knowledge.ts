interface SmartAddFieldGuideEntry {
  name: string;
  purpose: string;
  required: boolean;
}

interface SmartAddMerchantKnowledgeEntry {
  acquirerHint?: string;
  askIfMissing?: string;
  brandNames: string[];
  id: string;
  merchantKeywords: string[];
  notes: string;
}

export const SMART_ADD_FIELD_GUIDE: SmartAddFieldGuideEntry[] = [
  { name: "name", purpose: "地点或商户名称，用于创建最终地点记录。", required: true },
  { name: "address", purpose: "地图确认后的详细地址，用于定位和去重。", required: true },
  { name: "city", purpose: "城市字段，用于地图搜索和筛选。", required: true },
  { name: "brand", purpose: "商户品牌，例如 Starbucks、McDonald's，不是发卡行。", required: false },
  { name: "bin", purpose: "用户支付卡 BIN，可由卡册匹配结果补全。", required: false },
  { name: "network", purpose: "卡组织，例如 Visa、MasterCard。", required: true },
  { name: "paymentMethod", purpose: "支付方式，例如 Apple Pay、Tap、Insert。", required: true },
  { name: "transactionStatus", purpose: "支付结果。除非用户明确说失败/未知，否则默认 Success。", required: true },
  { name: "status", purpose: "设备状态。除非用户明确说故障/不可用，否则默认 active。", required: true },
  { name: "cvm", purpose: "持卡人验证方式，例如 PIN、No CVM、Signature。", required: false },
  { name: "acquiringMode", purpose: "收单模式，例如 EDC 或 DCC。", required: false },
  { name: "acquirer", purpose: "商户 POS 的收单机构或服务商，不是发卡行。", required: false },
  { name: "posModel", purpose: "POS 机具型号。", required: false },
  { name: "checkoutLocation", purpose: "结账位置，例如人工收银或自助收银。", required: false },
  { name: "attemptYear/attemptMonth/attemptDay", purpose: "测试日期，未提及时沿用当前默认日期。", required: false },
  { name: "notes", purpose: "补充说明，只存放额外背景，不要塞结构化字段。", required: false }
];

const SMART_ADD_MERCHANT_KNOWLEDGE: SmartAddMerchantKnowledgeEntry[] = [
  {
    id: "mcdonalds-center-holdings-pos",
    brandNames: ["McDonald's"],
    merchantKeywords: ["mcdonald", "麦当劳"],
    acquirerHint: "中心控股",
    askIfMissing: "若用户在添加麦当劳地点且未说明收单机构，请优先追问这台 POS 是否为中心控股提供的特殊 POS 机；若用户表示不知道，可把 acquirer 记为“未知”。",
    notes: "麦当劳场景下，很多 POS 会由中心控股提供，收单机构字段优先确认这一点。"
  }
];

function normalizeString(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveSmartAddMerchantKnowledge(input: {
  brand?: string;
  merchantName?: string;
  conversationText?: string;
}): SmartAddMerchantKnowledgeEntry[] {
  const haystack = [input.brand, input.merchantName, input.conversationText].map(normalizeString).join(" ");

  return SMART_ADD_MERCHANT_KNOWLEDGE.filter((entry) => {
    return entry.brandNames.some((brand) => haystack.includes(normalizeString(brand))) ||
      entry.merchantKeywords.some((keyword) => haystack.includes(normalizeString(keyword)));
  });
}
