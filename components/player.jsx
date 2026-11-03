"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Keyboard,
  ListVideo,
  Play,
  Search,
  Share2,
  SkipBack,
  SkipForward,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import Shell, { SettingsPanel } from "./shell";
import VideoPlayer from "./video-player";
import { EmptyState } from "./library";
import { VideoThumb } from "./thumb";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useLearning } from "./provider";
import { flatten, lessonKey, localDay } from "@/lib/catalogue.mjs";
import { clock, gradientFor, human, initials } from "@/lib/format";
import { useThumbnail } from "@/lib/thumbnail";
import nav from "@/lib/navigation.json";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  [["Space", "K"], "Play / pause"],
  [["J"], "Back 10 seconds"],
  [["L"], "Forward 10 seconds"],
  [["←", "→"], "Seek 5 seconds"],
  [["↑", "↓"], "Volume (player focused)"],
  [["M"], "Mute"],
  [["F"], "Fullscreen"],
  [["T"], "Theater mode"],
  [["I"], "Picture-in-picture"],
  [["N", "P"], "Next / previous lesson"],
  [["<", ">"], "Slower / faster"],
  [["0–9"], "Jump to 0–90%"],
];

function parentOf(courseId) {
  const batch = Object.entries(nav.batches).find(([, ids]) => ids.includes(courseId))?.[0];
  if (batch) return { href: `/batches/${batch}`, label: nav.titles[batch] || batch };
  const cat = nav.categories.find((c) => c.items.includes(courseId));
  if (cat) return { href: `/category/${cat.id}`, label: cat.title };
  return { href: "/", label: "Home" };
}

/* ================================================================ Page */
export default function PlayerPage({ slug = "alpha-batch-3" }) {
  return (
    <Shell>
      <PlayerContent slug={slug} />
    </Shell>
  );
}

function PlayerContent({ slug }) {
  const { courses } = useLearning();
  const course = courses.find((c) => c.id === slug);
  if (course && flatten(course).length) return <CoursePlayer key={course.id} course={course} />;
  return (
    <EmptyState
      icon={ListVideo}
      title={course?.title || nav.titles[slug] || "Course not found"}
      text={
        course || nav.titles[slug]
          ? "This course is waiting for its JSON data. Import your authorized course file to start watching."
          : "We couldn't find this course. Import it or head back to your library."
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <SettingsPanel
            trigger={
              <Button>
                <Upload />
                Import course JSON
              </Button>
            }
          />
          <Button variant="outline" asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      }
    />
  );
}

