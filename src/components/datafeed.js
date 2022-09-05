import { makeApiRequest, parseFullSymbol, getAllSymbols } from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const exchange = "Binance";
const lastBarsCache = new Map();
const getConfigurationData = async () => {
  return {
    supports_marks: true,
    supports_time: true,
    supports_timescale_marks: true,
    selected_resolution: "m",
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
};

export default class Datafeed {
  constructor(apiKey, timescaleMarks = [], lineOrders = []) {
    this.timescaleMarks = timescaleMarks;
    this.lineOrders = lineOrders;
    this.apiKey = apiKey;
  }
  onReady = async (callback) => {
    this.configurationData = await getConfigurationData(this.apiKey);
    callback(this.configurationData);
  };

  searchSymbols = async (
    userInput,
    exchange,
    symbolType,
    onResultReadyCallback
  ) => {
    console.log("[searchSymbols]: Method call");
    const symbols = await getAllSymbols(exchange);
    const newSymbols = symbols.filter((symbol) => {
      const isExchangeValid = exchange === "" || symbol.exchange === exchange;
      const isFullSymbolContainsInput =
        symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
      return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
  };

  resolveSymbol = async (
    symbolName,
    onSymbolResolvedCallback,
    onResolveErrorCallback
  ) => {
    const symbols = await getAllSymbols(exchange);
    const symbolItem = symbols.find(
      ({ full_name }) => full_name === symbolName
    );
    if (!symbolItem) {
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
      has_intraday: true,
      has_no_volume: false,
      has_weekly_and_monthly: false,
      volume_precision: 4,
      data_status: "streaming",
    };

    onSymbolResolvedCallback(symbolInfo);
  };

  getBars = async (
    symbolInfo,
    resolution,
    periodParams,
    onHistoryCallback,
    onErrorCallback
  ) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log("[getBars]: Method call");
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

  getTimescaleMarks(symbolInfo, from, to, onDataCallback, resolution) {
    if (this.timescaleMarks.length > 0) {
      let timescaleMarks = [];
      this.timescaleMarks.forEach((mark) => {
        let time = new Date(mark.time * 1000);
        time.setHours(1, 0, 0, 0);
        const roundFloor = time.getTime() / 1000;
        mark.time = roundFloor;
        timescaleMarks.push(mark);
      });
      onDataCallback(timescaleMarks);
    }
  }

  subscribeBars = (
		symbolInfo,
		resolution,
		onRealtimeCallback,
		subscribeUID,
		onResetCacheNeededCallback,
	) => {
		console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID);
		subscribeOnStream(
			symbolInfo,
			resolution,
			onRealtimeCallback,
			subscribeUID,
			onResetCacheNeededCallback,
			lastBarsCache.get(symbolInfo.full_name),
		);
	}


  unsubscribeBars = (subscriberUID) => {
		console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
		unsubscribeFromStream(subscriberUID);
	}
}
