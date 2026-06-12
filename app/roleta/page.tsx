import { redirect } from "next/navigation";
import { readRouletteAccessSession } from "@/lib/auth";

export default async function RoulettePage() {
  const accessKey = await readRouletteAccessSession();

  if (!accessKey) {
    redirect("/");
  }

  redirect(`/roleta/${accessKey.wheelNumber}`);
}
