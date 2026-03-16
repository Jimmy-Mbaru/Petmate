describe('Owner Workflow', () => {
  const randomId = Date.now();
  const ownerEmail = `owner_${randomId}@example.com`;
  const ownerPassword = 'Password123!';

  it('should complete full owner workflow', () => {
    // 1. Register
    cy.visit('/auth/register');
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('Owner');
    cy.get('input[name="email"]').type(ownerEmail);
    cy.get('input[name="password"]').type(ownerPassword);
    cy.get('input[name="confirmPassword"]').type(ownerPassword);
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.contains('button', 'Create Account').click();
    
    // Wait for potential network call and check for error
    cy.wait(1000); 
    cy.get('body').then(($body) => {
      const errorMsg = $body.find('.text-red-800');
      if (errorMsg.length > 0 && errorMsg.is(':visible')) {
        throw new Error(`Registration failed with error: ${errorMsg.text()}`);
      }
    });

    // Should redirect to verify-email
    cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
    cy.contains('Check Your Email');

    // 2. Manually verify user in DB for testing
    cy.exec(`npx ts-node ../backend/scripts/verify-user.ts ${ownerEmail}`);

    // 3. Login
    cy.visit('/auth/login');
    cy.intercept('POST', '**/auth/login').as('login');
    cy.get('input[name="email"]').type(ownerEmail);
    cy.get('input[name="password"]').type(ownerPassword);
    cy.contains('button', 'Sign In').click();
    
    cy.wait('@login').then((interception) => {
      if (interception.response?.statusCode !== 201 && interception.response?.statusCode !== 200) {
        throw new Error(`Login failed with status ${interception.response?.statusCode}: ${JSON.stringify(interception.response?.body)}`);
      }
    });

    cy.url({ timeout: 15000 }).should('include', '/app/dashboard');
    cy.contains('Welcome back');

    // 4. Add a Pet
    cy.visit('/app/pets');
    // Check if there's an 'Add pet' button or if it's the empty state
    cy.get('body').then(($body) => {
      if ($body.find('a[routerLink="/app/pets/new"]').length > 0) {
        cy.get('a[routerLink="/app/pets/new"]').first().click();
      } else {
        cy.contains('Add pet').click();
      }
    });
    cy.get('input[formControlName="name"]').type('Buddy');
    cy.get('input[formControlName="species"]').type('Dog');
    cy.get('input[formControlName="breed"]').type('Golden Retriever');
    cy.get('input[formControlName="age"]').type('24');
    cy.get('select[formControlName="gender"]').select('male');
    cy.get('textarea[formControlName="healthNotes"]').type('A very good boy.');
    
    // Upload a dummy image (might fail, but we made it optional)
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      fileName: 'pet.gif',
      mimeType: 'image/gif',
    }, { force: true });

    cy.get('button[type="submit"]').should('not.be.disabled').click();
    cy.contains('Buddy', { timeout: 10000 }).should('be.visible');

    // 5. Search for Boarding
    cy.visit('/boarding');
    cy.get('input[placeholder*="Search by location"]').type('Nairobi');
    // Wait for results
    cy.contains('KES').should('be.visible');

    // 4. Book a Boarding
    // Assuming there's at least one host. If not, this might fail.
    // We might need to seed a host first or just check the page loads.
    cy.get('.card').first().click(); // Open detail
    cy.contains('Book Now').click();
    // Fill booking form
    // ... this depends on the booking modal/page
    
    // 5. Store Workflow
    cy.visit('/app/store');
    cy.intercept('POST', '**/store/cart/checkout').as('checkout');
    cy.contains('KES').should('be.visible');
    cy.get('.btn-add-to-cart').first().click();
    
    // Wait for cart to update
    cy.get('.cart-count').should('contain', '1');
    cy.get('.cart-summary').click();
    
    cy.contains('button', 'Checkout').click();
    cy.wait('@checkout', { timeout: 15000 }).then((interception) => {
      if (interception.response?.statusCode !== 201) {
        throw new Error(`Checkout failed with status ${interception.response?.statusCode}: ${JSON.stringify(interception.response?.body)}`);
      }
    });
    cy.contains('Order placed successfully', { timeout: 10000 }).should('be.visible');

    // 6. View My Orders
    cy.intercept('GET', '**/store/orders/my*').as('getMyOrders');
    cy.visit('/app/store/my-orders');
    cy.wait('@getMyOrders');
    cy.get('.order-card', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.contains('Order').should('be.visible');
  });
});
