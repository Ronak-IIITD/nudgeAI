import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const features = [
  {
    icon: "🎯",
    title: "Smart Deadlines",
    desc: "Natural-language due dates and reminder cascades that feel thoughtful, not alarming.",
    tone: "bg-[rgba(239,211,191,0.72)]",
  },
  {
    icon: "🔥",
    title: "Habit Streaks",
    desc: "Gentle momentum tracking with encouragement, recovery mode, and milestone joy.",
    tone: "bg-[rgba(214,177,111,0.25)]",
  },
  {
    icon: "⏱️",
    title: "Focus Timer",
    desc: "Pomodoro, custom, or flow sessions in a distraction-light space that helps you settle in.",
    tone: "bg-[rgba(201,178,156,0.32)]",
  },
  {
    icon: "✅",
    title: "Daily Goals",
    desc: "Start with a few meaningful priorities and close the day with wins that actually feel good.",
    tone: "bg-[rgba(123,154,123,0.22)]",
  },
  {
    icon: "☕",
    title: "Mood Check-ins",
    desc: "Track your energy and let the app soften its tone when the day asks for more kindness.",
    tone: "bg-[rgba(210,143,108,0.18)]",
  },
  {
    icon: "📊",
    title: "AI Insights",
    desc: "Spot patterns in your habits, focus, and moods with summaries that feel human and useful.",
    tone: "bg-[rgba(139,111,90,0.14)]",
  },
];

