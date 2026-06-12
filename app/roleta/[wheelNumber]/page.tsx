import { redirect } from "next/navigation";
import { Roulette } from "@/components/Roulette";
import { readRouletteAccessSession } from "@/lib/auth";

type RoulettePageProps = {
  params: Promise<{ wheelNumber: string }>;
};

export default async function RoulettePage({ params }: RoulettePageProps) {
  const accessKey = await readRouletteAccessSession();

  if (!accessKey) {
    redirect("/");
  }

  const { wheelNumber: wheelParam } = await params;
  const wheelNumber = Number(wheelParam);

  if (wheelNumber !== accessKey.wheelNumber) {
    redirect(`/roleta/${accessKey.wheelNumber}`);
  }

  return <Roulette wheelNumber={wheelNumber} />;
}
