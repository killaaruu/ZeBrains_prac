import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CreateReport, RequestUser } from "@repo/shared";
import { createReportSchema } from "@repo/shared";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { CreateReportDto } from "./dto/report.dto";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @ApiOperation({ summary: "Submit a report generation topic" })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createReportSchema)) _dto: CreateReportDto,
  ) {
    const body = _dto as CreateReport;
    return this.service.create(body, user.id);
  }

  @Get()
  @ApiOperation({ summary: "List current user's reports" })
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one current-user report" })
  getById(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.getById(id, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete one current-user report" })
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(id, user.id);
  }
}
