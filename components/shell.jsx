"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Braces,
  Brain,
  Code2,
  Compass,
  Download,
  Flame,
  Globe,
  History,
  Home,
  Layers,
  Library,
  Menu,
  Moon,
  Play,
  Search,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLearning } from "./provider";
import { validateCatalogue, localDay } from "@/lib/catalogue.mjs";
import { gradientFor } from "@/lib/format";
import nav from "@/lib/navigation.json";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS = {
  alpha: Code2,
  delta: Globe,
  "alpha-plus": Braces,
  sigma: Layers,
  prime: Brain,
  "sigma-prime": Sparkles,
  aptitude: Target,
  others: Library,
};

const MAIN_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/recent", label: "History", icon: History },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/* ---------------------------------------------------------------- Logo */
export function Logo({ compact = false }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-primary to-accent text-white shadow-lg shadow-primary/30">
        <Play className="h-4 w-4 translate-x-px fill-current" />
      </span>
      {!compact && (
        <span className="text-[17px] font-extrabold tracking-tight">
          raajasaab<span className="text-primary">-learning</span>
        </span>
      )}
    </Link>
  );
}

/* ----------------------------------------------------------- Settings */
function Segmented({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.icon && <o.icon className="h-4 w-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsPanel({ trigger }) {
  const { state, update } = useLearning();
  const [message, setMessage] = useState("");

  async function importFiles(e) {
    try {
      const map = new Map(state.courseCatalogue.map((c) => [c.id, c]));
      let count = 0;
      for (const file of e.target.files) {
        if (file.size > 20 * 1024 * 1024) throw new Error("Each JSON file must be under 20 MB.");
        for (const c of validateCatalogue(JSON.parse(await file.text()))) {
          map.set(c.id, c);
          count += 1;
        }
      }
      update({ courseCatalogue: [...map.values()] });
      setMessage(`Imported ${count} course${count === 1 ? "" : "s"}. Matching IDs override bundled data on this device.`);
    } catch (err) {
      setMessage(err.message || "Could not import that file.");
    }
    e.target.value = "";
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "raajasaab-learning-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage("Backup downloaded.");
  }

  async function restore(e) {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) throw new Error("Backup is too large.");
      const backup = JSON.parse(await file.text());
      if (backup.version !== 1 || !backup.state) throw new Error("Unsupported backup file.");
      const s = backup.state;
      const patch = {};
      for (const k of ["savedLectures", "recentLectures", "completedLessons"]) {
        if (Array.isArray(s[k])) patch[k] = s[k].filter((v) => typeof v === "string");
      }
      for (const k of ["positions", "notes", "dailySessions"]) {
        if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) patch[k] = s[k];
      }
      patch.courseCatalogue = s.courseCatalogue?.length ? validateCatalogue(s.courseCatalogue) : [];
      patch.userName = String(s.userName || "").slice(0, 60);
      patch.theme = s.theme === "light" ? "light" : "dark";
      if (s.lastLesson && typeof s.lastLesson.courseId === "string" && typeof s.lastLesson.lessonId === "string") {
        patch.lastLesson = s.lastLesson;
      }
      if (SPEEDS.includes(s.playbackSpeed)) patch.playbackSpeed = s.playbackSpeed;
      patch.dailyTarget = {
        mode: s.dailyTarget?.mode === "minutes" ? "minutes" : "lectures",
        value: Math.min(500, Math.max(1, Number(s.dailyTarget?.value) || 5)),
      };
      update(patch);
      setMessage("Backup restored.");
    } catch (err) {
      setMessage(err.message || "Could not restore that backup.");
    }
    e.target.value = "";
  }

  return (
    <Dialog onOpenChange={() => setMessage("")}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>Make it yours</DialogTitle>
        <DialogDescription className="mt-1.5">
          Preferences and progress live in this browser only. Your name is a greeting, not a login.
        </DialogDescription>

        <div className="mt-7 space-y-7">
          <SettingsSection title="Profile">
            <Input
              maxLength={60}
              value={state.userName}
              onChange={(e) => update({ userName: e.target.value })}
              placeholder="What should we call you?"
              aria-label="Your name"
            />
          </SettingsSection>

          <SettingsSection title="Appearance">
            <Segmented
              label="Theme"
              value={state.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: "dark", label: "Dark", icon: Moon },
                { value: "light", label: "Light", icon: Sun },
              ]}
            />
          </SettingsSection>

          <SettingsSection title="Daily goal">
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <Segmented
                label="Goal type"
                value={state.dailyTarget.mode}
                onChange={(mode) => update({ dailyTarget: { ...state.dailyTarget, mode } })}
                options={[
                  { value: "lectures", label: "Lectures" },
                  { value: "minutes", label: "Minutes" },
                ]}
              />
              <Input
                type="number"
                min={1}
                max={500}
                aria-label="Daily target"
                value={state.dailyTarget.value}
                onChange={(e) =>
                  update({
                    dailyTarget: {
                      ...state.dailyTarget,
                      value: Math.min(500, Math.max(1, Number(e.target.value) || 1)),
                    },
                  })
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Course data">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-center transition hover:border-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring">
              <Upload className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Import course JSON</span>
              <span className="text-xs text-muted-foreground">One course, an array, or {"{ courses: [...] }"}. Only use media you're authorized to access.</span>
              <input type="file" accept=".json,application/json" multiple onChange={importFiles} className="sr-only" />
            </label>
            {state.courseCatalogue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  update({ courseCatalogue: [] });
                  setMessage("Local overrides removed. Your progress is kept.");
                }}
              >
                <Trash2 />
                Remove {state.courseCatalogue.length} imported course{state.courseCatalogue.length === 1 ? "" : "s"}
              </Button>
            )}
          </SettingsSection>

          <SettingsSection title="Backup">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="subtle" onClick={exportData}>
                <Download />
                Export progress
              </Button>
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-muted px-5 text-sm font-semibold transition hover:bg-muted/70 focus-within:ring-2 focus-within:ring-ring">
                <Upload className="h-4 w-4" />
                Restore backup
                <input type="file" accept=".json,application/json" onChange={restore} className="sr-only" />
              </label>
            </div>
          </SettingsSection>

          <p role="status" aria-live="polite" className="min-h-5 text-sm font-medium text-primary">
            {message}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ Welcome */
