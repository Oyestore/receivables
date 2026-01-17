import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current User Decorator
 * Extracts user from request object
 * Usage: @CurrentUser() user: any
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
