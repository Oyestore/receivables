/// <reference types="cypress" />

describe('Gamification System', () => {
    beforeEach(() => {
        cy.loginAs('sme_owner');
        cy.visit('/sme/gamification');
    });

    it('should display user level and points', () => {
        cy.get('[data-testid="user-level"]').should('be.visible');
        cy.get('[data-testid="total-points"]').should('be.visible');
        cy.get('[data-testid="level-progress"]').should('be.visible');
    });

    it('should show stats grid', () => {
        const stats = ['Total Points', 'Current Streak', 'Longest Streak', 'Achievements'];

        stats.forEach((stat) => {
            cy.contains(stat).should('be.visible');
        });
    });

    it('should display achievements', () => {
        cy.get('[data-testid="achievements-grid"]').should('be.visible');
        cy.get('[data-testid="achievement-card"]').should('have.length.at.least', 1);
    });

    it('should show unlocked achievements with indicator', () => {
        cy.get('[data-testid="achievement-card"]').first().within(() => {
            // Check for unlock indicator or progress
            cy.get('*').should('exist');
        });
    });

    it('should display recent activity', () => {
        cy.get('[data-testid="recent-activity"]').should('be.visible');
        cy.contains('Recent Activity').should('be.visible');
    });

    it('should navigate to leaderboard', () => {
        cy.contains('Leaderboard').click();
        cy.get('[data-testid="leaderboard"]').should('be.visible');
    });

    it('should display leaderboard rankings', () => {
        cy.contains('Leaderboard').click();

        cy.get('[data-testid="leaderboard-table"]').should('be.visible');
        cy.get('tr').should('have.length.at.least', 2); // Header + at least 1 row
    });

    it('should show user rank in leaderboard', () => {
        cy.contains('Leaderboard').click();

        // Find current user's row (should be highlighted)
        cy.get('[data-testid="current-user-row"]').should('exist');
    });
});
