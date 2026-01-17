import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoiceCacheService {
    private readonly DEFAULT_TTL = 300; // 5 minutes
    private readonly SEARCH_TTL = 60; // 1 minute for search results

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    // Cache single invoice
    async getInvoice(id: string): Promise<Invoice | null> {
        const key = `invoice:${id}`;
        return this.cacheManager.get<Invoice>(key);
    }

    async setInvoice(invoice: Invoice, ttl?: number): Promise<void> {
        const key = `invoice:${id}`;
        await this.cacheManager.set(key, invoice, { ttl: ttl || this.DEFAULT_TTL });
    }

    // Cache invoice list
    async getInvoiceList(
        tenantId: string,
        page: number,
        limit: number,
    ): Promise<Invoice[] | null> {
        const key = `invoices:${tenantId}:p${page}:l${limit}`;
        return this.cacheManager.get<Invoice[]>(key);
    }

    async setInvoiceList(
        tenantId: string,
        page: number,
        limit: number,
        invoices: Invoice[],
    ): Promise<void> {
        const key = `invoices:${tenantId}:p${page}:l${limit}`;
        await this.cacheManager.set(key, invoices, { ttl: this.DEFAULT_TTL });
    }

    // Cache search results
    async getSearchResults(searchHash: string): Promise<any | null> {
        const key = `search:${searchHash}`;
        return this.cacheManager.get(key);
    }

    async setSearchResults(searchHash: string, results: any): Promise<void> {
        const key = `search:${searchHash}`;
        await this.cacheManager.set(key, results, { ttl: this.SEARCH_TTL });
    }

    // Cache facets
    async getFacets(tenantId: string): Promise<any | null> {
        const key = `facets:${tenantId}`;
        return this.cacheManager.get(key);
    }

    async setFacets(tenantId: string, facets: any): Promise<void> {
        const key = `facets:${tenantId}`;
        await this.cacheManager.set(key, facets, { ttl: this.DEFAULT_TTL });
    }

    // Invalidation methods
    async invalidateInvoice(id: string): Promise<void> {
        await this.cacheManager.del(`invoice:${id}`);
    }

    async invalidateTenant(tenantId: string): Promise<void> {
        // Invalidate all tenant data
        const keys = [
            `invoices:${tenantId}:*`,
            `facets:${tenantId}`,
            `search:${tenantId}:*`,
        ];

        for (const pattern of keys) {
            await this.deletePattern(pattern);
        }
    }

    async invalidateSearch(): Promise<void> {
        await this.deletePattern('search:*');
    }

    // Warm cache with frequently accessed invoices
    async warmCache(tenantId: string, topInvoices: Invoice[]): Promise<void> {
        for (const invoice of topInvoices) {
            await this.setInvoice(invoice);
        }
    }

    // Helper: Delete by pattern (requires Redis)
    private async deletePattern(pattern: string): Promise<void> {
        // This would use Redis SCAN command in production
        // For now, we'll use a simple deletion
        try {
            const store: any = (this.cacheManager as any).store;
            if (store.keys) {
                const keys = await store.keys(pattern);
                for (const key of keys) {
                    await this.cacheManager.del(key);
                }
            }
        } catch (error) {
            // Fallback: just log the error
            console.warn('Pattern deletion not supported:', error);
        }
    }

    // Cache statistics
    async getStats(): Promise<{
        hits: number;
        misses: number;
        keys: number;
    }> {
        // This would integrate with Redis INFO command
        return {
            hits: 0,
            misses: 0,
            keys: 0,
        };
    }
}
