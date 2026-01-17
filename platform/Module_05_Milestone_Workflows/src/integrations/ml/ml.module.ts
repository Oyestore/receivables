import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MLServiceConnector } from './ml-service.connector';
import { Milestone } from '../../entities/milestone.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Milestone]),
        HttpModule.register({
            timeout: 15000,
            maxRedirects: 5,
        }),
    ],
    providers: [MLServiceConnector],
    exports: [MLServiceConnector],
})
export class MLServiceModule { }
