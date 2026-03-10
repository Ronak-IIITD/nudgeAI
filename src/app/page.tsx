import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

const features = [
  {
    icon: CalendarClock,
    title: "Smart Deadlines",
    desc: "Natural-language due dates and reminder cascades that feel thoughtful, not alarming.",
    tone: "bg-[rgba(239,211,191,0.72)] text-[var(--primary-dark)]",
  },
  {
    icon: TrendingUp,
    title: "Habit Streaks",
    desc: "Gentle momentum tracking with encouragement, recovery mode, and milestone joy.",
    tone: "bg-[rgba(214,177,111,0.25)] text-[var(--primary-dark)]",
  },
  {
    icon: TimerReset,
    title: "Focus Timer",
    desc: "Pomodoro, custom, or flow sessions in a distraction-light space that helps you settle in.",
    tone: "bg-[rgba(201,178,156,0.32)] text-[var(--secondary)]",
  },
  {
    icon: Target,
    title: "Daily Goals",
    desc: "Start with a few meaningful priorities and close the day with wins that actually feel good.",
    tone: "bg-[rgba(123,154,123,0.22)] text-[var(--success)]",
  },
  {
    icon: HeartHandshake,
    title: "Mood Check-ins",
    desc: "Track your energy and let the app soften its tone when the day asks for more kindness.",
    tone: "bg-[rgba(210,143,108,0.18)] text-[var(--accent)]",
  },
  {
    icon: ShieldCheck,
    title: "AI Insights",
    desc: "Spot patterns in your habits, focus, and moods with summaries that feel human and useful.",
    tone: "bg-[rgba(85,107,123,0.12)] text-[var(--secondary)]",
  },
];

const examples = [
  ["7 days out", "Your client presentation is one week away. Let's start strong!"],
  ["2 days out", "48 hours until your project deadline. You've totally got this."],
  ["Day of", "Today's the day! Your deadline is tonight. I believe in you."],
  ["Habit nudge", "Don't break your 12-day streak. Your gym habit is on a roll."],
  ["Focus done", "Focus session complete! You crushed 25 minutes. Take a breather."],
] as const;

const pricing = [
  {
    tier: "Free",
    price: "$0",
    cta: "Get Started",
    featured: false,
    features: [
      "3 active deadlines",
      "2 habits",
      "Basic Pomodoro",
      "Daily goals",
      "7-day data history",
    ],
  },
  {
    tier: "Pro",
    price: "$6",
    cta: "Start Free Trial",
    featured: true,
    features: [
      "Unlimited deadlines and habits",
      "Full AI personalization",
      "Mood tracking",
      "Insights dashboard",
      "Priority support",
    ],
  },
  {
    tier: "Team",
    price: "$12",
    cta: "Contact Us",
    featured: false,
    features: [
      "All Pro features",
      "Shared deadlines",
      "Team habits",
      "Manager dashboard",
      "Coming in phase 2",
    ],
  },
];

const proof = [
  ["5", "core rituals"],
  ["<3 min", "onboarding"],
  ["daily", "warm nudges"],
] as const;

