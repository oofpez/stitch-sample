const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
const stitchApi = require('./components/stitch-api/index');
const bat = require('./components/batcave/batmobiles');
const app = express();

const subscriptionTestUrl = "https://eo1th4zvfs09cqu.m.pipedream.net";
console.log("pipedream:", subscriptionTestUrl);

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
      return token;
    })
    .then(
      function(token) { return stitchApi.gql(token.access_token,stitchApi.userQueries.listBankAccounts);},
      function(error) { console.log(error);})
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
  try {
    if (expiry < Date.now()){
      await stitchApi.auth.refreshUserToken(latestUserToken.refresh_token).then(
        (token) => {
          latestUserToken = token;
          updateExpiry(token.expires_in);
          cost = bat.purchase(request.query.batmobile);
          response.render('confirm', {
            model: `Model: ${request.query.batmobile.toUpperCase()}`,
            price: `Price: ${cost}`});
        },
        (reason) => {
          console.log(error);
          response.render('error', {
            message: reason
          });
        });      
    } else {
      cost = bat.purchase(request.query.batmobile);
      response.render('confirm', {
        model: `Model: ${request.query.batmobile.toUpperCase()}`,
        price: `Price: ${cost}`});
    }
  }
  catch (err){
    response.render('error', {message: err});
  }
}) 

app.get('/auth-payment',(request,response) =>  {
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
})

app.get('/returnpayment', async  (request, response) => {
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
})

app.get('/auth-user',(request,response) =>  {
stitchApi.auth.authorizeUser()
  .then(
    (value) => {
      console.log(value);
     response.redirect(value);
    //response.render('clientAuth',{token: value});
  },(reason) => {
    console.log(reason);
    response.statusCode = 500;
    response.json(reason);
  }
);
})



app.listen(3000)
