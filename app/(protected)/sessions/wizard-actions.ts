"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { eligiblePoolForCategory, pickWeighted, SelectableExercise } from "@/lib/selection";
import { fetchForecastForDate, seasonForDate } from "@/lib/weather";

export async function getWizardContext(dateStr: string) {
  const date = new Date(`${dateStr}T09:00:00`);
  const [settings, categories, forecast] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    fetchForecastForDate(date),
  ]);

  return {
    settings,
    categories,
    forecast,
    season: seasonForDate(date),
    withinForecastRange: forecast !== null,
  };
}

export type Suggestion = {
  categoryId: string;
  categoryName: string;
  chosen: SelectableExercise | undefined;
  pool: SelectableExercise[];
};

export async function getSuggestions(
  dateStr: string,
  categoryIds: string[],
): Promise<Suggestion[]> {
  const date = new Date(`${dateStr}T09:00:00`);
  const [settings, categories, forecast, exercises] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { id: { in: categoryIds } } }),
    fetchForecastForDate(date),
    prisma.exercise.findMany({ where: { categoryId: { in: categoryIds } } }),
  ]);

  const exerciseIds = exercises.map((e) => e.id);
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId: { in: exerciseIds } },
    include: { session: { select: { date: true } } },
  });
  const lastUsedByExerciseId = new Map<string, Date>();
  for (const se of sessionExercises) {
    const current = lastUsedByExerciseId.get(se.exerciseId);
    if (!current || se.session.date > current) {
      lastUsedByExerciseId.set(se.exerciseId, se.session.date);
    }
  }

  const season = seasonForDate(date);

  return categories.map((category) => {
    const pool = eligiblePoolForCategory(exercises, category.id, {
      forecast,
      season,
      weatherFilterOn: settings.weatherFilter,
      seasonFilterOn: settings.seasonFilter,
      lastUsedByExerciseId,
      sessionDate: date,
    });
    const chosen = pickWeighted(pool) ?? pool[0];
    return {
      categoryId: category.id,
      categoryName: category.name,
      chosen,
      pool,
    };
  });
}

export async function createSession(input: {
  dateStr: string;
  targetMinutes: number;
  notes?: string;
  attendanceCount?: number;
  exercises: { exerciseId: string; allocatedMinutes: number }[];
}) {
  const shareSlug = randomBytes(9).toString("base64url");
  const session = await prisma.session.create({
    data: {
      date: new Date(`${input.dateStr}T09:00:00`),
      targetMinutes: input.targetMinutes,
      notes: input.notes || null,
      attendanceCount: input.attendanceCount ?? null,
      shareSlug,
      exercises: {
        create: input.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          allocatedMinutes: e.allocatedMinutes,
          orderIndex: i,
        })),
      },
    },
  });
  revalidatePath("/sessions");
  redirect(`/sessions/${session.id}`);
}
