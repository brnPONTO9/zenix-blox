import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type RedeemPageProps = {
  searchParams?: Promise<{
    pedido?: string;
    order?: string;
    email?: string;
    pacote?: string;
    package?: string;
  }>;
};

export default async function RedeemPage({ searchParams }: RedeemPageProps) {
  const params = await searchParams;
  const orderId = String(params?.pedido ?? params?.order ?? "").trim();
  const email = String(params?.email ?? "").trim().toLowerCase();
  const rawPackageId = String(params?.pacote ?? params?.package ?? "").trim();
  const packageId =
    rawPackageId && rawPackageId !== "undefined" && rawPackageId !== "null"
      ? rawPackageId
      : "";

  if (!orderId) {
    return (
      <main className="grid min-h-screen place-items-center bg-obsidian px-4 py-8 text-white">
        <section className="panel w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="text-2xl font-black">Pedido não encontrado</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Abra este link pelo botão Resgatar do CentralCart.
          </p>
          <Link href="/" className="primary-button mt-6 inline-flex">
            Voltar
          </Link>
        </section>
      </main>
    );
  }

  const exactOrder = await prisma.centralCartOrder.findUnique({
    where: { orderId },
    include: { accessKey: true }
  });

  const centralCartOrder =
    exactOrder && (!email || exactOrder.buyerEmail?.toLowerCase() === email)
      ? exactOrder
      : email
        ? await prisma.centralCartOrder.findFirst({
            where: {
              buyerEmail: { equals: email, mode: "insensitive" },
              ...(packageId ? { packageId } : {}),
              accessKey: {
                is: {
                  active: true,
                  deletedAt: null,
                  usedAt: null
                }
              }
            },
            include: { accessKey: true },
            orderBy: { createdAt: "desc" }
          })
        : null;

  if (
    !centralCartOrder ||
    !centralCartOrder.accessKey
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-obsidian px-4 py-8 text-white">
        <section className="panel w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="text-2xl font-black">Key ainda não liberada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Aguarde alguns segundos após a aprovação do pagamento e tente novamente.
          </p>
          <Link href="/" className="primary-button mt-6 inline-flex">
            Ir para a roleta
          </Link>
        </section>
      </main>
    );
  }

  redirect(`/?key=${encodeURIComponent(centralCartOrder.accessKey.code)}`);
}
