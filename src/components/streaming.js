const channelToSubscription = new Map();

  const socket = new WebSocket("wss://stream.binance.com:9443/ws");
    socket.onopen = (event) => {
      console.log("[socket] Connected", event);
    };

    socket.onclose = (reason) => {
      console.log("[socket] Disconnected:", reason);
    };

    socket.onerror = (error) => {
      console.log("[socket] Error:", error);
    };

    socket.onmessage = (e) => {
      console.log("[socket] Message:", JSON.parse(e.data));
      const data = JSON.parse(e.data);
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
      console.log("[socket] Generate new bar", bar);
      // send data to every subscriber of that symbol
      subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
    };

  export function subscribeOnStream(
    symbolInfo,
    resolution,
    onRealtimeCallback,
    subscribeUID,
    onResetCacheNeededCallback,
	interval
  ) {
    const channelString = `${symbolInfo.name.toLowerCase()}@kline_${interval}`;
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
    const subRequest = {
      method: "SUBSCRIBE",
      params: [channelString],
      id: 1,
    };
    channelToSubscription.set(channelString, subscriptionItem);
    console.log(
      "[subscribeBars]: Subscribe to streaming. Channel:",
      channelString
    );
    socket.send(JSON.stringify(subRequest));
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
            id: 1
          };
          socket.send(JSON.stringify(subRequest));
          channelToSubscription.delete(channelString);
          break;
        }
      }
    }
  }

