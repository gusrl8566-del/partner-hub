import { EventStatus } from "@partner-hub/shared";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateEventCategoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateEventCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsDateString()
  registrationDeadline!: string;

  @IsDateString()
  visibilityStartAt!: string;

  @IsDateString()
  visibilityEndAt!: string;

  @IsInt()
  @Min(0)
  feePerPerson!: number;

  @IsBoolean()
  popupEnabled!: boolean;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsDateString()
  visibilityStartAt?: string;

  @IsOptional()
  @IsDateString()
  visibilityEndAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  feePerPerson?: number;

  @IsOptional()
  @IsBoolean()
  popupEnabled?: boolean;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

export class GenerateEventCopyDto {
  @IsString()
  templateId!: string;

  @IsString()
  channel!: string;

  @IsOptional()
  @IsString()
  link?: string;
}

export class CreateEventRegistrationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantUserIds!: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReplaceEventRegistrationsDto {
  @IsArray()
  @IsString({ each: true })
  participantUserIds!: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
