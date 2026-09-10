import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type SeedData = {
  categories: string[];
  exercises: { name: string; category: string; estimatedMinutes: number; avoidRain: boolean }[];
  sessions: {
    filename: string;
    title: string;
    date: string;
    dateIsGuess: boolean;
    rawContent: string | null;
    targetMinutes: number | null;
    exerciseNames: string[];
  }[];
};

async function main() {
  const data: SeedData = JSON.parse(
    readFileSync(join(__dirname, "../prisma/seed-data/historical-sessions.json"), "utf8"),
  );

  const categoryIdByName = new Map<string, string>();
  for (const [i, name] of data.categories.entries()) {
    const category = await prisma.category.upsert({
      where: { name },
      update: { sortOrder: i },
      create: { name, sortOrder: i },
    });
    categoryIdByName.set(name, category.id);
  }
  console.log(`Categories: ${categoryIdByName.size}`);

  const exerciseIdByName = new Map<string, string>();
  for (const ex of data.exercises) {
    const categoryId = categoryIdByName.get(ex.category);
    if (!categoryId) throw new Error(`Unknown category "${ex.category}" for exercise "${ex.name}"`);

    const existing = await prisma.exercise.findFirst({ where: { name: ex.name } });
    const exercise = existing
      ? await prisma.exercise.update({
          where: { id: existing.id },
          data: { categoryId, estimatedMinutes: ex.estimatedMinutes, avoidRain: ex.avoidRain },
        })
      : await prisma.exercise.create({
          data: {
            name: ex.name,
            categoryId,
            estimatedMinutes: ex.estimatedMinutes,
            avoidRain: ex.avoidRain,
          },
        });
    exerciseIdByName.set(ex.name, exercise.id);
  }
  console.log(`Exercises: ${exerciseIdByName.size}`);

  let created = 0;
  let updated = 0;
  for (const s of data.sessions) {
    const exerciseIds = s.exerciseNames
      .map((name) => exerciseIdByName.get(name))
      .filter((id): id is string => !!id);

    const existing = await prisma.session.findUnique({ where: { sourceFilename: s.filename } });

    const baseData = {
      date: new Date(`${s.date}T09:00:00`),
      dateIsGuess: s.dateIsGuess,
      title: s.title,
      rawContent: s.rawContent,
      targetMinutes: s.targetMinutes,
    };

    if (existing) {
      await prisma.sessionExercise.deleteMany({ where: { sessionId: existing.id } });
      await prisma.session.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          exercises: {
            create: exerciseIds.map((exerciseId, i) => ({ exerciseId, orderIndex: i })),
          },
        },
      });
      updated++;
    } else {
      await prisma.session.create({
        data: {
          ...baseData,
          shareSlug: randomBytes(9).toString("base64url"),
          sourceFilename: s.filename,
          exercises: {
            create: exerciseIds.map((exerciseId, i) => ({ exerciseId, orderIndex: i })),
          },
        },
      });
      created++;
    }
  }
  console.log(`Sessions created: ${created}, updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
