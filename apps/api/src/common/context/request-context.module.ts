import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ClsModule } from "nestjs-cls";
import { RequestContextInterceptor } from "./request-context.interceptor";

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor }],
  exports: [ClsModule],
})
export class RequestContextModule {}
