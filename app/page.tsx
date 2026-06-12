import { redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { readRouletteAccessSession } from "@/lib/auth";

export default async function Home() {
  const accessKey = await readRouletteAccessSession();

  if (accessKey) {
    redirect(`/roleta/${accessKey.wheelNumber}`);
  }

  return <AccessGate />;
}
