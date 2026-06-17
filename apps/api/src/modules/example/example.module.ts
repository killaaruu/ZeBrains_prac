import { Module } from "@nestjs/common";
import { db } from "@repo/db-backend";
import { ExampleController } from "./example.controller";
import { ExampleService } from "./example.service";

@Module({
  controllers: [ExampleController],
  providers: [{ provide: "DRIZZLE_DB", useValue: db }, ExampleService],
})
export class ExampleModule {}
