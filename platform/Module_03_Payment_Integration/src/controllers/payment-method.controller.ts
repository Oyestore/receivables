import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from '../entities/payment-method.entity';

@Controller('payment-methods')
export class PaymentMethodController {
    constructor(
        @InjectRepository(PaymentMethod)
        private readonly paymentMethodRepository: Repository<PaymentMethod>,
    ) { }

    @Get()
    async findAll() {
        return this.paymentMethodRepository.find();
    }

    @Post()
    async create(@Body() createPaymentMethodDto: any) {
        return this.paymentMethodRepository.save(createPaymentMethodDto);
    }
}