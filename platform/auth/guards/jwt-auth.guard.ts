import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * Validates JWT tokens and attaches user to request
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        // Add custom authentication logic here if needed
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        // Throw an exception if no user is found
        if (err || !user) {
            throw err || new UnauthorizedException('Invalid or expired token');
        }
        return user;
    }
}