function Welcome() {
  const { state, update } = useLearning();
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(state.dailyTarget.value || 5);
  const open = !state.userName.trim() && !dismissed;

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;
    update({ userName: trimmed, dailyTarget: { mode: "lectures", value: goal } });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDismissed(true)}>
      <DialogContent className="max-w-md">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-primary to-accent text-white shadow-xl shadow-primary/30">
          <Sparkles className="h-7 w-7" />
        </div>
        <DialogTitle className="mt-5 text-center text-2xl font-extrabold">Welcome to raajasaab-learning</DialogTitle>
        <DialogDescription className="mt-2 text-center">
          Tell us what to call you and pick a gentle daily goal. Everything stays on this device.
        </DialogDescription>
        <form onSubmit={submit} className="mt-7 space-y-6">
          <label className="block text-sm font-semibold">
            Your name
            <Input
              autoFocus
              className="mt-2"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Raghav"
            />
          </label>
          <div>
            <p className="text-sm font-semibold">Daily goal</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[2, 3, 5, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGoal(n)}
                  aria-pressed={goal === n}
                  className={cn(
                    "rounded-2xl border py-3 text-lg font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    goal === n ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  {n}
                  <span className="block text-[10px] font-medium text-muted-foreground">lectures</span>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={!name.trim()}>
            Start learning
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ Sidebar */
function SidebarNav({ collapsed, pathname }) {
  const { state } = useLearning();
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const today = state.dailySessions[localDay()] || { lectures: 0, seconds: 0 };
  const goal = state.dailyTarget;
  const value =
    goal.mode === "minutes" ? Math.floor((Number(today.seconds) || 0) / 60) : Number(today.lectures) || 0;

  return (
    <nav aria-label="Main" className={cn("flex flex-col gap-1", collapsed ? "px-1.5 py-3" : "p-3")}>
      {MAIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed ? "flex-col gap-1 px-1 py-3 text-[10px]" : "gap-4 px-3 py-2.5 text-sm",
              active ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active && "fill-primary/20")} />
            <span className="truncate">{label}</span>
            {!collapsed && href === "/saved" && state.savedLectures.length > 0 && (
              <span className="ml-auto rounded-full bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
                {state.savedLectures.length}
              </span>
            )}
          </Link>
        );
      })}

      {!collapsed && (
        <>
          <div className="my-3 h-px bg-border" />
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Learning paths
          </p>
          {nav.categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.id] || Compass;
            const active = pathname === `/category/${c.id}`;
            return (
              <Link
                key={c.id}
                href={`/category/${c.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                  style={{ background: gradientFor(c.id) }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{c.title}</span>
              </Link>
            );
          })}

          <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                Today
              </span>
              <span className="tabular-nums text-muted-foreground">
                {value}/{goal.value} {goal.mode === "minutes" ? "min" : "lectures"}
              </span>
            </div>
            <Progress value={value} max={goal.value} className="mt-3" label="Daily goal progress" />
            <p className="mt-3 text-[11px] leading-4 text-muted-foreground">Small steps. Real growth.</p>
          </div>
        </>
      )}
    </nav>
  );
}

/* --------------------------------------------------------------- Shell */
export default function Shell({ children }) {
  const { state, update, ready, storageError } = useLearning();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("dl-sidebar") === "collapsed");
    } catch {}
  }, []);

  useEffect(() => setDrawer(false), [pathname]);

  // Press "/" anywhere to jump to search (like YouTube).
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!searchRef.current || searchRef.current.offsetParent === null) return;
      e.preventDefault();
      searchRef.current.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function toggleNav() {
    if (window.innerWidth < 1024) {
      setDrawer((d) => !d);
      return;
    }
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("dl-sidebar", next ? "collapsed" : "open");
      } catch {}
      return next;
    });
  }

  function submit(e) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  const initial = (state.userName.trim()[0] || "?").toUpperCase();

  return (
    <div className="relative min-h-screen">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/4 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute -right-40 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[130px]" />
      </div>

      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Button variant="ghost" size="icon" onClick={toggleNav} aria-label="Toggle navigation">
            <Menu className="size-5" />
          </Button>
          <Logo />

          <form onSubmit={submit} role="search" className="mx-auto hidden w-full max-w-xl md:block">
            <div className="flex h-10 items-center rounded-full border border-border bg-card/70 pl-4 pr-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lessons and courses"
                aria-label="Search lessons and courses"
                className="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground lg:block">
                /
              </kbd>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Button variant="ghost" size="icon" className="md:hidden" asChild>
              <Link href="/search" aria-label="Search">
                <Search className="size-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => update({ theme: state.theme === "dark" ? "light" : "dark" })}
            >
              {state.theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <SettingsPanel
              trigger={
                <button
                  type="button"
                  aria-label="Profile and settings"
                  className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-primary to-accent text-sm font-bold text-white shadow-md shadow-primary/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {initial}
                </button>
              }
            />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "scrollbar-thin sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-y-auto border-r border-border/60 transition-[width] duration-200 lg:block",
            collapsed ? "w-[76px]" : "w-64"
          )}
        >
          <SidebarNav collapsed={collapsed} pathname={pathname} />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="dl-fade absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <div className="dl-pop-in scrollbar-thin absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border bg-background">
              <div className="flex h-16 items-center gap-2 px-3">
                <Button variant="ghost" size="icon" onClick={() => setDrawer(false)} aria-label="Close navigation">
                  <X className="size-5" />
                </Button>
                <Logo />
              </div>
              <SidebarNav collapsed={false} pathname={pathname} />
            </div>
          </div>
        )}

        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12">
          {storageError && (
            <p role="alert" className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-400/10 p-3 text-sm">
              {storageError}
            </p>
          )}
          {ready ? <div className="mx-auto max-w-[1800px]">{children}</div> : <LoadingSkeleton />}
          {/* <footer className="mx-auto mt-16 max-w-[1800px] border-t border-border/60 pt-6 text-xs leading-5 text-muted-foreground">
            raajasaab-learning keeps progress on this device only — it&apos;s approximate, not certified completion.
            Video availability depends on the provider&apos;s authorization and restrictions.
          </footer> */}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {MAIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {ready && <Welcome />}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1800px] animate-pulse space-y-8" aria-label="Loading">
      <div className="h-56 rounded-3xl bg-muted" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-44 rounded-3xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
