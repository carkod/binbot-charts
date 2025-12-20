// Exchange enum for type-safe exchange selection
export enum Exchange {
  BINANCE = "binance",
  KUCOIN = "kucoin",
}

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

import { makeApiRequest } from "./helpers";

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
      // KuCoin requires POST to bullet-public; use proxy via makeApiRequest
      try {
        const data = await makeApiRequest(
          "api/v1/bullet-public",
          "https://api.kucoin.com",
          { method: "POST" }
        );
        if (data.code === "200000" && data.data?.instanceServers?.length > 0) {
          const server = data.data.instanceServers[0];
          return `${server.endpoint}?token=${data.data.token}`;
        }
        throw new Error("Failed to get KuCoin WebSocket URL: Invalid response");
      } catch (error: any) {
        throw new Error(`Failed to get KuCoin WebSocket URL: ${error?.message || String(error)}`);
      }
    },
  },
};

export type ExchangeName = keyof typeof SUPPORTED_EXCHANGES;

// Export exchange name constants for use in other modules
export { EXCHANGE_BINANCE, EXCHANGE_KUCOIN };
