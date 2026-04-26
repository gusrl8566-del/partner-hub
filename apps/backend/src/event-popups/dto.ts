import { IsInt, IsOptional, Max, Min } from "class-validator";

export class DismissPopupDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  dismissHours?: number;
}
