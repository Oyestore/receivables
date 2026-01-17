import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'cypress/support/e2e.ts',
        videosFolder: 'cypress/videos',
        screenshotsFolder: 'cypress/screenshots',
        video: true,
        screenshotOnRunFailure: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,

        setupNodeEvents(on, config) {
            // implement node event listeners here
            on('task', {
                log(message) {
                    console.log(message)
                    return null
                },
            })
        },

        env: {
            apiUrl: 'http://localhost:4000',
            testUser: {
                email: 'test@example.com',
                password: 'Test123!@#'
            }
        }
    },

    component: {
        devServer: {
            framework: 'react',
            bundler: 'vite',
        },
        specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'cypress/support/component.ts',
    },
})
