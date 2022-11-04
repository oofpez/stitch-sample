# stitch-sample
sample integration with stitch. Batman uses stitch to faciliate payments between his alter-ego Bruce Wayne and himself to purchase fancy cars.

This project covers the basic functionality of a stitch API integration.

To use, run `npm start`  - it will be hosted on http://localhost:3000

The entrypoint is under web/index.js

most of the controller functionality sits there.

the pages are rendered as layouts with nodeJS express using handlebars to parse some parameters.
some redirects are required to authenticate with banking logins and MFAs.

The server is not stateless.
If you run into any issues you will likely have to restart the server, it breaks if you don't follow the prescribed flows or refresh some of the pages.

Refer to web/components/stitch-api for the graphql queries used.
some parts of the system including models & routers have not been implemented in favour of hackery...




