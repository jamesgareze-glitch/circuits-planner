import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const core = await prisma.category.findFirst({ where: { name: "Core" } });
  if (!core) {
    console.log('No "Core" category found — nothing to rename.');
    return;
  }
  await prisma.category.update({ where: { id: core.id }, data: { name: "Abs" } });
  console.log('Renamed "Core" -> "Abs" (id ' + core.id + ")");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
