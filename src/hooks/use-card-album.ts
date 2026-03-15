import { useCallback, useEffect, useMemo, useState } from "react";

import { cardAlbumService } from "@/services/card-album-service";
import type { CardAlbumCard, CreateCardAlbumCardInput } from "@/types/card-album";

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "卡册数据加载失败。";
}

export function useCardAlbum() {
  const [cards, setCards] = useState<CardAlbumCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCardId, setAddingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshCards = useCallback(async () => {
    setLoading(true);
    try {
      const nextCards = await cardAlbumService.listCards();
      setCards(nextCards);
      setError(null);
    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCards();
  }, [refreshCards]);

  const personalCardKeys = useMemo(() => {
    return new Set(
      cards
        .filter((card) => card.scope === "personal")
        .map((card) => [card.issuer.trim(), card.title.trim(), card.bin.trim(), card.organization.trim()].join("::").toLowerCase())
    );
  }, [cards]);

  const addToPersonal = useCallback(async (card: CardAlbumCard) => {
    setAddingCardId(card.id);
    try {
      const result = await cardAlbumService.addToPersonal(card);
      if (result.added && result.card) {
        setCards((prev) => [result.card as CardAlbumCard, ...prev]);
      }
      setError(null);
      return result;
    } catch (error) {
      const message = formatErrorMessage(error);
      setError(message);
      throw new Error(message);
    } finally {
      setAddingCardId(null);
    }
  }, []);

  const createPersonalCard = useCallback(async (input: CreateCardAlbumCardInput) => {
    setAddingCardId("new");
    try {
      const createdCard = await cardAlbumService.createPersonalCard(input);
      setCards((prev) => [createdCard, ...prev]);
      setError(null);
      return createdCard;
    } catch (error) {
      const message = formatErrorMessage(error);
      setError(message);
      throw new Error(message);
    } finally {
      setAddingCardId(null);
    }
  }, []);

  return {
    cards,
    loading,
    error,
    addingCardId,
    personalCardKeys,
    refreshCards,
    addToPersonal,
    createPersonalCard
  };
}
