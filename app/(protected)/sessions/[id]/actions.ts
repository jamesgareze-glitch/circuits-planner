"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateSessionDetails(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const attendanceRaw = formData.get("attendanceCount");
  const attendanceCount =
    attendanceRaw === null || attendanceRaw === "" ? null : Number(attendanceRaw);

  await prisma.session.update({
    where: { id },
    data: {
      notes: String(formData.get("notes") ?? "") || null,
      attendanceCount,
    },
  });
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/sessions");
}
