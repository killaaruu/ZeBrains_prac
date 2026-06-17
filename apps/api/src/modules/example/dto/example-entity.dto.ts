import { ApiProperty } from "@nestjs/swagger";

export class CreateExampleEntityDto {
  @ApiProperty({ example: "My entity", maxLength: 200 })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: "An optional description" })
  description?: string | null;
}

export class UpdateExampleEntityDto {
  @ApiProperty({ required: false, maxLength: 200 })
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;
}

export class ExampleEntityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
