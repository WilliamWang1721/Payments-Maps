const BRAND_KEYWORDS = [
  "麦当劳",
  "肯德基",
  "星巴克",
  "瑞幸",
  "喜茶",
  "奈雪",
  "蜜雪冰城",
  "古茗",
  "茶百道",
  "霸王茶姬",
  "汉堡王",
  "必胜客",
  "海底捞",
  "全家",
  "罗森",
  "7-11",
  "7-eleven",
  "便利蜂",
  "沃尔玛",
  "山姆",
  "盒马",
  "永辉",
  "优衣库",
  "屈臣氏",
  "nike",
  "adidas",
  "apple",
  "mcdonald",
  "starbucks"
];

const STORE_HINTS = [
  "店",
  "便利店",
  "超市",
  "咖啡",
  "餐厅",
  "饭店",
  "酒楼",
  "酒店",
  "宾馆",
  "药房",
  "药店",
  "银行",
  "书店",
  "影城",
  "旗舰店",
  "体验店",
  "餐吧",
  "茶饮",
  "奶茶",
  "烘焙",
  "面包房",
  "火锅",
  "烤肉",
  "商店",
  "门店"
];

const NEGATIVE_ENDINGS = [
  "公园",
  "北门",
  "南门",
  "东门",
  "西门",
  "入口",
  "出口",
  "停车场",
  "地铁站",
  "公交站",
  "学校",
  "大学",
  "中学",
  "小学",
  "医院",
  "社区",
  "小区",
  "花园",
  "大厦",
  "广场",
  "中心",
  "体育馆",
  "体育公园",
  "北苑",
  "南苑",
  "街",
  "路",
  "大道",
  "胡同",
  "巷",
  "弄"
];

const ADDRESS_TOKENS = [
  "省",
  "市",
  "区",
  "县",
  "镇",
  "乡",
  "街道",
  "街",
  "路",
  "大道",
  "巷",
  "弄",
  "胡同",
  "号",
  "栋",
  "座",
  "楼",
  "单元",
  "室",
  "村",
  "社区"
];

const POSITIVE_POI_TYPES = ["餐饮服务", "购物服务", "生活服务", "住宿服务", "金融保险服务", "公司企业"];
const NEGATIVE_POI_TYPES = ["风景名胜", "地名地址信息", "交通设施服务", "科教文化服务", "政府机构及社会团体", "公共设施", "商务住宅"];

interface MerchantExtractionInput {
  formattedAddress?: string;
  addressComponent?: Record<string, unknown>;
  pois?: Array<Record<string, unknown>>;
}

interface MerchantCandidate {
  name: string;
  score: number;
}

