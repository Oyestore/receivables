import { format, formatDistance, formatRelative } from 'date-fns';

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format large numbers with K, L, Cr suffixes
 */
export function formatNumber(num: number): string {
    if (num >= 10000000) {
        return `${(num / 10000000).toFixed(2)}Cr`;
    }
    if (num >= 100000) {
        return `${(num / 100000).toFixed(2)}L`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, formatString: string = 'MMM dd, yyyy'): string {
    return format(new Date(date), formatString);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
}

/**
 * Format date relative to now (e.g., "yesterday at 3:15 PM")
 */
export function formatRelativeDate(date: Date | string): string {
    return formatRelative(new Date(date), new Date());
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Format phone number (Indian format)
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
}
