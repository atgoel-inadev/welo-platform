import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class AssignUserToProjectDto {
  @IsString()
  userId: string;

  @IsString()
  projectId: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsNumber()
  quota?: number;
}

export class UpdateProjectTeamMemberDto {
  @IsOptional()
  @IsNumber()
  quota?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RemoveUserFromProjectDto {
  @IsString()
  userId: string;

  @IsString()
  projectId: string;
}
