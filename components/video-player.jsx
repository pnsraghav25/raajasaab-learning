"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const HIDE_DELAY = 2600;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const FLASH_ICONS = {
  play: Play,
  pause: Pause,
  back: RotateCcw,
  forward: RotateCw,
  volume: Volume2,
  mute: VolumeX,
  speed: Gauge,
};

/* ---------------------------------------------------- Small pieces */
function AutoplaySwitch({ checked, onChange, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Autoplay next lesson is ${checked ? "on" : "off"}`}
      title={`Autoplay is ${checked ? "on" : "off"}`}
      onClick={() => onChange?.(!checked)}
      className={cn("group/ap inline-flex h-10 items-center px-2 focus-visible:outline-none", className)}
    >
      <span className={cn("relative h-3.5 w-9 rounded-full transition-colors", checked ? "bg-primary/70" : "bg-white/30")}>
        <span
          className={cn(
            "absolute top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full shadow-md transition-all duration-200 group-focus-visible/ap:ring-2 group-focus-visible/ap:ring-primary",
            checked ? "left-4 bg-white text-primary" : "left-0 bg-neutral-300 text-neutral-700"
          )}
        >
          {checked ? <Play className="h-2.5 w-2.5 fill-current" /> : <Pause className="h-2.5 w-2.5 fill-current" />}
        </span>
      </span>
    </button>
  );
}

function MenuRow({ icon: Icon, label, value, onClick, disabled }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none disabled:opacity-40"
    >
      <Icon className="h-[18px] w-[18px] text-white/80" />
      <span className="flex-1">{label}</span>
      <span className="text-white/60">{value}</span>
      <ChevronRight className="h-4 w-4 text-white/50" />
    </button>
  );
}

function MenuHeader({ title, onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-1 flex w-full items-center gap-2 border-b border-white/10 px-3 pb-2.5 pt-1 text-left font-semibold transition hover:text-white/80 focus-visible:outline-none"
    >
      <ChevronLeft className="h-4 w-4" />
      {title}
    </button>
  );
}

function MenuOption({ selected, onClick, children }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none",
        selected && "font-semibold text-primary"
      )}
    >
      <span className="w-4">{selected && <Check className="h-4 w-4" />}</span>
      {children}
    </button>
  );
}

/* ---------------------------------------------------- Player */
export default function VideoPlayer({
  src,
  title,
  subtitle,
  initialPosition = 0,
  autoPlay = false,
  speed = 1,
  volume = 1,
  autoplayNext = false,
  nextTitle,
  hasPrevious = false,
  hasNext = false,
  theater = false,
  onPrevious,
  onNext,
  onSpeedChange,
  onVolumeChange,
  onAutoplayChange,
  onTheaterChange,
  onProgress,
  onStarted,
  onEnded,
  onTimeChange,
  onReady,
}) {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const barRef = useRef(null);
  const menuRef = useRef(null);
  const gearRef = useRef(null);
  const hideTimer = useRef(null);
  const clickTimer = useRef(null);
  const noticeTimer = useRef(null);
  const flashTimer = useRef(null);
  const lastTick = useRef(null);
  const watched = useRef(0);
  const restored = useRef(false);
  const endedOnce = useRef(false);
  const scrubbing = useRef(false);
  const menuJustClosed = useRef(false);
  const lastReported = useRef(-1);
  const actions = useRef({});
  const latest = useRef({});
  latest.current = {
    speed,
    volume,
    autoplayNext,
    hasNext,
    hasPrevious,
    theater,
    onPrevious,
    onNext,
    onSpeedChange,
    onVolumeChange,
    onTheaterChange,
    onProgress,
    onStarted,
    onEnded,
    onTimeChange,
    onReady,
  };

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [menu, setMenu] = useState("closed"); // closed | main | speed | quality
  const [levels, setLevels] = useState([]);
  const [quality, setQuality] = useState(-1);
  const [activeHeight, setActiveHeight] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [notice, setNotice] = useState(null);
  const [flash, setFlash] = useState(null);
  const [hover, setHover] = useState(null);
  const [scrub, setScrub] = useState(null);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState(null);

  /* ---------------- helpers ---------------- */
  function reveal() {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !scrubbing.current) setVisible(false);
    }, HIDE_DELAY);
  }

  function showNotice(text, action) {
    clearTimeout(noticeTimer.current);
    setNotice({ text, action });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }

  function showFlash(kind, text) {
    clearTimeout(flashTimer.current);
    setFlash({ kind, text, id: Date.now() });
    flashTimer.current = setTimeout(() => setFlash(null), 650);
  }

  function flush() {
    const v = videoRef.current;
    if (!v || !restored.current) return;
    const seconds = watched.current;
    watched.current = 0;
    latest.current.onProgress?.(Number.isFinite(v.currentTime) ? v.currentTime : 0, seconds);
  }

  async function toggle() {
    const v = videoRef.current;
    if (!v || error) return;
    if (v.paused || v.ended) {
      try {
        await v.play();
        showFlash("play");
      } catch {
        showNotice("Playback couldn't start — press Play again.");
      }
    } else {
      v.pause();
      showFlash("pause");
    }
    reveal();
  }

  function seekTo(t) {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    const next = clamp(t, 0, v.duration);
    v.currentTime = next;
    lastTick.current = null;
    setPosition(next);
    setEnded(false);
    setCountdown(null);
    latest.current.onTimeChange?.(next);
    reveal();
  }

  function seekBy(delta) {
    const v = videoRef.current;
    if (!v) return;
    seekTo(v.currentTime + delta);
    showFlash(delta < 0 ? "back" : "forward", `${Math.abs(delta)}s`);
  }

  function seekPercent(p) {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) seekTo(v.duration * p);
  }

  function changeVolume(n, silent = false) {
    const val = clamp(Math.round(n * 100) / 100, 0, 1);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      if (val > 0 && v.muted) v.muted = false;
    }
    latest.current.onVolumeChange?.(val);
    if (!silent) showFlash(val === 0 ? "mute" : "volume", `${Math.round(val * 100)}%`);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || latest.current.volume === 0) {
      v.muted = false;
      if (latest.current.volume === 0) changeVolume(0.5, true);
      showFlash("volume", `${Math.round((latest.current.volume || 0.5) * 100)}%`);
    } else {
      v.muted = true;
      showFlash("mute", "Muted");
    }
    reveal();
  }

  function changeSpeed(s) {
    latest.current.onSpeedChange?.(s);
    showFlash("speed", s === 1 ? "Normal" : `${s}×`);
  }

  function stepSpeed(dir) {
    let i = SPEEDS.indexOf(latest.current.speed);
    if (i === -1) i = SPEEDS.indexOf(1);
    changeSpeed(SPEEDS[clamp(i + dir, 0, SPEEDS.length - 1)]);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (rootRef.current?.requestFullscreen) await rootRef.current.requestFullscreen();
      else if (videoRef.current?.webkitEnterFullscreen) videoRef.current.webkitEnterFullscreen();
      else showNotice("Fullscreen isn't available in this browser.");
    } catch {
      showNotice("Fullscreen isn't available in this browser.");
    }
  }

  async function togglePip() {
    try {
      const v = videoRef.current;
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled && v && v.readyState >= 2) await v.requestPictureInPicture();
      else showNotice("Picture-in-picture isn't ready yet.");
    } catch {
      showNotice("Picture-in-picture couldn't start.");
    }
  }

  function toggleTheater() {
    if (document.fullscreenElement) return;
    latest.current.onTheaterChange?.(!latest.current.theater);
  }

  function goNext() {
    if (!latest.current.hasNext) return;
    flush();
    setCountdown(null);
    latest.current.onNext?.(!!videoRef.current && !videoRef.current.paused);
  }

  function goPrev() {
    if (!latest.current.hasPrevious) return;
    flush();
    latest.current.onPrevious?.(!!videoRef.current && !videoRef.current.paused);
  }

  actions.current = {
    toggle,
    seekTo,
    seekBy,
    seekPercent,
    changeVolume,
    toggleMute,
    stepSpeed,
    toggleFullscreen,
    togglePip,
    toggleTheater,
    goNext,
    goPrev,
    menuOpen: () => menu !== "closed",
    closeMenu: () => setMenu("closed"),
  };

  /* ---------------- keyboard shortcuts (YouTube-style) ---------------- */
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (document.querySelector('[role="dialog"]')) return; // a modal is open
      const root = rootRef.current;
      if (!root) return;
      const inside = t instanceof Node && root.contains(t);
      const onInteractive = t instanceof Element && !!t.closest("button, a, summary, [role='switch']");
      const a = actions.current;

      switch (e.key) {
        case " ":
          if (onInteractive && !inside) return;
          a.toggle();
          break;
        case "k":
        case "K":
          a.toggle();
          break;
        case "j":
        case "J":
          a.seekBy(-10);
          break;
        case "l":
        case "L":
          a.seekBy(10);
          break;
        case "ArrowLeft":
          if (onInteractive && !inside) return;
          a.seekBy(-5);
          break;
        case "ArrowRight":
          if (onInteractive && !inside) return;
          a.seekBy(5);
          break;
        case "ArrowUp":
          if (!inside) return;
          a.changeVolume(latest.current.volume + 0.05);
          break;
        case "ArrowDown":
          if (!inside) return;
          a.changeVolume(latest.current.volume - 0.05);
          break;
        case "m":
        case "M":
          a.toggleMute();
          break;
        case "f":
        case "F":
          a.toggleFullscreen();
          break;
        case "t":
        case "T":
          a.toggleTheater();
          break;
        case "i":
        case "I":
          a.togglePip();
          break;
        case "n":
        case "N":
          a.goNext();
          break;
        case "p":
        case "P":
          a.goPrev();
          break;
        case ">":
          a.stepSpeed(1);
          break;
        case "<":
          a.stepSpeed(-1);
          break;
        case "Home":
          if (!inside) return;
          a.seekTo(0);
          break;
        case "End":
          if (!inside) return;
          a.seekPercent(0.999);
          break;
        case "Escape":
          if (!a.menuOpen()) return;
          a.closeMenu();
          break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            a.seekPercent(Number(e.key) / 10);
            break;
          }
          return;
      }
      e.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- apply persisted speed + volume ---------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = SPEEDS.includes(speed) ? speed : 1;
    v.volume = clamp(Number(volume) || 0, 0, 1);
  }, [speed, volume]);

  /* ---------------- load source ---------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    let cancelled = false;
    let hls = null;
    let netRetries = 0;
    let mediaRetries = 0;

    restored.current = false;
    endedOnce.current = false;
    watched.current = 0;
    lastTick.current = null;
    setError("");
    setLoading(true);
    setPlaying(false);
    setStarted(false);
    setEnded(false);
    setCountdown(null);
    setPosition(0);
    setDuration(0);
    setBuffered(0);
    setLevels([]);
    setQuality(-1);
    setActiveHeight(0);
    setMenu("closed");
    setVisible(true);

    const onMeta = () => {
      if (cancelled) return;
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      setDuration(d);
      const start = Number(initialPosition) || 0;
      if (d > 0 && start > 3 && start < d - 5) {
        v.currentTime = start;
        setPosition(start);
        showNotice(`Resumed from ${clock(start)}`, { label: "Start over", run: () => actions.current.seekTo(0) });
      }
      v.playbackRate = SPEEDS.includes(latest.current.speed) ? latest.current.speed : 1;
      v.volume = clamp(Number(latest.current.volume) || 0, 0, 1);
      restored.current = true;
      setLoading(false);
      latest.current.onReady?.(v);
      if (autoPlay) {
        v.play().catch(() => {
          if (!cancelled) showNotice("Autoplay was blocked — press Play to continue.");
        });
      }
    };

    const onNativeError = () => {
      if (cancelled || hls) return; // HLS.js reports its own errors
      setError("The provider couldn't load this video. The link may be expired or restricted.");
      setLoading(false);
    };
    const flushNow = () => flush();
    const onVisibility = () => {
      if (document.hidden) flush();
    };

    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("error", onNativeError);
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onVisibility);

    // Prefer HLS.js — native canPlayType() can return a misleading "maybe".
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        setLevels(
          hls.levels
            .map((l, i) => ({ i, height: l.height || 0, label: l.height ? `${l.height}p` : `Level ${i + 1}` }))
            .sort((a, b) => b.height - a.height)
        );
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (!cancelled) setActiveHeight(hls.levels[data.level]?.height || 0);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (cancelled || !data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && netRetries < 2) {
          netRetries += 1;
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 1) {
          mediaRetries += 1;
          hls.recoverMediaError();
          return;
        }
        setError(`Playback failed (${data.details || data.type}). The link may be expired or restricted by the provider.`);
        setLoading(false);
        hls.destroy();
        hlsRef.current = null;
      });
      hls.loadSource(src);
      hls.attachMedia(v);
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
    } else {
      setError("This browser can't play HLS video.");
      setLoading(false);
    }

    return () => {
      flush();
      restored.current = false;
      cancelled = true;
      [hideTimer, clickTimer, noticeTimer, flashTimer].forEach((t) => clearTimeout(t.current));
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onNativeError);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
      hls?.destroy();
      hlsRef.current = null;
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, retry]);

  /* ---------------- fullscreen + PiP support ---------------- */
  useEffect(() => {
    setPipSupported(!!document.pictureInPictureEnabled);
    const onFs = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ---------------- close settings menu on outside click ---------------- */
  useEffect(() => {
    if (menu === "closed") return undefined;
    function onDown(e) {
      if (menuRef.current?.contains(e.target) || gearRef.current?.contains(e.target)) return;
      menuJustClosed.current = true;
      setMenu("closed");
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menu]);

  /* ---------------- "Up next" countdown ---------------- */
  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown <= 0) {
      setCountdown(null);
      latest.current.onNext?.(true);
      return undefined;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  /* ---------------- media events ---------------- */
  function updateBuffered() {
    const v = videoRef.current;
    if (!v || !v.buffered.length) return;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i += 1) {
      if (v.buffered.start(i) <= v.currentTime + 0.5) end = Math.max(end, v.buffered.end(i));
    }
    setBuffered(end);
  }

  function tick() {
    const v = videoRef.current;
    if (!v) return;
    const now = performance.now();
    if (!scrubbing.current) setPosition(v.currentTime);
    const whole = Math.floor(v.currentTime);
    if (whole !== lastReported.current) {
      lastReported.current = whole;
      latest.current.onTimeChange?.(v.currentTime);
    }
    if (!v.paused && !v.seeking && v.readyState >= 3 && lastTick.current !== null) {
      watched.current += clamp((now - lastTick.current) / 1000, 0, 1);
    }
    lastTick.current = now;
    updateBuffered();
    if (watched.current >= 5) flush();
  }

  function handleEnded() {
    flush();
    setPlaying(false);
    setEnded(true);
    setVisible(true);
    if (!endedOnce.current) {
      endedOnce.current = true;
      latest.current.onEnded?.();
    }
    if (latest.current.autoplayNext && latest.current.hasNext) setCountdown(5);
  }

  /* ---------------- surface (click / double-click) ---------------- */
  function onSurfaceClick(e) {
    rootRef.current?.focus({ preventScroll: true });
    if (menuJustClosed.current) {
      menuJustClosed.current = false;
      return;
    }
    if (e.nativeEvent?.pointerType === "touch" && playing && !visible) {
      reveal();
      return;
    }
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => actions.current.toggle(), 180);
  }

  function onSurfaceDoubleClick() {
    clearTimeout(clickTimer.current);
    actions.current.toggleFullscreen();
  }

  /* ---------------- seek bar ---------------- */
  function pointToTime(clientX) {
    const bar = barRef.current;
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    if (!r.width) return null;
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    return { p, t: p * (duration || 0), x: p * r.width, w: r.width };
  }

  function onSeekDown(e) {
    if (!duration || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    scrubbing.current = true;
    const info = pointToTime(e.clientX);
    if (!info) return;
    setHover(info);
    setScrub(info.t);
    reveal();
  }

  function onSeekMove(e) {
    const info = pointToTime(e.clientX);
    if (!info) return;
    if (e.pointerType === "mouse" || scrubbing.current) setHover(info);
    if (scrubbing.current) setScrub(info.t);
  }

  function onSeekUp(e) {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    const info = pointToTime(e.clientX);
    setScrub(null);
    if (info) seekTo(info.t);
    if (e.pointerType !== "mouse") setHover(null);
  }

  function onSeekCancel() {
    scrubbing.current = false;
    setScrub(null);
    setHover(null);
  }

  /* ---------------- derived ---------------- */
  const show = visible || !playing || menu !== "closed" || scrub !== null || !!error || ended;
  const shown = scrub ?? position;
  const pct = duration > 0 ? clamp((shown / duration) * 100, 0, 100) : 0;
  const bufPct = duration > 0 ? clamp((buffered / duration) * 100, 0, 100) : 0;
  const tipTime = scrub ?? hover?.t ?? 0;
  const tipLeft = hover ? clamp(hover.x, 26, hover.w - 26) : 0;
  const volPct = muted ? 0 : Math.round(volume * 100);
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const qualityLabel =
    quality === -1
      ? `Auto${activeHeight ? ` (${activeHeight}p)` : ""}`
      : levels.find((l) => l.i === quality)?.label || "Auto";
  const ctrl =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35";
  const FlashIcon = flash ? FLASH_ICONS[flash.kind] : null;
  const C = 2 * Math.PI * 34;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={`Video player: ${title}`}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") reveal();
      }}
      onPointerLeave={() => {
        if (!scrubbing.current && videoRef.current && !videoRef.current.paused && menu === "closed") setVisible(false);
      }}
      onFocus={reveal}
      className={cn(
        "relative isolate w-full select-none overflow-hidden bg-black text-white outline-none",
        isFullscreen
          ? "h-full"
          : theater
            ? "aspect-video max-h-[calc(100vh-8.5rem)]"
            : "aspect-video rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/5 sm:rounded-3xl",
        !show && "cursor-none"
      )}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-contain"
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          setEnded(false);
          setCountdown(null);
          lastTick.current = performance.now();
          latest.current.onStarted?.();
          reveal();
        }}
        onPlaying={() => setLoading(false)}
        onPause={() => {
          setPlaying(false);
          lastTick.current = null;
          flush();
          setVisible(true);
        }}
        onEnded={handleEnded}
        onTimeUpdate={tick}
        onProgress={updateBuffered}
        onDurationChange={() => {
          const v = videoRef.current;
          if (v && Number.isFinite(v.duration)) setDuration(v.duration);
        }}
        onSeeking={() => {
          lastTick.current = null;
          if (videoRef.current && videoRef.current.currentTime < 1) endedOnce.current = false;
        }}
        onWaiting={() => {
          setLoading(true);
          lastTick.current = null;
        }}
        onCanPlay={() => setLoading(false)}
        onVolumeChange={() => setMuted(!!videoRef.current?.muted)}
        onRateChange={() => {
          const v = videoRef.current;
          if (v && restored.current && v.playbackRate !== latest.current.speed) v.playbackRate = latest.current.speed;
        }}
      />

      {/* Click surface: single click = play/pause, double click = fullscreen */}
      <div aria-hidden className="absolute inset-0 z-[1]" onClick={onSurfaceClick} onDoubleClick={onSurfaceDoubleClick} />

      {/* Title bar (fullscreen / theater) */}
      {(isFullscreen || theater) && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-[2] bg-linear-to-b from-black/80 to-transparent px-5 pb-12 pt-4 transition-opacity duration-300",
            show ? "opacity-100" : "opacity-0"
          )}
        >
          <p className="truncate text-base font-semibold sm:text-lg">{title}</p>
          {subtitle && <p className="truncate text-xs text-white/70">{subtitle}</p>}
        </div>
      )}

      {/* Buffering spinner */}
      {loading && !error && (
        <div role="status" className="pointer-events-none absolute inset-0 z-[2] grid place-items-center">
          <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/20 border-t-primary" />
          <span className="sr-only">Loading video</span>
        </div>
      )}

      {/* Big start button */}
      {!started && !loading && !error && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play video"
          className="dl-pop-in absolute left-1/2 top-1/2 z-[3] grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:h-20 sm:w-20"
        >
          <Play className="h-7 w-7 translate-x-0.5 fill-current sm:h-9 sm:w-9" />
        </button>
      )}

      {/* Action feedback bubble */}
      {flash && FlashIcon && (
        <div
          key={flash.id}
          className={cn(
            "pointer-events-none absolute top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2",
            flash.kind === "back" ? "left-[22%]" : flash.kind === "forward" ? "left-[78%]" : "left-1/2"
          )}
        >
          <div className="dl-flash flex h-[72px] w-[72px] flex-col items-center justify-center gap-0.5 rounded-full bg-black/55 backdrop-blur-sm">
            <FlashIcon className={cn("h-7 w-7", (flash.kind === "play" || flash.kind === "pause") && "fill-current")} />
            {flash.text && <span className="text-[11px] font-semibold">{flash.text}</span>}
          </div>
        </div>
      )}

      {/* Toast */}
      {notice && !error && (
        <div
          role="status"
          className={cn(
            "dl-pop-in absolute left-3 top-3 z-[6] flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-full bg-black/75 py-1.5 pl-4 text-xs ring-1 ring-white/10 backdrop-blur",
            notice.action ? "pr-1.5" : "pr-4"
          )}
        >
          <span className="truncate">{notice.text}</span>
          {notice.action && (
            <button
              type="button"
              onClick={() => {
                notice.action.run();
                setNotice(null);
              }}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-semibold transition hover:bg-white/25"
            >
              {notice.action.label}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="absolute inset-0 z-[8] flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
          <p className="max-w-md text-sm text-white/90">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {/* End screen */}
      {ended && !error && (
        <div className="dl-fade absolute inset-0 z-[5] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          {countdown !== null && hasNext ? (
            <div className="flex max-w-sm flex-col items-center px-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Up next in {countdown}</p>
              <p className="mt-2 line-clamp-2 text-base font-semibold sm:text-lg">{nextTitle}</p>
              <div className="relative my-5 h-20 w-20">
                <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="4" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (countdown / 5)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <button
                  type="button"
                  onClick={() => {
                    setCountdown(null);
                    latest.current.onNext?.(true);
                  }}
                  aria-label="Play next lesson now"
                  className="absolute inset-2 grid place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <Play className="h-7 w-7 translate-x-0.5 fill-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCountdown(null)}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3 px-6">
              <button
                type="button"
                onClick={() => {
                  seekTo(0);
                  videoRef.current?.play().catch(() => {});
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/25"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
              {hasNext && (
                <button
                  type="button"
                  onClick={() => latest.current.onNext?.(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Next lesson
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings menu */}
      {menu !== "closed" && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Player settings"
          className="dl-pop-in scrollbar-thin absolute bottom-16 right-3 z-[7] max-h-[calc(100%-5rem)] w-64 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl bg-[#12142a]/95 py-2 text-sm shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
        >
          {menu === "main" && (
            <>
              <MenuRow icon={Gauge} label="Playback speed" value={speed === 1 ? "Normal" : `${speed}×`} onClick={() => setMenu("speed")} />
              <MenuRow icon={SlidersHorizontal} label="Quality" value={qualityLabel} disabled={!levels.length} onClick={() => setMenu("quality")} />
              <div className="flex items-center gap-3 px-4 py-1 sm:hidden">
                <Play className="h-[18px] w-[18px] text-white/80" />
                <span className="flex-1">Autoplay next</span>
                <AutoplaySwitch checked={autoplayNext} onChange={onAutoplayChange} className="px-0" />
              </div>
            </>
          )}
          {menu === "speed" && (
            <>
              <MenuHeader title="Playback speed" onBack={() => setMenu("main")} />
              {SPEEDS.map((s) => (
                <MenuOption
                  key={s}
                  selected={s === speed}
                  onClick={() => {
                    changeSpeed(s);
                    setMenu("main");
                  }}
                >
                  {s === 1 ? "Normal" : `${s}×`}
                </MenuOption>
              ))}
            </>
          )}
          {menu === "quality" && (
            <>
              <MenuHeader title="Quality" onBack={() => setMenu("main")} />
              <MenuOption
                selected={quality === -1}
                onClick={() => {
                  setQuality(-1);
                  if (hlsRef.current) hlsRef.current.currentLevel = -1;
                  setMenu("main");
                }}
              >
                Auto{activeHeight ? ` (${activeHeight}p)` : ""}
              </MenuOption>
              {levels.map((l) => (
                <MenuOption
                  key={l.i}
                  selected={quality === l.i}
                  onClick={() => {
                    setQuality(l.i);
                    if (hlsRef.current) hlsRef.current.currentLevel = l.i;
                    setMenu("main");
                  }}
                >
                  {l.label}
                  {l.height >= 720 && <span className="ml-1 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">HD</span>}
                </MenuOption>
              ))}
            </>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[4] transition-opacity duration-300",
          show ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/90 via-black/45 to-transparent" />
        <div className="relative px-2 pb-1.5 sm:px-4 sm:pb-2">
          {/* Seek bar — theme coloured */}
          <div
            ref={barRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shown)}
            aria-valuetext={`${clock(shown)} of ${clock(duration)}`}
            onPointerDown={onSeekDown}
            onPointerMove={onSeekMove}
            onPointerUp={onSeekUp}
            onPointerCancel={onSeekCancel}
            onPointerLeave={() => {
              if (!scrubbing.current) setHover(null);
            }}
            className="group/seek relative mx-1 flex h-5 cursor-pointer touch-none items-center outline-none"
          >
            <div
              className={cn(
                "relative h-[3px] w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-150 group-hover/seek:h-[5px] group-focus-visible/seek:h-[5px]",
                scrub !== null && "h-[5px]"
              )}
            >
              <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${bufPct}%` }} />
              {hover && <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${hover.p * 100}%` }} />}
              <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/30 transition-transform duration-150",
                scrub !== null ? "scale-100" : "scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100"
              )}
              style={{ left: `${pct}%` }}
            />
            {(hover || scrub !== null) && duration > 0 && (
              <div
                className="pointer-events-none absolute bottom-6 -translate-x-1/2 rounded-lg bg-black/85 px-2 py-1 text-xs font-semibold tabular-nums ring-1 ring-white/10"
                style={{ left: hover ? `${tipLeft}px` : `${pct}%` }}
              >
                {clock(tipTime)}
              </div>
            )}
          </div>

          <div className="mt-0.5 flex h-10 items-center">
            {/* <button type="button" className={cn(ctrl, "hidden sm:inline-flex")} disabled={!hasPrevious} onClick={goPrev} aria-label="Previous lesson (P)" title="Previous (P)">
              <SkipBack className="h-5 w-5 fill-current" />
            </button> */}
            <button type="button" className={ctrl} onClick={toggle} aria-label={playing ? "Pause (K)" : "Play (K)"} title={playing ? "Pause (K)" : "Play (K)"}>
              {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
            </button>
            {/* <button type="button" className={ctrl} disabled={!hasNext} onClick={goNext} aria-label="Next lesson (N)" title="Next (N)">
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
            <button type="button" className={cn(ctrl, "hidden md:inline-flex")} onClick={() => seekBy(-10)} aria-label="Back 10 seconds (J)" title="Back 10s (J)">
              <RotateCcw className="h-[18px] w-[18px]" />
            </button>
            <button type="button" className={cn(ctrl, "hidden md:inline-flex")} onClick={() => seekBy(10)} aria-label="Forward 10 seconds (L)" title="Forward 10s (L)">
              <RotateCw className="h-[18px] w-[18px]" />
            </button> */}

            {/* Volume — the slider is a flex item inside a fixed 40px-tall row, so it sits exactly on the icon's centre line */}
            <div className="group/vol flex h-10 items-center">
              <button type="button" className={ctrl} onClick={toggleMute} aria-label={muted ? "Unmute (M)" : "Mute (M)"} title={muted ? "Unmute (M)" : "Mute (M)"}>
                <VolumeIcon className="h-5 w-5" />
              </button>
              <div className="hidden h-10 w-0 items-center overflow-hidden transition-[width] duration-200 group-hover/vol:w-[5.5rem] group-focus-within/vol:w-[5.5rem] sm:flex">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(Number(e.target.value), true)}
                  aria-label="Volume"
                  className="dl-range mx-2 my-0 block h-1 w-[4.5rem] shrink-0 p-0"
                  style={{ "--val": `${volPct}%` }}
                />
              </div>
            </div>

            <span className="ml-1.5 whitespace-nowrap text-xs leading-none tabular-nums sm:ml-2 sm:text-[13px]">
              {clock(shown)}
              <span className="text-white/55"> / {clock(duration)}</span>
            </span>

            <div className="min-w-2 flex-1" />

            <AutoplaySwitch checked={autoplayNext} onChange={onAutoplayChange} className="hidden sm:inline-flex" />
            {speed !== 1 && (
              <button
                type="button"
                onClick={() => setMenu("speed")}
                className="mr-0.5 hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-bold transition hover:bg-white/25 sm:inline"
                title="Playback speed"
              >
                {speed}×
              </button>
            )}
            <button
              ref={gearRef}
              type="button"
              className={cn(ctrl, menu !== "closed" && "bg-white/10")}
              aria-haspopup="menu"
              aria-expanded={menu !== "closed"}
              aria-label="Settings"
              title="Settings"
              onClick={() => setMenu((m) => (m === "closed" ? "main" : "closed"))}
            >
              <Settings className={cn("h-5 w-5 transition-transform duration-300", menu !== "closed" && "rotate-45")} />
            </button>
            {pipSupported && (
              <button type="button" className={cn(ctrl, "hidden sm:inline-flex")} onClick={togglePip} aria-label="Picture-in-picture (I)" title="Miniplayer (I)">
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}
            {onTheaterChange && !isFullscreen && (
              <button
                type="button"
                className={cn(ctrl, "hidden lg:inline-flex", theater && "text-primary")}
                onClick={toggleTheater}
                aria-label={theater ? "Default view (T)" : "Theater mode (T)"}
                title={theater ? "Default view (T)" : "Theater mode (T)"}
              >
                <RectangleHorizontal className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              className={ctrl}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
