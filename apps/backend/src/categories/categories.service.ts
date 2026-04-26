import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: { name: string; description?: string }) {
    return this.prisma.category.create({ data: input });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  update(id: string, input: { name?: string; description?: string }) {
    return this.prisma.category.update({
      where: { id },
      data: input,
    });
  }
}
