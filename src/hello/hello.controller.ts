import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorator";

@Public()
@Controller("hello")
export class HelloController {
  @Get()
  sayHello(): string {
    return "Hello World";
  }
}
