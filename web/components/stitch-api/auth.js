const request = require('request-promise');
const config = require('../../../config/index');
const crypto = require('crypto');
const verifier = require('./verifier');

const CSRFstate = verifier.generateRandomStateOrNonce();
console.log("State:", CSRFstate);
const pkce = verifier.generateVerifierChallengePair();

const clientScopes = [
        "client_paymentrequest",
        "client_imageupload",
        "client_paymentauthorizationrequest",
        "client_refund",
        "client_disbursement"
    ];

function buildAuthorizationUrl(clientId, challenge, redirectUri, state, nonce, scopes) {
    const search = {
            client_id: clientId,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            redirect_uri: redirectUri,
            scope: scopes.join(' '),
            response_type: 'code',
            nonce: nonce,
            state: state
    };
    const searchString = Object.entries(search).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return `https://secure.stitch.money/connect/authorize?${searchString}`;
}

async function authorizeUser()
{
    return buildAuthorizationUrl(
        config.client.id,
        pkce.code_challenge,
        "http://localhost:3000/return",
        CSRFstate,
        verifier.generateRandomStateOrNonce(),
        config.client.allowedScopes
    );
}

async function fetchClientToken()
{
    const body = {
        client_id: config.client.id,
        client_secret: config.secret.value,
        scope: clientScopes.join(" "),
        grant_type: "client_credentials",
        audience: "https://secure.stitch.money/connect/token"
    }

    const bodyString = Object.entries(body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const send = {
        method: 'POST',
        body: bodyString,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        uri: 'https://secure.stitch.money/connect/token'
    }

    const result = await request(send)
    .then(function (response) {
        return JSON.parse(response);
    })
    .catch(function (err) {
        console.log(err);
        // Something bad happened, handle the error (Todo)
        return null;
    })
    return result;
}

async function fetchUserToken(authCode)
{
    const body = {
        client_id: config.client.id,
        code: authCode,
        redirect_uri: 'http://localhost:3000/return',
        grant_type: "authorization_code",
        code_verifier: pkce.code_verifier,
        client_secret: config.secret.value
    }

    const bodyString = Object.entries(body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const send = {
        method: 'POST',
        body: bodyString,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        uri: 'https://secure.stitch.money/connect/token'
    }

    const result = await request(send)
    .then(function (response) {
        console.log('Token: ',  response);
        return JSON.parse(response);
    })
    .catch(function (err) {
        console.error(err);
        // Something bad happened, handle the error (Todo)
        throw err;
    })
    return result;
}

async function refreshUserToken(refresh){
    const body = {
        grant_type: "refresh_token",
        client_id: config.client.id,
        refreshToken: refresh,
        client_secret: config.secret.value
    }

    const bodyString = Object.entries(body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const send = {
        method: 'POST',
        body: bodyString,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        uri: 'https://secure.stitch.money/connect/token'
    }

    const result = await request(send)
    .then(function (response) {
        console.log('Token: ',  response);
        return JSON.parse(response);
    })
    .catch(function (err) {
        console.error(err);
        // Something bad happened, handle the error (Todo)
        throw err;
    })
    return result;
}


function fetchAccountData(){

}

//module.exports = authenticateClient;
module.exports = {fetchClientToken, authorizeUser,fetchUserToken} ;
