import type { RequestUser } from "@repo/shared";
import type { ClsStore } from "nestjs-cls";

export type ActorKind = "client" | "admin" | "system";

export interface ActorContext {
  kind: ActorKind;
  id: string | null;
  label: string;
}

export interface RequestContextStore extends ClsStore {
  actor: ActorContext;
  ip: string | null;
  userAgent: string | null;
}

export type AuthenticatedUser = RequestUser;
