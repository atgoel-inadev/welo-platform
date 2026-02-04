import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InstanceService } from './instance.service';
import {
  CreateInstanceDto,
  StopInstanceDto,
  RestoreInstanceDto,
  InstanceResponseDto,
} from './dto/instance.dto';
import { SendEventDto } from '../event/dto/event.dto';
import { ResponseDto } from '@app/common';

@ApiTags('instances')
@ApiBearerAuth()
@Controller('workflow-instances')
export class InstanceController {
  constructor(private readonly instanceService: InstanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create workflow instance' })
  @ApiResponse({ status: 201, description: 'Instance created', type: InstanceResponseDto })
  async create(@Body() createDto: CreateInstanceDto) {
    const instance = await this.instanceService.create(createDto);
    return new ResponseDto(instance);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance details', type: InstanceResponseDto })
  async findOne(@Param('id') id: string) {
    const instance = await this.instanceService.findOne(id);
    return new ResponseDto(instance);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Send event to workflow instance' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  async sendEvent(@Param('id') id: string, @Body() eventDto: SendEventDto) {
    const instance = await this.instanceService.sendEvent(id, {
      type: eventDto.type,
      payload: eventDto.payload,
    });
    return new ResponseDto(instance);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance paused' })
  async pause(@Param('id') id: string) {
    const instance = await this.instanceService.pause(id);
    return new ResponseDto(instance);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance resumed' })
  async resume(@Param('id') id: string) {
    const instance = await this.instanceService.resume(id);
    return new ResponseDto(instance);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance stopped' })
  async stop(@Param('id') id: string, @Body() stopDto: StopInstanceDto) {
    const instance = await this.instanceService.stop(id, stopDto);
    return new ResponseDto(instance);
  }

  @Get(':id/snapshot')
  @ApiOperation({ summary: 'Get workflow instance snapshot' })
  @ApiResponse({ status: 200, description: 'Instance snapshot' })
  async getSnapshot(@Param('id') id: string) {
    const snapshot = await this.instanceService.getSnapshot(id);
    return new ResponseDto(snapshot);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore workflow instance from snapshot' })
  @ApiResponse({ status: 200, description: 'Instance restored' })
  async restore(@Param('id') id: string, @Body() restoreDto: RestoreInstanceDto) {
    const instance = await this.instanceService.restore(id, restoreDto);
    return new ResponseDto(instance);
  }

  @Get(':id/actors')
  @ApiOperation({ summary: 'Get child actors of workflow instance' })
  @ApiResponse({ status: 200, description: 'Child actors' })
  async getChildActors(@Param('id') id: string) {
    const actors = await this.instanceService.getChildActors(id);
    return new ResponseDto(actors);
  }
}
