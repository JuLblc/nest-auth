import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { JwtPayload, Tokens } from "./types";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class AuthService {
  private static readonly TIME_OUT_MS = 60 * 60 * 1000;
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailerService: MailerService
  ) {}

  async validatePassword({
    password,
    minLength,
    requireUppercase,
    requireLowercase,
    requireSpecialChar,
  }: {
    password: string;
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireSpecialChar: boolean;
  }) {
    // Check for minimum password length
    if (password.length < minLength) {
      throw new BadRequestException(
        `The password must have at least ${minLength} characters.`
      );
    }
    if (requireUppercase && !/[A-Z]/.test(password)) {
      throw new BadRequestException(
        "The password must contain at least one uppercase letter."
      );
    }
    if (requireLowercase && !/[a-z]/.test(password)) {
      throw new BadRequestException(
        "The password must contain at least one lowercase letter."
      );
    }
    if (
      requireSpecialChar &&
      !/[!@#$%^&*()_+[\]{};':"\\|,.<>/?]+/.test(password)
    ) {
      throw new BadRequestException(
        "The password must contain at least one special character."
      );
    }
  }

  async signToken(userId: number, email: string): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>("ACCESS_JWT_SECRET"),
        expiresIn: "15m",
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>("REFRESH_JWT_SECRET"),
        expiresIn: "7d",
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateRefreshTokenHash(
    userId: number,
    refreshToken: string
  ): Promise<void> {
    const hashedRefreshToken = await argon.hash(refreshToken);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRefreshToken,
      },
    });
  }

  async signup(dto: AuthDto) {
    try {
      await this.validatePassword({
        password: dto.password,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireSpecialChar: true,
      });

      const hashedPassword = await argon.hash(dto.password);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hashedPassword,
          passwordLastUpdatedAt: new Date(),
        },
      });

      const tokens = await this.signToken(user.id, user.email);
      await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

      return tokens;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ForbiddenException("Credentials taken");
        }
      }
      throw error;
    }
  }

  async signin(dto: AuthDto) {
    // find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException("Credentials incorrect");

    const passwordMatches = await argon.verify(
      user.hashedPassword,
      dto.password
    );
    if (!passwordMatches) throw new ForbiddenException("Credentials incorrect");

    const tokens = await this.signToken(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: number): Promise<boolean> {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRefreshToken: {
          not: null,
        },
      },
      data: {
        hashedRefreshToken: null,
      },
    });
    return true;
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException("Credentials incorrect");

    const refreshTokenMatches = await argon.verify(
      user.hashedRefreshToken,
      refreshToken
    );

    if (!refreshTokenMatches)
      throw new ForbiddenException("Credentials incorrect");

    const tokens = await this.signToken(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  generateToken() {
    const chars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const length = 32;
    const randomChars = [];

    for (const _ of Array(length)) {
      const randomNumber = Math.floor(Math.random() * chars.length);
      randomChars.push(chars[randomNumber]);
    }

    return randomChars.join("");
  }

  generateExpiringResetToken() {
    const resetToken = this.generateToken();
    const resetTokenExpiresAtTimestamp = Date.now() + AuthService.TIME_OUT_MS;
    const resetTokenExpiresAt = new Date(resetTokenExpiresAtTimestamp);

    return { resetToken, resetTokenExpiresAt };
  }

  isTimeBetweenPasswordRequestExceeded(lastUpdate: Date) {
    const currentTime = new Date();
    const timeDifference = currentTime.getTime() - lastUpdate.getTime();

    return timeDifference > AuthService.TIME_OUT_MS;
  }

  async sendResetEmail(email: string, resetLink: string) {
    const sentMessageInfo = await this.mailerService.sendMail({
      to: email,
      subject: "Password reset request",
      html: `<h1>Hello,</h1>
      <p>You have requested to reset your password. Please click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this password reset, you can ignore this email.</p>
      <p>Thanks,</p>
      <p>Julien</p>`,
    });

    const resetMailRecipient = sentMessageInfo.accepted[0];
    return resetMailRecipient;
  }

  async forgotCredentials(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new BadRequestException(`User with ${email} doesn't exist`);
    }

    const passwordLastUpdated = user.passwordLastUpdatedAt;

    if (!this.isTimeBetweenPasswordRequestExceeded(passwordLastUpdated)) {
      throw new BadRequestException(
        "Please wait before requesting another password reset"
      );
    }

    const { resetToken, resetTokenExpiresAt } =
      this.generateExpiringResetToken();

    await this.prisma.user.update({
      where: {
        email,
      },
      data: {
        resetToken,
        resetTokenExpiresAt,
      },
    });

    const resetLink = `${this.config.get("URL_SITE")}/auth/reset?${resetToken}`;

    const resetMailRecipient =
      resetLink && (await this.sendResetEmail(email, resetLink));

    return { resetToken, resetTokenExpiresAt, resetMailRecipient };
  }
}
