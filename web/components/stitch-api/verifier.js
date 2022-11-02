const crypto = require('crypto');
const pkceChallenge = require('pkce-challenge').default;

function generateVerifierChallengePair() {

  const pair = pkceChallenge();
  console.log('Verifier:', pair.code_verifier);
  console.log('Challenge:', pair.code_challenge);
  return pair;
}

function base64UrlEncode(byteArray) {
  const charCodes = String.fromCharCode(...byteArray);
  const buf = Buffer.from(charCodes);
  const result =  buf.toString('Base64')
  // (replace + with -, replace / with _, trim trailing =)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')
  return result;
}

function generateRandomStateOrNonce() {
  const randomBytes = crypto.webcrypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(randomBytes);
}

module.exports = {generateVerifierChallengePair, generateRandomStateOrNonce, generateRandomStateOrNonce}