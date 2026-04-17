import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { escapeCsvCell, TRANSACTION_CSV_HEADER } from "@/lib/csv-transactions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { transactionAt: "desc" },
    take: 20_000,
    include: {
      creditCardDebt: {
        select: { name: true }
      }
    }
  });

  const lines = [
    TRANSACTION_CSV_HEADER,
    ...rows.map((r) =>
      [
        escapeCsvCell(r.description),
        r.amount.toString(),
        r.type,
        escapeCsvCell(r.category),
        r.paymentMethod,
        r.transactionAt.toISOString(),
        r.creditCardDebt?.name ? escapeCsvCell(r.creditCardDebt.name) : ""
      ].join(",")
    )
  ];

  const body = lines.join("\r\n");
  const filename = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
