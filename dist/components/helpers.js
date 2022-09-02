"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateSymbol = generateSymbol;
exports.makeApiRequest = makeApiRequest;
exports.parseFullSymbol = parseFullSymbol;

require("core-js/modules/es.promise.js");

require("core-js/modules/es.regexp.exec.js");

require("core-js/modules/es.string.match.js");

// Make requests to CryptoCompare API
async function makeApiRequest(path) {
  try {
    const response = await fetch("https://min-api.cryptocompare.com/".concat(path));
    return response.json();
  } catch (error) {
    throw new Error("CryptoCompare request error: ".concat(error.status));
  }
} // Generate a symbol ID from a pair of the coins


function generateSymbol(exchange, fromSymbol, toSymbol) {
  const short = "".concat(fromSymbol, "/").concat(toSymbol);
  return {
    short,
    full: "".concat(exchange, ":").concat(short)
  };
}

function parseFullSymbol(fullSymbol) {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);

  if (!match) {
    return null;
  }

  return {
    exchange: match[1],
    fromSymbol: match[2],
    toSymbol: match[3]
  };
}