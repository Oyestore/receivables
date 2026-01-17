import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { QRCodeService } from '../Module_03_Payment_Integration/src/services/qrcode.service';

describe('QRCodeService (Deterministic)', () => {
  let app: INestApplication;
  let qrcode: QRCodeService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [QRCodeService],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    qrcode = app.get(QRCodeService);
  });

  afterAll(async () => { await app.close(); });

  it('generates UPI QR code data URL', async () => {
    const dataUrl = await qrcode.generateUPIQRCode({
      upiId: 'merchant@upi',
      payeeName: 'Merchant',
      amount: 123.45,
      transactionNote: 'Test',
      transactionRef: 'REF123',
    });
    expect(dataUrl.startsWith('data:image/png;base64')).toBe(true);
  });

  it('generates generic QR code buffer', async () => {
    const buf = await qrcode.generateQRCodeBuffer('hello-world');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('generates payment link QR data URL', async () => {
    const dataUrl = await qrcode.generatePaymentLinkQR('https://example.com/pay/123');
    expect(dataUrl.startsWith('data:image/png;base64')).toBe(true);
  });
});
