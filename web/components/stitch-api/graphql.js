function queryStitchApi(accessToken, graphqlQuery, variables) {

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${accessToken}`);
  
    var graphql = JSON.stringify({
      query: graphqlQuery,// "query ListBankAccounts { user { bankAccounts { user { bankAccounts { name }}}}}",
      variables: {}
    })
  
    var requestOptions = {
      credentials: 'include',
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      mode: 'cors'
    };
  
    return fetch('https://api.stitch.money/graphql', requestOptions);
  }

  module.exports = queryStitchApi;