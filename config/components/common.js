'use strict'


const config = {
  authentication: {
    codeChallengeMethod: process.env.codeChallengeMethod || 'S256',
    value2: process.env.val2 || 'default'
  }
}

module.exports = config