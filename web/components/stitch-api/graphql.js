const request = require('request-promise');

async function query(accessToken, graphqlQuery, vars = {})
{
    const body = {
      query: graphqlQuery,
      variables: JSON.stringify(vars)
    };
    const bodyString = Object.entries(body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const send = {
        method: 'POST',
        body: bodyString,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', "Authorization": `Bearer ${accessToken}`},
        uri: 'https://api.stitch.money/graphql'
    }
    try {
      // Wait for the result of waitAndMaybeReject() to settle,
      // and assign the fulfilled value to fulfilledValue:
      const response = await request(send);
      // If the result of waitAndMaybeReject() rejects, our code
      // throws, and we jump to the catch block.
      // Otherwise, this block continues to run:
      console.log("GraphQL response: ", response)
      return JSON.parse(response);
    } catch (e) {
      console.log(e);
      throw e;
    }
}

module.exports = query;