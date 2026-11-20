import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'EPI', maxLength: 120 })
  @Transform(({ obj, key }) => (typeof obj[key] === 'string' ? obj[key].trim() : obj[key]))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  active?: boolean;
}

export class CategoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty({ description: 'Quantidade total de insumos vinculados.' })
  itemCount!: number;
  @ApiProperty({ description: 'Quantidade de insumos ativos vinculados.' })
  activeItemCount!: number;
}
