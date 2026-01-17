/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        /**
         * Custom command to login as a specific user role
         * @example cy.loginAs('sme_owner')
         */
        loginAs(role: 'sme_owner' | 'legal_partner' | 'accountant' | 'admin'): Chainable<void>;

        /**
         * Custom command to seed test data
         * @example cy.seedData('invoices')
         */
        seedData(dataType: string): Chainable<void>;

        /**
         * Custom command to wait for API call
         * @example cy.waitForApi('@getInvoices')
         */
        waitForApi(alias: string): Chainable<void>;

        /**
         * Custom command to check responsive design
         * @example cy.checkResponsive()
         */
        checkResponsive(): Chainable<void>;
    }
}

// Login command
Cypress.Commands.add('loginAs', (role) => {
    const users = {
        sme_owner: {
            email: 'sme@example.com',
            password: 'Demo@123',
        },
        legal_partner: {
            email: 'legal@example.com',
            password: 'Demo@123',
        },
        accountant: {
            email: 'accountant@example.com',
            password: 'Demo@123',
        },
        admin: {
            email: 'admin@example.com',
            password: 'Demo@123',
        },
    };

    const user = users[role];

    cy.visit('/login');
    cy.get('input[name="email"]').type(user.email);
    cy.get('input[name="password"]').type(user.password);
    cy.get('button[type="submit"]').click();

    // Wait for redirect
    cy.url().should('not.include', '/login');

    // Wait for dashboard to load
    cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible');
});

// Seed data command
Cypress.Commands.add('seedData', (dataType) => {
    cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/test/seed/${dataType}`,
        failOnStatusCode: false,
    });
});

// Wait for API
Cypress.Commands.add('waitForApi', (alias) => {
    cy.wait(alias).its('response.statusCode').should('eq', 200);
});

// Check responsive design
Cypress.Commands.add('checkResponsive', () => {
    const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 720, name: 'desktop' },
    ];

    viewports.forEach((viewport) => {
        cy.viewport(viewport.width, viewport.height);
        cy.wait(500);
        cy.screenshot(`responsive-${viewport.name}`);
    });
});

export { };
