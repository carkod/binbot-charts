// Exchange name constants for consistency
const EXCHANGE_BINANCE = "Binance";
const EXCHANGE_KUCOIN = "KuCoin";

export interface ExchangeConfig {
  name: string;
  value: string;
  restApiUrl: string;
  wsUrl: string;
  // KuCoin requires dynamic WebSocket URL, so this can be a function
  getWsUrl?: () => Promise<string>;
}

export const SUPPORTED_EXCHANGES: Record<string, ExchangeConfig> = {
  binance: {
    name: EXCHANGE_BINANCE,
    value: EXCHANGE_BINANCE,
    restApiUrl: "https://api.binance.com",
    wsUrl: "wss://stream.binance.com:9443/ws",
  },
  kucoin: {
    name: EXCHANGE_KUCOIN,
    value: EXCHANGE_KUCOIN,
    restApiUrl: "https://api.kucoin.com",
    wsUrl: "", // Will be fetched dynamically
    getWsUrl: async () => {
      // KuCoin requires getting a token first
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch("https://api.kucoin.com/api/v1/bullet-public", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (data.code === "200000" && data.data?.instanceServers?.length > 0) {
          const server = data.data.instanceServers[0];
          return `${server.endpoint}?token=${data.data.token}`;
        }
        throw new Error("Failed to get KuCoin WebSocket URL: Invalid response");
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error("Failed to get KuCoin WebSocket URL: Request timeout");
        }
        throw new Error(`Failed to get KuCoin WebSocket URL: ${error.message}`);
      }
    },
  },
};

export type ExchangeName = keyof typeof SUPPORTED_EXCHANGES;

// Export exchange name constants for use in other modules
export { EXCHANGE_BINANCE, EXCHANGE_KUCOIN };
