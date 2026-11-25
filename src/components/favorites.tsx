"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";

const empty: string[] = [];
const event = "recipe-favorites";
let previous: string | null = null;
let cached = empty;

function snapshot() {
  try {
    const value = localStorage.getItem("recipe-favorites");
    if (value !== previous) {
      previous = value;
      const parsed: unknown = JSON.parse(value ?? "[]");
      cached = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : empty;
    }
  } catch { return empty; }
  return cached;
}

function subscribe(update: () => void) {
  window.addEventListener(event, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(event, update);
    window.removeEventListener("storage", update);
  };
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, snapshot, () => empty);
}

export function Favorite({ id, title }: { id: string; title: string }) {
  const selected = useFavorites().includes(id);
  function toggle() {
    const current = snapshot();
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try {
      localStorage.setItem("recipe-favorites", JSON.stringify(next));
      window.dispatchEvent(new Event(event));
    } catch { /* Storage can be disabled by browser settings. */ }
  }
  return <button type="button" className="favorite" aria-label={`Αγαπημένο · ${title}`} aria-pressed={selected} onClick={toggle}>
    <Heart size={20} aria-hidden fill={selected ? "currentColor" : "none"} />
  </button>;
}
