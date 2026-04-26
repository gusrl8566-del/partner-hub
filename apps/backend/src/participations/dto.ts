import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateParticipationDto {
  @IsString()
  userId!: string;

  @IsString()
  categoryId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
