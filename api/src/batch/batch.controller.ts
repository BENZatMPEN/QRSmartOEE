import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BatchService } from './batch.service';
import { StartBatchDto } from './dto/start-batch.dto';
import { BasicAuthGuard } from '../auth/auth-basic.guard';

@UseGuards(BasicAuthGuard)
@Controller('batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post('start')
  async startBatch(@Body() startBatchDto: StartBatchDto) {
    return this.batchService.startBatchAndWriteToModbus(startBatchDto);
  }
}
