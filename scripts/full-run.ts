// Full end-to-end pipeline test: creates a job row, runs the whole pipeline,
// and prints the final video URL. Validates Supabase storage + orchestration.
// Run: node --env-file=.env.local --import tsx scripts/full-run.ts
import { supabaseAdmin } from "../lib/supabase/admin.ts";
import { runPipeline } from "../lib/pipeline/run.ts";

async function main() {
  const { data: job, error } = await supabaseAdmin
    .from("videos")
    .insert({
      topic: "gece vardiyasında çalışan bir güvenlikçinin başına gelen tuhaf olay",
      genre: "plot-twist story",
      status: "pending",
    })
    .select()
    .single();

  if (error || !job) {
    console.error("❌ iş kaydı oluşturulamadı:", error?.message);
    process.exit(1);
  }

  console.log("▶ iş başladı:", job.id);
  console.log("  (hikaye → ses → görseller → render, birkaç dakika sürer)\n");

  await runPipeline(job.id);

  const { data: done } = await supabaseAdmin
    .from("videos")
    .select("status, title, video_url, error")
    .eq("id", job.id)
    .single();

  console.log("\n— SONUÇ —");
  console.log("durum :", done?.status);
  console.log("başlık:", done?.title);
  if (done?.status === "done") {
    console.log("\x1b[32m🎬 VİDEO HAZIR:\x1b[0m", done?.video_url);
  } else {
    console.log("\x1b[31m❌ hata:\x1b[0m", done?.error);
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
