/// <reference types="cypress" />

describe('Invoice Management', () => {
    beforeEach(() => {
        cy.loginAs('sme_owner');
        cy.visit('/sme/invoices');
    });

    it('should display invoices list', () => {
        cy.get('[data-testid="invoices-list"]').should('be.visible');
        cy.contains('Invoices').should('be.visible');
    });

    it('should create new invoice', () => {
        // Click create button
        cy.contains('Create Invoice').click();
        cy.url().should('include', '/invoices/new');

        // Fill invoice form
        cy.get('input[name="customerName"]').type('Test Customer Ltd');
        cy.get('input[name="customerEmail"]').type('customer@test.com');
        cy.get('input[name="invoiceNumber"]').type(`INV-${Date.now()}`);

        // Add line item
        cy.contains('Add Item').click();
        cy.get('input[name="items[0].description"]').type('Consulting Services');
        cy.get('input[name="items[0].quantity"]').type('10');
        cy.get('input[name="items[0].rate"]').type('5000');

        // Check calculated total
        cy.get('[data-testid="invoice-total"]').should('contain', '50,000');

        // Submit
        cy.get('button[type="submit"]').click();

        // Verify success
        cy.contains('Invoice created successfully', { timeout: 5000 }).should('be.visible');
        cy.url().should('include', '/sme/invoices');
    });

    it('should validate required fields', () => {
        cy.contains('Create Invoice').click();
        cy.get('button[type="submit"]').click();

        // Check validation errors
        cy.contains('Customer name is required').should('be.visible');
        cy.contains('Invoice number is required').should('be.visible');
    });

    it('should filter invoices by status', () => {
        cy.get('[data-testid="status-filter"]').click();
        cy.contains('Paid').click();

        cy.wait(1000);
        cy.get('[data-testid="invoice-card"]').each(($el) => {
            cy.wrap($el).should('contain', 'Paid');
        });
    });

    it('should search invoices', () => {
        cy.get('input[placeholder*="Search"]').type('INV-001');
        cy.wait(500);

        cy.get('[data-testid="invoice-card"]').should('have.length.at.least', 1);
        cy.get('[data-testid="invoice-card"]').first().should('contain', 'INV-001');
    });

    it('should view invoice details', () => {
        cy.get('[data-testid="invoice-card"]').first().click();

        cy.get('[data-testid="invoice-details"]').should('be.visible');
        cy.contains('Invoice Details').should('be.visible');
        cy.get('[data-testid="customer-info"]').should('be.visible');
        cy.get('[data-testid="line-items"]').should('be.visible');
    });

    it('should send invoice via email', () => {
        cy.get('[data-testid="invoice-card"]').first().click();
        cy.contains('Send').click();

        cy.get('[data-testid="send-dialog"]').should('be.visible');
        cy.get('input[name="recipientEmail"]').should('have.value');
        cy.contains('Send Invoice').click();

        cy.contains('Invoice sent successfully', { timeout: 5000 }).should('be.visible');
    });

    it('should download invoice as PDF', () => {
        cy.get('[data-testid="invoice-card"]').first().click();

        // Intercept download request
        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        });

        cy.contains('Download PDF').click();
        cy.get('@windowOpen').should('be.called');
    });

    it('should edit invoice', () => {
        cy.get('[data-testid="invoice-card"]').first().click();
        cy.contains('Edit').click();

        cy.get('input[name="customerName"]').clear().type('Updated Customer Name');
        cy.get('button[type="submit"]').click();

        cy.contains('Invoice updated successfully', { timeout: 5000 }).should('be.visible');
    });

    it('should delete invoice', () => {
        cy.get('[data-testid="invoice-card"]').first().click();
        cy.contains('Delete').click();

        // Confirm deletion
        cy.get('[data-testid="confirm-dialog"]').should('be.visible');
        cy.contains('Confirm').click();

        cy.contains('Invoice deleted successfully', { timeout: 5000 }).should('be.visible');
    });
});
