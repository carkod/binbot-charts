const channelToSubscription = new Map();

declare global {
  interface Window { socket: WebSocket; }
}

interface StreamingConfig {
  wsUrl: string;
  exchange: string;
}

function setupSockets(subRequest, config: StreamingConfig) {
  const socket: WebSocket = new WebSocket(config.wsUrl);
  window.socket = socket;
  socket.onopen = (event) => {
    console.log("[socket] Connected");
    socket.send(JSON.stringify(subRequest));
  };

  socket.onclose = (reason) => {
    console.log("[socket] Disconnected:", reason);
  };

  socket.onerror = (error) => {
    console.log("[socket] Error:", error);
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    
    // Parse based on exchange
    if (config.exchange === "Binance") {
      parseBinanceMessage(data);
    } else if (config.exchange === "KuCoin") {
      parseKuCoinMessage(data);
    }
  };
}

function parseBinanceMessage(data: any) {
  if (data.e == undefined) {
    // skip all non-TRADE events
    return;
  }
  const {
    s: symbol,
    t: startTime,
    T: closeTime,
    i: interval,
    o: open,
    c: close,
    h: high,
    l: low,
    v: volume,
    n: trades,
    q: quoteVolume,
  } = data.k;

  const channelString = `${symbol.toLowerCase()}@kline_${interval}`;
  const subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem === undefined) {
    return;
  }
  const bar = {
    time: startTime,
    open: open,
    high: high,
    low: low,
    close: close,
    volume: volume,
  };
  // send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
}

function parseKuCoinMessage(data: any) {
  // KuCoin WebSocket message structure
  if (data.type !== "message" || !data.data) {
    return;
  }
  
  const candle = data.data.candles;
  if (!candle) {
    return;
  }
  
  // KuCoin candle format: [timestamp, open, close, high, low, volume, turnover]
  const [timestamp, open, close, high, low, volume] = candle;
  
  const channelString = data.topic; // KuCoin uses topic for channel identification
  const subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem === undefined) {
    return;
  }
  
  const bar = {
    time: parseInt(timestamp) * 1000, // KuCoin uses seconds, convert to milliseconds
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume),
  };
  
  // send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
}

export function subscribeOnStream(
  symbolInfo,
  resolution,
  onRealtimeCallback,
  subscribeUID,
  onResetCacheNeededCallback,
  interval,
  wsUrl: string,
  exchange: string = "Binance"
) {
  const channelString = exchange === "Binance" 
    ? `${symbolInfo.name.toLowerCase()}@kline_${interval}`
    : `/market/candles:${symbolInfo.name}_${interval}`; // KuCoin format
  
  const handler = {
    id: subscribeUID,
    callback: onRealtimeCallback,
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
    handlers: [handler],
  };
  
  const subRequest = exchange === "Binance"
    ? {
        method: "SUBSCRIBE",
        params: [channelString],
        id: 1,
      }
    : {
        id: Date.now(),
        type: "subscribe",
        topic: channelString,
        privateChannel: false,
        response: true,
      };
  
  channelToSubscription.set(channelString, subscriptionItem);
  setupSockets(subRequest, { wsUrl, exchange });
}

export function unsubscribeFromStream(subscriberUID) {
  // find a subscription with id === subscriberUID
  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString);
    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler) => handler.id === subscriberUID
    );

    if (handlerIndex !== -1) {
      // remove from handlers
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        // unsubscribe from the channel, if it was the last handler
        console.log(
          "[unsubscribeBars]: Unsubscribe from streaming. Channel:",
          channelString
        );
        const subRequest = {
          method: "UNSUBSCRIBE",
          params: [channelString],
          id: 1,
        };
        window.socket.send(JSON.stringify(subRequest));
        channelToSubscription.delete(channelString);
        window.socket = undefined;
        break;
      }
    }
  }
}
