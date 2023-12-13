import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class AuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
export class ForgotDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
