import { useEffect, useRef } from "react";


function resolveApiBase(apiHost: string): string {
  // Always use the provided absolute base URL (no dev proxy rewrite)
  // Ensure no trailing slash
  return apiHost.replace(/\/$/, "");
}

export async function makeApiRequest(
  path: string,
  apiHost: string = "https://api.binance.com",
  init?: RequestInit
) {
  try {
    const base = resolveApiBase(apiHost);
    const url = `${base}/${path.replace(/^\//, "")}`;
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error: any) {
    throw new Error(`API request error: ${error?.message || String(error)}`);
  }
}

export async function getAllSymbols(symbol: string, apiHost: string = "https://api.binance.com", exchange: string = "Binance") {
  let newSymbols = [];
  try {
    const data = await makeApiRequest(`api/v3/exchangeInfo?symbol=${symbol.toUpperCase()}`, apiHost);
    data.symbols.forEach(item => {
      if (item.status === "TRADING") {
        newSymbols.push({
          symbol: item.symbol,
          full_name: `${item.baseAsset}/${item.quoteAsset}`,
          description: `Precision: ${item.quoteAssetPrecision}`,
          exchange: exchange,
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

export function roundTime(ts: number): number {
  /**
   * @param ts a JavaScript new Date().getTime() timestamp
   */
  let time = new Date(ts);
  time.setMinutes(0);
  time.setSeconds(0)
  time.setMilliseconds(0);
  const roundFloor = time.getTime();
  return roundFloor / 1000
}