import { AuthGuard } from "@nestjs/passport";

export class RefreshJwtGuard extends AuthGuard("jwt-refresh") {
  constructor() {
    super();
  }
}
