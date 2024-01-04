import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as pactum from "pactum";
import { AppModule } from "../src/app.module";
import { AuthDto } from "../src/auth/dto";
import { PrismaService, PrismaServiceTest } from "../src/prisma/prisma.service";
import { EditUserDto } from "../src/user/dto";
import {
  PasswordResetToken,
  ResetTokenValidity,
  Tokens,
} from "../src/auth/types/tokens.type";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { User } from "@prisma/client";

describe("App e2e", () => {
  let app: INestApplication;
  let prisma: PrismaServiceTest;

  const currentDate = new Date();
  const fourHoursAgo = new Date(currentDate.getTime() - 4 * 60 * 60 * 1000);

  const forgotDto = {
    email: "john@doe.com",
    hashedPassword: "",
    passwordLastUpdatedAt: fourHoursAgo,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useClass(PrismaServiceTest)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      })
    );
    await app.init();
    await app.listen(process.env.PORT_TEST);

    prisma = app.get(PrismaServiceTest);
    await prisma.cleanDb();

    await prisma.user.create({
      data: {
        email: forgotDto.email,
        hashedPassword: forgotDto.hashedPassword,
        passwordLastUpdatedAt: forgotDto.passwordLastUpdatedAt,
      },
    });

    pactum.request.setBaseUrl(process.env.URL_SITE_TEST);
  });

  afterAll(() => {
    app.close();
  });

  describe("Auth", () => {
    const authDto: AuthDto = {
      email: "vlad@gmail.com",
      password: "123Soleil!",
    };

    const wrongEmailDto: AuthDto = {
      email: "vladgmail.com",
      password: "123Soleil!",
    };

    const wrongMinLengthDto: AuthDto = {
      email: "vlad@gmail.com",
      password: "123",
    };

    const withoutLowercaseDto: AuthDto = {
      email: "vlad@gmail.com",
      password: "123456789",
    };

    const withoutUppercaseDto: AuthDto = {
      email: "vlad@gmail.com",
      password: "123456789a",
    };

    const withoutSpecialCharDto: AuthDto = {
      email: "vlad@gmail.com",
      password: "123456789aA",
    };

    let tokens: Tokens;

    describe("Signup", () => {
      it("should throw if email empty", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody({
            password: authDto.password,
          })
          .expectStatus(400);
      });
      it("should throw if email is not an email", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody({
            email: wrongEmailDto.email,
            password: wrongEmailDto.password,
          })
          .expectStatus(400);
      });
      it("should throw if password empty", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody({
            email: authDto.email,
          })
          .expectStatus(400);
      });
      it("should throw if no body provided", () => {
        return pactum.spec().post("/auth/signup").expectStatus(400);
      });
      it("should throw if password length < 8", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(wrongMinLengthDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain lowercase", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutLowercaseDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain uppercase", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutUppercaseDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain uppercase", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutSpecialCharDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain special char", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutSpecialCharDto)
          .expectStatus(400);
      });
      it("should signup", async () => {
        const response = await pactum
          .spec()
          .post("/auth/signup")
          .withBody(authDto);

        tokens = response.body;

        expect(response.statusCode).toEqual(201);
        expect(tokens.access_token).toBeTruthy();
        expect(tokens.refresh_token).toBeTruthy();
      });
    });

    describe("Signin", () => {
      it("should throw if email empty", () => {
        return pactum
          .spec()
          .post("/auth/signin")
          .withBody({
            password: authDto.password,
          })
          .expectStatus(400);
      });
      it("should throw if password empty", () => {
        return pactum
          .spec()
          .post("/auth/signin")
          .withBody({
            email: authDto.email,
          })
          .expectStatus(400);
      });
      it("should throw if no body provided", () => {
        return pactum.spec().post("/auth/signin").expectStatus(400);
      });
      it("should throw if password length < 8", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(wrongMinLengthDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain lowercase", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutLowercaseDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain uppercase", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutUppercaseDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain uppercase", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutSpecialCharDto)
          .expectStatus(400);
      });
      it("should throw if password do not contain special char", () => {
        return pactum
          .spec()
          .post("/auth/signup")
          .withBody(withoutSpecialCharDto)
          .expectStatus(400);
      });
      it("should signin", () => {
        return pactum
          .spec()
          .post("/auth/signin")
          .withBody(authDto)
          .expectStatus(200)
          .stores("userAt", "access_token");
      });
    });

    describe("Refresh", () => {
      it("should refresh tokens", async () => {
        // wait for 1 second
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 1000);
        });

        const response = await pactum
          .spec()
          .post("/auth/refresh")
          .withBearerToken(tokens.refresh_token);

        const newTokens = response.body;

        expect(response.statusCode).toEqual(200);
        expect(newTokens.access_token).toBeTruthy();
        expect(newTokens.refresh_token).toBeTruthy();

        expect(newTokens.access_token).not.toBe(tokens.access_token);
        expect(newTokens.refresh_token).not.toBe(tokens.refresh_token);
      });
    });

    describe("User", () => {
      describe("Get me", () => {
        it("should get current user", () => {
          return pactum
            .spec()
            .get("/users/me")
            .withHeaders({
              Authorization: "Bearer $S{userAt}",
            })
            .expectStatus(200);
        });
      });

      describe("Edit user", () => {
        it("should edit user", () => {
          const editUserDto: EditUserDto = {
            firstName: "Vladimir",
            lastName: "Agaev",
          };
          return pactum
            .spec()
            .patch("/users")
            .withHeaders({
              Authorization: "Bearer $S{userAt}",
            })
            .withBody(editUserDto)
            .expectStatus(200)
            .expectBodyContains(editUserDto.firstName)
            .expectBodyContains(editUserDto.lastName);
        });
      });
    });

    describe("Logout", () => {
      it("should logout", async () => {
        return pactum
          .spec()
          .post("/auth/logout")
          .withBearerToken(tokens.access_token)
          .expectStatus(200);
      });
    });

    describe("Forgot", () => {
      it("should throw if request sent within 1 hour after the previous request", async () => {
        return await pactum
          .spec()
          .post("/auth/forgot")
          .withBody({ email: authDto.email })
          .expectStatus(400);
      });

      it("should generate resetData", async () => {
        const response = await pactum
          .spec()
          .post("/auth/forgot")
          .withBody({ email: forgotDto.email });

        const resetData: PasswordResetToken = response.body;

        expect(response.statusCode).toEqual(201);
        expect(resetData.resetToken).toBeTruthy();
        expect(resetData.resetTokenExpiresAt).toBeTruthy();
        expect(resetData.resetMailRecipient).toEqual(forgotDto.email);
      });
    });
    describe("Reset", () => {
      let user: User;
      let resetToken: string;
      let initialResetTokenExpiresAt: Date;

      beforeAll(async () => {
        user = await prisma.user.findUnique({
          where: {
            email: forgotDto.email,
          },
        });

        resetToken = user.resetToken;
        initialResetTokenExpiresAt = user.resetTokenExpiresAt;
      });

      it("should throw if token don't match any user", async () => {
        const corruptedResetToken = "corruptedResetToken";

        return await pactum
          .spec()
          .get(`/auth/reset`)
          .withQueryParams("resetToken", corruptedResetToken)
          .expectStatus(400);
      });

      it("should return user email if token match a user", async () => {
        const response = await pactum
          .spec()
          .get(`/auth/reset`)
          .withQueryParams("resetToken", resetToken);

        const checkResetTokenValidityData: ResetTokenValidity = response.body;

        expect(response.statusCode).toEqual(200);
        expect(checkResetTokenValidityData.email).toEqual(forgotDto.email);
        expect(checkResetTokenValidityData.isExpired).toEqual(false);
      });

      it("should return isExpired = true, if the token is expired", async () => {
        const { resetTokenExpiresAt } = user;

        const expiredResetToken = new Date(resetTokenExpiresAt);
        expiredResetToken.setDate(resetTokenExpiresAt.getDate() - 1);

        await prisma.user.update({
          where: {
            email: forgotDto.email,
          },
          data: {
            resetTokenExpiresAt: expiredResetToken,
          },
        });

        const response = await pactum
          .spec()
          .get(`/auth/reset`)
          .withQueryParams("resetToken", resetToken);

        const checkResetTokenValidityData: ResetTokenValidity = response.body;

        expect(response.statusCode).toEqual(200);
        expect(checkResetTokenValidityData.email).toEqual(undefined);
        expect(checkResetTokenValidityData.isExpired).toEqual(true);
      });

      it("should update password", async () => {
        await prisma.user.update({
          where: {
            email: forgotDto.email,
          },
          data: {
            resetTokenExpiresAt: initialResetTokenExpiresAt,
          },
        });

        return await pactum
          .spec()
          .put("/auth/reset")
          .withQueryParams("resetToken", resetToken)
          .withBody({ password: authDto.password })
          .expectStatus(200);
      });
    });
  });
});
