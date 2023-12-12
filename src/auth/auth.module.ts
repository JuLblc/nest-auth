import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AccessJwtStrategy, RefreshJwtStrategy } from "./strategy";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    JwtModule.register({}),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>("MAILER_HOST"),
          port: configService.get<number>("MAILER_PORT"),
          //TODO
          //secure: true,
          auth: {
            user: configService.get<string>("MAILER_USER_MAIL"),
            pass: configService.get<string>("MAILER_USER_PASS"),
          },
        },
        defaults: {
          from: configService.get<string>("MAILER_USER_MAIL"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessJwtStrategy, RefreshJwtStrategy],
})
export class AuthModule {}
