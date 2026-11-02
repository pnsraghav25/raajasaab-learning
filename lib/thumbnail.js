"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Real video thumbnails for Wistia lessons.
 * - Uses Wistia's public oEmbed endpoint (returns `thumbnail_url`).
 * - Lazy: only requested when the element scrolls near the viewport.
 * - Throttled: at most 4 requests at once.
 * - Cached per browser session, including "no thumbnail" results.
 * - If requests keep failing (CORS/network), stops trying for the session.
 */

const MAX_PARALLEL = 4;
const BLOCK_KEY = "dl-thumb-blocked";
const memory = new Map(); // id -> base URL or ""
const inflight = new Map(); // id -> Promise
const queue = [];
let running = 0;
let networkFailures = 0;

export function wistiaId(url) {
  const match = /wistia\.(?:com|net)\/embed\/medias\/([a-z0-9]+)/i.exec(String(url || ""));
  return match ? match[1] : null;
}

/** Ask Wistia for a resized image (keeps 16:9). */
export function sizedThumb(base, width = 640) {
  if (!base) return null;
  return `${base}?image_crop_resized=${width}x${Math.round((width * 9) / 16)}`;
}

function isBlocked() {
  try {
    return sessionStorage.getItem(BLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function peek(id) {
  if (memory.has(id)) return memory.get(id) || null;
  try {
    const hit = sessionStorage.getItem(`dl-thumb:${id}`);
    if (hit !== null) {
      memory.set(id, hit);
      return hit || null;
    }
  } catch {}
  return undefined; // unknown
}

function remember(id, base) {
  memory.set(id, base || "");
  try {
    sessionStorage.setItem(`dl-thumb:${id}`, base || "");
  } catch {}
}

function schedule(task) {
  return new Promise((resolve) => {
    const run = async () => {
      running += 1;
      try {
        resolve(await task());
      } finally {
        running -= 1;
        queue.shift()?.();
      }
    };
    if (running < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

async function request(id) {
  if (isBlocked()) return null;
  try {
    const media = encodeURIComponent(`https://home.wistia.com/medias/${id}`);
    const res = await fetch(`https://fast.wistia.com/oembed?url=${media}`);
    networkFailures = 0;
    if (!res.ok) return null;
    const data = await res.json();
    const url = typeof data?.thumbnail_url === "string" ? data.thumbnail_url : "";
    return url.startsWith("https://") ? url.split("?")[0] : null;
  } catch {
    networkFailures += 1;
    if (networkFailures >= 3) {
      try {
        sessionStorage.setItem(BLOCK_KEY, "1");
      } catch {}
    }
    return null;
  }
}

function load(id) {
  const known = peek(id);
  if (known !== undefined) return Promise.resolve(known);
  if (!inflight.has(id)) {
    inflight.set(
      id,
      schedule(() => request(id)).then((base) => {
        remember(id, base);
        inflight.delete(id);
        return base;
      })
    );
  }
  return inflight.get(id);
}

/**
 * const { ref, thumb, onError } = useThumbnail(lesson.url)
 *  - put `ref` on the card/row element
 *  - `thumb` is an image URL, or null → render the text-only layout
 *  - pass `onError` to the <img> so a broken image falls back cleanly
 */
export function useThumbnail(src, { lazy = true } = {}) {
  const id = wistiaId(src);
  const [node, setNode] = useState(null);
  const [visible, setVisible] = useState(!lazy);
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    if (!lazy || visible || !node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lazy, visible, node]);

  useEffect(() => {
    let alive = true;
    setThumb(id ? peek(id) || null : null);
    if (!id || !visible) return undefined;
    load(id).then((base) => {
      if (alive) setThumb(base || null);
    });
    return () => {
      alive = false;
    };
  }, [id, visible]);

  const onError = useCallback(() => {
    if (id) remember(id, "");
    setThumb(null);
  }, [id]);

  return { ref: setNode, thumb, onError };
}
