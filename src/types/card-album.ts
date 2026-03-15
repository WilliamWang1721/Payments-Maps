export type CardAlbumScope = "public" | "personal";

export interface CardAlbumCard {
  id: string;
  userId: string | null;
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  groupName: string;
  description: string;
  scope: CardAlbumScope;
  updatedAt: string;
  createdAt: string;
}

export interface CreateCardAlbumCardInput {
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  groupName: string;
  description?: string;
}
