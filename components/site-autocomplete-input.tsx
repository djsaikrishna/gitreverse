"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LibraryEntry } from "@/lib/library-types";

type SiteAutocompleteInputProps = {
  id?: string;
  "aria-label"?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectEntry?: (entry: LibraryEntry) => void;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
};

export function SiteAutocompleteInput({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  onSelectEntry,
  placeholder = "https://pinterest.com",
  required,
  readOnly,
}: SiteAutocompleteInputProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        kind: "website",
        sort: "newest",
        page: "0",
        limit: "8",
        search,
      });
      const res = await fetch(`/api/library?${params.toString()}`, {
        cache: search ? "no-store" : "default",
      });
      if (!res.ok) {
        setEntries([]);
        return;
      }
      const json = (await res.json()) as { data?: LibraryEntry[] };
      setEntries((json.data ?? []).filter((e) => e.kind === "website"));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value.trim());
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, value, fetchSuggestions, readOnly]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectEntry(entry: LibraryEntry) {
    const url = entry.target_url ?? entry.title;
    onChange(url);
    onSelectEntry?.(entry);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || entries.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const entry = entries[activeIndex];
      if (entry) selectEntry(entry);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div className="relative">
        <div className="absolute inset-0 translate-x-1 translate-y-1 rounded bg-zinc-900" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          readOnly={readOnly}
          className="relative z-10 w-full rounded border-[3px] border-zinc-900 bg-white px-4 py-3 text-base text-zinc-900 placeholder-zinc-500 read-only:bg-zinc-50 read-only:text-zinc-600 focus:outline-none"
          placeholder={placeholder}
          value={value}
          required={required}
          onFocus={() => {
            if (!readOnly) setOpen(true);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && !readOnly && (entries.length > 0 || loading) ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2">
          <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900" />
          <ul
            id={listboxId}
            role="listbox"
            className="relative z-10 max-h-56 overflow-auto rounded-lg border-[3px] border-zinc-900 bg-white py-1"
          >
            {loading && entries.length === 0 ? (
              <li className="px-4 py-2.5 text-sm text-zinc-500">Searching…</li>
            ) : null}
            {entries.map((entry, index) => (
              <li key={entry.key} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#fff4da] ${
                    index === activeIndex ? "bg-[#fff4da]" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectEntry(entry)}
                >
                  <span className="font-semibold text-zinc-900">{entry.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
