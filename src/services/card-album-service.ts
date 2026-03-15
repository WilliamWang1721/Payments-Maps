import { supabase } from "@/lib/supabase";
import type { CardAlbumCard, CreateCardAlbumCardInput } from "@/types/card-album";

interface CardAlbumRow {
  id: string;
  user_id: string | null;
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  group_name: string;
  description: string | null;
  scope: "public" | "personal";
  updated_at: string;
  created_at: string;
}

const CARD_ALBUM_COLUMNS = `
  id,
  user_id,
  issuer,
  title,
  bin,
  organization,
  group_name,
  description,
  scope,
  updated_at,
  created_at
`;

function mapRowToCard(row: CardAlbumRow): CardAlbumCard {
  return {
    id: row.id,
    userId: row.user_id,
    issuer: row.issuer,
    title: row.title,
    bin: row.bin,
    organization: row.organization,
    groupName: row.group_name,
    description: row.description || "",
    scope: row.scope,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user?.id || null;
}

function getCardIdentityKey(card: Pick<CardAlbumCard, "issuer" | "title" | "bin" | "organization">): string {
  return [card.issuer.trim(), card.title.trim(), card.bin.trim(), card.organization.trim()].join("::").toLowerCase();
}

export const cardAlbumService = {
  async listCards(): Promise<CardAlbumCard[]> {
    const userId = await getCurrentUserId();
    const publicQuery = supabase.from("card_album_cards").select(CARD_ALBUM_COLUMNS).eq("scope", "public").order("updated_at", { ascending: false });
    const personalQuery = userId
      ? supabase.from("card_album_cards").select(CARD_ALBUM_COLUMNS).eq("scope", "personal").eq("user_id", userId).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

    const [publicResult, personalResult] = await Promise.all([publicQuery, personalQuery]);

    if (publicResult.error) {
      throw publicResult.error;
    }
    if (personalResult.error) {
      throw personalResult.error;
    }

    const rows = [...((publicResult.data || []) as CardAlbumRow[]), ...((personalResult.data || []) as CardAlbumRow[])];
    return rows.map(mapRowToCard);
  },

  async addToPersonal(card: CardAlbumCard): Promise<{ added: boolean; card?: CardAlbumCard }> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("请先登录后再添加卡片。");
    }

    const { data: personalRows, error: personalError } = await supabase
      .from("card_album_cards")
      .select(CARD_ALBUM_COLUMNS)
      .eq("scope", "personal")
      .eq("user_id", userId);

    if (personalError) {
      throw personalError;
    }

    const exists = ((personalRows || []) as CardAlbumRow[])
      .map(mapRowToCard)
      .some((item) => getCardIdentityKey(item) === getCardIdentityKey(card));

    if (exists) {
      return { added: false };
    }

    const { data, error } = await supabase
      .from("card_album_cards")
      .insert({
        user_id: userId,
        issuer: card.issuer,
        title: card.title,
        bin: card.bin,
        organization: card.organization,
        group_name: card.groupName,
        description: card.description || null,
        scope: "personal"
      })
      .select(CARD_ALBUM_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    return {
      added: true,
      card: mapRowToCard(data as CardAlbumRow)
    };
  },

  async createPersonalCard(input: CreateCardAlbumCardInput): Promise<CardAlbumCard> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("请先登录后再添加卡片。");
    }

    const normalizedInput = {
      issuer: input.issuer.trim(),
      title: input.title.trim(),
      bin: input.bin.trim(),
      organization: input.organization.trim(),
      groupName: input.groupName.trim(),
      description: input.description?.trim() || ""
    };

    if (!normalizedInput.issuer || !normalizedInput.title || !normalizedInput.bin || !normalizedInput.organization || !normalizedInput.groupName) {
      throw new Error("请完整填写发卡行、卡片名称、BIN、卡组织和卡片等级。");
    }

    const { data: personalRows, error: personalError } = await supabase
      .from("card_album_cards")
      .select(CARD_ALBUM_COLUMNS)
      .eq("scope", "personal")
      .eq("user_id", userId);

    if (personalError) {
      throw personalError;
    }

    const exists = ((personalRows || []) as CardAlbumRow[])
      .map(mapRowToCard)
      .some((item) => getCardIdentityKey(item) === getCardIdentityKey(normalizedInput));

    if (exists) {
      throw new Error("这张卡已经在我的卡册里。");
    }

    const { data, error } = await supabase
      .from("card_album_cards")
      .insert({
        user_id: userId,
        issuer: normalizedInput.issuer,
        title: normalizedInput.title,
        bin: normalizedInput.bin,
        organization: normalizedInput.organization,
        group_name: normalizedInput.groupName,
        description: normalizedInput.description || null,
        scope: "personal"
      })
      .select(CARD_ALBUM_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    return mapRowToCard(data as CardAlbumRow);
  }
};
