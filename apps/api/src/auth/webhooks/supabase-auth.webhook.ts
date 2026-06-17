import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";

export interface SupabaseUserUpdatedEvent {
  type: "user.updated";
  record: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
  };
}

export interface SupabaseUserSignedInEvent {
  type: "user.signed_in";
  record: {
    id: string;
  };
}

export type SupabaseAuthEvent = SupabaseUserUpdatedEvent | SupabaseUserSignedInEvent;

@Injectable()
export class SupabaseAuthWebhookHandler {
  constructor(private authService: AuthService) {}

  async handle(event: SupabaseAuthEvent): Promise<void> {
    switch (event.type) {
      case "user.updated":
        if (event.record.email_confirmed_at) {
          await this.authService.activateByEmail(event.record.email);
        }
        break;
      case "user.signed_in":
        await this.authService.updateLastLogin(event.record.id);
        break;
    }
  }
}
