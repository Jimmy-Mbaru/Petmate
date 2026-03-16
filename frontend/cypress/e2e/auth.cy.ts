describe('Authentication', () => {
  it('should load the landing page', () => {
    cy.visit('/');
    cy.contains('PetMate');
  });

  it('should navigate to login page', () => {
    cy.visit('/');
    cy.contains('Log In').click();
    cy.url().should('include', '/auth/login');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
  });
});
