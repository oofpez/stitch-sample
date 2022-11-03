const auth = require('./auth')
const gql = require('./graphql')
const userQueries = require('./queries/userQueries')
const clientQueries = require('./queries/clientQueries')

module.exports = { auth, gql, userQueries, clientQueries };