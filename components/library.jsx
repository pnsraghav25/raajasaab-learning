"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  History,
  Play,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Shell, { CATEGORY_ICONS, SettingsPanel } from "./shell";
import { HoverBar, VideoThumb } from "./thumb";
import { Button, buttonVariants } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useLearning } from "./provider";
import nav from "@/lib/navigation.json";
import { flatten, lessonKey, localDay } from "@/lib/catalogue.mjs";
import { coverFor } from "@/lib/covers";
import { clock, gradientFor, human, initials } from "@/lib/format";
import { useThumbnail } from "@/lib/thumbnail";
import { cn } from "@/lib/utils";

/* ================================================================ Page */
export default function LibraryPage({ mode = "home", slug, query = "" }) {
  return (
    <Shell>
      <LibraryContent mode={mode} slug={slug} query={query} />
    </Shell>
  );
}

function LibraryContent({ mode, slug, query }) {
  const data = useLibraryData();
  if (mode === "category") return <CategoryView slug={slug} data={data} />;
  if (mode === "batch") return <BatchView slug={slug} data={data} />;
  if (mode === "saved") return <SavedView data={data} />;
  if (mode === "recent") return <RecentView data={data} />;
  if (mode === "search") return <SearchView initial={query} data={data} />;
  return <HomeView data={data} />;
}

/* ================================================================ Data */
function useLibraryData() {
  const { state, update, courses } = useLearning();
  const byId = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const lessons = useMemo(
    () => courses.flatMap((c) => flatten(c).map((l) => ({ ...l, course: c, key: lessonKey(c.id, l.id) }))),
    [courses]
  );
  const byKey = useMemo(() => new Map(lessons.map((l) => [l.key, l])), [lessons]);
  const completed = useMemo(() => new Set(state.completedLessons), [state.completedLessons]);
  return { state, update, courses, byId, lessons, byKey, completed };
}

const lessonHref = (l) => `/courses/${l.course.id}?lesson=${encodeURIComponent(l.id)}`;

function watchedPct(lesson, state) {
  const pos = Number(state.positions[lesson.key]) || 0;
  return lesson.duration > 0 ? Math.min(100, (pos / lesson.duration) * 100) : 0;
}

function streakFrom(sessions) {
  const active = (day) => {
    const s = sessions[day];
    return !!s && ((Number(s.lectures) || 0) > 0 || (Number(s.seconds) || 0) >= 60);
  };
  const d = new Date();
  if (!active(localDay(d))) d.setDate(d.getDate() - 1); // today not started yet — streak still alive
  let n = 0;
  while (active(localDay(d)) && n < 3650) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/**
 * Picks the image for a course card:
 * 1. your cover URL (course JSON `thumbnail` or lib/course-thumbnails.json)
 * 2. otherwise the first lesson's Wistia thumbnail
 * 3. otherwise null → text-only layout
 * If your cover URL fails to load, it falls back to step 2.
 */
function useCourseImage(id, course, { allowLessonThumb = true } = {}) {
  const cover = coverFor(id, course);
  const [coverBroken, setCoverBroken] = useState(false);
  useEffect(() => setCoverBroken(false), [cover]);
  const showCover = !!cover && !coverBroken;
  const firstLesson = allowLessonThumb && !showCover ? flatten(course)[0]?.url : null;
  const { ref, thumb, onError } = useThumbnail(firstLesson);

  if (showCover) return { ref, src: cover, raw: true, onError: () => setCoverBroken(true) };
  if (thumb) return { ref, src: thumb, raw: false, onError };
  return { ref, src: null, raw: false, onError };
}

/* ========================================================== Primitives */
export function EmptyState({ icon: Icon = Sparkles, title, text, action }) {
  return (
    <div className="dl-fade-up mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      {text && <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function SectionTitle({ title, subtitle, href, linkLabel = "See all" }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function PageHeader({ crumbs = [], title, description, icon: Icon, seed, cover, meta }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [cover]);
  const showCover = !!cover && !broken;

  return (
    <header className="dl-fade-up relative mb-10 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="absolute inset-0 opacity-[0.10]" style={{ background: gradientFor(seed) }} />
      <div
        className="absolute -right-16 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: gradientFor(seed) }}
      />
      <nav aria-label="Breadcrumb" className="relative flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((c) => (
          <Fragment key={c.href}>
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </Fragment>
        ))}
        <span aria-current="page" className="font-medium text-foreground">
          {title}
        </span>
      </nav>
      <div className="relative mt-5 flex items-center gap-4 sm:gap-5">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="aspect-video w-28 shrink-0 rounded-2xl object-cover shadow-lg ring-1 ring-black/10 sm:w-44"
          />
        ) : (
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
            style={{ background: gradientFor(seed) }}
          >
            {Icon ? <Icon className="h-7 w-7" /> : <span className="text-lg font-extrabold">{initials(title)}</span>}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>}
        </div>
      </div>
      {meta && <div className="relative mt-6 flex flex-wrap items-center gap-2">{meta}</div>}
    </header>
  );
}

