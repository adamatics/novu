describe('Notifications List', function () {
  beforeEach(function () {
    cy.intercept('**/notifications/feed?page=0').as('getNotificationsFirstPage');
    cy.intercept('**/notifications/unseen').as('unseenRequest');

    cy.initializeSession()
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        cy.task('createNotifications', {
          identifier: session.templates[0].triggers[0].identifier,
          token: session.token,
          subscriberId: session.subscriber.subscriberId,
          count: 5,
          organizationId: session.organization._id,
          templateId: session.templates[0]._id,
        });

        cy.wait(1000);
      });
  });

  it('should show list of current notifications', function () {
    cy.wait('@getNotificationsFirstPage');

    cy.getByTestId('notification-list-item', {
      timeout: 10000,
    }).should('have.length', 5);
    cy.getByTestId('notification-list-item')
      .first()
      .getByTestId('notification-content')
      .contains('test content for John', {
        matchCase: false,
      });

    cy.getByTestId('unseen-count-label').contains('5');
  });

  it('should update real time for new notifications', function () {
    cy.wait('@getNotificationsFirstPage');

    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 3,
      organizationId: this.session.organization._id,
      templateId: this.session.templates[0]._id,
    });

    cy.wait('@getNotificationsFirstPage');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('unseen-count-label').contains('8');

    cy.getByTestId('notification-list-item').should('have.length', 8);

    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 1,
      organizationId: this.session.organization._id,
      templateId: this.session.templates[0]._id,
    });

    cy.wait(['@getNotificationsFirstPage', '@unseenRequest']);

    cy.getByTestId('unseen-count-label').contains('9');
  });

  /**
   * This is skipped because it caught a flaky tests failure when run in cypress run mode
   */
  it.skip('should lazy-load notifications on scroll', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 20,
    });
    cy.intercept('**/notifications/feed?page=0').as('firstPage');
    cy.intercept('**/notifications/feed?page=1').as('secondPage');
    cy.intercept('**/notifications/feed?page=2').as('thirdPage');

    cy.wait('@firstPage');
    cy.getByTestId('notification-list-item').should('have.length', 10);

    cy.getByTestId('notifications-scroll-area').get('.infinite-scroll-component').scrollTo('bottom');
    cy.wait('@secondPage');
    cy.getByTestId('notification-list-item').should('have.length', 20);

    cy.getByTestId('notifications-scroll-area').get('.infinite-scroll-component').scrollTo('bottom');
    cy.wait('@thirdPage');
    cy.getByTestId('notification-list-item').should('have.length', 25);
  });

  it.skip('toggle read state on click of notification', function () {
    cy.getByTestId('unseen-count-label').contains('5');
    cy.intercept('**/messages/**/read').as('readRequest');
    cy.getByTestId('notification-list-item').first().click();
    cy.wait('@readRequest');
    cy.getByTestId('unseen-count-label').contains('4');
  });

  it('count seen-unseen notification', function () {
    cy.wait('@getNotificationsFirstPage');

    cy.getByTestId('unseen-count-label').contains('5');
    cy.getByTestId('notification-list-item').should('have.length', 5);
  });
});
