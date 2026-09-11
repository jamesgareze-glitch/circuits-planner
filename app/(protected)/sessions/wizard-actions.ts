"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { eligiblePoolForCategory, pickWeightedMany, SelectableExercise } from "@/lib/selection";
import { fetchForecastForDate, seasonForDate } from "@/lib/weather";
import { RoutineFormat } from "@/lib/format";
import { RoutineSuggestion, suggestRoutine } from "@/lib/routineSuggestion";

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
  picks: SelectableExercise[];
  pool: SelectableExercise[];
  suggestedFormat: RoutineSuggestion;
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
      recencyFilterOn: settings.recencyFilter,
      recencyWeeks: settings.recencyWeeks,
      lastUsedByExerciseId,
      sessionDate: date,
    });
    const picks = pickWeightedMany(pool, settings.exercisesPerCategoryDefault);
    return {
      categoryId: category.id,
      categoryName: category.name,
      picks,
      pool,
      suggestedFormat: suggestRoutine(),
    };
  });
}

export type BlockInput =
  | {
      type: "category";
      categoryId: string;
      exercises: { exerciseId: string; minutes?: number; weight?: number; reps?: number }[];
      format: RoutineFormat;
      rounds?: number;
      workSeconds?: number;
      restSeconds?: number;
      timeCapMinutes?: number;
      ladderStart?: number;
      ladderEnd?: number;
      ladderStep?: number;
      ladderPyramid?: boolean;
      ladderUnit?: string;
      isPartner: boolean;
      partnerNote?: string;
    }
  | { type: "text"; text: string };

export async function createSession(input: {
  dateStr: string;
  targetMinutes: number;
  notes?: string;
  attendanceCount?: number;
  blocks: BlockInput[];
}) {
  const [warmup, abs] = await Promise.all([
    prisma.category.findFirst({ where: { name: "Warm-up" } }),
    prisma.category.findFirst({ where: { name: "Abs" } }),
  ]);

  const blockRank = (b: BlockInput) => {
    if (b.type !== "category") return 1;
    if (warmup && b.categoryId === warmup.id) return 0;
    if (abs && b.categoryId === abs.id) return 2;
    return 1;
  };
  const orderedBlocks = [...input.blocks].sort((a, b) => blockRank(a) - blockRank(b));

  const shareSlug = randomBytes(9).toString("base64url");
  const session = await prisma.session.create({
    data: {
      date: new Date(`${input.dateStr}T09:00:00`),
      targetMinutes: input.targetMinutes,
      notes: input.notes || null,
      attendanceCount: input.attendanceCount ?? null,
      shareSlug,
      blocks: {
        create: orderedBlocks.map((block, i) =>
          block.type === "text"
            ? { orderIndex: i, type: "text", textContent: block.text }
            : {
                orderIndex: i,
                type: "category",
                categoryId: block.categoryId,
                format: block.format,
                rounds: block.rounds ?? null,
                workSeconds: block.workSeconds ?? null,
                restSeconds: block.restSeconds ?? null,
                timeCapMinutes: block.timeCapMinutes ?? null,
                ladderStart: block.ladderStart ?? null,
                ladderEnd: block.ladderEnd ?? null,
                ladderStep: block.ladderStep ?? null,
                ladderPyramid: block.ladderPyramid ?? false,
                ladderUnit: block.ladderUnit ?? null,
                isPartner: block.isPartner,
                partnerNote: block.partnerNote || null,
              },
        ),
      },
    },
    include: { blocks: true },
  });

  // Created as a second pass (rather than nested under blocks above) because
  // SessionExercise.sessionId is a sibling relation to blockId, not an ancestor in
  // the nested-write tree, so Prisma can't infer it from the blocks.create() nesting.
  for (const [i, block] of orderedBlocks.entries()) {
    if (block.type !== "category") continue;
    const createdBlock = session.blocks[i];
    await prisma.sessionExercise.createMany({
      data: block.exercises.map((e, j) => ({
        sessionId: session.id,
        blockId: createdBlock.id,
        exerciseId: e.exerciseId,
        orderIndex: j,
        allocatedMinutes: e.minutes ?? null,
        weight: e.weight ?? null,
        reps: e.reps ?? null,
      })),
    });
  }

  revalidatePath("/sessions");
  redirect(`/sessions/${session.id}`);
}
