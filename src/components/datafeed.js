import { makeApiRequest } from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const getConfigurationData = async () => {
  return {
    supports_marks: true,
    supports_time: true,
    supports_timescale_marks: true,
    supported_resolutions: [
      "1s",
      "1m",
      "3m",
      "5m",
      "15m",
      "30m",
      "1h",
      "2h",
      "4h",
      "6h",
      "8h",
      "12h",
      "1d",
      "3d",
      "1w",
      "1M",
    ],
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
  constructor(timescaleMarks = [], lineOrders = [], interval="1h") {
    this.timescaleMarks = timescaleMarks;
    this.lineOrders = lineOrders;
    this.streaming = null
    this.interval = interval
  }
  onReady = async (callback) => {
    this.configurationData = await getConfigurationData();
    callback(this.configurationData);
  };

  searchSymbols = async (
    userInput,
    exchange,
    symbolType,
    onResultReadyCallback
  ) => {
    console.log("[searchSymbols]: Method call");
    // const symbols = await getAllSymbols(exchange);
    // const newSymbols = symbols.filter((symbol) => {
    //   const isExchangeValid = exchange === "" || symbol.exchange === exchange;
    //   if (symbol.replace("/", "") === userInput) {

    //   }
    //   const isFullSymbolContainsInput =
    //     symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
    //   return isExchangeValid && isFullSymbolContainsInput;
    // });
    onResultReadyCallback(newSymbols);
  };

  resolveSymbol = async (
    symbolName,
    onSymbolResolvedCallback,
    onResolveErrorCallback
  ) => {
    // const symbols = await getAllSymbols(exchange);
    // const symbolItem = symbols.find(
    //   ({ full_name }) => full_name === symbolName
    // );
    // if (!symbolItem) {
    //   onResolveErrorCallback("cannot resolve symbol");
    //   return;
    // }
    const symbolInfo = {
      ticker: symbolName,
      name: symbolName,
      ticker: symbolName,
      description: symbolName,
      type: "crypto",
      session: "24x7",
      timezone: "Etc/UTC",
      exchange: "Binance",
      minmov: 100,
      pricescale: 100000,
      has_intraday: true,
      has_no_volume: false,
      volume: "hundreds",
      has_weekly_and_monthly: true,
      volume_precision: 9,
      data_status: "streaming",
      resolution: "1h"
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
    let urlParameters = {
      symbol: symbolInfo.name,
      interval: this.interval,
      startTime: (from * 1000),
      endTime: (to * 1000),
      limit: 600
    };

    const query = Object.keys(urlParameters)
      .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
      .join("&");
    try {
      const data = await makeApiRequest(`api/v3/uiKlines?${query}`);
      if ((data.Response && data.Response === "Error") || data.length === 0) {
        // "noData" should be set if there is no data in the requested period.
        onHistoryCallback([], {
          noData: true,
        });
        return;
      }
      let bars = [];
      data.forEach((bar) => {
        if (bar[0] >= (from * 1000) && bar[0] < (to * 1000)) {
          bars = [
            ...bars,
            {
              time: bar[0],
              low: bar[3],
              high: bar[2],
              open: bar[1],
              close: bar[4],
              volume: bar[5]
            },
          ];
        }
      });
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
    onResetCacheNeededCallback
  ) => {
    console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID);
    subscribeOnStream(
    	symbolInfo,
    	resolution,
    	onRealtimeCallback,
    	subscribeUID,
    	onResetCacheNeededCallback,
      this.interval
    );
  };

  unsubscribeBars = (subscriberUID) => {
    console.log(
      "[unsubscribeBars]: Method call with subscriberUID:",
      subscriberUID
    );
    unsubscribeFromStream(subscriberUID);
  };
}
