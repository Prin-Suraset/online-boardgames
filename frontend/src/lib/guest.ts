import type { GuestProfile } from "../types";

const PLAYER_ID_KEY = "boardgame.playerId";
const PLAYER_NAME_KEY = "boardgame.playerName";
const PLAYER_AVATAR_KEY = "boardgame.avatar";

export const AVATAR_OPTIONS = ["♟", "◆", "✦", "●", "▲", "★"] as const;

function defaultName(playerId: string): string {
  return `Guest ${playerId.slice(0, 4).toUpperCase()}`;
}

export function loadGuestProfile(): GuestProfile {
  const storedId = localStorage.getItem(PLAYER_ID_KEY);
  const playerId = storedId ?? crypto.randomUUID();
  const playerName = localStorage.getItem(PLAYER_NAME_KEY) ?? defaultName(playerId);
  const avatar = localStorage.getItem(PLAYER_AVATAR_KEY) ?? AVATAR_OPTIONS[0];
  const profile = { playerId, playerName, avatar };
  saveGuestProfile(profile);
  return profile;
}

export function saveGuestProfile(profile: GuestProfile): void {
  localStorage.setItem(PLAYER_ID_KEY, profile.playerId);
  localStorage.setItem(PLAYER_NAME_KEY, profile.playerName);
  localStorage.setItem(PLAYER_AVATAR_KEY, profile.avatar);
}
