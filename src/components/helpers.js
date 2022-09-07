// Make requests to CryptoCompare API
export async function makeApiRequest(path) {
  try {
    const response = await fetch(`https://api.binance.com/${path}`);
    return response.json();
  } catch (error) {
    throw new Error(`Binance request error: ${error.status}`);
  }
}

// Generate a symbol ID from a pair of the coins
export function generateSymbol(exchange, fromSymbol, toSymbol) {
  const short = `${fromSymbol}/${toSymbol}`;
  return {
    short,
    full: `${exchange}:${short}`,
  };
}

export function parseFullSymbol(fullSymbol) {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
  if (!match) {
    return null;
  }

  return {
    exchange: match[1],
    fromSymbol: match[2],
    toSymbol: match[3],
  };
}

export async function getAllSymbols(symbol) {
  let newSymbols = [];
  try {
    const data = await makeApiRequest(`api/v3/exchangeInfo?symbol=${symbol.toUpperCase()}`);
    data.symbols.forEach(item => {
      if (item.status === "TRADING") {
        newSymbols.push({
          symbol: item.symbol,
          full_name: `${item.baseAsset}/${item.quoteAsset}`,
          description: `Precision: ${item.quoteAssetPrecision}`,
          exchange: "Binance",
          ticker: item.symbol,
          type: "crypto",
        });
      }
    });
  } catch (e) {
    return newSymbols
  }
  return newSymbols;
}
