// Re-test only the two services we just set up billing for.
// Run: node --env-file=.env.local scripts/smoke-billing.ts
import { synthesizeVoice } from "../lib/pipeline/voice.ts";
import { generateImage } from "../lib/pipeline/images.ts";

function ok(m: string) { console.log("\x1b[32m✅ " + m + "\x1b[0m"); }
function bad(m: string) { console.log("\x1b[31m❌ " + m + "\x1b[0m"); }

try {
  const audio = await synthesizeVoice("Merhaba, bu bir ses testidir.");
  ok(`ElevenLabs: ${(audio.length / 1024).toFixed(0)} KB ses üretildi`);
} catch (e: any) {
  bad("ElevenLabs: " + (e?.message || e));
}

try {
  const img = await generateImage("a cinematic vertical photo of a city street at night, moody lighting");
  ok(`Replicate: ${(img.length / 1024).toFixed(0)} KB görsel üretildi`);
} catch (e: any) {
  bad("Replicate: " + (e?.message || e));
}