const rituals = [
  "Plan your day in minutes, not menus.",
  "See what matters now without visual noise.",
  "Let encouragement show up at the right moments.",
] as const;

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="page-shell min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="hero-orb hero-orb-sun right-[-3rem] top-20 h-40 w-40 sm:h-56 sm:w-56" />
      <div className="hero-orb hero-orb-mist left-[-2rem] top-[28rem] h-44 w-44 sm:h-64 sm:w-64" />

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(180deg,var(--primary),var(--primary-dark))] text-white shadow-[0_18px_38px_rgba(109,84,65,0.22)]">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="block text-xl font-semibold" data-display="true">
              NudgeAI
            </span>
            <span className="block text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              calm momentum system
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:inline-flex"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="cozy-button rounded-2xl px-5 py-2.5 text-sm font-medium"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <section className="hero-grid mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:pb-24 lg:pt-8">
        <div className="max-w-2xl pt-4 lg:pt-12">
          <div className="section-label stagger-rise" style={{ animationDelay: "40ms" }}>
            <span className="status-dot" />
            warm AI nudges
          </div>

          <h1
            className="mt-7 text-balance text-5xl font-semibold leading-[0.94] md:text-6xl lg:text-7xl"
            data-display="true"
          >
            A more beautiful way to keep your week moving.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)] lg:text-xl">
            NudgeAI blends deadlines, habits, focus sessions, and daily wins into a
            softer workspace that feels intentional, personal, and genuinely calming.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="cozy-button inline-flex items-center justify-center gap-2 rounded-[1.35rem] px-8 py-4 text-base font-medium"
            >
              Start your calm setup
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/login"
              className="cozy-button-soft inline-flex items-center justify-center rounded-[1.35rem] px-8 py-4 text-base font-medium"
            >
              Explore the workspace
            </Link>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
            {proof.map(([value, label], index) => (
              <div
                key={label}
                className="cozy-card rounded-[1.5rem] p-4 stagger-rise"
                style={{ animationDelay: `${120 + index * 90}ms` }}
              >
                <p className="text-2xl font-semibold" data-display="true">
                  {value}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            {rituals.map((item) => (
              <div key={item} className="rounded-2xl bg-white/35 px-4 py-3 backdrop-blur-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="glass-strong relative w-full max-w-2xl rounded-[2.2rem] p-5 sm:p-6">
            <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(139,111,90,0.45),transparent)]" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  today with NudgeAI
                </p>
                <p className="mt-2 text-2xl font-semibold" data-display="true">
                  A little calmer, a lot clearer
                </p>
              </div>
              <div className="rounded-full bg-[rgba(85,107,123,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">
                design refresh
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="cozy-card rounded-[1.7rem] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      morning brief
                    </p>
                    <p className="mt-2 text-xl font-semibold" data-display="true">
                      Ease into the work that matters most.
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(210,143,108,0.14)] text-[var(--accent)]">
                    <Sparkles size={18} />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ["Client proposal", "Due Friday at 6:00 PM", "67%"],
                    ["Deep work block", "25 quiet minutes", "Ready"],
                    ["Reading habit", "1 check-in left today", "Open"],
                  ].map(([title, meta, badge]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.8)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{meta}</p>
                      </div>
                      <span className="rounded-full bg-[rgba(139,111,90,0.1)] px-3 py-1 text-xs font-medium text-[var(--primary-dark)]">
                        {badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(92,73,59,0.95),rgba(121,98,82,0.92))] p-5 text-white shadow-[0_20px_50px_rgba(84,60,43,0.18)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/65">
                    AI nudge
                  </p>
                  <p className="mt-3 text-lg leading-8 text-white/92">
                    Keep your list small. Three thoughtful wins today will do more than ten rushed ones.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                    <span className="status-dot" />
                    personalized tone based on your rhythm
                  </div>
                </div>

                <div className="cozy-card rounded-[1.7rem] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--muted)]">Daily rhythm</p>
                    <span className="text-xs font-semibold text-[var(--primary)]">3 of 5 complete</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      "Finish proposal draft",
                      "20 minute focus session",
                      "Reply to advisor",
                      "Reading habit check-in",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-2xl bg-[rgba(255,250,244,0.72)] px-3 py-2.5"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            index < 2
                              ? "bg-[var(--success)] text-white"
                              : "border border-[var(--border)] text-[var(--muted)]"
                          }`}
                        >
                          {index < 2 ? "OK" : ""}
                        </span>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="mb-12 max-w-2xl">
          <div className="section-label">
            <span className="status-dot" />
            built for softer productivity
          </div>
          <h2 className="mt-5 text-4xl font-semibold" data-display="true">
            Everything you need, with a lot more atmosphere.
          </h2>
          <p className="mt-4 text-lg text-[var(--muted)]">
            The product stays clear and spacious while the AI keeps your momentum warm,
            personal, and steady.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="cozy-card feature-tile interactive-card rounded-[1.8rem] p-6 stagger-rise"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.tone}`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-2xl font-semibold" data-display="true">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="section-label">
              <span className="status-dot" />
              voice and timing
            </div>
            <h2 className="mt-5 text-4xl font-semibold" data-display="true">
              An AI that feels more human than robotic.
            </h2>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
              NudgeAI is designed to notice the moment, respond with the right energy,
              and keep your progress moving without adding stress.
            </p>
            <p className="mt-6 text-base leading-7 text-[var(--muted)]">
              Every reminder, summary, and check-in is meant to feel like calm guidance,
              not pressure.
            </p>
          </div>

          <div className="space-y-4">
            {examples.map(([time, msg], index) => (
              <div
                key={time}
                className="cozy-card interactive-card flex items-start gap-4 rounded-[1.6rem] p-5 stagger-rise"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,var(--primary),var(--primary-dark))] text-white shadow-[0_14px_30px_rgba(109,84,65,0.2)]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                    {time}
                  </span>
                  <p className="mt-2 text-sm leading-7">{msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="glass-strong rounded-[2.2rem] px-6 py-10 lg:px-10">
          <h2 className="text-center text-4xl font-semibold" data-display="true">
            Simple, honest pricing
          </h2>
          <p className="mb-12 mt-4 text-center text-[var(--muted)]">
            Start free and upgrade when the rhythm feels right.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.tier}
                className={`interactive-card relative rounded-[1.8rem] p-6 ${
                  plan.featured
                    ? "border border-[rgba(139,111,90,0.3)] bg-[linear-gradient(180deg,rgba(255,248,241,0.98),rgba(244,232,220,0.92))] shadow-[0_24px_60px_rgba(109,84,65,0.16)]"
                    : "cozy-card"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="mb-1 text-2xl font-semibold" data-display="true">
                  {plan.tier}
                </h3>
                <div className="mb-4">
                  <span className={`text-4xl font-semibold ${plan.featured ? "gradient-stroke" : ""}`} data-display="true">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {plan.tier === "Team" ? "/user/mo" : "/month"}
                  </span>
                </div>
                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <CheckCircle2 size={16} className="text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block rounded-2xl py-3 text-center text-sm font-medium ${
                    plan.featured ? "cozy-button" : "cozy-button-soft"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-10">
        <div className="section-label">
          <span className="status-dot" />
          ready when you are
        </div>
        <h2 className="mt-5 text-5xl font-semibold" data-display="true">
          Ready for a workflow that feels better?
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Join NudgeAI to build better habits, hit deadlines with less friction, and make
          your productivity system feel like something you actually want to return to.
        </p>
        <Link
          href="/register"
          className="cozy-button inline-flex items-center gap-2 rounded-[1.35rem] px-8 py-4 text-lg font-medium"
        >
          Get Started Free
          <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="mx-auto max-w-7xl border-t border-[var(--border)] px-6 py-8 text-center lg:px-10">
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(180deg,var(--primary),var(--primary-dark))] text-white">
            <Sparkles size={14} />
          </div>
          <span className="text-lg font-semibold" data-display="true">
            NudgeAI
          </span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Built for real people who want focus, follow-through, and a little more calm.
        </p>
      </footer>
    </div>
  );
}
