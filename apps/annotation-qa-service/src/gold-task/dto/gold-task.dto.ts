import { IsUUID, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoldTaskDto {
  @ApiProperty({ description: 'The known-correct reference annotation' })
  @IsObject()
  goldAnnotation: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @ApiPropertyOptional({ description: 'Tolerance configuration for comparison scoring' })
  @IsOptional()
  @IsObject()
  tolerance?: {
    boundaryIouThreshold?: number;
    labelExactMatch?: boolean;
    attributeMatch?: 'exact' | 'partial' | 'none';
    scoreWeights?: {
      labelF1?: number;
      boundaryIou?: number;
      attributeMatch?: number;
    };
  };
}

export class UpdateGoldTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  goldAnnotation?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tolerance?: Record<string, any>;
}

export class GoldCompareDto {
  @ApiProperty({ description: 'Annotation ID to compare against this task\'s gold standard' })
  @IsUUID()
  annotationId: string;
}
