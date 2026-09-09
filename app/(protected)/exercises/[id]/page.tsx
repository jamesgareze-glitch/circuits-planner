import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExerciseForm } from "../ExerciseForm";
import { addComment, deleteExercise, updateExercise } from "../actions";

export default async function ExerciseDetailPage({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const [exercise, categories] = await Promise.all([
    prisma.exercise.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        <form action={deleteExercise}>
          <input type="hidden" name="id" value={exercise.id} />
          <button type="submit" className="text-sm text-red-600 hover:underline">
            Delete
          </button>
        </form>
      </div>

      <ExerciseForm
        action={updateExercise}
        categories={categories}
        defaults={exercise}
        submitLabel="Save changes"
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Comments</h2>
        <form action={addComment} className="flex gap-2">
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <input
            type="text"
            name="text"
            required
            placeholder="Add a note about this exercise…"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900">
            Post
          </button>
        </form>
        {exercise.comments.length === 0 ? (
          <p className="text-sm text-zinc-500">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exercise.comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                <p>{c.text}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {c.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
