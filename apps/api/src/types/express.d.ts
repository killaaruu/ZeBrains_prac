import type { RequestUser } from "@repo/shared";
import type { ServiceUser } from "../auth/service-token.service";

// Augment Express's Request with the principal attached by AuthGuard
// (a regular user or a service token). Previously provided by @types/passport.
declare global {
  namespace Express {
    interface Request {
      user?: RequestUser | ServiceUser;
    }
  }
}
