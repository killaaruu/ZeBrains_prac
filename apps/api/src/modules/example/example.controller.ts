import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  CreateExampleEntity,
  PaginationQuery,
  RequestUser,
  UpdateExampleEntity,
} from "@repo/shared";
import {
  createExampleEntitySchema,
  paginationQuerySchema,
  updateExampleEntitySchema,
} from "@repo/shared";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { CreateExampleEntityDto, UpdateExampleEntityDto } from "./dto/example-entity.dto";
import { ExampleService } from "./example.service";

@ApiTags("Example")
@ApiBearerAuth()
@Controller("example-entities")
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Get()
  @ApiOperation({ summary: "List example entities (paginated)" })
  list(@Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.service.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one example entity by id" })
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create an example entity" })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createExampleEntitySchema)) _dto: CreateExampleEntityDto,
  ) {
    const body = _dto as unknown as CreateExampleEntity;
    return this.service.create(body, user?.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an example entity" })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateExampleEntitySchema)) _dto: UpdateExampleEntityDto,
  ) {
    const body = _dto as unknown as UpdateExampleEntity;
    return this.service.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an example entity" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.service.remove(id);
  }
}
