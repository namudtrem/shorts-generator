import { supabaseAdmin, uploadMedia } from "../supabase/admin";
import { generateStory } from "./story";
import { synthesizeVoice } from "./voice";
import { generateImage } from "./images";
import {
  startRender,
  waitForRender,
  estimateDuration,
  type RenderScene,
} from "./render";

/** Update a job row's status (service role — bypasses RLS). */
async function patch(id: string, fields: Record<string, unknown>) {
  await supabaseAdmin.from("videos").update(fields).eq("id", id);
}

/**
 * Run the full pipeline for one job row.
 * Each stage writes its status + artifacts back to the `videos` table so the
 * UI can show live progress by polling.
 */
export async function runPipeline(jobId: string) {
  try {
    const { data: job, error } = await supabaseAdmin
      .from("videos")
      .select("*")
      .eq("id", jobId)
      .single();
    if (error || !job) throw new Error("job not found");

    // 1) Story (Claude)
    await patch(jobId, { status: "writing" });
    const story = await generateStory(job.topic, job.genre, "Turkish");
    await patch(jobId, {
      title: story.title,
      description: `${story.description}\n\n${story.hashtags.map((h) => "#" + h).join(" ")}`,
      script: story.scenes.map((s) => s.narration).join(" "),
    });

    // 2) Voiceover (ElevenLabs) — one MP3 for the whole narration
    await patch(jobId, { status: "voicing" });
    const fullNarration = story.scenes.map((s) => s.narration).join(" ");
    const audio = await synthesizeVoice(fullNarration);
    const audioUrl = await uploadMedia(`${jobId}/voice.mp3`, audio, "audio/mpeg");
    await patch(jobId, { audio_url: audioUrl });

    // 3) Background images (Replicate) — one per scene
    await patch(jobId, { status: "imaging" });
    const imageUrls: string[] = [];
    for (let i = 0; i < story.scenes.length; i++) {
      const bytes = await generateImage(story.scenes[i].image_prompt);
      const url = await uploadMedia(`${jobId}/img-${i}.jpg`, bytes, "image/jpeg");
      imageUrls.push(url);
      await patch(jobId, { image_urls: imageUrls });
    }

    // 4) Render (Creatomate)
    await patch(jobId, { status: "rendering" });
    const scenes: RenderScene[] = story.scenes.map((s, i) => ({
      imageUrl: imageUrls[i],
      caption: s.narration,
      duration: estimateDuration(s.narration),
    }));
    const renderId = await startRender(scenes, audioUrl);
    await patch(jobId, { render_id: renderId });
    const videoUrl = await waitForRender(renderId);

    // 5) Done
    await patch(jobId, { status: "done", video_url: videoUrl });
  } catch (e: any) {
    await patch(jobId, { status: "error", error: String(e?.message || e) });
    throw e;
  }
}
