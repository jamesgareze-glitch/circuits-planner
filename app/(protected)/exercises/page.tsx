import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCategory, vote } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { exercises: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Exercise library</h1>
        <Link
          href="/exercises/new"
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          + New exercise
        </Link>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-zinc-500">No categories yet — add one below to get started.</p>
      )}

      {categories.map((category) => (
        <section key={category.id} className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">{category.name}</h2>
          {category.exercises.length === 0 ? (
            <p className="text-sm text-zinc-500">No exercises in this category yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {category.exercises.map((ex) => {
                const badges: string[] = [];
                if (ex.minTempC !== null || ex.maxTempC !== null) {
                  badges.push(
                    `${ex.minTempC ?? "–"}° to ${ex.maxTempC ?? "–"}°C`,
                  );
                }
                if (ex.avoidRain) badges.push("no rain");
                if (ex.avoidHighWind) badges.push("no high wind");
                if (ex.seasons.length > 0) badges.push(ex.seasons.join("/"));

                return (
                  <li key={ex.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <Link href={`/exercises/${ex.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{ex.name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {ex.estimatedMinutes} min
                        {badges.length > 0 ? ` · ${badges.join(" · ")}` : ""}
                      </p>
                    </Link>
                    <form action={vote} className="flex items-center gap-1 text-sm">
                      <input type="hidden" name="id" value={ex.id} />
                      <button
                        type="submit"
                        name="direction"
                        value="up"
                        className="rounded px-2 py-1 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        ▲ {ex.upvotes}
                      </button>
                      <button
                        type="submit"
                        name="direction"
                        value="down"
                        className="rounded px-2 py-1 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        ▼ {ex.downvotes}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <section className="rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Add a category</h3>
        <form action={createCategory} className="flex gap-2">
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Cardio"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
