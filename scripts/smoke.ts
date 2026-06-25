// Quick end-to-end smoke test of all four external services.
// Run: node --env-file=.env.local scripts/smoke.ts
import { generateStory } from "../lib/pipeline/story.ts";
import { synthesizeVoice } from "../lib/pipeline/voice.ts";
import { generateImage } from "../lib/pipeline/images.ts";
import { startRender, waitForRender } from "../lib/pipeline/render.ts";

function ok(m: string) { console.log("\x1b[32m✅ " + m + "\x1b[0m"); }
function bad(m: string) { console.log("\x1b[31m❌ " + m + "\x1b[0m"); }

const results: Record<string, boolean> = {};

// 1) Claude — story generation (structured output)
let story;
try {
  story = await generateStory("asansörde yaşanan komik bir an", "funny everyday story", "Turkish");
  ok(`Claude: "${story.title}" — ${story.scenes.length} sahne`);
  results.claude = true;
} catch (e: any) {
  bad("Claude: " + (e?.message || e));
  results.claude = false;
}

// 2) ElevenLabs — voice
try {
  const audio = await synthesizeVoice("Merhaba, bu bir ses testidir.");
  ok(`ElevenLabs: ${(audio.length / 1024).toFixed(0)} KB ses üretildi`);
  results.elevenlabs = true;
} catch (e: any) {
  bad("ElevenLabs: " + (e?.message || e));
  results.elevenlabs = false;
}

// 3) Replicate — image
try {
  const prompt = story?.scenes?.[0]?.image_prompt || "a cinematic vertical photo of a city at night";
  const img = await generateImage(prompt);
  ok(`Replicate: ${(img.length / 1024).toFixed(0)} KB görsel üretildi`);
  results.replicate = true;
} catch (e: any) {
  bad("Replicate: " + (e?.message || e));
  results.replicate = false;
}

// 4) Creatomate — render (uses public sample assets so it needs no storage)
try {
  const id = await startRender(
    [
      { imageUrl: "https://picsum.photos/1080/1920", caption: "Test sahnesi 1", duration: 2.5 },
      { imageUrl: "https://picsum.photos/seed/2/1080/1920", caption: "Test sahnesi 2", duration: 2.5 },
    ],
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  );
  ok(`Creatomate: render başladı (id ${id}), tamamlanması bekleniyor...`);
  const url = await waitForRender(id, { timeoutMs: 4 * 60_000 });
  ok(`Creatomate: video hazır → ${url}`);
  results.creatomate = true;
} catch (e: any) {
  bad("Creatomate: " + (e?.message || e));
  results.creatomate = false;
}

console.log("\n— ÖZET —");
for (const [k, v] of Object.entries(results)) console.log(`${v ? "✅" : "❌"} ${k}`);
