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

export async function getAllSymbols(exchange) {
  const data = await makeApiRequest("data/v3/all/exchanges");
  let allSymbols = [];
  const pairs = data.Data[exchange].pairs;
  for (const leftPairPart of Object.keys(pairs)) {
    const symbols = pairs[leftPairPart].map((rightPairPart) => {
      const symbol = generateSymbol(exchange, leftPairPart, rightPairPart);
      return {
        symbol: symbol.short,
        full_name: symbol.full,
        description: symbol.short,
        exchange: exchange,
        type: "crypto",
      };
    });
    allSymbols = [...allSymbols, ...symbols];
  }
  return allSymbols;
}

export default function getNextDailyBarTime(barTime) {
  const date = new Date(barTime * 1000);
  date.setDate(date.getDate() + 1);
  return date.getTime() / 1000;
}