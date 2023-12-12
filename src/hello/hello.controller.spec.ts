import { Test, TestingModule } from "@nestjs/testing";
import { HelloController } from "./hello.controller";
import { describe, it, expect, beforeEach } from "vitest";

describe("HelloController", () => {
  let controller: HelloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelloController],
    }).compile();

    controller = module.get<HelloController>(HelloController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
