import { render, screen } from '@testing-library/react';
import { GradientCard } from '../GradientCard';

describe('GradientCard Component', () => {
    it('renders children correctly', () => {
        render(
            <GradientCard>
                <div>Test Content</div>
            </GradientCard>
        );

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies the correct theme class', () => {
        const { container } = render(
            <GradientCard theme="invoicing">
                <div>Test</div>
            </GradientCard>
        );

        const card = container.firstChild as HTMLElement;
        expect(card.classList.contains('gradient-card')).toBe(true);
    });

    it('applies glass effect when glass prop is true', () => {
        const { container } = render(
            <GradientCard glass>
                <div>Test</div>
            </GradientCard>
        );

        const card = container.firstChild as HTMLElement;
        expect(card.classList.contains('glass')).toBe(true);
    });

    it('calls onClick handler when clicked and clickable', () => {
        const handleClick = jest.fn();
        const { container } = render(
            <GradientCard onClick={handleClick}>
                <div>Test</div>
            </GradientCard>
        );

        const card = container.firstChild as HTMLElement;
        card.click();

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover effect class when hover prop is true', () => {
        const { container } = render(
            <GradientCard hoverable>
                <div>Test</div>
            </GradientCard>
        );

        const card = container.firstChild as HTMLElement;
        expect(card.classList.contains('hover')).toBe(true);
    });
});
