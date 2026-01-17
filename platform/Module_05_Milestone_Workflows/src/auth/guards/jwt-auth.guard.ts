import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Auth Guard
 * 
 * Protects routes by requiring valid JWT token
 * Usage: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // Add custom logic if needed
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        // You can throw an exception based on either "info" or "err" arguments
        if (err || !user) {
            throw err || new Error('Unauthorized');
        }
        return user;
    }
}
