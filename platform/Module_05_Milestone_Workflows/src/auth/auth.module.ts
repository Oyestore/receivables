import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION') || '24h',
                },
            }),
        }),
    ],
    providers: [JwtStrategy],
    exports: [PassportModule, JwtModule],
})
export class AuthModule { }
