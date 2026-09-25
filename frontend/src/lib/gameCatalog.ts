import type { GameType } from "../types";

export interface CatalogGame {
  id: GameType;
  title: string;
  icon: string;
  players: string;
  duration: string;
  genre: string;
  description: string;
  selectionDetails: string;
}

export const catalogGames: readonly CatalogGame[] = [
  {
    id: "tictactoe",
    title: "Tic-Tac-Toe",
    icon: "🔲",
    players: "2 Players",
    duration: "~5m",
    genre: "Strategy",
    description: "The essential three-in-a-row duel. Simple rules, sharp decisions.",
    selectionDetails: "Classic Duel · 2 Players · Quick Match",
  },
  {
    id: "what_number",
    title: "What number I have?",
    icon: "🔢",
    players: "4–8 Players",
    duration: "~15m",
    genre: "Deduction",
    description: "Read the table, manage powerful skills, and expose every rival card.",
    selectionDetails: "Social Deduction · 4–8 Players · Cards & Skills",
  },
  {
    id: "you_or_me",
    title: "You or me who more than?",
    icon: "🃏",
    players: "2–4 Players",
    duration: "~20m",
    genre: "Bluffing",
    description: "High-stakes betting, hidden cards, and one bold question: who has more?",
    selectionDetails: "High-Stakes Bluffing · 2–4 Players · Poker Betting",
  },
];
