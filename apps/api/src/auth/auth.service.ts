import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { DrizzleDb } from "@repo/db-backend";
import { profiles } from "@repo/db-backend/schema";
import type { RequestUser } from "@repo/shared";
import { eq } from "drizzle-orm";
import { DB_TOKEN } from "./types";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async resolveUser(authUid: string): Promise<RequestUser> {
    this.logger.debug(`Resolving user for authUid=${authUid}`);

    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.authUid, authUid))
      .limit(1);

    if (!profile) {
      this.logger.warn(`Profile not found for authUid=${authUid}`);
      throw new UnauthorizedException("Profile not found");
    }
    if (profile.status === "inactive") {
      this.logger.warn(`Inactive account: id=${profile.id}, authUid=${authUid}`);
      throw new UnauthorizedException("Account is inactive");
    }

    this.logger.log(
      `User resolved: id=${profile.id}, email=${profile.email}, role=${profile.role}`,
    );

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      status: profile.status,
    };
  }

  async createProfile(
    authUid: string,
    email: string,
    data: { firstName: string; lastName: string },
  ): Promise<RequestUser> {
    const existing = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.authUid, authUid))
      .limit(1);

    if (existing[0]) {
      return this.toRequestUser(existing[0]);
    }

    try {
      const [profile] = await this.db
        .insert(profiles)
        .values({
          authUid,
          email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: "user",
          status: "pending",
        })
        .returning();

      return this.toRequestUser(profile);
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") {
        throw error;
      }

      const [profile] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.authUid, authUid))
        .limit(1);
      if (!profile) {
        throw error;
      }
      return this.toRequestUser(profile);
    }
  }

  async updateLastLogin(authUid: string): Promise<void> {
    await this.db
      .update(profiles)
      .set({ lastLoginAt: new Date() })
      .where(eq(profiles.authUid, authUid));
  }

  async activateByEmail(email: string): Promise<void> {
    await this.db.update(profiles).set({ status: "active" }).where(eq(profiles.email, email));
  }

  private toRequestUser(profile: typeof profiles.$inferSelect): RequestUser {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      status: profile.status,
    };
  }
}
