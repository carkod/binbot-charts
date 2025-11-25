import { getAllSymbols, makeApiRequest } from "./helpers";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming";
import { ExchangeConfig } from "./exchanges";

enum BinanceResolutions {
  one_second = "1s",
  one_minute = "1m",
  three_minute = "3m",
  five_minute = "5m",
  fifteen_minute = "15m",
  thirty_minute = "30m",
  one_hour = "1h",
  two_hour = "2h",
  four_hour = "4h",
  six_hour = "6h",
  eight_hour = "8h",
  twelve_hour = "12h",
  one_day = "1d",
  three_day = "3d",
  one_week = "1w",
  one_month = "1M",
}

interface ConfigurationData {
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
  supported_resolutions: string[];
  exchanges: { value: string; name: string; desc: string }[];
  symbols_types: { name: string; value: string }[];
}

const getConfigurationData = async (supportedExchanges: ExchangeConfig[]): Promise<ConfigurationData> => {
  return {
    supports_marks: true,
    supports_timescale_marks: true,
    supports_time: true,
    supported_resolutions: [
      "1S",
      "1",
      "3",
      "5",
      "15",
      "30",
      "60",
      "120",
      "240",
      "360",
      "480",
      "720",
      "1D",
      "3D",
      "1W",
      "12M",
    ],
    exchanges: supportedExchanges.map(exchange => ({
      value: exchange.value,
      name: exchange.name,
      desc: exchange.name,
    })),
    symbols_types: [
      {
        name: "crypto",
        value: "crypto",
      },
    ],
  };
};

interface TimescaleMark {
  id: string;
  time: number;
  color: string;
  label: string;
  tooltip: string;
}

interface SymbolInfo {
  name: string;
  ticker: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  minmov: number;
  pricescale: number;
  has_daily: boolean;
  has_intraday: boolean;
  has_no_volume: boolean;
  has_seconds: boolean;
  seconds_multipliers: number[];
  volume: string;
  volume_precision: number;
  data_status: string;
  resolution: string;
}

interface PeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
}

interface Bar {
  time: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

export default class Datafeed {
  private streaming: any;
  private timescaleMarks: TimescaleMark[];
  private interval: string;
  private configurationData: ConfigurationData | null = null;
  private exchangeConfig: ExchangeConfig;
  private supportedExchanges: ExchangeConfig[];

  constructor(
    timescaleMarks: TimescaleMark[] = [], 
    interval: string = "1h",
    exchangeConfig: ExchangeConfig,
    supportedExchanges: ExchangeConfig[] = []
  ) {
    this.streaming = null;
    this.timescaleMarks = timescaleMarks;
    this.interval = interval;
    this.exchangeConfig = exchangeConfig;
    this.supportedExchanges = supportedExchanges;
  }

  onReady = async (callback: (data: ConfigurationData) => void): Promise<void> => {
    this.configurationData = await getConfigurationData(this.supportedExchanges);
    callback(this.configurationData);
  };

  searchSymbols = async (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (symbols: any[]) => void
  ): Promise<void> => {
    const symbols = await getAllSymbols(
      userInput, 
      this.exchangeConfig.restApiUrl,
      this.exchangeConfig.name
    );
    onResultReadyCallback(symbols);
  };

  resolveSymbol = async (
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: SymbolInfo) => void,
    onResolveErrorCallback: (error: string) => void
  ): Promise<void> => {
    if (!symbolName) {
      await onResolveErrorCallback("cannot resolve symbol");
      return;
    }

    const symbolInfo = async (): Promise<SymbolInfo> => {

      const symbolData = await makeApiRequest(
        `api/v3/exchangeInfo?symbol=${symbolName}`,
        this.exchangeConfig.restApiUrl
      );
      const priceScale = symbolData.symbols[0].baseAssetPrecision;

      console.log("Symbol info:", 1 ** parseFloat(priceScale));

      return {
        name: symbolName,
        ticker: symbolName,
        description: symbolName,
        type: "crypto",
        session: "24x7",
        timezone: "Etc/UTC",
        exchange: this.exchangeConfig.name,
        minmov: 1,
        pricescale: 10 ** parseFloat(priceScale),
        has_daily: true,
        has_intraday: true,
        has_no_volume: false,
        has_seconds: true,
        seconds_multipliers: [1],
        volume: "hundreds",
        volume_precision: 9,
        data_status: "streaming",
        resolution: "1h",
      };
    };
    const symbol = await symbolInfo();
    onSymbolResolvedCallback(symbol);
  };

  getBars = async (
    symbolInfo: SymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: any) => void
  ): Promise<void> => {
    const { from, to, firstDataRequest } = periodParams;
    let interval = "60"; // 1 hour
    // Calculate interval using resolution data
    if (!/[a-zA-Z]$/.test(resolution)) {
      if (parseInt(resolution) >= 60) {
        interval = parseInt(resolution) / 60 + "h";
      } else {
        interval = resolution + "m";
      }
    } else {
      interval = resolution.toLowerCase().replace(/[a-z]\b/g, (c) => c.toLowerCase());
    }

    let urlParameters = {
      symbol: symbolInfo.name,
      interval: interval,
      startTime: Math.abs(from * 1000),
      endTime: Math.abs(to * 1000),
      limit: 600,
    };

    const query = Object.keys(urlParameters)
      .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
      .join("&");

    try {
      const data = await makeApiRequest(
        `api/v3/uiKlines?${query}`,
        this.exchangeConfig.restApiUrl
      );
      if ((data.Response && data.Response === "Error") || data.length === 0) {
        // "noData" should be set if there is no data in the requested period.
        onHistoryCallback([], {
          noData: true,
        });
        return;
      }
      let bars: Bar[] = [];
      data.forEach((bar: any) => {
        if (bar[0] >= from * 1000 && bar[0] < to * 1000) {
          bars = [
            ...bars,
            {
              time: bar[0],
              low: bar[3],
              high: bar[2],
              open: bar[1],
              close: bar[4],
              volume: bar[5],
            },
          ];
        }
      });
      onHistoryCallback(bars, {
        noData: false,
      });
    } catch (error) {
      console.log("[getBars]: Get error", error);
      onErrorCallback(error);
    }
  };

  getTimescaleMarks(
    symbolInfo: SymbolInfo,
    from: number,
    to: number,
    onDataCallback: (marks: TimescaleMark[]) => void,
    resolution: string
  ): void {
    if (this.timescaleMarks.length > 0) {
      let timescaleMarks = Object.assign([], this.timescaleMarks);
      onDataCallback(timescaleMarks);
    }
  }

  async getServerTime(onServertimeCallback: (time: number) => void): Promise<void> {
    const data = await makeApiRequest(`api/v3/time`, this.exchangeConfig.restApiUrl);
    const serverTime = data.serverTime / 1000;
    onServertimeCallback(serverTime);
  }

  subscribeBars = async (
    symbolInfo: SymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: Bar) => void,
    subscribeUID: string,
    onResetCacheNeededCallback: () => void
  ): Promise<void> => {
    // Get WebSocket URL (might be dynamic for KuCoin)
    let wsUrl = this.exchangeConfig.wsUrl;
    if (this.exchangeConfig.getWsUrl) {
      wsUrl = await this.exchangeConfig.getWsUrl();
    }
    
    subscribeOnStream(
      symbolInfo,
      resolution,
      onRealtimeCallback,
      subscribeUID,
      onResetCacheNeededCallback,
      this.interval,
      wsUrl,
      this.exchangeConfig.name
    );
  };

  unsubscribeBars = (subscriberUID: string): void => {
    unsubscribeFromStream(subscriberUID);
  };
}
