"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import bundled from "@/app/catalogue.json";
import { validateCatalogue, localDay } from "@/lib/catalogue.mjs";

const LearningContext = createContext(null);
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const defaults = {
  userName: "",
  savedLectures: [],
  recentLectures: [],
  dailyTarget: { mode: "lectures", value: 5 },
  courseCatalogue: [],
  lastLesson: null,
  completedLessons: [],
  positions: {},
  playbackSpeed: 1,
  volume: 1,
  theme: "dark",
  notes: {},
  dailySessions: {},
  autoplay: false,
};

function loadState() {
  const s = { ...defaults };
  for (const key of Object.keys(defaults)) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) s[key] = JSON.parse(raw);
    } catch {
      // ignore corrupt values and keep the default
    }
  }
  for (const k of ["savedLectures", "recentLectures", "completedLessons"]) {
    s[k] = Array.isArray(s[k]) ? s[k].filter((v) => typeof v === "string") : [];
  }
  for (const k of ["positions", "notes", "dailySessions"]) {
    if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
  }
  try {
    s.courseCatalogue =
      Array.isArray(s.courseCatalogue) && s.courseCatalogue.length ? validateCatalogue(s.courseCatalogue) : [];
  } catch {
    s.courseCatalogue = [];
  }
  s.userName = typeof s.userName === "string" ? s.userName.slice(0, 60) : "";
  s.theme = s.theme === "light" ? "light" : "dark";
  s.playbackSpeed = SPEEDS.includes(s.playbackSpeed) ? s.playbackSpeed : 1;
  const vol = Number(s.volume);
  s.volume = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 1;
  s.autoplay = s.autoplay === true;
  s.dailyTarget = {
    mode: s.dailyTarget?.mode === "minutes" ? "minutes" : "lectures",
    value: Math.min(500, Math.max(1, Number(s.dailyTarget?.value) || 5)),
  };
  if (!s.lastLesson || typeof s.lastLesson.courseId !== "string" || typeof s.lastLesson.lessonId !== "string") {
    s.lastLesson = null;
  }
  return s;
}

export function LearningProvider({ children }) {
  const [state, setState] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
    readyRef.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme, ready]);

  function update(patch) {
    const prev = stateRef.current;
    const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
    stateRef.current = next;
    setState(next);
    if (!readyRef.current) return;
    try {
      // Only write keys that actually changed (keeps large catalogues cheap).
      for (const key of Object.keys(defaults)) {
        if (next[key] !== prev[key]) localStorage.setItem(key, JSON.stringify(next[key]));
      }
      setStorageError("");
    } catch {
      setStorageError("Browser storage is unavailable or full. Changes may not survive a reload.");
    }
  }

  const courses = useMemo(() => {
    const map = new Map(bundled.map((c) => [c.id, c]));
    for (const c of state.courseCatalogue) map.set(c.id, c);
    return [...map.values()];
  }, [state.courseCatalogue]);

  function complete(key, countSession = false) {
    update((s) => {
      const day = localDay();
      const stats = s.dailySessions[day] || { lectures: 0, seconds: 0 };
      return {
        completedLessons: [...new Set([...s.completedLessons, key])],
        dailySessions: countSession
          ? { ...s.dailySessions, [day]: { ...stats, lectures: (Number(stats.lectures) || 0) + 1 } }
          : s.dailySessions,
      };
    });
  }

  return (
    <LearningContext.Provider value={{ state, update, ready, courses, complete, storageError }}>
      {children}
    </LearningContext.Provider>
  );
}

export const useLearning = () => useContext(LearningContext);
