import { redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { readRouletteAccessSession } from "@/lib/auth";

type HomeProps = {
  searchParams?: Promise<{
    key?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const accessKey = await readRouletteAccessSession();
  const params = await searchParams;

  if (accessKey) {
    redirect(`/roleta/${accessKey.wheelNumber}`);
  }

  return <AccessGate initialCode={params?.key ?? ""} />;
}
