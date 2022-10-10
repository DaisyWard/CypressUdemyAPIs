/// <reference types="cypress"/>

describe('Test with backend', () => {
  beforeEach('login to the app', () => {
    // cy.intercept({method: 'GET', path: 'tags'}, {fixture: 'tags.json'})
    cy.loginToApplication()
  })

  it('should log in', ()=> {
    cy.log('Yay we logged in!')
  })

  it('verfy correct request and response', () => {

    cy.intercept('POST', 'https://api.realworld.io/api/articles/').as('postArticles')

    cy.contains('New Article').click()
    cy.get('[formcontrolname="title"').type('moosse')
    cy.get('[formcontrolname="description"').type('This is a description')
    cy.get('[formcontrolname="body"').type('This is a body of the article')
    cy.contains('Publish Article').click()

    cy.wait('@postArticles').then(xhr => {
      console.log(xhr)
      expect(xhr.response.statusCode).to.equal(200)
      expect(xhr.request.body.article.description).to.equal('This is a description')
      expect(xhr.request.body.article.body).to.equal('This is a body of the article')
    })
  })

  it('intercepting and modifying request and response', () => {

    // cy.intercept('POST', '**/articles/', (req) => {
    //   req.body.article.description = "This is a description 2"
    // }).as('postArticles')

    cy.intercept('POST', '**/articles', (req) => {
      req.reply(res => {
        console.log(res)
        expect(req.body.article.description).to.equal('This is a description')
        req.body.article.description = "This is a description 2"
      })
    }).as('postArticles')

    cy.contains('New Article').click()
    cy.get('[formcontrolname="title"').type('mooosse')
    cy.get('[formcontrolname="description"').type('This is a description')
    cy.get('[formcontrolname="body"').type('This is a body of the article')
    cy.contains('Publish Article').click()

    cy.wait('@postArticles').then(xhr => {
      console.log(xhr)
      expect(xhr.response.statusCode).to.equal(200)
      expect(xhr.request.body.article.description).to.equal('This is a description')
      expect(xhr.request.body.article.body).to.equal('This is a body of the article')
    })
  })

  it('verify popular tags are displayed', () => {
    cy.get('.tag-list')
      .should('contain', 'cypress')
      .and('contain', 'automation')
      .and('contain', 'testing')
  })

  it('verify global feed likes count', () => {
    cy.intercept('GET', 'https://api.realworld.io/api/articles/feed*', {"articles": [], "articlesCount": 0}) //Wildcard
    cy.intercept('GET', 'https://api.realworld.io/api/articles*', {fixture: 'articles.json'})

    cy.contains('Global Feed').click()
    cy.get('app-article-list button').then(heartList => {
      expect(heartList[0]).to.contain('1')
      expect(heartList[1]).to.contain('5')
    })

    cy.fixture('articles.json').then(file => {
      const articleLink = file.articles[1].slug

      file.articles[1].favoritesCount = 6
      cy.intercept('POST', `https://api.realworld.io/api/articles/${articleLink}/favorite`, file)
    })

    cy.get('app-article-list button').eq(1).click().should('contain', '6')
  })

  it.only('it deletes a new article in the global feed', () => {

    const bodyRequest = {
      "article": {
          "tagList": [],
          "title": "Goose 111",
          "description": "Goose",
          "body": "Goose"
      }
    }

    cy.get('@token').then(token => {
      cy.request({
        url: 'https://api.realworld.io/api/articles/',
        headers: {'Authorization': `Token ${token}`},
        method: 'POST',
        body: bodyRequest
      }).then(response => {
        expect(response.status).to.equal(200)
      })

      cy.contains('Global Feed').click()
      cy.get('.article-preview').first().click()
      cy.get('.article-actions').contains('Delete Article').click()

      cy.request({
        url: 'https://api.realworld.io/api/articles?limit=10&offset=0',
        headers: {'Authorization': `Token ${token}`},
        method: 'GET'
      }).its('body').then(body => {
        console.log(body)
        expect(body.articles[0].title).not.to.equal('Goose 111')
      })
    })
  })
})