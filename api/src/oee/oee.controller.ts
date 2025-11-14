import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { OeeService } from './oee.service';
import { CreateOeeDto } from './dto/create-oee.dto';
import { UpdateOeeDto } from './dto/update-oee.dto';
import { BasicAuthGuard } from '../auth/auth-basic.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportQrProductDto } from './dto/import-csv.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateQrProductDto } from './dto/create-qr-product.dto';
import { UpdateQrProductDto } from './dto/update-qr-product.dto';
import { UpdateScanSourceDto } from './dto/scan-source.dto';
import { ScanUsbDto } from './dto/scan-usb.dto';

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

  @Get(':id/qr-products')
  findQrProductsByOeeId(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.oeeService.findQrProductsByOeeId(id, paginationQuery);
  }

  @Post('qr-products')
  createQRProduct(@Body() createQrProductDto: CreateQrProductDto) {
    return this.oeeService.createQRProduct(createQrProductDto);
  }

  @Patch('/qr-products/:id')
  updateQRProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQrProductDto: UpdateQrProductDto,
  ) {
    return this.oeeService.updateQRProduct(id, updateQrProductDto);
  }

  @Delete('/qr-products/:id')
  deleteQRProduct(@Param('id', ParseIntPipe) id: number) {
    return this.oeeService.deleteQRProduct(id);
  }

  @Post('import-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ImportQrProductDto,
  ) {
    const result = await this.oeeService.importFromCsv(
      file.path,
      body.productList,
      body.masterOeeId,
    );

    return {
      message: 'CSV imported',
      ...result,
    };
  }

  @Patch(':id/scan-source')
  updateScanSource(
    @Param('id') id: string,
    @Body() updateScanSourceDto: UpdateScanSourceDto,
  ) {
    return this.oeeService.updateScanSourceByOeeId(+id, updateScanSourceDto);
  }

  @Post('scan-usb')
  handleUsbScan(@Body() scanUsbDto: ScanUsbDto) {
    return this.oeeService.handleUsbScan(scanUsbDto);
  }
}
