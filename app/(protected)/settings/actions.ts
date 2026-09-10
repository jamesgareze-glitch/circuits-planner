"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateSettings(formData: FormData) {
  const recencyWeeksRaw = Number(formData.get("recencyWeeks") ?? 2);
  const recencyWeeks = Number.isFinite(recencyWeeksRaw) && recencyWeeksRaw > 0 ? recencyWeeksRaw : 2;

  const exercisesPerCategoryRaw = Number(formData.get("exercisesPerCategoryDefault") ?? 1);
  const exercisesPerCategoryDefault =
    Number.isFinite(exercisesPerCategoryRaw) && exercisesPerCategoryRaw > 0 ? exercisesPerCategoryRaw : 1;

  const data = {
    weatherFilter: formData.get("weatherFilter") === "on",
    seasonFilter: formData.get("seasonFilter") === "on",
    recencyFilter: formData.get("recencyFilter") === "on",
    recencyWeeks,
    exercisesPerCategoryDefault,
  };

  await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  revalidatePath("/settings");
}
