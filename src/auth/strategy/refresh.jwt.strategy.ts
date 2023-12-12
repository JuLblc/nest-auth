import { Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtPayload, JwtPayloadWithRt } from "../types";

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>("REFRESH_JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req
      ?.get("authorization")
      ?.replace("Bearer", "")
      .trim();

    if (!refreshToken) throw new ForbiddenException("Refresh token malformed");

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (user) delete user.hashedPassword;

    return {
      ...user,
      refreshToken,
    };
  }
}
