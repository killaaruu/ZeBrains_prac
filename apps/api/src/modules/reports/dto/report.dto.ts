import { ApiProperty } from "@nestjs/swagger";

export class CreateReportDto {
  @ApiProperty({ example: "AI coding assistants", maxLength: 500 })
  topic!: string;
}

export class CreateReportResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
}

export class ReportDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  topic!: string;

  @ApiProperty({ enum: ["queued", "thinking", "done", "error"] })
  status!: string;

  @ApiProperty({ nullable: true })
  result!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
