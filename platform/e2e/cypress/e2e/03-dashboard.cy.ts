/// <reference types="cypress" />

describe('Cash Flow Dashboard', () => {
    beforeEach(() => {
        cy.loginAs('sme_owner');
        cy.visit('/sme/dashboard');
    });

    it('should display dashboard correctly', () => {
        cy.get('[data-testid="dashboard"]').should('be.visible');
        cy.contains('Dashboard').should('be.visible');
    });

    it('should show KPI widgets', () => {
        // Check all 8 KPI widgets
        const kpis = [
            'Total Outstanding',
            'Current Cash',
            'Forecasted Cash',
            'Overdue Amount',
            'Collection Rate',
            'Average Days to Pay',
            'Invoices Created',
            'Payments Received',
        ];

        kpis.forEach((kpi) => {
            cy.contains(kpi).should('be.visible');
        });
    });

    it('should display cash flow timeline', () => {
        cy.get('[data-testid="cash-flow-timeline"]').should('be.visible');
        cy.get('[data-testid="timeline-chart"]').should('be.visible');
    });

    it('should show aging analysis', () => {
        cy.get('[data-testid="aging-analysis"]').should('be.visible');

        // Check aging buckets
        ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'].forEach((bucket) => {
            cy.contains(bucket).should('be.visible');
        });
    });

    it('should display alerts panel', () => {
        cy.get('[data-testid="alerts-panel"]').should('be.visible');
        cy.contains('Alerts').should('be.visible');
    });

    it('should toggle between forecast scenarios', () => {
        cy.contains('Scenario').click();

        ['Optimistic', 'Realistic', 'Pessimistic'].forEach((scenario) => {
            cy.contains(scenario).click();
            cy.wait(500);
            cy.get('[data-testid="forecast-chart"]').should('be.visible');
        });
    });

    it('should navigate to invoices from dashboard', () => {
        cy.contains('View All Invoices').click();
        cy.url().should('include', '/invoices');
    });

    it('should refresh data', () => {
        cy.get('[data-testid="refresh-button"]').click();
        cy.contains('Data refreshed', { timeout: 3000 }).should('be.visible');
    });
});
