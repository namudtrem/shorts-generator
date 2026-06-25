import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/videos — list the signed-in user's jobs. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data });
}

/** POST /api/videos — create a job and start the pipeline. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { topic, genre } = await req.json();
  if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });

  const { data: job, error } = await supabase
    .from("videos")
    .insert({ user_id: user.id, topic, genre: genre || "story", status: "pending" })
    .select()
    .single();

  if (error || !job)
    return NextResponse.json({ error: error?.message || "insert failed" }, { status: 500 });

  // Trigger the pipeline.
  if (process.env.NODE_ENV === "production") {
    // Production (Netlify): invoke the long-running background function (15 min).
    // A normal serverless function would be killed ~10s after the response,
    // so the heavy pipeline must run in a *background* function instead.
    // Build an absolute URL from the incoming request host (no config needed).
    const host = req.headers.get("host");
    const base = process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");
    // Background functions answer 202 instantly, so awaiting only guarantees
    // the invocation fires before this handler is frozen.
    try {
      await fetch(`${base}/.netlify/functions/generate-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
    } catch (e) {
      console.error("background trigger failed", e);
    }
  } else {
    // Local dev: run inline (fire-and-forget). `next dev` keeps the process alive.
    const { runPipeline } = await import("@/lib/pipeline/run");
    void runPipeline(job.id);
  }

  return NextResponse.json({ job });
}
