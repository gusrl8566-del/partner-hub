import { AnnouncementTemplateStatus } from "@partner-hub/shared";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAnnouncementTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  kakaoTemplate!: string;

  @IsString()
  internalTemplate!: string;

  @IsOptional()
  @IsEnum(AnnouncementTemplateStatus)
  status?: AnnouncementTemplateStatus;
}

export class UpdateAnnouncementTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  kakaoTemplate?: string;

  @IsOptional()
  @IsString()
  internalTemplate?: string;

  @IsOptional()
  @IsEnum(AnnouncementTemplateStatus)
  status?: AnnouncementTemplateStatus;
}
