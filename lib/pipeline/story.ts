import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface Scene {
  /** Narration text for this scene, in the target language. */
  narration: string;
  /** English prompt describing the background image for this scene. */
  image_prompt: string;
}

export interface Story {
  title: string;
  description: string;
  hashtags: string[];
  scenes: Scene[];
}

const STORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Catchy YouTube Shorts title (<= 80 chars)" },
    description: { type: "string", description: "YouTube description, 1-2 sentences" },
    hashtags: {
      type: "array",
      items: { type: "string" },
      description: "5-8 relevant hashtags without the # symbol",
    },
    scenes: {
      type: "array",
      description: "5-7 scenes that together form a 30-50 second story",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          narration: { type: "string", description: "Spoken line(s) for this scene" },
          image_prompt: {
            type: "string",
            description:
              "Vivid English image-generation prompt for a 9:16 vertical background, cinematic, no text",
          },
        },
        required: ["narration", "image_prompt"],
      },
    },
  },
  required: ["title", "description", "hashtags", "scenes"],
} as const;

/**
 * Generate an entertaining short-form story for a given topic.
 * `language` is the narration language (e.g. "Turkish").
 */
export async function generateStory(
  topic: string,
  genre: string,
  language = "Turkish"
): Promise<Story> {
  const system = [
    `You are a viral short-form video writer. You write punchy, emotionally engaging`,
    `${genre} stories for YouTube Shorts (vertical, 30-50 seconds).`,
    `The narration MUST be written in ${language}.`,
    `Rules:`,
    `- Open with a 1-2 second hook that stops the scroll. No "hello" or intros.`,
    `- Build tension, deliver a twist or payoff near the end.`,
    `- End with a short call-to-action that invites comments.`,
    `- Keep each scene's narration to 1-2 sentences.`,
    `- image_prompt must be in ENGLISH and describe a cinematic vertical background with no text or words.`,
  ].join("\n");

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system,
    output_config: { format: { type: "json_schema", schema: STORY_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Topic / niche: ${topic}\n\nWrite the Short now.`,
      },
    ],
  });

  const text = msg.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Claude returned no text");
  return JSON.parse(text.text) as Story;
}
