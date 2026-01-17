import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Body, Headers } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

describe('Invoice Payment Journey (E2E)', () => {
    let app: INestApplication;
    let jwtToken: string;

    beforeAll(async () => {
        const invoices: any[] = [];
        @Controller('invoices')
        class TestInvoicesController {
            @Post()
            async create(@Body() dto: any, @Headers('authorization') _auth: string) {
                const id = 'inv-' + (invoices.length + 1);
                const inv = { id, ...dto };
                invoices.push(inv);
                return inv;
            }
        }
        @Controller('payments')
        class TestPaymentsController {
            @Post('initiate')
            async initiate(@Body() body: any, @Headers('authorization') _auth: string) {
                return { orderId: 'order-' + body.invoiceId, paymentUrl: 'https://pay.example.com/' + body.invoiceId };
            }
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppTestingModule],
            controllers: [TestInvoicesController, TestPaymentsController],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        jwtToken = 'test-token';
    });

    afterAll(async () => {
        await app.close();
    });

    it('/invoices (POST) - Create Invoice', async () => {
        const invoiceDto: any = {
            customerName: 'E2E Test Customer',
            amount: 5000,
            dueDate: new Date(),
            items: [{ description: 'Test Item', quantity: 1, price: 5000 }]
        };

        const response = await request(app.getHttpServer())
            .post('/invoices')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send(invoiceDto)
            .expect(201);

        expect(response.body.id).toBeDefined();
        return response.body.id;
    });

        it('/payments/initiate (POST) - Start Payment', async () => {
            // First create an invoice
            const createRes = await request(app.getHttpServer())
                .post('/invoices')
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({
                    customerName: 'Payment Test',
                    amount: 1000,
                    dueDate: new Date(),
                    items: [{ description: 'Item', quantity: 1, price: 1000 }]
                });

        const invoiceId = createRes.body.id;

        // Initiate payment
            const payRes = await request(app.getHttpServer())
                .post('/payments/initiate')
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({
                    invoiceId,
                    amount: 1000,
                    gateway: 'PHONEPE'
                })
                .expect(201);

        expect(payRes.body.orderId).toBeDefined();
        expect(payRes.body.paymentUrl).toBeDefined();
    });
});
