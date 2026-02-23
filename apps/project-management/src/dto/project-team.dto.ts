import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserToProjectDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID to assign' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'ANNOTATOR', description: 'Role in the project (ANNOTATOR, REVIEWER, MANAGER, etc.)' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ example: 50, description: 'Maximum tasks quota for this user in the project' })
  @IsOptional()
  @IsNumber()
  quota?: number;
}

export class UpdateProjectTeamMemberDto {
  @ApiPropertyOptional({ example: 100, description: 'Updated task quota' })
  @IsOptional()
  @IsNumber()
  quota?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the team member is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RemoveUserFromProjectDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID to remove' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Project ID' })
  @IsString()
  projectId: string;
}
