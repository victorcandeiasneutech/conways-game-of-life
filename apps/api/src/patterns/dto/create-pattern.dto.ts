import { IsString, IsInt, IsArray, ArrayNotEmpty, Min, Max } from 'class-validator';

export class CreatePatternDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(5)
  @Max(100)
  width!: number;

  @IsInt()
  @Min(5)
  @Max(100)
  height!: number;

  @IsArray()
  @ArrayNotEmpty()
  liveCells!: [number, number][];
}
