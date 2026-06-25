const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generate a 9:16 background image from a prompt using Replicate (Flux).
 * Returns the raw image bytes (so we can re-host them on Supabase Storage).
 *
 * Retries on rate-limit (429) and transient 5xx errors. Replicate throttles
 * accounts with low credit (6 req/min, burst 1), so the pipeline must back off.
 */
export async function generateImage(prompt: string, attempt = 0): Promise<Buffer> {
  const model = process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell";

  // `Prefer: wait` makes Replicate block until the prediction finishes.
  const res = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN!}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: "9:16",
          output_format: "jpg",
          num_outputs: 1,
        },
      }),
    }
  );

  // Back off and retry on throttling / transient errors.
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    const retryAfter = Number(res.headers.get("retry-after")) || 0;
    const wait = Math.max(retryAfter * 1000, 2000 * (attempt + 1));
    await sleep(wait);
    return generateImage(prompt, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Replicate error ${res.status}: ${await res.text()}`);
  }

  const prediction = await res.json();
  if (prediction.status === "failed") {
    throw new Error(`Image generation failed: ${prediction.error}`);
  }

  const output = prediction.output;
  const url = Array.isArray(output) ? output[0] : output;
  if (!url) throw new Error("Replicate returned no image URL");

  const img = await fetch(url);
  return Buffer.from(await img.arrayBuffer());
}
