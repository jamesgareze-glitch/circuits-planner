import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { describeBlockFormat } from "@/lib/format";
import { submitFeedback } from "./actions";

export default async function PublicSessionPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const submitted = query.submitted !== undefined;

  const session = await prisma.session.findUnique({
    where: { shareSlug: slug },
    include: {
      exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: true } },
      blocks: {
        orderBy: { orderIndex: "asc" },
        include: { category: true, exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: true } } },
      },
    },
  });
  if (!session) notFound();
  const hasBlocks = session.blocks.length > 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">
          Circuits —{" "}
          {session.date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h1>
        <p className="text-sm text-zinc-500">How was today&apos;s session?</p>
      </div>

      {hasBlocks ? (
        <div className="flex flex-col gap-3">
          {session.blocks.map((block) => {
            const formatSummary = block.type === "category" ? describeBlockFormat(block) : null;
            return (
              <div key={block.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="border-b border-zinc-200 px-4 py-1.5 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {block.type === "text" ? "Note" : block.category?.name ?? "Category"}
                  </p>
                  {formatSummary && <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">{formatSummary}</p>}
                  {block.partnerNote && <p className="mt-0.5 text-xs italic text-zinc-500">{block.partnerNote}</p>}
                </div>
                {block.type === "text" ? (
                  <p className="whitespace-pre-wrap px-4 py-2 text-sm">{block.textContent}</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {block.exercises.map((se) => (
                      <li key={se.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span>{se.exercise.name}</span>
                        <span className="text-zinc-500">
                          {[
                            se.reps !== null ? `${se.reps} reps` : null,
                            se.weight !== null ? `${se.weight} kg` : null,
                            se.allocatedMinutes !== null ? `${se.allocatedMinutes} min` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {session.exercises.map((se) => (
            <li key={se.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{se.exercise.name}</span>
              <span className="text-zinc-500">{se.allocatedMinutes} min</span>
            </li>
          ))}
        </ul>
      )}

      {submitted ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          Thanks for the feedback!
        </p>
      ) : (
        <form action={submitFeedback} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="slug" value={slug} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Rating</legend>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 text-xs">
                  <input type="radio" name="rating" value={n} required />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm">
            Comment (optional)
            <textarea
              name="comment"
              rows={3}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Submit feedback
          </button>
        </form>
      )}
    </div>
  );
}