function normalizeText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join("").trim();
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function normalizeCandidate(value: string): string {
  return value
    .replace(/[“”"'`]/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/^[的在位于靠近内里]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function endsWithAny(text: string, endings: string[]): boolean {
  return endings.some((ending) => text.endsWith(ending));
}

function scoreMerchantName(candidate: string): number {
  if (!candidate) {
    return -100;
  }

  let score = 0;
  const normalizedCandidate = candidate.toLowerCase();

  if (candidate.length >= 2 && candidate.length <= 28) {
    score += 10;
  } else {
    score -= 20;
  }

  if (includesAny(candidate, BRAND_KEYWORDS)) {
    score += 60;
  }

  if (includesAny(candidate, STORE_HINTS)) {
    score += 42;
  }

  if (/[A-Za-z]/.test(candidate)) {
    score += 8;
  }

  if (includesAny(candidate, ADDRESS_TOKENS)) {
    score -= 35;
  }

  if (endsWithAny(normalizedCandidate, NEGATIVE_ENDINGS) && !includesAny(candidate, ["店", "餐厅", "咖啡", "超市", "酒店", "银行", "药房", "书店"])) {
    score -= 65;
  }

  if (/^\d+$/.test(candidate) || /^[A-Za-z0-9]+$/.test(candidate)) {
    score -= 30;
  }

  if (/^(?:第?\d+|[A-Za-z]?\d+)(?:号|层|栋|座|室)$/.test(candidate)) {
    score -= 50;
  }

  return score;
}

function scorePoiType(type: string): number {
  if (!type) {
    return 0;
  }

  if (POSITIVE_POI_TYPES.some((keyword) => type.includes(keyword))) {
    return 16;
  }

  if (NEGATIVE_POI_TYPES.some((keyword) => type.includes(keyword))) {
    return -24;
  }

  return 0;
}

function buildAddressPrefixes(addressComponent: Record<string, unknown>): string[] {
  const province = normalizeText(addressComponent.province);
  const city = normalizeText(addressComponent.city) || province;
  const district = normalizeText(addressComponent.district);
  const township = normalizeText(addressComponent.township);
  const street = normalizeText((addressComponent.streetNumber as { street?: unknown } | undefined)?.street);
  const number = normalizeText((addressComponent.streetNumber as { number?: unknown } | undefined)?.number);

  const segments = {
    province,
    city,
    district,
    township,
    street,
    streetWithNumber: `${street}${number}`.trim()
  };

  return Array.from(
    new Set(
      [
        `${segments.province}${segments.city}${segments.district}${segments.township}${segments.streetWithNumber}`,
        `${segments.province}${segments.city}${segments.district}${segments.township}${segments.street}`,
        `${segments.city}${segments.district}${segments.township}${segments.streetWithNumber}`,
        `${segments.city}${segments.district}${segments.township}${segments.street}`,
        `${segments.district}${segments.township}${segments.streetWithNumber}`,
        `${segments.district}${segments.township}${segments.street}`,
        `${segments.township}${segments.streetWithNumber}`,
        `${segments.township}${segments.street}`,
        segments.streetWithNumber,
        segments.street
      ].filter(Boolean)
    )
  ).sort((left, right) => right.length - left.length);
}

function extractCandidateFromFormattedAddress(formattedAddress: string, addressComponent: Record<string, unknown>): string | null {
  if (!formattedAddress) {
    return null;
  }

  const normalizedAddress = formattedAddress.replace(/\s+/g, "").trim();
  const addressWithoutParenthesis = normalizedAddress.replace(/[（(][^）)]*[）)]/g, "");
  const prefixes = buildAddressPrefixes(addressComponent);

  for (const prefix of prefixes) {
    if (!prefix || !addressWithoutParenthesis.startsWith(prefix)) {
      continue;
    }

    const remainder = normalizeCandidate(addressWithoutParenthesis.slice(prefix.length));
    if (scoreMerchantName(remainder) >= 50) {
      return remainder;
    }
  }

  const markerIndex = Math.max(addressWithoutParenthesis.lastIndexOf("的"), addressWithoutParenthesis.lastIndexOf("在"));
  if (markerIndex >= 0) {
    const afterMarker = normalizeCandidate(addressWithoutParenthesis.slice(markerIndex + 1));
    if (scoreMerchantName(afterMarker) >= 50) {
      return afterMarker;
    }
  }

  const splitMatch = addressWithoutParenthesis.match(/(?:街道|大道|大街|路|街|巷|弄|号)(.+)$/);
  if (splitMatch?.[1]) {
    const tailCandidate = normalizeCandidate(splitMatch[1]);
    if (scoreMerchantName(tailCandidate) >= 50) {
      return tailCandidate;
    }
  }

  return null;
}

export function extractMerchantNameFromRegeocode(input: MerchantExtractionInput): string | null {
  const candidates: MerchantCandidate[] = [];
  const formattedAddress = normalizeText(input.formattedAddress);
  const addressComponent = input.addressComponent || {};

  const formattedCandidate = extractCandidateFromFormattedAddress(formattedAddress, addressComponent);
  if (formattedCandidate) {
    candidates.push({
      name: formattedCandidate,
      score: scoreMerchantName(formattedCandidate) + 18
    });
  }

  (input.pois || []).slice(0, 5).forEach((poi, index) => {
    const name = normalizeCandidate(normalizeText(poi.name));
    if (!name) {
      return;
    }

    const baseScore = scoreMerchantName(name);
    const distance = Number(poi.distance);
    const distanceBonus = Number.isFinite(distance)
      ? distance <= 30
        ? 15
        : distance <= 100
          ? 10
          : distance <= 300
            ? 4
            : -8
      : 0;

    const typeBonus = scorePoiType(normalizeText(poi.type));
    const addressBonus = formattedAddress.includes(name) ? 14 : 0;
    const rankPenalty = index * 4;

    candidates.push({
      name,
      score: baseScore + distanceBonus + typeBonus + addressBonus - rankPenalty
    });
  });

  const bestCandidate = candidates
    .filter((candidate) => candidate.score >= 50)
    .sort((left, right) => right.score - left.score)[0];

  return bestCandidate?.name || null;
}
