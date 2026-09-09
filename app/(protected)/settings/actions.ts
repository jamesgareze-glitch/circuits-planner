"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateSettings(formData: FormData) {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      weatherFilter: formData.get("weatherFilter") === "on",
      seasonFilter: formData.get("seasonFilter") === "on",
    },
    create: {
      id: 1,
      weatherFilter: formData.get("weatherFilter") === "on",
      seasonFilter: formData.get("seasonFilter") === "on",
    },
  });
  revalidatePath("/settings");
}
