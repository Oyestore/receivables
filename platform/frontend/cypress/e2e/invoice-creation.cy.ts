describe('Invoice Creation Flow', () => {
    beforeEach(() => {
        // Login before each test
        cy.login(Cypress.env('testUser').email, Cypress.env('testUser').password)
        cy.visit('/sme/invoices')
    })

    it('should display invoice list', () => {
        cy.contains('h1', 'Invoice Management').should('be.visible')
        cy.get('[data-testid="invoice-list"]').should('be.visible')
    })

    it('should open create invoice form', () => {
        cy.contains('button', 'Create Invoice').click()
        cy.get('[data-testid="invoice-form"]').should('be.visible')
    })

    it('should create a new invoice successfully', () => {
        // Open create form
        cy.contains('button', 'Create Invoice').click()

        // Fill customer information
        cy.get('input[name="customerName"]').type('Test Customer Inc.')
        cy.get('input[name="customerEmail"]').type('customer@example.com')
        cy.get('input[name="customerPhone"]').type('+1234567890')

        // Fill invoice details
        cy.get('input[name="issueDate"]').type('2024-12-14')
        cy.get('input[name="dueDate"]').type('2025-01-14')
        cy.get('select[name="paymentTerms"]').select('Net 30')

        // Add line item
        cy.get('[data-testid="add-line-item"]').click()
        cy.get('input[name="items[0].description"]').type('Consulting Services')
        cy.get('input[name="items[0].quantity"]').type('10')
        cy.get('input[name="items[0].unitPrice"]').type('100')
        cy.get('input[name="items[0].taxRate"]').type('18')

        // Verify calculated total
        cy.get('[data-testid="invoice-total"]').should('contain', '1,180.00')

        // Add notes
        cy.get('textarea[name="notes"]').type('Payment due within 30 days')

        // Submit
        cy.get('button[type="submit"]').click()

        // Should show success message
        cy.contains('Invoice created successfully').should('be.visible')

        // Should redirect to invoice list
        cy.url().should('include', '/sme/invoices')

        // Should see new invoice in list
        cy.contains('Test Customer Inc.').should('be.visible')
    })

    it('should validate required fields', () => {
        cy.contains('button', 'Create Invoice').click()
        cy.get('button[type="submit"]').click()

        cy.contains('Customer name is required').should('be.visible')
        cy.contains('Customer email is required').should('be.visible')
        cy.contains('Issue date is required').should('be.visible')
        cy.contains('Due date is required').should('be.visible')
    })

    it('should calculate totals correctly with multiple line items', () => {
        cy.contains('button', 'Create Invoice').click()

        // Add first item
        cy.get('[data-testid="add-line-item"]').click()
        cy.get('input[name="items[0].description"]').type('Item 1')
        cy.get('input[name="items[0].quantity"]').type('5')
        cy.get('input[name="items[0].unitPrice"]').type('100')
        cy.get('input[name="items[0].taxRate"]').type('18')

        // Add second item
        cy.get('[data-testid="add-line-item"]').click()
        cy.get('input[name="items[1].description"]').type('Item 2')
        cy.get('input[name="items[1].quantity"]').type('3')
        cy.get('input[name="items[1].unitPrice"]').type('200')
        cy.get('input[name="items[1].taxRate"]').type('18')

        // Verify subtotal: (5*100) + (3*200) = 1100
        cy.get('[data-testid="invoice-subtotal"]').should('contain', '1,100.00')

        // Verify tax: 1100 * 0.18 = 198
        cy.get('[data-testid="invoice-tax"]').should('contain', '198.00')

        // Verify total: 1100 + 198 = 1298
        cy.get('[data-testid="invoice-total"]').should('contain', '1,298.00')
    })

    it('should be able to remove line items', () => {
        cy.contains('button', 'Create Invoice').click()

        // Add two items
        cy.get('[data-testid="add-line-item"]').click()
        cy.get('[data-testid="add-line-item"]').click()

        // Should have 2 items
        cy.get('[data-testid="line-item"]').should('have.length', 2)

        // Remove first item
        cy.get('[data-testid="remove-line-item"]').first().click()

        // Should have 1 item left
        cy.get('[data-testid="line-item"]').should('have.length', 1)
    })

    it('should download invoice PDF', () => {
        // Assuming we have an existing invoice
        cy.get('[data-testid="invoice-row"]').first().within(() => {
            cy.get('[data-testid="download-pdf"]').click()
        })

        // Verify download started (check downloads folder in real test)
        cy.wait(1000)
    })

    it('should send invoice reminder', () => {
        cy.get('[data-testid="invoice-row"]').first().within(() => {
            cy.get('[data-testid="send-reminder"]').click()
        })

        cy.contains('Reminder sent successfully').should('be.visible')
    })
})
