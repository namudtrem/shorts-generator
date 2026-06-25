// Netlify *background* function: any file ending in `-background` may run for
// up to 15 minutes — long enough for the full Claude -> ElevenLabs -> images
// -> Creatomate render pipeline. It returns 202 immediately and keeps working.
import { runPipeline } from "../../lib/pipeline/run";

export default async function handler(req: Request) {
  try {
    const { jobId } = await req.json();
    if (!jobId) return new Response("jobId required", { status: 400 });
    await runPipeline(jobId);
    return new Response("ok");
  } catch (e: any) {
    // Errors are already recorded on the job row by runPipeline.
    return new Response(String(e?.message || e), { status: 500 });
  }
}
