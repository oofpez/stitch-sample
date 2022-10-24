const path = require('path')
const express = require('express')
const exphbs = require('express-handlebars')
require('./components/stitch-api/index')
const app = express()

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

app.listen(3000)