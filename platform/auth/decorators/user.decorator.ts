import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * User Decorator
 * 
 * Extracts authenticated user from request
 * Usage: @User() user: UserPayload
 */
export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

/**
 * User Payload Interface
 */
export interface UserPayload {
    userId: string;
    tenantId: string;
    email: string;
    roles?: string[];
    [key: string]: any;
}