function CardGrid({ children }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{children}</div>;
}

/** Duration + progress/completed line used by text-only cards and rows. */
function LessonMeta({ lesson, pct, done, className }) {
  return (
    <div className={cn("flex items-center gap-2 text-[11px] text-muted-foreground", className)}>
      <Clock className="h-3 w-3 shrink-0" />
      <span className="tabular-nums">{clock(lesson.duration)}</span>
      {done ? (
        <span className="ml-auto flex items-center gap-1 font-semibold text-accent">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      ) : pct > 0 ? (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </span>
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
  );
}

/* =============================================================== Cards */
function CategoryCard({ category, index }) {
  const Icon = CATEGORY_ICONS[category.id] || Compass;
  const count = category.items.length;
  return (
    <Link
      href={`/category/${category.id}`}
      style={{ animationDelay: `${index * 45}ms` }}
      className="dl-fade-up group relative overflow-hidden rounded-3xl border border-border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition duration-300 group-hover:opacity-45"
        style={{ background: gradientFor(category.id) }}
      />
      <span
        className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition duration-300 group-hover:scale-110"
        style={{ background: gradientFor(category.id) }}
      >
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="relative mt-5 text-lg font-bold">{category.title}</h3>
      <p className="relative mt-1 min-h-10 text-sm leading-5 text-muted-foreground">{category.description}</p>
      <div className="relative mt-5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {count ? `${count} ${count === 1 ? "option" : "options"}` : "Import to unlock"}
        </span>
        <span className="flex items-center gap-1 font-semibold text-primary">
          Explore
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

/** Course / bundle card — your cover image, else the first lesson's thumbnail, else text-only. */
function CourseCard({ id, asBatch, course, completed }) {
  const lessons = course ? flatten(course) : [];
  const done = lessons.filter((l) => completed.has(lessonKey(id, l.id))).length;
  const total = lessons.reduce((n, l) => n + (Number(l.duration) || 0), 0);
  const title = course?.title || nav.titles[id] || id;
  const pct = lessons.length ? (done / lessons.length) * 100 : 0;
  const batchCount = nav.batches[id]?.length || 0;
  const image = useCourseImage(id, course, { allowLessonThumb: !asBatch });

  const label = asBatch ? `Bundle · ${batchCount} courses` : lessons.length ? `${lessons.length} lessons` : "Awaiting data";
  const meta = asBatch
    ? "Open the bundle to see its courses"
    : lessons.length
      ? done
        ? `${done} of ${lessons.length} completed`
        : `${human(total)} of content · not started`
      : "Import your JSON in settings to unlock";
  const cta = asBatch ? "Explore bundle" : !lessons.length ? "View course" : done ? "Continue" : "Start learning";

  return (
    <Link
      ref={image.ref}
      href={asBatch ? `/batches/${id}` : `/courses/${id}`}
      className="dl-fade-up group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {image.src ? (
        <VideoThumb
          src={image.src}
          raw={image.raw}
          onError={image.onError}
          duration={asBatch ? 0 : total}
          progress={asBatch ? 0 : pct}
          className="rounded-none"
        />
      ) : (
        <HoverBar />
      )}
      <div className="flex flex-1 flex-col p-4">
        <Badge variant={lessons.length || asBatch ? "soft" : "outline"} className="self-start">
          {label}
        </Badge>
        <h3 className="mt-3 line-clamp-2 font-bold leading-snug transition-colors group-hover:text-primary">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        {!asBatch && lessons.length > 0 && !image.src && (
          <div className="mt-4">
            <Progress value={done} max={lessons.length} label="Course progress" />
            <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">{Math.round(pct)}% complete</p>
          </div>
        )}
        <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-semibold text-primary">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

/** Lesson card for horizontal shelves (Recently watched). */
function LessonCard({ lesson, state, completed, className }) {
  const { ref, thumb, onError } = useThumbnail(lesson.url);
  const pct = watchedPct(lesson, state);
  const done = completed.has(lesson.key);
  return (
    <Link
      ref={ref}
      href={lessonHref(lesson)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {thumb ? (
        <VideoThumb src={thumb} onError={onError} size="sm" duration={lesson.duration} progress={pct} done={done} className="rounded-none" />
      ) : (
        <HoverBar />
      )}
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">{lesson.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{lesson.course.title}</p>
        {!thumb && <LessonMeta lesson={lesson} pct={pct} done={done} className="mt-auto pt-3" />}
      </div>
    </Link>
  );
}

/** Lesson row for History, Saved and Search. */
function LessonRow({ lesson, state, completed, onRemove, removeLabel }) {
  const { ref, thumb, onError } = useThumbnail(lesson.url);
  const pct = watchedPct(lesson, state);
  const done = completed.has(lesson.key);
  return (
    <div ref={ref} className="group relative flex items-center gap-2 rounded-2xl pr-2 transition-colors hover:bg-primary/[0.06]">
      {!thumb && <HoverBar />}
      <Link
        href={lessonHref(lesson)}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl p-2 pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {thumb ? (
          <VideoThumb
            src={thumb}
            onError={onError}
            size="sm"
            duration={lesson.duration}
            progress={pct}
            done={done}
            className="w-36 rounded-xl sm:w-48"
          />
        ) : (
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
              done ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
            )}
          >
            <span className="group-hover:hidden">{done ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}</span>
            <Play className="hidden h-4 w-4 translate-x-px fill-current group-hover:block" />
          </span>
        )}
        <div className="min-w-0 flex-1 py-0.5">
          <p className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">{lesson.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {lesson.course.title} · {lesson.section}
          </p>
          {thumb ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {done ? (
                <Badge variant="success">
                  <CheckCircle2 />
                  Completed
                </Badge>
              ) : pct > 0 ? (
                <Badge variant="soft">{Math.round(pct)}% watched</Badge>
              ) : null}
            </div>
          ) : (
            <LessonMeta lesson={lesson} pct={pct} done={done} className="mt-2 max-w-xs" />
          )}
        </div>
      </Link>
      {onRemove && (
        <Button variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove} className="opacity-60 hover:opacity-100">
          <X />
        </Button>
      )}
    </div>
  );
}

/* ================================================================ Home */
function Ring({ value, size = 116, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, value || 0));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <defs>
        <linearGradient id="dl-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#dl-ring)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        style={{ transition: "stroke-dashoffset .8s ease" }}
      />
    </svg>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-3 py-2.5">
      <Icon className={cn("h-4 w-4", tone)} />
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function GoalCard({ value, goal, streak, completedCount, seconds }) {
  const pct = goal.value ? value / goal.value : 0;
  const met = value >= goal.value;
  return (
    <div className="w-full rounded-3xl border border-border bg-background/60 p-5 backdrop-blur lg:w-[23rem]">
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <Ring value={pct} />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-extrabold tabular-nums">{Math.min(100, Math.round(pct * 100))}%</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">today</p>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{met ? "Goal reached — nice work!" : "Today's goal"}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">
            {value}
            <span className="text-base font-semibold text-muted-foreground"> / {goal.value}</span>
          </p>
          <p className="text-xs text-muted-foreground">{goal.mode === "minutes" ? "minutes watched" : "lectures finished"}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat icon={Flame} label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} tone="text-orange-400" />
        <Stat icon={CheckCircle2} label="Completed" value={completedCount} tone="text-accent" />
        <Stat icon={Clock} label="Today" value={human(seconds)} tone="text-primary" />
      </div>
    </div>
  );
}

