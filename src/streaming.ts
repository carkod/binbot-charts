import { EXCHANGE_BINANCE, EXCHANGE_KUCOIN } from "./exchanges";

const channelToSubscription = new Map();
let pingInterval: number | null = null;
let reconnectTimeout: number | null = null;

declare global {
  interface Window { socket: WebSocket; }
}

interface StreamingConfig {
  wsUrl: string;
  exchange: string;
}

interface SubscriptionRequest {
  method?: string;
  params?: string[];
  id?: number;
  type?: string;
  topic?: string;
  privateChannel?: boolean;
  response?: boolean;
}

function setupSockets(subRequest: SubscriptionRequest, config: StreamingConfig) {
  const socket: WebSocket = new WebSocket(config.wsUrl);
  window.socket = socket;
  
  socket.onopen = (event) => {
    console.log("[socket] Connected");
    socket.send(JSON.stringify(subRequest));
    
    // Setup ping interval for KuCoin (every 20 seconds)
    if (config.exchange === EXCHANGE_KUCOIN) {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      pingInterval = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ id: Date.now(), type: "ping" }));
        }
      }, 20000);
    }
  };

  socket.onclose = (reason) => {
    console.log("[socket] Disconnected:", reason);
    
    // Clear ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    // Reconnect after 3 seconds if there are active subscriptions
    if (channelToSubscription.size > 0) {
      console.log("[socket] Reconnecting in 3 seconds...");
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      reconnectTimeout = window.setTimeout(() => {
        setupSockets(subRequest, config);
      }, 3000);
    }
  };

  socket.onerror = (error) => {
    console.log("[socket] Error:", error);
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    
    // Handle KuCoin pong response
    if (data.type === "pong") {
      return;
    }
    
    // Parse based on exchange
    if (config.exchange === EXCHANGE_BINANCE) {
      parseBinanceMessage(data);
    } else if (config.exchange === EXCHANGE_KUCOIN) {
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
  
  const candlesData = data.data.candles;
  if (!candlesData) {
    return;
  }
  
  // KuCoin candle format: single string "time,open,close,high,low,volume,turnover"
  // or array format depending on the endpoint
  let candleArray: string[];
  if (typeof candlesData === 'string') {
    candleArray = candlesData.split(',');
  } else if (Array.isArray(candlesData)) {
    // If it's already an array, use it directly
    candleArray = candlesData;
  } else {
    return;
  }
  
  // KuCoin candle format: [time, open, close, high, low, volume, turnover]
  const [timestamp, open, close, high, low, volume] = candleArray;
  
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
  exchange: string = EXCHANGE_BINANCE
) {
  const channelString = exchange === EXCHANGE_BINANCE 
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
    exchange, // Store exchange for unsubscribe
  };
  
  const subRequest = exchange === EXCHANGE_BINANCE
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
        
        // Use exchange-specific unsubscribe format
        const subRequest = subscriptionItem.exchange === EXCHANGE_BINANCE
          ? {
              method: "UNSUBSCRIBE",
              params: [channelString],
              id: 1,
            }
          : {
              id: Date.now(),
              type: "unsubscribe",
              topic: channelString,
              privateChannel: false,
              response: true,
            };
        
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
          window.socket.send(JSON.stringify(subRequest));
        }
        channelToSubscription.delete(channelString);
        
        // Clear intervals and close socket if no more subscriptions
        if (channelToSubscription.size === 0) {
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          if (window.socket) {
            window.socket.close();
            window.socket = undefined;
          }
        }
        break;
      }
    }
  }
}
