"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/web.dom-collections.iterator.js");

require("core-js/modules/es.promise.js");

require("core-js/modules/es.symbol.description.js");

var _helpers = require("./helpers.js");

var _streaming = require("./streaming.js");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const lastBarsCache = new Map();
const exchange = "Binance";
const configurationData = {
  supported_resolutions: ["1D", "1W", "1M"],
  exchanges: [{
    value: "Binance",
    name: "Binance",
    desc: "Binance"
  }],
  symbols_types: [{
    name: "crypto",
    // `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
    value: "crypto"
  } // ...
  ]
};

async function getAllSymbols() {
  const data = await (0, _helpers.makeApiRequest)("data/v3/all/exchanges");
  let allSymbols = [];
  const pairs = data.Data[exchange].pairs;

  for (const leftPairPart of Object.keys(pairs)) {
    const symbols = pairs[leftPairPart].map(rightPairPart => {
      const symbol = (0, _helpers.generateSymbol)(exchange, leftPairPart, rightPairPart);
      return {
        symbol: symbol.short,
        full_name: symbol.full,
        description: symbol.short,
        exchange: exchange,
        type: "crypto"
      };
    });
    allSymbols = [...allSymbols, ...symbols];
  }

  return allSymbols;
}

class Datafeed {}

exports.default = Datafeed;

_defineProperty(Datafeed, "onReady", callback => {
  console.log("[onReady]: Method call");
  setTimeout(() => callback(configurationData));
});

_defineProperty(Datafeed, "searchSymbols", async (userInput, exchange, symbolType, onResultReadyCallback) => {
  console.log("[searchSymbols]: Method call");
  const symbols = await getAllSymbols();
  const newSymbols = symbols.filter(symbol => {
    const isExchangeValid = exchange === "" || symbol.exchange === exchange;
    const isFullSymbolContainsInput = symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
    return isExchangeValid && isFullSymbolContainsInput;
  });
  onResultReadyCallback(newSymbols);
});

_defineProperty(Datafeed, "resolveSymbol", async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
  console.log("[resolveSymbol]: Method call", symbolName);
  const symbols = await getAllSymbols();
  const symbolItem = symbols.find(_ref => {
    let {
      full_name
    } = _ref;
    return full_name === symbolName;
  });

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
    data_status: "streaming"
  };
  console.log("[resolveSymbol]: Symbol resolved", symbolName);
  onSymbolResolvedCallback(symbolInfo);
});

_defineProperty(Datafeed, "getBars", async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
  const {
    from,
    to,
    firstDataRequest
  } = periodParams;
  console.log("[getBars]: Method call", symbolInfo, resolution, from, to);
  const parsedSymbol = (0, _helpers.parseFullSymbol)(symbolInfo.full_name);
  const urlParameters = {
    e: parsedSymbol.exchange,
    fsym: parsedSymbol.fromSymbol,
    tsym: parsedSymbol.toSymbol,
    toTs: to,
    limit: 2000
  };
  const query = Object.keys(urlParameters).map(name => "".concat(name, "=").concat(encodeURIComponent(urlParameters[name]))).join("&");

  try {
    const data = await (0, _helpers.makeApiRequest)("data/histoday?".concat(query));

    if (data.Response && data.Response === "Error" || data.Data.length === 0) {
      // "noData" should be set if there is no data in the requested period.
      onHistoryCallback([], {
        noData: true
      });
      return;
    }

    let bars = [];
    data.Data.forEach(bar => {
      if (bar.time >= from && bar.time < to) {
        bars = [...bars, {
          time: bar.time * 1000,
          low: bar.low,
          high: bar.high,
          open: bar.open,
          close: bar.close
        }];
      }
    });

    if (firstDataRequest) {
      lastBarsCache.set(symbolInfo.full_name, _objectSpread({}, bars[bars.length - 1]));
    }

    console.log("[getBars]: returned ".concat(bars.length, " bar(s)"));
    onHistoryCallback(bars, {
      noData: false
    });
  } catch (error) {
    console.log("[getBars]: Get error", error);
    onErrorCallback(error);
  }
});

_defineProperty(Datafeed, "subscribeBars", (symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) => {
  console.log("[subscribeBars]: Method call with subscribeUID:", subscribeUID);
  (0, _streaming.subscribeOnStream)(symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback, lastBarsCache.get(symbolInfo.full_name));
});

_defineProperty(Datafeed, "unsubscribeBars", subscriberUID => {
  console.log("[unsubscribeBars]: Method call with subscriberUID:", subscriberUID);
  (0, _streaming.unsubscribeFromStream)(subscriberUID);
});