/** "Pick up where you left off" — real thumbnail when available, otherwise text-only. */
function ContinueCard({ lesson, state }) {
  const { ref, thumb, onError } = useThumbnail(lesson.url, { lazy: false });
  const pos = Number(state.positions[lesson.key]) || 0;
  const pct = watchedPct(lesson, state);

  return (
    <Link
      ref={ref}
      href={lessonHref(lesson)}
      className={cn(
        "group relative grid overflow-hidden rounded-3xl border border-border bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.04] hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        thumb && "md:grid-cols-[minmax(0,26rem)_1fr]"
      )}
    >
      {thumb ? (
        <VideoThumb src={thumb} onError={onError} size="lg" duration={lesson.duration} progress={pct} className="rounded-none" />
      ) : (
        <HoverBar className="inset-y-0 rounded-none" />
      )}

      <div className="flex flex-col justify-center gap-3 p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Continue watching</p>
        <h3 className="line-clamp-2 text-xl font-extrabold leading-snug transition group-hover:text-primary sm:text-2xl">
          {lesson.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {lesson.course.title} · {lesson.section}
        </p>

        {!thumb && (
          <div className="max-w-md">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                {clock(pos)} / {clock(lesson.duration)}
              </span>
              <span>{Math.round(pct)}% watched</span>
            </div>
            <Progress value={pct} max={100} className="mt-1.5" label="Lesson progress" />
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className={cn(buttonVariants(), "group-hover:brightness-110")}>
            <Play className="h-4 w-4 fill-current" />
            {pos > 3 ? `Resume at ${clock(pos)}` : "Start lesson"}
          </span>
          {thumb && pct > 0 && <span className="text-xs text-muted-foreground">{Math.round(pct)}% watched</span>}
        </div>
      </div>
    </Link>
  );
}

function HomeView({ data }) {
  const { state, byId, byKey, completed } = data;
  const today = state.dailySessions[localDay()] || { lectures: 0, seconds: 0 };
  const goal = state.dailyTarget;
  const value =
    goal.mode === "minutes" ? Math.floor((Number(today.seconds) || 0) / 60) : Number(today.lectures) || 0;
  const streak = streakFrom(state.dailySessions);
  const last = state.lastLesson ? byKey.get(lessonKey(state.lastLesson.courseId, state.lastLesson.lessonId)) : null;
  const recent = state.recentLectures.map((k) => byKey.get(k)).filter(Boolean);
  const readyCourses = [...byId.values()].filter((c) => flatten(c).length > 0);
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = state.userName.trim();

  return (
    <div className="space-y-14">
      <section className="dl-fade-up relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge variant="soft">
              <Sparkles />
              {streak > 1 ? `${streak}-day streak — keep it going` : "A little progress, every day"}
            </Badge>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
              {greeting}
              {name ? `, ${name}` : ""}.
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
              {last
                ? "Your last lesson is waiting exactly where you left it."
                : "Pick a path, press play — raajasaab-learning remembers the rest."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {last ? (
                <Button size="lg" asChild>
                  <Link href={lessonHref(last)}>
                    <Play className="fill-current" />
                    Continue learning
                  </Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link href="#paths">
                    <Compass />
                    Explore paths
                  </Link>
                </Button>
              )}
              <Button size="lg" variant="outline" asChild>
                <Link href="/recent">
                  <History />
                  History
                </Link>
              </Button>
            </div>
          </div>
          <GoalCard
            value={value}
            goal={goal}
            streak={streak}
            completedCount={state.completedLessons.length}
            seconds={Number(today.seconds) || 0}
          />
        </div>
      </section>

      {last && (
        <section>
          <SectionTitle title="Pick up where you left off" />
          <ContinueCard lesson={last} state={state} />
        </section>
      )}

      {recent.length > 1 && (
        <section>
          <SectionTitle title="Recently watched" href="/recent" />
          <div className="scrollbar-thin -mx-1 flex snap-x gap-5 overflow-x-auto px-1 pb-3 pt-1">
            {recent.slice(0, 12).map((l) => (
              <LessonCard key={l.key} lesson={l} state={state} completed={completed} className="w-64 shrink-0 snap-start sm:w-72" />
            ))}
          </div>
        </section>
      )}

      <section id="paths" className="scroll-mt-24">
        <SectionTitle title="Learning paths" subtitle="Eight paths. Your pace." />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {nav.categories.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} />
          ))}
        </div>
      </section>

      {readyCourses.length > 0 && (
        <section>
          <SectionTitle title="Ready to watch" subtitle="Courses with lessons loaded on this device" />
          <CardGrid>
            {readyCourses.map((c) => (
              <CourseCard key={c.id} id={c.id} course={c} completed={completed} />
            ))}
          </CardGrid>
        </section>
      )}
    </div>
  );
}

/* ============================================================ Category */
function CategoryView({ slug, data }) {
  const { byId, courses, completed } = data;
  const category = nav.categories.find((c) => c.id === slug);
  if (!category) {
    return (
      <EmptyState
        icon={Compass}
        title="Path not found"
        text="This learning path doesn't exist."
        action={
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        }
      />
    );
  }
  const ids = [
    ...new Set([
      ...category.items,
      ...courses
        .filter((c) => c.category === slug || (slug === "others" && !c.category && !nav.titles[c.id]))
        .map((c) => c.id),
    ]),
  ];
  const isBatch = (id) => slug !== "others" && !!nav.batches[id];

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }]}
        title={category.title}
        description={category.description}
        icon={CATEGORY_ICONS[slug] || Compass}
        seed={slug}
        cover={coverFor(slug)}
        meta={<Badge variant="soft">{ids.length} {ids.length === 1 ? "option" : "options"}</Badge>}
      />
      {ids.length ? (
        <CardGrid>
          {ids.map((id) => (
            <CourseCard key={id} id={id} asBatch={isBatch(id)} course={byId.get(id)} completed={completed} />
          ))}
        </CardGrid>
      ) : (
        <EmptyState
          title="Nothing here yet"
          text={`Import a course JSON with "category": "${slug}" to add it to this path.`}
          action={
            <SettingsPanel
              trigger={
                <Button>
                  <Upload />
                  Import courses
                </Button>
              }
            />
          }
        />
      )}
    </>
  );
}

