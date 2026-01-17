// Custom login command
Cypress.Commands.add('login', (email: string, password: string) => {
    cy.session([email, password], () => {
        cy.visit('/login')
        cy.get('input[name="email"]').type(email)
        cy.get('input[name="password"]').type(password)
        cy.get('button[type="submit"]').click()
        cy.url().should('include', '/dashboard')
        cy.window().then((win) => {
            expect(win.localStorage.getItem('authToken')).to.exist
        })
    })
})

// Custom API request with auth
Cypress.Commands.add('apiRequest', (method: string, url: string, body?: any) => {
    return cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken')
        return cy.request({
            method,
            url: `${Cypress.env('apiUrl')}${url}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body,
            failOnStatusCode: false,
        })
    })
})

// Wait for API call to complete
Cypress.Commands.add('waitForApi', (alias: string) => {
    cy.wait(`@${alias}`).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204])
    })
})

// Custom command to seed test data
Cypress.Commands.add('seedTestData', () => {
    // Create test customer
    cy.apiRequest('POST', '/api/customers', {
        name: 'Test Customer',
        email: 'test@customer.com',
        phone: '+1234567890',
    })

    // Create test invoice
    cy.apiRequest('POST', '/api/invoices', {
        customerId: 'test-customer-id',
        items: [
            {
                description: 'Test Item',
                quantity: 1,
                unitPrice: 100,
                taxRate: 18,
            },
        ],
    })
})

// Clean up test data
Cypress.Commands.add('cleanupTestData', () => {
    cy.apiRequest('DELETE', '/api/test-data/cleanup')
})

// Check for accessibility violations
Cypress.Commands.add('checkA11y', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
        runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa'],
        },
    })
})

// Declare custom commands for TypeScript
declare global {
    namespace Cypress {
        interface Chainable {
            login(email: string, password: string): Chainable<void>
            apiRequest(method: string, url: string, body?: any): Chainable<any>
            waitForApi(alias: string): Chainable<void>
            seedTestData(): Chainable<void>
            cleanupTestData(): Chainable<void>
            checkA11y(): Chainable<void>
        }
    }
}

export { }
