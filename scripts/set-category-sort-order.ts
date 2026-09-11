import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Derived from analyzing category appearance order across the 159 historical
// sessions (average normalized position of each category within a session's
// exercise sequence): Warm-up always opens, Cardio comes early, then Lower
// Body, Upper Body, Full Body/Strength, with Core (renamed Abs) and Games
// finishing the session.
const ORDER: Record<string, number> = {
  "Warm-up": 0,
  "Cardio": 10,
  "Lower Body": 20,
  "Upper Body": 30,
  "Full Body / Strength": 40,
  "Games": 50,
  "Abs": 60,
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = await prisma.category.findMany();
  for (const c of categories) {
    const sortOrder = ORDER[c.name];
    if (sortOrder === undefined) {
      console.log(`No known order for category "${c.name}" — leaving as-is (${c.sortOrder}).`);
      continue;
    }
    if (c.sortOrder === sortOrder) continue;
    await prisma.category.update({ where: { id: c.id }, data: { sortOrder } });
    console.log(`${c.name}: ${c.sortOrder} -> ${sortOrder}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