const examples = [
  ["7 days out", "Your client presentation is one week away. Let's start strong!"],
  ["2 days out", "48 hours until your project deadline. You've totally got this."],
  ["Day of", "Today's the day! Your deadline is tonight. I believe in you."],
  ["Habit nudge", "Don't break your 12-day streak! Your gym habit is on a roll."],
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
      "Unlimited deadlines & habits",
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
      "Coming in Phase 2",
    ],
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="page-shell min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_14px_32px_rgba(109,84,65,0.18)]">
            <span className="text-sm font-bold">N</span>
          </div>
          <div>
            <span className="block text-xl font-semibold" data-display="true">
              NudgeAI
            </span>
            <span className="block text-xs text-[var(--muted)]">
              your cozy productivity corner
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
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

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-28 lg:pt-10">
        <div className="max-w-2xl pt-6 lg:pt-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,250,244,0.8)] px-4 py-2 text-sm font-medium text-[var(--primary)] shadow-[0_10px_24px_rgba(109,84,65,0.06)]">
            <span>Warm AI nudges</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span>gentle structure</span>
          </div>

          <h1
            className="text-balance text-5xl font-semibold leading-[0.95] md:text-6xl lg:text-7xl"
            data-display="true"
          >
            A calmer way to keep your life together.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)] lg:text-xl">
            NudgeAI brings deadlines, habits, focus sessions, and daily wins into
            one soft, friendly space that feels more like a ritual than a chore.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="cozy-button inline-flex items-center justify-center rounded-[1.35rem] px-8 py-4 text-base font-medium"
            >
              Start your cozy setup
            </Link>
            <Link
              href="/login"
              className="cozy-outline inline-flex items-center justify-center rounded-[1.35rem] px-8 py-4 text-base font-medium text-[var(--foreground)]"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["5", "core rituals"],
              ["<3 min", "onboarding"],
              ["warm", "AI tone"],
            ].map(([value, label]) => (
              <div key={label} className="cozy-card rounded-[1.5rem] p-4">
                <p className="text-2xl font-semibold" data-display="true">
                  {value}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-xl rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,251,247,0.94),rgba(248,237,225,0.92))] p-5 shadow-[0_30px_80px_rgba(85,61,45,0.12)] backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between rounded-[1.5rem] bg-[rgba(255,250,244,0.76)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  today with nudgeai
                </p>
                <p className="mt-1 text-lg font-semibold" data-display="true">
                  A little calmer, a lot clearer
                </p>
              </div>
              <div className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-medium text-[var(--primary-dark)]">
                cozy mode
              </div>
            </div>

            <div className="space-y-4">
              <div className="cozy-card rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  morning nudge
                </p>
                <p className="mt-2 text-base leading-7">
                  Good morning. Pick three gentle priorities and let the rest stay
                  quiet for now.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="cozy-card rounded-[1.5rem] p-4">
                  <p className="text-sm font-medium text-[var(--muted)]">
                    Upcoming deadline
                  </p>
                  <p className="mt-2 text-xl font-semibold" data-display="true">
                    Client proposal
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    due Friday, 6:00 PM
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-[rgba(139,111,90,0.1)]">
                    <div className="h-2 w-2/3 rounded-full bg-[var(--accent)]" />
                  </div>
                </div>

                <div className="cozy-card rounded-[1.5rem] p-4">
                  <p className="text-sm font-medium text-[var(--muted)]">
                    Focus ritual
                  </p>
                  <p className="mt-2 text-xl font-semibold" data-display="true">
                    25 quiet minutes
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    soft timer, warm encouragement
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-full bg-[rgba(123,154,123,0.18)] px-3 py-1 text-xs text-[var(--success)]">
                      started
                    </span>
                    <span className="rounded-full bg-[rgba(210,143,108,0.16)] px-3 py-1 text-xs text-[var(--primary-dark)]">
                      linked to goal
                    </span>
                  </div>
                </div>
              </div>

              <div className="cozy-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--muted)]">
                    Daily rhythm
                  </p>
                  <span className="text-xs text-[var(--primary)]">3 of 5 complete</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    "Finish proposal draft",
                    "20 minute focus session",
                    "Reading habit check-in",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl bg-[rgba(255,250,244,0.72)] px-3 py-2.5"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          index < 2
                            ? "bg-[var(--success)] text-white"
                            : "border border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        {index < 2 ? "✓" : ""}
                      </span>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            built for softer productivity
          </p>
          <h2 className="text-4xl font-semibold" data-display="true">
            Everything you need, without the noisy feeling.
          </h2>
          <p className="mt-4 text-lg text-[var(--muted)]">
            The app stays clear and spacious, while the AI keeps your momentum
            warm, personal, and steady.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="cozy-card rounded-[1.75rem] p-6">
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${feature.tone}`}
              >
                {feature.icon}
              </div>
              <h3 className="text-2xl font-semibold" data-display="true">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-24">
        <h2 className="text-center text-4xl font-semibold" data-display="true">
          An AI that actually cares
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--muted)]">
          NudgeAI isn&apos;t a cold robot. It&apos;s a warm, encouraging presence - like a
          best friend who also happens to be very organized.
        </p>

        <div className="mx-auto mt-12 max-w-2xl space-y-4">
          {examples.map(([time, msg]) => (
            <div key={time} className="cozy-card flex items-start gap-4 rounded-[1.5rem] p-5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]">
                <span className="text-xs font-bold text-white">N</span>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--primary)]">
                  {time}
                </span>
                <p className="mt-1 text-sm leading-7">{msg}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[rgba(255,250,245,0.7)] px-6 py-10 shadow-[0_24px_70px_rgba(85,61,45,0.08)] backdrop-blur-xl lg:px-10">
          <h2 className="text-center text-4xl font-semibold" data-display="true">
            Simple, honest pricing
          </h2>
          <p className="mb-12 mt-4 text-center text-[var(--muted)]">
            Start free. Upgrade when you&apos;re ready.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.tier}
                className={`relative rounded-[1.75rem] p-6 ${
                  plan.featured
                    ? "border border-[rgba(139,111,90,0.3)] bg-[linear-gradient(180deg,rgba(255,248,241,0.96),rgba(245,232,219,0.92))] shadow-[0_20px_50px_rgba(109,84,65,0.14)]"
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
                  <span className="text-4xl font-semibold" data-display="true">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {plan.tier === "Team" ? "/user/mo" : "/month"}
                  </span>
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-[var(--muted)]"
                    >
                      <span className="text-[var(--success)]">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block rounded-2xl py-3 text-center text-sm font-medium ${
                    plan.featured ? "cozy-button" : "cozy-outline"
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
        <h2 className="text-5xl font-semibold" data-display="true">
          Ready for a softer workflow?
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-xl text-lg text-[var(--muted)]">
          Join NudgeAI and start building better habits, crushing deadlines, and
          actually enjoying your productivity journey.
        </p>
        <Link
          href="/register"
          className="cozy-button inline-block rounded-[1.35rem] px-8 py-4 text-lg font-medium"
        >
          Get Started Free
        </Link>
      </section>

      <footer className="mx-auto max-w-7xl border-t border-[var(--border)] px-6 py-8 text-center lg:px-10">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--primary)]">
            <span className="text-xs font-bold text-white">N</span>
          </div>
          <span className="text-lg font-semibold" data-display="true">
            NudgeAI
          </span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Built with love for real people who want to do better every day.
        </p>
      </footer>
    </div>
  );
}
