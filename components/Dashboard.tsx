"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

interface Video {
  id: string;
  topic: string;
  genre: string;
  status: string;
  error: string | null;
  title: string | null;
  description: string | null;
  video_url: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Sırada",
  writing: "Hikaye yazılıyor",
  voicing: "Seslendiriliyor",
  imaging: "Görseller üretiliyor",
  rendering: "Video render ediliyor",
  done: "Hazır",
  error: "Hata",
};

const GENRES = [
  { value: "plot-twist story", label: "Sürpriz sonlu hikaye" },
  { value: "funny everyday story", label: "Komik günlük hikaye" },
  { value: "scary story", label: "Korku hikayesi" },
  { value: "motivational story", label: "Motivasyon" },
  { value: "interesting facts", label: "İlginç bilgiler" },
];

export default function Dashboard({
  initialVideos,
  email,
}: {
  initialVideos: Video[];
  email: string;
}) {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState(GENRES[0].value);
  const [submitting, setSubmitting] = useState(false);

  // Poll for live progress while any job is in flight.
  useEffect(() => {
    const active = videos.some((v) => !["done", "error"].includes(v.status));
    if (!active) return;
    const t = setInterval(async () => {
      const res = await fetch("/api/videos");
      if (res.ok) setVideos((await res.json()).videos);
    }, 3000);
    return () => clearInterval(t);
  }, [videos]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, genre }),
    });
    setSubmitting(false);
    if (res.ok) {
      const { job } = await res.json();
      setVideos((v) => [job, ...v]);
      setTopic("");
    } else {
      alert((await res.json()).error || "Hata");
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎬 Shorts Generator</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>{email}</span>
          <button onClick={signOut} className="underline">
            Çıkış
          </button>
        </div>
      </header>

      <form
        onSubmit={create}
        className="mb-10 flex flex-col gap-3 rounded-xl bg-zinc-900/60 p-5 ring-1 ring-zinc-800"
      >
        <label className="text-sm text-zinc-400">Konu / niş</label>
        <input
          className="rounded bg-zinc-950 p-3 outline-none ring-1 ring-zinc-800"
          placeholder="Örn: asansörde yaşanan ilginç bir an"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <label className="text-sm text-zinc-400">Tür</label>
        <select
          className="rounded bg-zinc-950 p-3 outline-none ring-1 ring-zinc-800"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <button
          disabled={submitting}
          className="mt-2 rounded bg-indigo-600 p-3 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Başlatılıyor..." : "Short üret"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {videos.length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            Henüz video yok. Yukarıdan ilkini üret!
          </p>
        )}
        {videos.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    </main>
  );
}

function VideoCard({ v }: { v: Video }) {
  const busy = !["done", "error"].includes(v.status);
  return (
    <div className="rounded-xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
      <div className="flex items-center justify-between">
        <p className="font-medium">{v.title || v.topic}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            v.status === "done"
              ? "bg-emerald-900 text-emerald-300"
              : v.status === "error"
              ? "bg-red-900 text-red-300"
              : "bg-indigo-900 text-indigo-300"
          }`}
        >
          {STATUS_LABELS[v.status] || v.status}
        </span>
      </div>

      {busy && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-zinc-800">
          <div className="h-full w-1/3 animate-pulse rounded bg-indigo-500" />
        </div>
      )}

      {v.status === "error" && (
        <p className="mt-2 text-sm text-red-400">{v.error}</p>
      )}

      {v.status === "done" && v.video_url && (
        <div className="mt-3 flex flex-col gap-2">
          <video
            src={v.video_url}
            controls
            className="mx-auto max-h-[70vh] rounded-lg"
          />
          {v.description && (
            <p className="whitespace-pre-wrap text-sm text-zinc-400">
              {v.description}
            </p>
          )}
          <a
            href={v.video_url}
            download
            className="text-sm text-indigo-400 underline"
          >
            ⬇ Videoyu indir
          </a>
        </div>
      )}
    </div>
  );
}
