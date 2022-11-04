const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
const stitchApi = require('./components/stitch-api/index');
const bat = require('./components/batcave/batmobiles');
const app = express();

const subscriptionTestUrl = "https://eo1th4zvfs09cqu.m.pipedream.net";
console.log("pipedream:", subscriptionTestUrl);

//Stateful objects used to maintain client tokens, payment ids, etc.
//Ideally these are passed as parameters between pages or stored in a user's session rather than the nodejs server.
let latestUserToken = null;
let latestClientToken = null;
let latestPayment = null;
let expiry = new Date();
let cost = 1;

function updateExpiry(seconds){
  expiry = new Date();
  expiry.setTime(expiry.getTime() + seconds * 1000);
}


app.engine('.hbs', exphbs.engine({
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, 'views'))


app.get('/', (request, response) => {
  response.render('home', {
    name: 'Bruce Wayne'
  })
})

app.get('/return',async (request,response) => {
  await stitchApi.auth.fetchUserToken(request.query.code)
  .then(
    async (token) => {
      latestUserToken = token;
      updateExpiry(token.expires_in);     
      //This flow will never be hit because the token cannot expire after we just received it - it's just an exercise to
      // test how refreshing tokens work. to enable, mark the if clause as if (true);
      if (expiry < Date.now() && latestUserToken.refresh_token)
      {
        //Flow not properly tested.
        const newToken = await stitchApi.auth.refreshUserToken(latestUserToken.refresh_token);
        latestUserToken = newToken;
        updateExpiry(newToken.expires_in);
         
      } 
      return token;
    })
    .then(
      function(token) { return stitchApi.gql(token.access_token,stitchApi.userQueries.listBankAccounts);},
      function(error) { console.log(error); throw error;})
    .then(
      (accountsResponse) => {
        response.render('return', 
        {
        message: "You have succesfully authenticated. please choose a batmobile to purchase.",
        accounts: accountsResponse.data.user.bankAccounts
      })})
      ,(reason) => { //error
        response.render('error', {
          message: reason
        });
      }
});     

app.get('/purchase',async (request,response) => {
      cost = bat.priceCheck(request.query.batmobile);
      response.render('confirm', {
        model: `Model: ${request.query.batmobile.toUpperCase()}`,
        price: `Price: ${cost}`});
});

app.get('/refund',async (_,response) => {   
    //subscribe refund changes to webhook (fire and forget)
    const subscriptionDetails = stitchApi.clientQueries.refundSubscription(subscriptionTestUrl);
    stitchApi.gql(latestClientToken.access_token, subscriptionDetails.query, subscriptionDetails.variables);
    //initiate the refund
    const refundDetails = stitchApi.clientQueries.createRefundPlaceholder(cost,latestPayment)
    const refundResult = await stitchApi.gql(latestClientToken.access_token,refundDetails.query, refundDetails.variables);
    //TODO: display details about the refund if any are available.
    response.render('refund');
});

app.get('/auth-payment',(_,response) =>  {
stitchApi.auth.fetchClientToken()
  .then(
    (token) => {
      //save the token for this session to reuse.
      latestClientToken = token;     
      //subscribe payment changes to webhook (fire and forget)
      const subscriptionDetails = stitchApi.clientQueries.paymentSubscription(subscriptionTestUrl);
      stitchApi.gql(token.access_token, subscriptionDetails.query, subscriptionDetails.variables);
      //initiate the payment
      const paymentDetails = stitchApi.clientQueries.placeHolderPayment(cost);
      return stitchApi.gql(token.access_token,paymentDetails.query, paymentDetails.variables)
      //response.render('clientAuth',{token: value});
    },
    (reason) => {
      console.log(reason);
      response.render('error',{message: reason});
    })
  .then(
    (result) => {
      //If succesful, redirect to the stitch payment authorization interface.
      latestPayment = result.data.clientPaymentInitiationRequestCreate.paymentInitiationRequest.id;
      const redirectUrl = `${result.data.clientPaymentInitiationRequestCreate.paymentInitiationRequest.url}?redirect_uri=http://localhost:3000/returnpayment`;
      response.redirect(redirectUrl);
    },
    (reason) => {
      console.log(reason);
      response.render('error',{message: reason});
    }
  );
});

app.get('/link-payment', async (_,response) =>  {
  stitchApi.auth.fetchClientToken()
    .then(
      (token) => {
        //save the token for this session to reuse.
        latestClientToken = token;     
        //subscribe payment changes to webhook (fire and forget)
        const subscriptionDetails = stitchApi.clientQueries.paymentSubscription(subscriptionTestUrl);
        stitchApi.gql(token.access_token, subscriptionDetails.query, subscriptionDetails.variables);
        //initiate the payment
        const paymentDetails = stitchApi.userQueries.placeHolderPayment(cost);
        return stitchApi.gql(latestUserToken.access_token,paymentDetails.query, paymentDetails.variables)
        //response.render('clientAuth',{token: value});
      },
      (reason) => {
        console.log(reason);
        response.render('error',{message: reason});
      })
    .then(
      (result) => {
        if ( result.errors && result.errors.length > 0 && result.errors[0].extensions.code === 'USER_INTERACTION_REQUIRED') {
            //MFA required
            latestPayment = result.errors[0].extensions.id;
            const mfaUrl = result.errors[0].extensions.userInteractionUrl;    
            response.redirect(`${mfaUrl}?redirect_uri=http://localhost:3000/returnlinkpayment`); 
        } else {
          //TODO: test this flow;
          latestPayment = result.data.userInitiatePayment.paymentInitiation.id;
          response.redirect(`http://localhost:3000/returnlinkpayment?status=${result.data.userInitiatePayment.paymentInitiation.status.__typename}`)
        }
      },
      (reason) => {
        console.log(reason);
        response.render('error',{message: reason});
      }
    );

  
});

app.get('/returnpayment', async  (_, response) => {
  //todo
  const paymentStatus = stitchApi.clientQueries.paymentStatus(latestPayment);
  stitchApi.gql(latestClientToken.access_token, paymentStatus.query, paymentStatus.variables).then(
    (result) => {
      response.render('returnPayment', {paymentStatus: JSON.stringify(result.data || {})});
    },
    (reason) => {
      console.log(reason);
      response.render('error',{message: reason});
    }
  );
});

app.get('/returnlinkpayment', async  (request, response) => {
  //todo
  const status = request.query.status;
  response.render('returnPayment', {paymentStatus: status});
});

app.get('/auth-user',(request,response) =>  {
const url = stitchApi.auth.authorizeUser();
     response.redirect(url);
});

app.get('/link',async (request,response) =>  {
  await stitchApi.auth.fetchClientToken()
  .then(
    (token) => {
      //save the token for this session to reuse.
      latestClientToken = token;     
      return token;
    })
  .then(async (t) => await stitchApi.auth.createSamplePaymentAuthorization(t.access_token))
  .then(
    (value) => {
      console.log(value);
     const url = stitchApi.auth.authorizeUser(
      value.data.clientPaymentAuthorizationRequestCreate.authorizationRequestUrl,
      "http://localhost:3000/return"
      );
     response.redirect(url);
    //response.render('clientAuth',{token: value});
  },(reason) => {
    console.log(reason);
    response.statusCode = 500;
    response.json(reason);
  });
});

app.use(express.static(__dirname + '/public'));
app.listen(3000)
