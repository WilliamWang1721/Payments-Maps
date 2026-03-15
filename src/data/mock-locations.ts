import type { LocationRecord } from "@/types/location";

const BRANDS = ["Visa", "Mastercard", "Amex", "Discover", "UnionPay"];
const CITIES = ["上海", "北京", "深圳", "广州", "杭州", "成都"];

function toBin(index: number): string {
  return String(400000 + index).padStart(6, "0");
}

export const MOCK_LOCATIONS: LocationRecord[] = Array.from({ length: 326 }, (_, idx) => {
  const brand = BRANDS[idx % BRANDS.length];
  const city = CITIES[idx % CITIES.length];
  const createdAt = new Date(Date.now() - idx * 86_400_000).toISOString();
  return {
    id: `loc-${idx + 1}`,
    name: `商户 ${idx + 1}`,
    address: `${city}市示例路 ${idx + 10} 号`,
    brand,
    bin: toBin(idx + 1),
    city,
    status: idx % 7 === 0 ? "inactive" : "active",
    lat: 37.2 + (idx % 20) * 0.08,
    lng: -122.4 + (idx % 24) * 0.07,
    createdAt,
    updatedAt: createdAt
  };
});
