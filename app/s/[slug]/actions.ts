"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function submitFeedback(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();
  if (!sessionId || rating < 1 || rating > 5) return;

  await prisma.feedback.create({
    data: { sessionId, rating, comment: comment || null },
  });
  revalidatePath("/sessions");
  redirect(`/s/${slug}?submitted=1`);
}