/* =============================================================== Batch */
function BatchView({ slug, data }) {
  const { byId, courses, completed } = data;
  const parent = nav.categories.find((c) => c.items.includes(slug));
  const ids = [...new Set([...(nav.batches[slug] || []), ...courses.filter((c) => c.batch === slug).map((c) => c.id)])];
  const title = nav.titles[slug] || byId.get(slug)?.title || slug;

  if (!ids.length) {
    return (
      <EmptyState
        icon={Compass}
        title="Bundle not found"
        text="There are no courses in this bundle yet."
        action={
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, ...(parent ? [{ href: `/category/${parent.id}`, label: parent.title }] : [])]}
        title={title}
        description="Choose a course and keep moving forward."
        seed={slug}
        cover={coverFor(slug, byId.get(slug))}
        meta={<Badge variant="soft">{ids.length} courses</Badge>}
      />
      <CardGrid>
        {ids.map((id) => (
          <CourseCard key={id} id={id} course={byId.get(id)} completed={completed} />
        ))}
      </CardGrid>
    </>
  );
}

/* =========================================================== Saved */
function SavedView({ data }) {
  const { state, update, byKey, completed } = data;
  const items = state.savedLectures.map((k) => byKey.get(k)).filter(Boolean);
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }]}
        title="Saved lessons"
        description="Lessons you bookmarked to revisit."
        icon={Bookmark}
        seed="saved"
        meta={<Badge variant="soft">{items.length} saved</Badge>}
      />
      {items.length ? (
        <div className="space-y-1">
          {items.map((l) => (
            <LessonRow
              key={l.key}
              lesson={l}
              state={state}
              completed={completed}
              removeLabel="Remove from saved"
              onRemove={() => update((s) => ({ savedLectures: s.savedLectures.filter((k) => k !== l.key) }))}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No saved lessons yet"
          text="Tap Save under any lesson and it'll show up here."
          action={
            <Button asChild>
              <Link href="/">Browse paths</Link>
            </Button>
          }
        />
      )}
    </>
  );
}

/* =========================================================== History */
function RecentView({ data }) {
  const { state, update, byKey, completed } = data;
  const items = state.recentLectures.map((k) => byKey.get(k)).filter(Boolean);
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }]}
        title="History"
        description="Everything you've watched recently, newest first."
        icon={History}
        seed="history"
        meta={
          <>
            <Badge variant="soft">{items.length} lessons</Badge>
            {items.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => update({ recentLectures: [] })}>
                <Trash2 />
                Clear history
              </Button>
            )}
          </>
        }
      />
      {items.length ? (
        <div className="space-y-1">
          {items.map((l) => (
            <LessonRow
              key={l.key}
              lesson={l}
              state={state}
              completed={completed}
              removeLabel="Remove from history"
              onRemove={() => update((s) => ({ recentLectures: s.recentLectures.filter((k) => k !== l.key) }))}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="Nothing watched yet"
          text="Lessons you play will appear here so you can jump right back in."
          action={
            <Button asChild>
              <Link href="/">Start learning</Link>
            </Button>
          }
        />
      )}
    </>
  );
}

/* ============================================================ Search */
function SearchView({ initial, data }) {
  const router = useRouter();
  const { state, lessons, byId, completed } = data;
  const [q, setQ] = useState(initial || "");
  useEffect(() => setQ(initial || ""), [initial]);
  const term = q.trim().toLowerCase();

  const courseMatches = useMemo(() => {
    if (!term) return [];
    const ids = new Set([...Object.keys(nav.titles), ...byId.keys()]);
    return [...ids].filter((id) => (byId.get(id)?.title || nav.titles[id] || id).toLowerCase().includes(term)).slice(0, 8);
  }, [term, byId]);

  const lessonMatches = useMemo(
    () =>
      term
        ? lessons
            .filter((l) => l.title.toLowerCase().includes(term) || l.section.toLowerCase().includes(term))
            .slice(0, 80)
        : [],
    [term, lessons]
  );

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="dl-fade-up mx-auto mb-10 max-w-2xl"
      >
        <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-card px-5 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons, sections and courses…"
            aria-label="Search"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="rounded-full p-1.5 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {!term ? (
        <EmptyState icon={Search} title="Search your library" text="Find any lesson by title or section across every course you've loaded." />
      ) : !courseMatches.length && !lessonMatches.length ? (
        <EmptyState icon={Search} title="No results" text={`Nothing matches “${q.trim()}”. Try a shorter or different term.`} />
      ) : (
        <div className="space-y-12">
          {courseMatches.length > 0 && (
            <section>
              <SectionTitle title="Courses" />
              <CardGrid>
                {courseMatches.map((id) => (
                  <CourseCard key={id} id={id} course={byId.get(id)} completed={completed} asBatch={!byId.get(id) && !!nav.batches[id]} />
                ))}
              </CardGrid>
            </section>
          )}
          {lessonMatches.length > 0 && (
            <section>
              <SectionTitle
                title="Lessons"
                subtitle={lessonMatches.length === 80 ? "Showing the first 80 matches — refine your search for more." : `${lessonMatches.length} matches`}
              />
              <div className="space-y-1">
                {lessonMatches.map((l) => (
                  <LessonRow key={l.key} lesson={l} state={state} completed={completed} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
