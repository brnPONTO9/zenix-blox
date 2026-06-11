import { redirect } from "next/navigation";
import { Roulette } from "@/components/Roulette";
import { readRouletteAccessSession } from "@/lib/auth";

export default async function RoulettePage() {
  const accessKey = await readRouletteAccessSession();

  if (!accessKey) {
    redirect("/");
  }

  return <Roulette />;
}
