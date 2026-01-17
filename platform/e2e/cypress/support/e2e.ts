// ***********************************************************
// This file is processed and loaded automatically before your test files.
//
// You can change the location of this file or turn off
// automatically serving support files with the 'supportFile' configuration option.
// ***********************************************************

import './commands';

// Hide fetch/XHR requests from command log for cleaner test output
const app = window.top;
if (app && !app.document.head.querySelector('[data-hide-command-log-request]')) {
    const style = app.document.createElement('style');
    style.innerHTML =
        '.command-name-request, .command-name-xhr { display: none }';
    style.setAttribute('data-hide-command-log-request', '');
    app.document.head.appendChild(style);
}

// Example: store test user data
Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from failing the test on uncaught exceptions
    if (err.message.includes('ResizeObserver')) {
        return false;
    }
    return true;
});
