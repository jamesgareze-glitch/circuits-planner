"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SEASONS } from "@/lib/constants";

function parseSeasons(formData: FormData): string[] {
  return SEASONS.filter((s) => formData.get(`season-${s}`) === "on");
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const count = await prisma.category.count();
  await prisma.category.create({ data: { name, sortOrder: count } });
  revalidatePath("/exercises");
  revalidatePath("/exercises/new");
}

export async function createExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 5);
  if (!name || !categoryId) return;

  await prisma.exercise.create({
    data: {
      name,
      categoryId,
      description: String(formData.get("description") ?? "") || null,
      estimatedMinutes,
      minTempC: parseOptionalInt(formData.get("minTempC")),
      maxTempC: parseOptionalInt(formData.get("maxTempC")),
      avoidRain: formData.get("avoidRain") === "on",
      avoidHighWind: formData.get("avoidHighWind") === "on",
      seasons: parseSeasons(formData),
    },
  });
  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function updateExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 5);
  if (!id || !name || !categoryId) return;

  await prisma.exercise.update({
    where: { id },
    data: {
      name,
      categoryId,
      description: String(formData.get("description") ?? "") || null,
      estimatedMinutes,
      minTempC: parseOptionalInt(formData.get("minTempC")),
      maxTempC: parseOptionalInt(formData.get("maxTempC")),
      avoidRain: formData.get("avoidRain") === "on",
      avoidHighWind: formData.get("avoidHighWind") === "on",
      seasons: parseSeasons(formData),
    },
  });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  redirect("/exercises");
}

export async function deleteExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.exercise.delete({ where: { id } });
  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function vote(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  await prisma.exercise.update({
    where: { id },
    data: direction === "up" ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
  });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
}

export async function addComment(formData: FormData) {
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!exerciseId || !text) return;
  await prisma.exerciseComment.create({ data: { exerciseId, text } });
  revalidatePath(`/exercises/${exerciseId}`);
}
