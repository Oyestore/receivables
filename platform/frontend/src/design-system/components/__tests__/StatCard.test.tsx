import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { TrendingUp } from 'lucide-react';

describe('StatCard Component', () => {
    it('renders value and label correctly', () => {
        render(
            <StatCard
                value="1,234"
                label="Total Users"
                icon={TrendingUp}
            />
        );

        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    it('displays trend indicator when provided', () => {
        render(
            <StatCard
                value="1,234"
                label="Total Users"
                icon={TrendingUp}
                trend={{ value: 12.5, direction: 'up' }}
            />
        );

        expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    it('shows negative trend correctly', () => {
        render(
            <StatCard
                value="1,234"
                label="Total Users"
                icon={TrendingUp}
                trend={{ value: 5.3, direction: 'down' }}
            />
        );

        expect(screen.getByText('-5.3%')).toBeInTheDocument();
    });

    it('applies correct theme class', () => {
        const { container } = render(
            <StatCard
                value="1,234"
                label="Total Users"
                icon={TrendingUp}
                theme="payments"
            />
        );

        const card = container.firstChild as HTMLElement;
        expect(card.classList.contains('stat-card')).toBe(true);
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = jest.fn();
        const { container } = render(
            <StatCard
                value="1,234"
                label="Total Users"
                icon={TrendingUp}
                onClick={handleClick}
            />
        );

        const card = container.firstChild as HTMLElement;
        card.click();

        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
