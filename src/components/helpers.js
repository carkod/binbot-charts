import { useEffect, useRef } from "react";


export async function makeApiRequest(path) {
  try {
    const response = await fetch(`https://api.binance.com/${path}`);
    return response.json();
  } catch (error) {
    throw new Error(`Binance request error: ${error.status}`);
  }
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

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