/* ============================================================ Player */
function CoursePlayer({ course }) {
  const { state, update, complete } = useLearning();
  const lessons = useMemo(() => flatten(course), [course]);

  const [lessonId, setLessonId] = useState(() => {
    const q = new URLSearchParams(window.location.search).get("lesson");
    if (lessons.some((l) => l.id === q)) return q;
    if (state.lastLesson?.courseId === course.id && lessons.some((l) => l.id === state.lastLesson.lessonId)) {
      return state.lastLesson.lessonId;
    }
    return lessons[0].id;
  });
  const [autoStart, setAutoStart] = useState(false);
  const [theater, setTheater] = useState(() => {
    try {
      return localStorage.getItem("dl-theater") === "1";
    } catch {
      return false;
    }
  });
  const [position, setPosition] = useState(0);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const media = useRef(null);
  const toastTimer = useRef(null);

  const index = Math.max(0, lessons.findIndex((l) => l.id === lessonId));
  const lesson = lessons[index];
  const key = lessonKey(course.id, lesson.id);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const saved = state.savedLectures.includes(key);
  const completed = state.completedLessons.includes(key);
  const completedSet = useMemo(() => new Set(state.completedLessons), [state.completedLessons]);
  const doneCount = useMemo(
    () => lessons.filter((l) => completedSet.has(lessonKey(course.id, l.id))).length,
    [lessons, completedSet, course.id]
  );
  const notes = (Array.isArray(state.notes[key]) ? state.notes[key] : []).slice().sort((a, b) => a.time - b.time);
  const parent = parentOf(course.id);
  const initial = (state.userName.trim()[0] || "?").toUpperCase();

  useEffect(() => {
    document.title = `${lesson.title} · raajasaab-learning`;
  }, [lesson.title]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function notify(text) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  // Each keyed VideoPlayer keeps the callbacks of *its* lesson, so a flush during
  // lesson switching can never write an old timestamp into the new lesson.
  function saveProgress(t, seconds = 0) {
    const safeTime = Number.isFinite(t) ? Math.max(0, t) : 0;
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    update((s) => {
      const day = localDay();
      const stats = s.dailySessions[day] || { lectures: 0, seconds: 0 };
      return {
        positions: { ...s.positions, [key]: safeTime },
        lastLesson: { courseId: course.id, lessonId: lesson.id },
        dailySessions: {
          ...s.dailySessions,
          [day]: { ...stats, seconds: (Number(stats.seconds) || 0) + safeSeconds },
        },
      };
    });
  }

  function select(target, play = false) {
    if (!target || target.id === lesson.id) return;
    setAutoStart(play);
    setPosition(0);
    setNote("");
    setLessonId(target.id);
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", target.id);
    window.history.replaceState(null, "", url);
    if (window.innerWidth < 1280) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleTheater(value) {
    setTheater(value);
    try {
      localStorage.setItem("dl-theater", value ? "1" : "0");
    } catch {}
  }

  function addNote() {
    const text = note.trim().slice(0, 5000);
    if (!text) return;
    const entry = { id: crypto.randomUUID(), time: Number(media.current?.currentTime) || 0, text };
    update((s) => ({ notes: { ...s.notes, [key]: [...(Array.isArray(s.notes[key]) ? s.notes[key] : []), entry] } }));
    setNote("");
    notify("Note saved");
  }

  function seekNote(t) {
    const v = media.current;
    if (v && Number.isFinite(v.duration)) {
      v.currentTime = Math.min(v.duration, Math.max(0, Number(t) || 0));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Link copied");
    } catch {
      notify("Couldn't copy the link");
    }
  }

  return (
    <>
      <div className="grid items-start gap-x-6 gap-y-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Player (same element in both layouts so playback never restarts) */}
        <div
          className={cn(
            "xl:row-start-1",
            theater ? "-mx-4 -mt-4 bg-black sm:-mx-6 sm:-mt-6 lg:-mx-8 xl:col-span-2" : "xl:col-start-1"
          )}
        >
          <div className={cn(theater && "mx-auto max-w-[1700px]")}>
            <VideoPlayer
              key={key}
              src={lesson.url}
              title={lesson.title}
              subtitle={course.title}
              initialPosition={Number(state.positions[key]) || 0}
              autoPlay={autoStart}
              speed={state.playbackSpeed}
              volume={state.volume}
              autoplayNext={state.autoplay}
              nextTitle={next?.title}
              hasPrevious={!!prev}
              hasNext={!!next}
              theater={theater}
              onTheaterChange={toggleTheater}
              onPrevious={(play) => select(prev, play)}
              onNext={(play) => select(next, play)}
              onSpeedChange={(playbackSpeed) => update({ playbackSpeed })}
              onVolumeChange={(volume) => update({ volume })}
              onAutoplayChange={(autoplay) => update({ autoplay })}
              onProgress={saveProgress}
              onTimeChange={setPosition}
              onReady={(v) => {
                media.current = v;
              }}
              onStarted={() =>
                update((s) => ({
                  lastLesson: { courseId: course.id, lessonId: lesson.id },
                  recentLectures: [key, ...s.recentLectures.filter((k) => k !== key)].slice(0, 100),
                }))
              }
              onEnded={() => complete(key, true)}
            />
          </div>
        </div>

        {/* Lesson info + notes */}
        <section className="min-w-0 xl:col-start-1 xl:row-start-2">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={parent.href} className="hover:text-foreground">
              {parent.label}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-foreground">{course.title}</span>
          </nav>

          <h1 className="mt-2 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">{lesson.title}</h1>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white shadow-md"
                style={{ background: gradientFor(course.id) }}
              >
                {initials(course.title)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{course.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doneCount} of {lessons.length} lessons completed
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-full bg-muted">
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => select(prev, !!media.current && !media.current.paused)}
                  className="inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold transition hover:bg-muted/60 hover:text-primary disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <SkipBack className="h-3.5 w-3.5 fill-current" />
                  Prev
                </button>
                <span className="my-2 w-px bg-border" />
                <button
                  type="button"
                  disabled={!next}
                  onClick={() => select(next, !!media.current && !media.current.paused)}
                  className="inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold transition hover:bg-muted/60 hover:text-primary disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  Next
                  <SkipForward className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
              <Button
                size="sm"
                variant={saved ? "soft" : "subtle"}
                className="h-9"
                aria-pressed={saved}
                onClick={() => {
                  update((s) => ({
                    savedLectures: s.savedLectures.includes(key)
                      ? s.savedLectures.filter((k) => k !== key)
                      : [...s.savedLectures, key],
                  }));
                  notify(saved ? "Removed from saved" : "Saved for later");
                }}
              >
                {saved ? <BookmarkCheck className="fill-current" /> : <Bookmark />}
                {saved ? "Saved" : "Save"}
              </Button>
              <Button
                size="sm"
                variant={completed ? "soft" : "subtle"}
                className="h-9"
                aria-pressed={completed}
                onClick={() =>
                  completed
                    ? update((s) => ({ completedLessons: s.completedLessons.filter((k) => k !== key) }))
                    : complete(key)
                }
              >
                <CheckCircle2 className={cn(completed && "fill-primary/20")} />
                {completed ? "Completed" : "Mark complete"}
              </Button>
              <Button size="sm" variant="subtle" className="h-9" onClick={share}>
                <Share2 />
                Share
              </Button>
            </div>
          </div>

          {/* Description box */}
          <div className="mt-4 rounded-2xl bg-muted/70 p-4 text-sm">
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-semibold">
              <span>
                Lesson {index + 1} of {lessons.length}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>{human(lesson.duration)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-primary">{lesson.section}</span>
            </div>
            <p className="mt-2 text-muted-foreground">
              Your position, speed and volume are remembered automatically — close the tab anytime and pick up exactly
              where you left off.
            </p>
            <details className="group mt-3">
              <summary className="flex w-fit list-none items-center gap-2 rounded-full text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Keyboard className="h-4 w-4" />
                Keyboard shortcuts
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SHORTCUTS.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="flex gap-1">
                      {keys.map((k) => (
                        <kbd key={k} className="min-w-6 rounded-md border border-border bg-card px-1.5 py-0.5 text-center font-sans text-[11px] font-semibold shadow-sm">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Notes (comment-style) */}
          <div className="mt-8">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-extrabold">Notes</h2>
              <Badge variant="soft">{notes.length}</Badge>
              <span className="ml-auto text-[11px] text-muted-foreground">Saved in this browser</span>
            </div>
            <div className="mt-4 flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-accent text-sm font-bold text-white">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="lesson-note" className="sr-only">
                  Add a note
                </label>
                <textarea
                  id="lesson-note"
                  rows={note ? 3 : 1}
                  maxLength={5000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote();
                  }}
                  placeholder={`Add a note at ${clock(position)}…`}
                  className="w-full resize-none border-0 border-b border-border bg-transparent px-0 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
                />
                {note && (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <span className="mr-auto hidden text-[11px] text-muted-foreground sm:inline">Ctrl + Enter to save</span>
                    <Button variant="ghost" size="sm" onClick={() => setNote("")}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addNote}>
                      Save at {clock(position)}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {notes.length > 0 ? (
              <ul className="mt-6 space-y-5">
                {notes.map((n) => (
                  <li key={n.id} className="group flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => seekNote(n.time)}
                        className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-bold tabular-nums text-primary transition hover:bg-primary/20"
                      >
                        {clock(n.time)}
                      </button>
                      <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-sm leading-6">{String(n.text)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete note"
                      className="opacity-50 transition group-hover:opacity-100"
                      onClick={() =>
                        update((s) => ({
                          notes: { ...s.notes, [key]: (s.notes[key] || []).filter((x) => x.id !== n.id) },
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                No notes yet. Capture an idea — it&apos;s saved with the exact timestamp.
              </p>
            )}
          </div>
        </section>

        {/* Course list */}
        <aside className={cn("min-w-0 xl:sticky xl:top-20 xl:col-start-2", theater ? "xl:row-start-2" : "xl:row-span-2 xl:row-start-1")}>
          <Playlist
            course={course}
            lessons={lessons}
            current={lesson}
            index={index}
            state={state}
            completedSet={completedSet}
            doneCount={doneCount}
            onSelect={(l) => select(l, !!media.current && !media.current.paused)}
          />
        </aside>
      </div>

      {toast && (
        <div
          role="status"
          className="dl-pop-in fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-xl lg:bottom-8"
        >
          {toast}
        </div>
      )}
    </>
  );
}

/* ========================================================== Course list */
function Playlist({ course, lessons, current, index, state, completedSet, doneCount, onSelect }) {
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [toggled, setToggled] = useState({});
  const listRef = useRef(null);
  const activeRef = useRef(null);
  const term = query.trim().toLowerCase();
  const currentSection = course.sections.find((s) => s.lessons.some((l) => l.id === current.id))?.id;
  const numberOf = useMemo(() => new Map(lessons.map((l, i) => [l.id, i + 1])), [lessons]);
  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  useEffect(() => {
    const list = listRef.current;
    const el = activeRef.current;
    if (!list || !el) return;
    list.scrollTo({ top: Math.max(0, el.offsetTop - 96), behavior: "smooth" });
  }, [current.id]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative border-b border-border p-4">
        <div className="absolute inset-0 opacity-[0.12]" style={{ background: gradientFor(course.id) }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 font-extrabold">{course.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lesson {index + 1} / {lessons.length} · {pct}% complete
            </p>
          </div>
          <ListVideo className="h-5 w-5 shrink-0 text-primary" />
        </div>
        <Progress value={doneCount} max={lessons.length} className="relative mt-3" label="Course completion" />
        <div className="relative mt-3 flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search lessons</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a lesson…"
              className="h-9 w-full rounded-full border border-border bg-background/70 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <button
            type="button"
            aria-pressed={hideDone}
            onClick={() => setHideDone((h) => !h)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hideDone ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            )}
          >
            Hide done
          </button>
        </div>
      </div>

      <div ref={listRef} className="scrollbar-thin relative max-h-[60vh] overflow-y-auto py-1 xl:max-h-[calc(100vh-17rem)]">
        {course.sections.map((s) => {
          const rows = s.lessons.filter(
            (l) =>
              (!term || l.title.toLowerCase().includes(term)) &&
              (!hideDone || !completedSet.has(lessonKey(course.id, l.id)))
          );
          if ((term || hideDone) && !rows.length) return null;
          const open = term ? true : (toggled[s.id] ?? s.id === currentSection);
          const sectionDone = s.lessons.filter((l) => completedSet.has(lessonKey(course.id, l.id))).length;
          const total = s.lessons.reduce((n, l) => n + (Number(l.duration) || 0), 0);

          return (
            <div key={s.id} className="border-b border-border/60 last:border-b-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setToggled((t) => ({ ...t, [s.id]: !open }))}
                className="sticky top-0 z-2 flex w-full items-center gap-3 bg-card/95 px-4 py-3 text-left backdrop-blur transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[13px] font-bold", s.id === currentSection && "text-primary")}>{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {sectionDone}/{s.lessons.length} done{total ? ` · ${human(total)}` : ""}
                    {s.isAvailable === false ? " · unavailable" : ""}
                  </p>
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
              </button>

              {open && (
                <ol className="pb-1.5">
                  {rows.map((l) => {
                    const lk = lessonKey(course.id, l.id);
                    const target = byId.get(l.id);
                    const pos = Number(state.positions[lk]) || 0;
                    return (
                      <PlaylistRow
                        key={l.id}
                        lesson={l}
                        number={numberOf.get(l.id)}
                        available={s.isAvailable !== false && l.type === "video" && !!l.url && !!target}
                        active={l.id === current.id}
                        done={completedSet.has(lk)}
                        watched={l.duration > 0 ? Math.min(100, (pos / l.duration) * 100) : 0}
                        activeRef={activeRef}
                        onClick={() => onSelect(target)}
                      />
                    );
                  })}
                  {!s.lessons.length && <li className="px-4 py-3 text-xs text-muted-foreground">No lessons in this section.</li>}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One lesson in the course list — real thumbnail if available, otherwise a numbered row. */
function PlaylistRow({ lesson, number, available, active, done, watched, activeRef, onClick }) {
  const { ref, thumb, onError } = useThumbnail(available ? lesson.url : null);
  const setRefs = useCallback(
    (el) => {
      ref(el);
      if (active) activeRef.current = el;
    },
    [ref, active, activeRef]
  );

  return (
    <li>
      <button
        type="button"
        ref={setRefs}
        disabled={!available}
        aria-current={active ? "true" : undefined}
        onClick={onClick}
        className={cn(
          "group relative flex w-full items-center gap-3 py-2 pl-4 pr-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          active ? "bg-primary/10" : "hover:bg-primary/6"
        )}
      >
        {/* Accent bar: always on for the current lesson, slides in on hover for others */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1.5 left-0 z-1 w-0.75 origin-center rounded-r-full bg-primary transition-transform duration-200",
            active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100 group-disabled:scale-y-0"
          )}
        />

        {thumb ? (
          <VideoThumb
            src={thumb}
            onError={onError}
            size="xs"
            duration={lesson.duration}
            progress={done ? 0 : watched}
            done={done}
            active={active}
            className="w-28 rounded-lg"
          />
        ) : (
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : done
                  ? "bg-accent/15 text-accent group-hover:bg-primary group-hover:text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
            )}
          >
            {active ? (
              <Play className="h-3 w-3 translate-x-px fill-current" />
            ) : (
              <>
                <span className="group-hover:hidden group-disabled:block">
                  {done ? <Check className="h-3.5 w-3.5" /> : number || "–"}
                </span>
                <Play className="hidden h-3 w-3 translate-x-px fill-current group-hover:block group-disabled:hidden" />
              </>
            )}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "line-clamp-2 text-[13px] leading-snug transition-colors",
              active ? "font-semibold text-primary" : "group-hover:text-primary"
            )}
          >
            {thumb && <span className="mr-1 text-muted-foreground tabular-nums">{number}.</span>}
            {lesson.title}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            {!thumb && <span className="tabular-nums">{available ? clock(lesson.duration) : "Not available"}</span>}
            {thumb && !available && <span>Not available</span>}
            {done && <span className="font-semibold text-accent">Completed</span>}
            {!done && watched > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${watched}%` }} />
                </span>
                {Math.round(watched)}%
              </span>
            )}
          </span>
        </span>

        {!thumb && (
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-primary transition duration-200",
              active ? "opacity-0" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-disabled:opacity-0"
            )}
          />
        )}
      </button>
    </li>
  );
}
