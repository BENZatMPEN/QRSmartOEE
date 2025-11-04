import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  getHello(): string {
    return 'Hello World!';
  }

  // @OnEvent('barcode.scanned')
  // handleBarcodeScannedEvent(payload: { text: string }) {
  //   this.logger.log(`AppService handling new barcode: ${payload.text}`);

  //   //
  //   // --> นี่คือจุดที่คุณจะนำข้อมูลไปใช้งานต่อ <--
  //   // เช่น:
  //   // - ตรวจสอบข้อมูล payload.text
  //   // - บันทึกลงฐานข้อมูล (Database)
  //   // - ส่งข้อมูลต่อไปยัง Frontend ผ่าน WebSocket
  //   //
  // }
}
