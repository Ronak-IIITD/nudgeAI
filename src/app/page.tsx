import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-16 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-xl font-bold">NudgeAI</span>
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
            className="text-sm font-medium px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)]"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-16 py-20 lg:py-32 text-center max-w-4xl mx-auto">
        <div className="inline-block px-4 py-1.5 bg-purple-100 text-[var(--primary)] rounded-full text-sm font-medium mb-6">
          Your Friendly AI Productivity Companion
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight mb-6">
          Stop forgetting.
          <br />
          Start <span className="text-[var(--primary)]">achieving</span>.
        </h1>
        <p className="text-lg lg:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10">
          NudgeAI is the AI-powered productivity app that feels like a
          supportive friend. Smart deadlines, habit tracking, focus timer,
          and daily goals — all with a warm, motivational AI that adapts to you.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-[var(--primary)] text-white rounded-xl font-medium text-lg hover:bg-[var(--primary-dark)] shadow-lg shadow-purple-200"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 border border-[var(--border)] rounded-xl font-medium text-lg hover:bg-[var(--surface-hover)]"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-16 py-20 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything you need to stay on track
          </h2>
          <p className="text-[var(--muted)] text-center mb-16 max-w-2xl mx-auto">
            Five powerful features that work independently — but become
            unstoppable together.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🎯",
                title: "Smart Deadlines",
                desc: "Add deadlines in plain language. AI creates a cascade of smart reminders that ramp up urgency as the day approaches.",
                color: "bg-purple-100",
              },
              {
                icon: "🔥",
                title: "Habit Streaks",
                desc: "Build habits with streak tracking, milestone celebrations, and AI that predicts when you might slip — and nudges you first.",
                color: "bg-orange-100",
              },
              {
                icon: "⏱️",
                title: "Focus Timer",
                desc: "Pomodoro, custom, or flow mode. Track focused hours, link sessions to tasks, and get AI encouragement at the finish.",
                color: "bg-blue-100",
              },
              {
                icon: "✅",
                title: "Daily Goals",
                desc: "Set 1-5 daily goals each morning. Log your wins each evening. Get a warm AI summary of your day.",
                color: "bg-green-100",
              },
              {
                icon: "💜",
                title: "Mood Check-ins",
                desc: "Quick emoji mood tracking that powers smarter, more empathetic reminders and shows mood-productivity patterns.",
                color: "bg-pink-100",
              },
              {
                icon: "📊",
                title: "AI Insights",
                desc: "Discover your patterns. See when you're most productive, how mood affects output, and get personalized tips.",
                color: "bg-yellow-100",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-[var(--border)] hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center text-2xl mb-4`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Personality Section */}
      <section className="px-6 lg:px-16 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          An AI that actually cares
        </h2>
        <p className="text-[var(--muted)] text-center mb-12 max-w-2xl mx-auto">
          NudgeAI isn&apos;t a cold robot. It&apos;s a warm, encouraging presence — like a
          best friend who also happens to be very organized.
        </p>

        <div className="space-y-4 max-w-lg mx-auto">
          {[
            {
              time: "7 days out",
              msg: "Your client presentation is one week away. Let's start strong!",
            },
            {
              time: "2 days out",
              msg: "48 hours until your project deadline. You've totally got this.",
            },
            {
              time: "Day of",
              msg: "Today's the day! Your deadline is tonight. I believe in you.",
            },
            {
              time: "Habit nudge",
              msg: "Don't break your 12-day streak! Your gym habit is on a roll.",
            },
            {
              time: "Focus done",
              msg: "Focus session complete! You crushed 25 minutes. Take a breather.",
            },
          ].map((example, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)]"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              <div>
                <span className="text-xs font-medium text-[var(--primary)] uppercase tracking-wide">
                  {example.time}
                </span>
                <p className="text-sm mt-1">{example.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 lg:px-16 py-20 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-[var(--muted)] text-center mb-12">
            Start free. Upgrade when you&apos;re ready.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tier: "Free",
                price: "$0",
                features: [
                  "3 active deadlines",
                  "2 habits",
                  "Basic Pomodoro",
                  "Daily goals",
                  "7-day data history",
                ],
                cta: "Get Started",
                featured: false,
              },
              {
                tier: "Pro",
                price: "$6",
                features: [
                  "Unlimited deadlines & habits",
                  "Full AI personalization",
                  "Mood tracking",
                  "Insights dashboard",
                  "Priority support",
                ],
                cta: "Start Free Trial",
                featured: true,
              },
              {
                tier: "Team",
                price: "$12",
                features: [
                  "All Pro features",
                  "Shared deadlines",
                  "Team habits",
                  "Manager dashboard",
                  "Coming in Phase 2",
                ],
                cta: "Contact Us",
                featured: false,
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`p-6 rounded-2xl border ${
                  plan.featured
                    ? "border-[var(--primary)] shadow-lg shadow-purple-100 relative"
                    : "border-[var(--border)]"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--primary)] text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-1">{plan.tier}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-[var(--muted)] text-sm">
                    {plan.tier === "Team" ? "/user/mo" : "/month"}
                  </span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-[var(--muted)]"
                    >
                      <span className="text-[var(--success)]">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 rounded-xl font-medium text-sm ${
                    plan.featured
                      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                      : "border border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-16 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to get things done?
        </h2>
        <p className="text-[var(--muted)] mb-8 max-w-md mx-auto">
          Join NudgeAI and start building better habits, crushing deadlines,
          and actually enjoying your productivity journey.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3.5 bg-[var(--primary)] text-white rounded-xl font-medium text-lg hover:bg-[var(--primary-dark)] shadow-lg shadow-purple-200"
        >
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-16 py-8 border-t border-[var(--border)] text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <span className="font-semibold">NudgeAI</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Built with love for real people who want to do better every day.
        </p>
      </footer>
    </div>
  );
}
