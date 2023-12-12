import { Global, Module } from "@nestjs/common";
import { PrismaService, PrismaServiceTest } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, PrismaServiceTest],
  exports: [PrismaService, PrismaServiceTest],
})
export class PrismaModule {}
