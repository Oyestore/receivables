/// <reference types="cypress" />

describe('Authentication Flow', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('should display login page correctly', () => {
        cy.contains('Sign In').should('be.visible');
        cy.get('input[name="email"]').should('be.visible');
        cy.get('input[name="password"]').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
        cy.get('button[type="submit"]').click();
        cy.contains('Email is required').should('be.visible');
        cy.contains('Password is required').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
        cy.get('input[name="email"]').type('wrong@example.com');
        cy.get('input[name="password"]').type('WrongPassword123');
        cy.get('button[type="submit"]').click();

        cy.contains('Invalid credentials', { timeout: 5000 }).should('be.visible');
    });

    it('should successfully login as SME Owner', () => {
        cy.loginAs('sme_owner');
        cy.url().should('include', '/sme/dashboard');
        cy.get('[data-testid="user-menu"]').should('contain', 'SME Owner');
    });

    it('should successfully login as Legal Partner', () => {
        cy.loginAs('legal_partner');
        cy.url().should('include', '/legal/dashboard');
        cy.get('[data-testid="user-menu"]').should('contain', 'Legal Partner');
    });

    it('should successfully login as Accountant', () => {
        cy.loginAs('accountant');
        cy.url().should('include', '/accounting/dashboard');
        cy.get('[data-testid="user-menu"]').should('contain', 'Accountant');
    });

    it('should successfully login as Admin', () => {
        cy.loginAs('admin');
        cy.url().should('include', '/admin/dashboard');
        cy.get('[data-testid="user-menu"]').should('contain', 'Admin');
    });

    it('should logout successfully', () => {
        cy.loginAs('sme_owner');
        cy.get('[data-testid="user-menu"]').click();
        cy.contains('Logout').click();
        cy.url().should('include', '/login');
    });

    it('should remember user session', () => {
        cy.loginAs('sme_owner');
        cy.reload();
        cy.url().should('include', '/sme/dashboard');
    });
});
