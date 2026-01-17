import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Organization Guard
 * Ensures requests are scoped to a valid organization/tenant
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Check if user has organization/tenant info
        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Get organization ID from request (query, params, or body)
        const organizationId =
            request.params?.organizationId ||
            request.query?.organizationId ||
            request.body?.organizationId ||
            user.organizationId;

        if (!organizationId) {
            throw new ForbiddenException('Organization context required');
        }

        // Verify user has access to this organization
        if (user.organizationId && user.organizationId !== organizationId) {
            // Check if user has cross-org access
            if (!user.organizations?.includes(organizationId)) {
                throw new ForbiddenException('Access denied to this organization');
            }
        }

        // Attach organization to request for downstream use
        request.organizationId = organizationId;

        return true;
    }
}
