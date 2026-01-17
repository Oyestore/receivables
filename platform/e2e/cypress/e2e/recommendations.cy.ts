describe('Recommendations API (UI E2E)', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:4000/api/v1';

  it('loads UI root', () => {
    cy.visit('/');
    cy.title().should('exist');
  });

  it('returns 401 for recommendations without token', () => {
    cy.request({
      url: `${apiUrl}/analytics/recommendations`,
      qs: { tenantId },
      failOnStatusCode: false
    }).then((res) => {
      expect([401, 403]).to.include(res.status);
    });
  });

  it('returns recommendations with token when available', () => {
    const token = window.localStorage.getItem('authToken');
    if (!token) {
      cy.log('No auth token present; skipping authorized request');
      return;
    }
    cy.request({
      url: `${apiUrl}/analytics/recommendations`,
      qs: { tenantId, 'signals[overdueInvoices]': 2 },
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
    });
  });
});

