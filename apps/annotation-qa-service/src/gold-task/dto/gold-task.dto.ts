import { IsUUID, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoldTaskDto {
  @ApiProperty({
    description: 'The known-correct reference annotation',
    example: {
      labels: [{ id: 'lbl-1', name: 'PERSON', value: 'Jane Smith' }],
      spans: [{ start: 12, end: 22, label: 'PERSON', text: 'Jane Smith' }],
      entities: [{ id: 'ent-1', type: 'PERSON', text: 'Jane Smith', start: 12, end: 22 }],
      attributes: { sentiment: 'neutral' },
    },
  })
  @IsObject()
  goldAnnotation: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @ApiPropertyOptional({
    description: 'Tolerance configuration for comparison scoring',
    example: {
      boundaryIouThreshold: 0.8,
      labelExactMatch: true,
      attributeMatch: 'partial',
      scoreWeights: { labelF1: 0.5, boundaryIou: 0.3, attributeMatch: 0.2 },
    },
  })
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
  @ApiPropertyOptional({ description: 'Updated gold annotation', example: { labels: [{ id: 'lbl-1', name: 'ORG', value: 'Acme' }] } })
  @IsOptional()
  @IsObject()
  goldAnnotation?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Updated tolerance config', example: { boundaryIouThreshold: 0.9, labelExactMatch: true } })
  @IsOptional()
  @IsObject()
  tolerance?: Record<string, any>;
}

export class GoldCompareDto {
  @ApiProperty({ description: 'Annotation ID to compare against this task\'s gold standard', example: 'a1b2c3d4-0001-0000-0000-000000000001' })
  @IsUUID()
  annotationId: string;
}
