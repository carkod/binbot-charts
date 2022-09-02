import { makeApiRequest, generateSymbol, parseFullSymbol } from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const lastBarsCache = new Map();
const exchange = "Binance";
const configurationData = {
  supported_resolutions: ["1D", "1W", "1M"],
  exchanges: [
    {
      value: "Binance",
      name: "Binance",
      desc: "Binance",
    },
  ],
  symbols_types: [
    {
      name: "crypto",
      value: "crypto",
    },
  ],
};

async function getAllSymbols() {
  const data = await makeApiRequest("data/v3/all/exchanges");
  let allSymbols = [];

  const pairs = data.Data[exchange].pairs;
  for (const leftPairPart of Object.keys(pairs)) {
    const symbols = pairs[leftPairPart].map((rightPairPart) => {
      const symbol = generateSymbol(
        exchange,
        leftPairPart,
        rightPairPart
      );
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

export default class Datafeed {
  static onReady = (callback) => {
    debugger;
    console.log("[onReady]: Method call");
    setTimeout(() => callback(configurationData));
  };

  static searchSymbols = async (
    userInput,
    exchange,
    symbolType,
    onResultReadyCallback
  ) => {
    console.log("[searchSymbols]: Method call");
    const symbols = await getAllSymbols();
    const newSymbols = symbols.filter((symbol) => {
      const isExchangeValid = exchange === "" || symbol.exchange === exchange;
      const isFullSymbolContainsInput =
        symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
      return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
  };

  static resolveSymbol = async (
    symbolName,
    onSymbolResolvedCallback,
    onResolveErrorCallback
  ) => {
    console.log("[resolveSymbol]: Method call", symbolName);
    const symbols = await getAllSymbols();
    const symbolItem = symbols.find(
      ({ full_name }) => full_name === symbolName
    );
    if (!symbolItem) {
      console.log("[resolveSymbol]: Cannot resolve symbol", symbolName);
      onResolveErrorCallback("cannot resolve symbol");
      return;
    }
    const symbolInfo = {
      ticker: symbolItem.full_name,
      name: symbolItem.symbol,
      description: symbolItem.description,
      type: symbolItem.type,
      session: "24x7",
      timezone: "Etc/UTC",
      exchange: symbolItem.exchange,
      minmov: 1,
      pricescale: 100,
      has_intraday: false,
      has_no_volume: true,
      has_weekly_and_monthly: false,
      supported_resolutions: ["1D", "1W", "1M"],
      volume_precision: 2,
      data_status: "streaming",
    };

    console.log("[resolveSymbol]: Symbol resolved", symbolName);
    onSymbolResolvedCallback(symbolInfo);
  };

  static getBars = async (
    symbolInfo,
    resolution,
    periodParams,
    onHistoryCallback,
    onErrorCallback
  ) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log("[getBars]: Method call", symbolInfo, resolution, from, to);
    const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    const urlParameters = {
      e: parsedSymbol.exchange,
      fsym: parsedSymbol.fromSymbol,
      tsym: parsedSymbol.toSymbol,
      toTs: to,
      limit: 2000,
    };
    const query = Object.keys(urlParameters)
      .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
      .join("&");
    try {
      const data = await makeApiRequest(`data/histoday?${query}`);
      if (
        (data.Response && data.Response === "Error") ||
        data.Data.length === 0
      ) {
        // "noData" should be set if there is no data in the requested period.
        onHistoryCallback([], {
          noData: true,
        });
        return;
      }
      let bars = [];
      data.Data.forEach((bar) => {
        if (bar.time >= from && bar.time < to) {
          bars = [
            ...bars,
            {
              time: bar.time * 1000,
              low: bar.low,
              high: bar.high,
              open: bar.open,
              close: bar.close,
            },
          ];
        }
      });
      if (firstDataRequest) {
        lastBarsCache.set(symbolInfo.full_name, {
          ...bars[bars.length - 1],
        });
      }
      console.log(`[getBars]: returned ${bars.length} bar(s)`);
      onHistoryCallback(bars, {
        noData: false,
      });
    } catch (error) {
      console.log("[getBars]: Get error", error);
      onErrorCallback(error);
    }
  };

  // static subscribeBars = (
  //   symbolInfo,
  //   resolution,
  //   onRealtimeCallback,
  //   subscribeUID,
  //   onResetCacheNeededCallback
  // ) => {
  //   console.log(
  //     "[subscribeBars]: Method call with subscribeUID:",
  //     subscribeUID
  //   );
  //   subscribeOnStream(
  //     symbolInfo,
  //     resolution,
  //     onRealtimeCallback,
  //     subscribeUID,
  //     onResetCacheNeededCallback,
  //     lastBarsCache.get(symbolInfo.full_name)
  //   );
  // };

  // static unsubscribeBars = (subscriberUID) => {
  //   console.log(
  //     "[unsubscribeBars]: Method call with subscriberUID:",
  //     subscriberUID
  //   );
  //   unsubscribeFromStream(subscriberUID);
  // };
}
