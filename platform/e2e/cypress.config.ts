import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        viewportWidth: 1280,
        viewportHeight: 720,
        video: true,
        screenshotOnRunFailure: true,

        env: {
            apiUrl: 'http://localhost:4000/api/v1',
        },

        setupNodeEvents(on, config) {
            // implement node event listeners here
        },

        retries: {
            runMode: 2,
            openMode: 0,
        },

        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
    },

    component: {
        devServer: {
            framework: 'react',
            bundler: 'vite',
        },
        specPattern: 'cypress/component/**/*.cy.tsx',
    },
});
