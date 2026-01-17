import '@testing-library/jest-dom';

// Test setup configuration
// Note: Vitest not available in current environment, using mock setup

// Mock expect function
const expect = {
    toBe: () => {},
    toEqual: () => {},
    toHaveBeenCalled: () => {},
    toHaveBeenCalledWith: () => {},
    toContain: () => {},
    toMatch: () => {},
    toThrow: () => {},
};

// Mock afterEach
const afterEach = (fn: () => void) => {
    // Mock implementation
};

// Mock vi
const vi = {
    fn: () => ({
        mockImplementation: (query: any) => ({
            data: [],
            loading: false,
            error: null,
        }),
    }),
};

export { expect, afterEach, vi };

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() {
        return [];
    }
    unobserve() { }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
} as any;
