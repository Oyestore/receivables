/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format: 10 digits)
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleaned = phone.replace(/\D/g, '');
    return phoneRegex.test(cleaned);
}

/**
 * Validate PAN number (Indian)
 */
export function isValidPAN(pan: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
}

/**
 * Validate GST number (Indian)
 */
export function isValidGST(gst: string): boolean {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
}

/**
 * Validate amount (positive number)
 */
export function isValidAmount(amount: number): boolean {
    return !isNaN(amount) && amount > 0;
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
}

/**
 * Validate file type
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate date is not in the future
 */
export function isNotFutureDate(date: Date | string): boolean {
    return new Date(date) <= new Date();
}

/**
 * Validate string length
 */
export function isValidLength(
    str: string,
    min: number = 0,
    max: number = Infinity
): boolean {
    return str.length >= min && str.length <= max;
}
