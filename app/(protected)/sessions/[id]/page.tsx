import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { blockTotalMinutes, describeBlockFormat } from "@/lib/format";
import { CopyLink } from "./CopyLink";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { deleteSession, updateSessionDetails } from "./actions";

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: true } },
      blocks: {
        orderBy: { orderIndex: "asc" },
        include: { category: true, exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: true } } },
      },
      feedback: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!session) notFound();

  const headersList = await headers();
  const host = headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const shareUrl = `${proto}://${host}/s/${session.shareSlug}`;

  const hasBlocks = session.blocks.length > 0;
  const totalMinutes = hasBlocks
    ? session.blocks.reduce((a, b) => a + (b.type === "category" ? blockTotalMinutes(b) : 0), 0)
    : session.exercises.reduce((a, e) => a + (e.allocatedMinutes ?? 0), 0);
  const hasAllocatedMinutes = hasBlocks
    ? totalMinutes > 0
    : session.exercises.some((e) => e.allocatedMinutes !== null);
  const dateLabel = session.date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{session.title || dateLabel}</h1>
          <p className="text-sm text-zinc-500">
            {session.title ? `${dateLabel}${session.dateIsGuess ? " (date estimated)" : ""}` : null}
            {session.title && (hasAllocatedMinutes || session.targetMinutes) ? " · " : ""}
            {hasAllocatedMinutes && `${totalMinutes} min planned`}
            {hasAllocatedMinutes && session.targetMinutes ? ` (target ${session.targetMinutes} min)` : ""}
            {!hasAllocatedMinutes && session.targetMinutes ? `~${session.targetMinutes} min` : ""}
          </p>
        </div>
        <form action={deleteSession}>
          <input type="hidden" name="id" value={session.id} />
          <DeleteSessionButton label={session.title || dateLabel} />
        </form>
      </div>

      {session.rawContent && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Original workout</h2>
          <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white px-4 py-3 font-sans text-sm dark:border-zinc-800 dark:bg-zinc-950">
            {session.rawContent}
          </pre>
        </section>
      )}

      {hasBlocks ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Exercises</h2>
          {session.blocks.map((block) => {
            const formatSummary = block.type === "category" ? describeBlockFormat(block) : null;
            return (
              <div key={block.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {block.type === "text" ? "Note" : block.category?.name ?? "Category"}
                  </p>
                  {formatSummary && <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">{formatSummary}</p>}
                  {block.partnerNote && <p className="mt-0.5 text-xs italic text-zinc-500">{block.partnerNote}</p>}
                </div>
                {block.type === "text" ? (
                  <p className="whitespace-pre-wrap px-4 py-3 text-sm">{block.textContent}</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {block.exercises.map((se) => (
                      <li key={se.id} className="flex items-center justify-between px-4 py-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{se.exercise.name}</span>
                        <span className="text-sm text-zinc-500">
                          {se.allocatedMinutes !== null ? `${se.allocatedMinutes} min` : ""}
                          {se.weight !== null ? ` · ${se.weight} kg` : ""}
                          {se.reps !== null ? ` · ${se.reps} reps` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        session.exercises.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Exercises featured</h2>
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {session.exercises.map((se) => (
                <li key={se.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{se.exercise.name}</span>
                  {se.allocatedMinutes !== null && (
                    <span className="text-sm text-zinc-500">{se.allocatedMinutes} min</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Attendance & notes</h2>
        <form action={updateSessionDetails} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={session.id} />
          <label className="flex flex-col gap-1 text-sm">
            Attendance count
            <input
              type="number"
              min={0}
              name="attendanceCount"
              defaultValue={session.attendanceCount ?? ""}
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={session.notes ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900"
          >
            Save
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Share for feedback</h2>
        <CopyLink url={shareUrl} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Feedback ({session.feedback.length})</h2>
        {session.feedback.length === 0 ? (
          <p className="text-sm text-zinc-500">No feedback submitted yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {session.feedback.map((f) => (
              <li key={f.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                <p>{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</p>
                {f.comment && <p className="mt-1">{f.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
