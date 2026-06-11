import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@zenixblox.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD precisa estar configurada antes de executar o seed.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      name: "ZenixBlox Admin",
      email,
      passwordHash
    }
  });

  const items = [
    {
      name: "Robux Spark Pack",
      imageUrl: "/items/robux-spark.svg",
      rarity: "Comum",
      probability: 52,
      wheelNumber: 1
    },
    {
      name: "VIP Server Boost",
      imageUrl: "/items/vip-boost.svg",
      rarity: "Raro",
      probability: 28,
      wheelNumber: 1
    },
    {
      name: "Avatar Neon Drop",
      imageUrl: "/items/avatar-drop.svg",
      rarity: "Epico",
      probability: 14,
      wheelNumber: 1
    },
    {
      name: "Gamepass Premium",
      imageUrl: "/items/gamepass-premium.svg",
      rarity: "Lendario",
      probability: 5,
      wheelNumber: 1
    },
    {
      name: "Zenix Ultra Prize",
      imageUrl: "/items/ultra-prize.svg",
      rarity: "Mitico",
      probability: 1,
      wheelNumber: 1
    }
  ];

  for (const item of items) {
    await prisma.wheelItem.upsert({
      where: { id: item.name.toLowerCase().replaceAll(" ", "-") },
      update: {},
      create: {
        id: item.name.toLowerCase().replaceAll(" ", "-"),
        ...item
      }
    });
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    const keys = [
      { code: "ZENIX-DEMO-1", label: "Demo uso unico", singleUse: true },
      { code: "ZENIX-DEMO-2", label: "Demo uso unico", singleUse: true },
      { code: "ZENIX-REUSE", label: "Demo reutilizavel", singleUse: false }
    ];

    for (const key of keys) {
      await prisma.accessKey.upsert({
        where: { code: key.code },
        update: {},
        create: key
      });
    }
  }

  await prisma.generalSetting.upsert({
    where: { key: "brand_name" },
    update: {},
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
