import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyCategoryStats() {
    const rows = await this.prisma.participation.findMany({
      include: {
        category: true,
      },
      orderBy: { occurredAt: "asc" },
    });

    const aggregate = new Map<
      string,
      {
        month: string;
        categoryId: string;
        categoryName: string;
        participationCount: number;
        totalQuantity: number;
      }
    >();

    for (const row of rows) {
      const month = row.occurredAt.toISOString().slice(0, 7);
      const key = `${month}:${row.categoryId}`;
      const current = aggregate.get(key) ?? {
        month,
        categoryId: row.categoryId,
        categoryName: row.category.name,
        participationCount: 0,
        totalQuantity: 0,
      };

      current.participationCount += 1;
      current.totalQuantity += row.quantity;
      aggregate.set(key, current);
    }

    return [...aggregate.values()];
  }
}
