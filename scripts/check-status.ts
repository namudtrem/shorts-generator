// Lists the most recent jobs and their pipeline status.
// Run: node --env-file=.env.local --import tsx scripts/check-status.ts
import { supabaseAdmin } from "../lib/supabase/admin.ts";

async function main() {
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("topic, status, error, video_url, updated_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) { console.error("❌", error.message); process.exit(1); }
  for (const v of data || []) {
    console.log(`• [${v.status}] ${v.topic}`);
    if (v.error) console.log(`    hata: ${v.error}`);
    if (v.video_url) console.log(`    video: ${v.video_url}`);
    console.log(`    son güncelleme: ${v.updated_at}`);
  }
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
