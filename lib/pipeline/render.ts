/**
 * Build a Creatomate "source" (a vertical 1080x1920 video) from the
 * generated scenes, then render it to an MP4.
 */

export interface RenderScene {
  imageUrl: string;
  caption: string;
  /** seconds this scene is on screen */
  duration: number;
}

const API = "https://api.creatomate.com/v1/renders";

/** Estimate how long a narration line takes to speak (seconds). */
export function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, words / 2.6); // ~2.6 words/sec
}

function buildSource(scenes: RenderScene[], audioUrl: string) {
  const elements: any[] = [];
  let t = 0;

  for (const s of scenes) {
    // Background image with a slow Ken-Burns zoom.
    elements.push({
      type: "image",
      track: 1,
      time: t,
      duration: s.duration,
      source: s.imageUrl,
      animations: [
        {
          type: "scale",
          scope: "element",
          easing: "linear",
          start_scale: "100%",
          end_scale: "115%",
        },
      ],
    });

    // Caption (subtitle) for this scene.
    elements.push({
      type: "text",
      track: 2,
      time: t,
      duration: s.duration,
      text: s.caption,
      width: "86%",
      x_alignment: "50%",
      y_alignment: "82%",
      font_family: "Montserrat",
      font_weight: "800",
      font_size: "6.5 vmin",
      line_height: "120%",
      fill_color: "#ffffff",
      stroke_color: "#000000",
      stroke_width: "0.6 vmin",
      background_color: "rgba(0,0,0,0.45)",
      background_x_padding: "26%",
      background_y_padding: "12%",
    });

    t += s.duration;
  }

  // Voiceover spanning the whole video.
  elements.push({ type: "audio", track: 3, time: 0, source: audioUrl });

  return {
    output_format: "mp4",
    width: 1080,
    height: 1920,
    frame_rate: 30,
    elements,
  };
}

/** Kick off a render. Returns the Creatomate render id. */
export async function startRender(
  scenes: RenderScene[],
  audioUrl: string
): Promise<string> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CREATOMATE_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: buildSource(scenes, audioUrl) }),
  });

  if (!res.ok) {
    throw new Error(`Creatomate error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const render = Array.isArray(data) ? data[0] : data;
  if (!render?.id) throw new Error("Creatomate returned no render id");
  return render.id;
}

/** Poll a render until it succeeds; returns the final MP4 URL. */
export async function waitForRender(
  id: string,
  { timeoutMs = 8 * 60_000, intervalMs = 5_000 } = {}
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/${id}`, {
      headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY!}` },
    });
    if (!res.ok) throw new Error(`Creatomate poll ${res.status}`);
    const r = await res.json();
    if (r.status === "succeeded") return r.url as string;
    if (r.status === "failed") throw new Error(`Render failed: ${r.error_message}`);
    await new Promise((ok) => setTimeout(ok, intervalMs));
  }
  throw new Error("Render timed out");
}
