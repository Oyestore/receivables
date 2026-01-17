import { render, screen } from '@testing-library/react';
import { StatusBadge, StatusType } from '../StatusBadge';

describe('StatusBadge Component', () => {
    it('renders label correctly', () => {
        render(<StatusBadge status="success" label="Active" />);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies correct status class for success', () => {
        const { container } = render(<StatusBadge status="success" label="Active" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.classList.contains('status-badge')).toBe(true);
        expect(badge.classList.contains('success')).toBe(true);
    });

    it('applies correct status class for error', () => {
        const { container } = render(<StatusBadge status="error" label="Failed" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.classList.contains('error')).toBe(true);
    });

    it('applies correct size class', () => {
        const { container } = render(
            <StatusBadge status="success" label="Active" size="lg" />
        );
        const badge = container.firstChild as HTMLElement;
        expect(badge.classList.contains('lg')).toBe(true);
    });

    it('renders with custom icon when provided', () => {
        const { container } = render(
            <StatusBadge status="success" label="Active" icon={<span data-testid="custom-icon">✓</span>} />
        );
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders all status types correctly', () => {
        const statuses: StatusType[] = [
            'success', 'error', 'warning', 'info', 'pending', 'active'
        ];

        statuses.forEach(status => {
            const { container } = render(<StatusBadge status={status} label={status} />);
            const badge = container.firstChild as HTMLElement;
            expect(badge.classList.contains(status)).toBe(true);
        });
    });
});
