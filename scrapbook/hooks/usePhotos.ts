"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo, PhotosPage } from "@/lib/types";

const PAGE_SIZE = 24;
const POLL_INTERVAL_MS = 30_000;

async function fetchPage(pageToken?: string): Promise<PhotosPage> {
  const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
  if (pageToken) params.set("pageToken", pageToken);

  const response = await fetch(`/api/photos?${params.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Couldn't load photos.");
  }
  return response.json();
}

/**
 * Owns the photo list end to end: initial load, "load more" pagination,
 * background polling so photos other people add show up without a
 * refresh, and optimistic insertion right after this browser's own
 * upload finishes.
 */
export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Tracks every photo id we've already shown, across pages and polls, so
  // polling can prepend only what's genuinely new without ever duplicating
  // a card.
  const knownIds = useRef<Set<string>>(new Set());

  const loadFirstPage = useCallback(async (signal: { cancelled: boolean }) => {
    try {
      const page = await fetchPage();
      if (signal.cancelled) return;
      knownIds.current = new Set(page.photos.map((photo) => photo.id));
      setPhotos(page.photos);
      setNextPageToken(page.nextPageToken);
      setError(null);
    } catch (err) {
      if (!signal.cancelled) {
        setError(err instanceof Error ? err.message : "Couldn't load photos.");
      }
    } finally {
      if (!signal.cancelled) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    // Deferred a tick so nothing here sets state synchronously during the
    // effect's own execution — mirrors how the polling effect below hands
    // its work to setInterval instead of calling it inline.
    Promise.resolve().then(() => loadFirstPage(signal));
    return () => {
      signal.cancelled = true;
    };
  }, [loadFirstPage]);

  const refresh = useCallback(() => {
    // Safe to set state synchronously here — this runs from a click
    // handler, not from inside an effect.
    setIsLoading(true);
    loadFirstPage({ cancelled: false });
  }, [loadFirstPage]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const page = await fetchPage();
        const freshPhotos = page.photos.filter((photo) => !knownIds.current.has(photo.id));
        if (freshPhotos.length === 0) return;

        freshPhotos.forEach((photo) => knownIds.current.add(photo.id));
        setPhotos((current) => [...freshPhotos, ...current]);
      } catch {
        // A background poll failing quietly isn't worth interrupting the
        // person's browsing with an error banner — the next poll will
        // retry, and manual actions (upload, load more) still surface
        // their own errors.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const page = await fetchPage(nextPageToken);
      const freshPhotos = page.photos.filter((photo) => !knownIds.current.has(photo.id));
      freshPhotos.forEach((photo) => knownIds.current.add(photo.id));
      setPhotos((current) => [...current, ...freshPhotos]);
      setNextPageToken(page.nextPageToken);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load more photos.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore]);

  const addPhoto = useCallback((photo: Photo) => {
    if (knownIds.current.has(photo.id)) return;
    knownIds.current.add(photo.id);
    setPhotos((current) => [photo, ...current]);
  }, []);

  return {
    photos,
    isLoading,
    isLoadingMore,
    error,
    hasMore: nextPageToken !== null,
    loadMore,
    addPhoto,
    refresh,
  };
}
