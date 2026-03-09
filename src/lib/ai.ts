import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type NudgeContext = {
  userName: string;
  mood?: number; // 1-5
  timeOfDay: "morning" | "afternoon" | "evening";
  streakCount?: number;
  deadlineUrgency?: "low" | "medium" | "high" | "overdue";
  snoozedCount?: number;
  completedGoalsToday?: number;
  totalGoalsToday?: number;
};

const SYSTEM_PROMPT = `You are NudgeAI, a warm, friendly, and motivational productivity assistant. 
You speak like a supportive best friend who also happens to be very organized.

Your personality traits:
- Warm: Never cold or robotic
- Motivational: Celebrate small and big wins
- Honest: Gently call out patterns without shame  
- Adaptive: Adjust tone to user mood
- Human: Use casual language, not corporate-speak

Rules:
- Keep messages concise (1-2 sentences max)
- Use the user's name when natural
- If mood is low (1-2), be extra gentle and encouraging
- If mood is high (4-5), be energetic and celebratory
- Never guilt-trip. Always frame positively.
- Use occasional exclamation marks but don't overdo it.`;

export async function generateNudge(
  type: "deadline_reminder" | "habit_nudge" | "focus_prompt" | "daily_goal" | "mood_response" | "day_summary" | "celebration" | "procrastination",
  context: NudgeContext,
  additionalInfo?: string
): Promise<string> {
  const prompts: Record<string, string> = {
    deadline_reminder: `Generate a deadline reminder message for ${context.userName}. 
      Urgency: ${context.deadlineUrgency}. Times snoozed: ${context.snoozedCount || 0}. 
      Current mood: ${context.mood || "unknown"}. Time of day: ${context.timeOfDay}.
      ${additionalInfo ? `Additional context: ${additionalInfo}` : ""}`,

    habit_nudge: `Generate a habit check-in nudge for ${context.userName}. 
      Current streak: ${context.streakCount || 0} days. 
      Mood: ${context.mood || "unknown"}. Time: ${context.timeOfDay}.
      ${additionalInfo ? `Habit: ${additionalInfo}` : ""}`,

    focus_prompt: `Generate a focus session encouragement for ${context.userName}. 
      Mood: ${context.mood || "unknown"}. Time: ${context.timeOfDay}.
      ${additionalInfo ? `Task: ${additionalInfo}` : ""}`,

    daily_goal: `Generate a morning goal-setting prompt for ${context.userName}. 
      Mood: ${context.mood || "unknown"}. Time: ${context.timeOfDay}.
      ${additionalInfo || ""}`,

    mood_response: `Respond warmly to ${context.userName}'s mood check-in. 
      They reported mood level: ${context.mood}/5. Time: ${context.timeOfDay}.
      ${additionalInfo ? `Their note: ${additionalInfo}` : ""}`,

    day_summary: `Write a brief, warm daily summary for ${context.userName}. 
      They completed ${context.completedGoalsToday}/${context.totalGoalsToday} goals today.
      Mood: ${context.mood || "unknown"}.
      ${additionalInfo ? `Details: ${additionalInfo}` : ""}`,

    celebration: `Write a celebration message for ${context.userName}. 
      ${additionalInfo ? `Achievement: ${additionalInfo}` : ""}`,

    procrastination: `${context.userName} has snoozed a reminder ${context.snoozedCount} times. 
      Gently and kindly acknowledge this pattern and offer support. 
      Mood: ${context.mood || "unknown"}.
      ${additionalInfo ? `Task: ${additionalInfo}` : ""}`,
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: prompts[type] || additionalInfo || "Generate a friendly productivity nudge.",
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text || "Keep going! You're doing great!";
  } catch (error) {
    console.error("AI generation error:", error);
    // Fallback messages
    const fallbacks: Record<string, string> = {
      deadline_reminder: "Heads up! You've got a deadline coming up. You've got this!",
      habit_nudge: "Time for your daily check-in! Every day counts.",
      focus_prompt: "Ready to focus? Let's crush this!",
      daily_goal: "Good morning! What are your top goals for today?",
      mood_response: "Thanks for checking in! Every feeling is valid.",
      day_summary: "Another day done! You showed up, and that matters.",
      celebration: "Amazing work! You should be proud!",
      procrastination: "Hey, no pressure! Want to break this task into smaller steps?",
    };
    return fallbacks[type] || "You're doing great! Keep it up!";
  }
}
