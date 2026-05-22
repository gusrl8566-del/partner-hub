import { UserRole } from "@partner-hub/shared";
import { IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  loginId!: string;

  @IsString()
  password!: string;
}

export class VerifyFirstAccessCodeDto {
  @IsString()
  loginId!: string;

  @IsString()
  inviteCode!: string;
}

export class SetFirstAccessPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class AdminResetPasswordDto {
  @IsString()
  userId!: string;
}

export class CreateUserDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/)
  loginId!: string;

  @IsString()
  name!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  parentUserId?: string;
}

export class CreateChildUserDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/)
  loginId!: string;

  @IsString()
  name!: string;
}

export class ReparentUserDto {
  @IsOptional()
  @IsString()
  parentUserId?: string | null;
}
