import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto, ForgotDto } from "./dto";
import { Tokens } from "./types";
import { GetUser, Public } from "./decorator";
import { RefreshJwtGuard } from "./guard";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("signup")
  signup(@Body() dto: AuthDto): Promise<Tokens> {
    return this.authService.signup(dto);
  }

  @Public()
  @Post("signin")
  @HttpCode(HttpStatus.OK)
  signin(@Body() dto: AuthDto): Promise<Tokens> {
    return this.authService.signin(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@GetUser("id") userId: number): Promise<boolean> {
    return this.authService.logout(userId);
  }

  @Public()
  @UseGuards(RefreshJwtGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refreshToken(
    @GetUser("id") userId: number,
    @GetUser("refreshToken") refreshToken: string
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Public()
  @Post("forgot")
  async forgot(@Body() dto: ForgotDto) {
    return this.authService.forgotCredentials(dto.email);
  }
}