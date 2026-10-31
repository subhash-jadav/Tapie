"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Cassette, CassetteInput } from "@/lib/schema";
import { getMyTapes, rememberTape } from "@/lib/client";
import { Editor } from "@/components/editor/Editor";

type State =
  | { status: "loading" }
  | { status: "ok"; input: CassetteInput; key: string }
  | { status: "notfound" | "forbidden" | "error" };

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const key = decodeURIComponent(window.location.hash.slice(1)) || getMyTapes().find((t) => t.id === id)?.key || "";
    fetch(`/api/cassettes/${id}`, { headers: key ? { "x-edit-key": key } : {} })
      .then(async (res) => {
        if (res.status === 404) return setState({ status: "notfound" });
        if (!res.ok) return setState({ status: "error" });
        const { cassette, canEdit } = (await res.json()) as { cassette: Cassette; canEdit: boolean };
        if (!canEdit) return setState({ status: "forbidden" });
        rememberTape({ id, key, title: cassette.title, updatedAt: cassette.updatedAt });
        if (!window.location.hash) window.history.replaceState(null, "", `#${key}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, createdAt, updatedAt, ...input } = cassette;
        setState({ status: "ok", input, key });
      })
      .catch(() => setState({ status: "error" }));
  }, [id]);

  if (state.status === "ok") return <Editor initial={state.input} id={id} editKey={state.key} />;

  const messages = {
    loading: ["Loading your tape…", ""],
    notfound: ["Tape not found", "This mixtape doesn't exist or was deleted."],
    forbidden: ["This edit link isn't valid", "You can still listen to the tape, but you need the secret edit link to change it."],
    error: ["Something went wrong", "Couldn't load the tape. Check your connection and refresh."],
  } as const;
  const [title, text] = messages[state.status];
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="mb-2 font-display text-3xl">{title}</h1>
        {text && <p className="mb-6 text-ink/70">{text}</p>}
        {state.status === "forbidden" && (
          <Link className="btn btn-primary mr-2" href={`/c/${id}`}>
            Listen to it
          </Link>
        )}
        {state.status !== "loading" && (
          <Link className="btn btn-ghost" href="/">
            Home
          </Link>
        )}
      </div>
    </main>
  );
}
