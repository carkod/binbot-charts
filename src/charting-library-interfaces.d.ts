import Datafeed from "./components/datafeed";

export interface IWidgetOptions {
  symbol: string;
  // BEWARE: no trailing slash is expected in feed URL
  datafeed: Datafeed;
  interval: string;
  container: HTMLInputElement;
  library_path: string; // node_modules path of charting_library
  locale?: string;
  disabled_features?: Array<string>;
  enabled_features?: Array<string>;
  charts_storage_url?: string;
  charts_storage_api_version?: string;
  client_id?: string;
  user_id?: string;
  fullscreen?: boolean;
  autosize?: boolean;
  studies_overrides?: object;
}

export interface IOrderLine {
  text: string;
  tooltip?: Array<string>;
  quantity?: string;
  price: Number;
  color?: string;
}

export interface ITimescaleMarks {
  id: string;
  time: Number;
  color?: string;
  label: string;
  tooltip?: Array<string>;
}
