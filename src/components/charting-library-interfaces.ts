import Datafeed from "./datafeed"

export interface IWidgetOptions {
    symbol: string,
    // BEWARE: no trailing slash is expected in feed URL
    datafeed: Datafeed,
    interval: String,
    container: HTMLInputElement,
    library_path: String, // node_modules path of charting_library
    locale: String,
    disabled_features: Array<String>,
    enabled_features: Array<String>,
    charts_storage_url: String,
    charts_storage_api_version: String,
    client_id: String,
    user_id: String,
    fullscreen: Boolean,
    autosize: Boolean,
    studies_overrides: Object,
}