import { makeApiRequest } from "./helpers";

const KUCOIN_FUTURES_API = "https://api-futures.kucoin.com";

export type NormalizedCandle = [
  number, // time in ms
  number, // open
  number, // high
  number, // low
  number, // close
  number, // volume
];

export interface ExchangeAdapter {
  fetchSymbolMeta(
    symbol: string,
    apiHost: string,
  ): Promise<{ priceScale: number }>;
  fetchBars(
    params: {
      symbol: string;
      interval: string; // e.g., 1m,5m,1h,1d
      from: number; // seconds
      to: number; // seconds
    },
    apiHost: string,
  ): Promise<NormalizedCandle[]>;
  fetchServerTime(apiHost: string): Promise<number>; // seconds
}

/**
 * Check if a KuCoin symbol is a futures contract (ends with "M", e.g. XBTUSDTM)
 */
export function isKucoinFutures(symbol: string): boolean {
  return symbol.endsWith("M");
}

function mapKuCoinInterval(interval: string): string {
  if (interval.endsWith("m")) return interval.replace("m", "min");
  if (interval.endsWith("h")) return interval.replace("h", "hour");
  if (interval.endsWith("d")) return interval.replace("d", "day");
  return interval;
}

/**
 * Map interval string to KuCoin Futures granularity (in minutes).
 * Supported: 1, 5, 15, 30, 60, 120, 240, 480, 720, 1440, 10080
 */
export function mapKuCoinFuturesGranularity(interval: string): number {
  const match = interval.match(/^(\d+)([mhdw])$/);
  if (!match) return 60;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "m":
      return value;
    case "h":
      return value * 60;
    case "d":
      return value * 1440;
    case "w":
      return value * 10080;
    default:
      return 60;
  }
}

const binanceAdapter: ExchangeAdapter = {
  async fetchSymbolMeta(symbol, apiHost) {
    const info = await makeApiRequest(
      `api/v3/exchangeInfo?symbol=${symbol}`,
      apiHost,
    );
    // Use quotePrecision (price precision) instead of baseAssetPrecision
    const priceScale = Number(info.symbols?.[0]?.quotePrecision) || 8;
    return { priceScale };
  },
  async fetchBars({ symbol, interval, from, to }, apiHost) {
    const params = new URLSearchParams({
      symbol,
      interval,
      startTime: String(Math.abs(from * 1000)),
      endTime: String(Math.abs(to * 1000)),
      limit: String(600),
    });
    const data = await makeApiRequest(
      `api/v3/uiKlines?${params.toString()}`,
      apiHost,
    );
    const candles: NormalizedCandle[] = Array.isArray(data)
      ? data.map((bar: any) => [
          Number(bar[0]),
          Number(bar[1]),
          Number(bar[2]),
          Number(bar[3]),
          Number(bar[4]),
          Number(bar[5]),
        ])
      : [];
    candles.sort((a, b) => a[0] - b[0]);
    return candles;
  },
  async fetchServerTime(apiHost) {
    const data = await makeApiRequest(`api/v3/time`, apiHost);
    return Number(data.serverTime) / 1000;
  },
};

const kucoinAdapter: ExchangeAdapter = {
  async fetchSymbolMeta(symbol, apiHost) {
    if (isKucoinFutures(symbol)) {
      // KuCoin Futures: GET /api/v1/contracts/{symbol}
      const info = await makeApiRequest(
        `api/v1/contracts/${symbol}`,
        KUCOIN_FUTURES_API,
      );
      let priceScale = 8;
      if (info?.data?.tickSize) {
        const tickStr = String(info.data.tickSize);
        const dot = tickStr.indexOf(".");
        priceScale = dot >= 0 ? Math.max(0, tickStr.length - dot - 1) : 0;
      }
      return { priceScale };
    }

    // KuCoin Spot
    const info = await makeApiRequest(
      `api/v1/symbols?symbol=${symbol}`,
      apiHost,
    );
    let priceScale = 8;
    if (info?.data && info.data.length > 0) {
      // Use priceIncrement (price precision) instead of baseIncrement
      const incRaw = info.data[0].priceIncrement;
      const incStr =
        typeof incRaw === "number" ? incRaw.toString() : String(incRaw || "");
      const dot = incStr.indexOf(".");
      priceScale = dot >= 0 ? Math.max(0, incStr.length - dot - 1) : 0;
    }
    return { priceScale };
  },
  async fetchBars({ symbol, interval, from, to }, apiHost) {
    if (isKucoinFutures(symbol)) {
      // KuCoin Futures: GET /api/v1/kline/query
      // granularity is in minutes: 1,5,15,30,60,120,240,480,720,1440,10080
      const granularity = mapKuCoinFuturesGranularity(interval);
      const params = new URLSearchParams({
        symbol,
        granularity: String(granularity),
        from: String(from * 1000), // futures expects milliseconds
        to: String(to * 1000),
      });
      const resp = await makeApiRequest(
        `api/v1/kline/query?${params.toString()}`,
        KUCOIN_FUTURES_API,
      );
      const raw = Array.isArray(resp?.data) ? resp.data : [];
      // Futures candle format: [time(ms), open, high, low, close, volume]
      const candles: NormalizedCandle[] = raw.map((bar: any) => [
        Number(bar[0]), // time already in ms
        Number(bar[1]), // open
        Number(bar[2]), // high
        Number(bar[3]), // low
        Number(bar[4]), // close
        Number(bar[5]), // volume
      ]);
      candles.sort((a, b) => a[0] - b[0]);
      return candles;
    }

    // KuCoin Spot
    const type = mapKuCoinInterval(interval);
    const params = new URLSearchParams({
      symbol,
      type,
      startAt: String(from),
      endAt: String(to),
    });
    const resp = await makeApiRequest(
      `api/v1/market/candles?${params.toString()}`,
      apiHost,
    );
    const raw = Array.isArray(resp?.data) ? resp.data : [];
    // Spot candle format: [time(s), open, close, high, low, volume, turnover]
    const candles: NormalizedCandle[] = raw.map((bar: any) => [
      Number(bar[0]) * 1000,
      Number(bar[1]),
      Number(bar[3]), // high
      Number(bar[4]), // low
      Number(bar[2]), // close
      Number(bar[5]), // volume
    ]);
    candles.sort((a, b) => a[0] - b[0]);
    return candles;
  },
  async fetchServerTime(apiHost) {
    const data = await makeApiRequest(`api/v1/timestamp`, apiHost);
    return Number(data.data) / 1000;
  },
};

export function getExchangeAdapter(exchangeName: string): ExchangeAdapter {
  const name = exchangeName?.toLowerCase();
  if (name === "kucoin") return kucoinAdapter;
  return binanceAdapter;
}
