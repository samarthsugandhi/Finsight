import { prisma } from "@/database/prisma";

export async function getRecentTransactions(
    userId: number,
    limit: number = 5
) {
    return prisma.transaction.findMany({
        where: {
            userId,
        },
        include: {
            category: true,
        },
        orderBy: {
            date: "desc",
        },
        take: limit,
    });
}