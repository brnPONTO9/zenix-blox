import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@zenixblox.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ZenixBlox@123";

  await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash: await bcrypt.hash(password, 12)
    },
    create: {
      name: "ZenixBlox Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  const items = [
    {
      name: "Robux Spark Pack",
      imageUrl: "/items/robux-spark.svg",
      rarity: "Comum",
      probability: 52
    },
    {
      name: "VIP Server Boost",
      imageUrl: "/items/vip-boost.svg",
      rarity: "Raro",
      probability: 28
    },
    {
      name: "Avatar Neon Drop",
      imageUrl: "/items/avatar-drop.svg",
      rarity: "Epico",
      probability: 14
    },
    {
      name: "Gamepass Premium",
      imageUrl: "/items/gamepass-premium.svg",
      rarity: "Lendario",
      probability: 5
    },
    {
      name: "Zenix Ultra Prize",
      imageUrl: "/items/ultra-prize.svg",
      rarity: "Mitico",
      probability: 1
    }
  ];

  for (const item of items) {
    await prisma.wheelItem.upsert({
      where: { id: item.name.toLowerCase().replaceAll(" ", "-") },
      update: { ...item, deletedAt: null },
      create: {
        id: item.name.toLowerCase().replaceAll(" ", "-"),
        ...item
      }
    });
  }

  const keys = [
    { code: "ZENIX-DEMO-1", label: "Demo uso unico", singleUse: true },
    { code: "ZENIX-DEMO-2", label: "Demo uso unico", singleUse: true },
    { code: "ZENIX-REUSE", label: "Demo reutilizavel", singleUse: false }
  ];

  for (const key of keys) {
    await prisma.accessKey.upsert({
      where: { code: key.code },
      update: { deletedAt: null },
      create: key
    });
  }

  await prisma.generalSetting.upsert({
    where: { key: "brand_name" },
    update: { value: "ZenixBlox" },
    create: { key: "brand_name", value: "ZenixBlox" }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
