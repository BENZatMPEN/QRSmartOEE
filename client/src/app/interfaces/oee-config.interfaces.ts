export interface OEEConfiguration {
  id: string;
  mcCode: string;
  oeeName: string;
  masterOeeId: number;
  modbusAddress: number;
  qrStartFormat: string;
  qrStopFormat: string;
  siteId: number;
  tcpIp: string;
  port: number;
}

export interface QRProduct {
  id: string;
  qrFormatSku: string;
  specialFactor: string;
  productId: string;
  productName: string;
  oeeId: number;
  masterOeeId: number;
}

export interface ProductSelectItem {
  id: string;
  name: string;
}

export interface FormErrors {
  modbusAddress?: string;
  qrStartFormat?: string;
  qrStopFormat?: string;
  tcpIp?: string;
  port?: string;
}
