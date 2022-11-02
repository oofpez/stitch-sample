const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
var stitchApi = require('./components/stitch-api/auth');
const batmobiles = require('./components/batcave/batmobiles');
const app = express();

let latestUserToken = null;

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
  let token = await stitchApi.fetchUserToken(request.query.code).then(
    (value) => {
      latestToken = value;
      response.render('return', {
        message: "You have succesfully authenticated. please choose a batmobile to purchase."
      });
    //response.render('clientAuth',{token: value});
  },(reason) => {
    response.render('error', {
      message: reason
    });
  }
);
}) 

app.get('/purchase',async (request,response) => {
  let cost = batmobiles[request.query.batmobile];
  console.log("about to purchase a new batmobile for: R", cost);
  response.render('purchased');
}) 


app.post('/auth',(request,response) =>  {
stitchApi.fetchClientToken()
  .then((value) => {
    console.log(value);
    response.json(value);
    //response.render('clientAuth',{token: value});
  }
);
})

app.get('/auth-user',(request,response) =>  {
stitchApi.authorizeUser()
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
