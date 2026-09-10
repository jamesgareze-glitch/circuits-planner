import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ExerciseForm } from "../ExerciseForm";
import { createExercise } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewExercisePage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New exercise</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Add a category first from the <Link href="/exercises" className="underline">exercise library</Link>.
        </p>
      ) : (
        <ExerciseForm action={createExercise} categories={categories} submitLabel="Create exercise" />
      )}
    </div>
  );
}
