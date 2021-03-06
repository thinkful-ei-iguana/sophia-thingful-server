const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')
const jwt = require('jsonwebtoken')

describe('Things Endpoints', function () {
  let db

  const {
    testUsers,
    testThings,
    testReviews,
  } = helpers.makeThingsFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  before('cleanup', () => helpers.cleanTables(db))

  after('disconnect from db', () => db.destroy())

  afterEach('cleanup', () => helpers.cleanTables(db))

  describe(`GET /api/things`, () => {
    context(`Given no things`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/things')
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200, [])
      })
    })

    context('Given there are things in the database', () => {
      beforeEach('insert users, things, and reviews', async () => {
        await helpers.seedUsers(db, testUsers);
        await helpers.seedThings(db, testThings);
        await helpers.seedReviews(db, testReviews);
      })

      it('responds with 200 and all of the things', (done) => {
        const expectedThings = testThings.map(thing =>
          helpers.makeExpectedThing(
            testUsers,
            thing,
            testReviews,
          )
        )

        done()

        return supertest(app)
          .get('/api/things')
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedThings)
      })
    })

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousThing,
        expectedThing,
      } = helpers.makeMaliciousThing(testUser)

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(
          db,
          testUser,
          maliciousThing,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedThing.title)
            expect(res.body[0].content).to.eql(expectedThing.content)
          })
      })
    })
  })

  describe(`GET /api/things/:thing_id`, () => {
    context(`Given no things`, () => {
      beforeEach('insert users', async () => {
        await helpers.seedUsers(db, testUsers)
      })

      it(`responds with 404`, (done) => {
        const thingId = 123456

        done()

        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` })
      })
    })

    context('Given there are things in the database', () => {
      beforeEach('insert users, things, and reviews', async () => {
        await helpers.seedUsers(db, testUsers);
        await helpers.seedThings(db, testThings);
        await helpers.seedReviews(db, testReviews)
      })

      it('responds with 200 and the specified thing', (done) => {
        const thingId = 2
        const expectedThing = helpers.makeExpectedThing(
          testUsers,
          testThings[thingId - 1],
          testReviews,
        )

        done();

        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedThing)
      })
    })

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousThing,
        expectedThing,
      } = helpers.makeMaliciousThing(testUser)

      beforeEach('insert malicious thing', async () => {
        await helpers.seedMaliciousThing(
          db,
          testUser,
          maliciousThing,
        )
      })

      it('removes XSS attack content', (done) => {
        done()
        return supertest(app)
          .get(`/api/things/${maliciousThing.id}`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedThing.title)
            expect(res.body.content).to.eql(expectedThing.content)
          })
      })
    })
  })

  describe(`GET /api/things/:thing_id/reviews`, () => {
    context(`Given no things`, () => {
      beforeEach('insert users', async () =>
        await helpers.seedUsers(db, testUsers)
      )
      it(`responds with 404`, (done) => {
        const thingId = 123456
        done()
        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` })
      })
    })

    context('Given there are reviews for thing in the database', () => {
      beforeEach('insert users, things, and reviews', async () => {
        await helpers.seedUsers(db, testUsers);
        await helpers.seedThings(db, testThings);
        await helpers.seedReviews(db, testReviews);
      })

      it('responds with 200 and the specified reviews', (done) => {
        const thingId = 1
        const expectedReviews = helpers.makeExpectedThingReviews(
          testUsers, thingId, testReviews
        )

        done()

        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedReviews)
      })
    })
  })
})
