import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PaymentGatewayFactory } from '../services/payment-gateway-factory.service';

@Controller('payment-gateways')
export class PaymentGatewayController {
    constructor(private readonly gatewayFactory: PaymentGatewayFactory) { }

    @Get()
    async findAll() {
        return { message: 'List of payment gateways' };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return { message: `Gateway ${id}` };
    }
}
