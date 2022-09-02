"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.subscribeOnStream = subscribeOnStream;
exports.unsubscribeFromStream = unsubscribeFromStream;

require("core-js/modules/web.dom-collections.iterator.js");

require("core-js/modules/es.regexp.exec.js");

require("core-js/modules/es.string.split.js");

require("core-js/modules/es.parse-int.js");

require("core-js/modules/es.parse-float.js");

var _helpers = require("./helpers.js");

var _socket = _interopRequireDefault(require("socket.io-client"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const socket = (0, _socket.default)("wss://streamer.cryptocompare.com");
const channelToSubscription = new Map();
socket.on("connect", () => {
  console.log("[socket] Connected");
});
socket.on("disconnect", reason => {
  console.log("[socket] Disconnected:", reason);
});
socket.on("error", error => {
  console.log("[socket] Error:", error);
});
socket.on("m", data => {
  console.log("[socket] Message:", data);
  const [eventTypeStr, exchange, fromSymbol, toSymbol,,, tradeTimeStr,, tradePriceStr] = data.split("~");

  if (parseInt(eventTypeStr) !== 0) {
    // skip all non-TRADE events
    return;
  }

  const tradePrice = parseFloat(tradePriceStr);
  const tradeTime = parseInt(tradeTimeStr);
  const channelString = "0~".concat(exchange, "~").concat(fromSymbol, "~").concat(toSymbol);
  const subscriptionItem = channelToSubscription.get(channelString);

  if (subscriptionItem === undefined) {
    return;
  }

  const lastDailyBar = subscriptionItem.lastDailyBar;
  const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time);
  let bar;

  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice
    };
    console.log("[socket] Generate new bar", bar);
  } else {
    bar = _objectSpread(_objectSpread({}, lastDailyBar), {}, {
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice
    });
    console.log("[socket] Update the latest bar by price", tradePrice);
  }

  subscriptionItem.lastDailyBar = bar; // send data to every subscriber of that symbol

  subscriptionItem.handlers.forEach(handler => handler.callback(bar));
});

function getNextDailyBarTime(barTime) {
  const date = new Date(barTime * 1000);
  date.setDate(date.getDate() + 1);
  return date.getTime() / 1000;
}

function subscribeOnStream(symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback, lastDailyBar) {
  const parsedSymbol = (0, _helpers.parseFullSymbol)(symbolInfo.full_name);
  const channelString = "0~".concat(parsedSymbol.exchange, "~").concat(parsedSymbol.fromSymbol, "~").concat(parsedSymbol.toSymbol);
  const handler = {
    id: subscribeUID,
    callback: onRealtimeCallback
  };
  let subscriptionItem = channelToSubscription.get(channelString);

  if (subscriptionItem) {
    // already subscribed to the channel, use the existing subscription
    subscriptionItem.handlers.push(handler);
    return;
  }

  subscriptionItem = {
    subscribeUID,
    resolution,
    lastDailyBar,
    handlers: [handler]
  };
  channelToSubscription.set(channelString, subscriptionItem);
  console.log("[subscribeBars]: Subscribe to streaming. Channel:", channelString);
  socket.emit("SubAdd", {
    subs: [channelString]
  });
}

function unsubscribeFromStream(subscriberUID) {
  // find a subscription with id === subscriberUID
  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString);
    const handlerIndex = subscriptionItem.handlers.findIndex(handler => handler.id === subscriberUID);

    if (handlerIndex !== -1) {
      // remove from handlers
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        // unsubscribe from the channel, if it was the last handler
        console.log("[unsubscribeBars]: Unsubscribe from streaming. Channel:", channelString);
        socket.emit("SubRemove", {
          subs: [channelString]
        });
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}