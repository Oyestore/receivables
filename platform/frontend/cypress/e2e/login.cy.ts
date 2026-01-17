describe('Login Flow', () => {
    beforeEach(() => {
        cy.visit('/login')
    })

    it('should display login page correctly', () => {
        cy.contains('h1', 'Login').should('be.visible')
        cy.get('input[name="email"]').should('be.visible')
        cy.get('input[name="password"]').should('be.visible')
        cy.get('button[type="submit"]').should('be.visible')
    })

    it('should show validation errors for empty form', () => {
        cy.get('button[type="submit"]').click()
        cy.contains('Email is required').should('be.visible')
        cy.contains('Password is required').should('be.visible')
    })

    it('should show error for invalid email format', () => {
        cy.get('input[name="email"]').type('invalid-email')
        cy.get('input[name="password"]').type('password123')
        cy.get('button[type="submit"]').click()
        cy.contains('Invalid email format').should('be.visible')
    })

    it('should successfully login with valid credentials', () => {
        const { email, password } = Cypress.env('testUser')

        cy.get('input[name="email"]').type(email)
        cy.get('input[name="password"]').type(password)
        cy.get('button[type="submit"]').click()

        // Should redirect to dashboard
        cy.url().should('include', '/dashboard')

        // Should store auth token
        cy.window().then((win) => {
            expect(win.localStorage.getItem('authToken')).to.exist
        })

        // Should display user info
        cy.contains(email).should('be.visible')
    })

    it('should show error for invalid credentials', () => {
        cy.get('input[name="email"]').type('wrong@example.com')
        cy.get('input[name="password"]').type('wrongpassword')
        cy.get('button[type="submit"]').click()

        cy.contains('Invalid credentials').should('be.visible')
        cy.url().should('include', '/login')
    })

    it('should navigate to forgot password page', () => {
        cy.contains('Forgot Password').click()
        cy.url().should('include', '/forgot-password')
    })

    it('should logout successfully', () => {
        // Login first
        const { email, password } = Cypress.env('testUser')
        cy.get('input[name="email"]').type(email)
        cy.get('input[name="password"]').type(password)
        cy.get('button[type="submit"]').click()

        // Wait for dashboard
        cy.url().should('include', '/dashboard')

        // Logout
        cy.get('[data-testid="user-menu"]').click()
        cy.contains('Logout').click()

        // Should redirect to login
        cy.url().should('include', '/login')

        // Token should be removed
        cy.window().then((win) => {
            expect(win.localStorage.getItem('authToken')).to.be.null
        })
    })
})
