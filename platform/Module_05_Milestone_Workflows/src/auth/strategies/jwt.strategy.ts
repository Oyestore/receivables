import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
    sub: string; // User ID
    email: string;
    tenantId: string;
    roles: string[];
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        });
    }

    async validate(payload: JwtPayload) {
        return {
            id: payload.sub,
            email: payload.email,
            tenantId: payload.tenantId,
            roles: payload.roles,
        };
    }
}
