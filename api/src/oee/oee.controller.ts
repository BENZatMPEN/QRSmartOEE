import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OeeService } from './oee.service';
import { CreateOeeDto } from './dto/create-oee.dto';
import { UpdateOeeDto } from './dto/update-oee.dto';
import { BasicAuthGuard } from '../auth/auth-basic.guard';

@Controller('oee')
@UseGuards(BasicAuthGuard)
export class OeeController {
  constructor(private readonly oeeService: OeeService) {}

  @Post()
  create(@Body() createOeeDto: CreateOeeDto) {
    return this.oeeService.create(createOeeDto);
  }

  @Get()
  findAll() {
    return this.oeeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.oeeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOeeDto: UpdateOeeDto) {
    return this.oeeService.update(+id, updateOeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.oeeService.remove(+id);
  }
}
