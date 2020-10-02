# CORS for Me - firefox extension
## Allows cross-domain xhr request by adding CORS headers to response.
## HTTPレスポンスにCORSヘッダを追加してクロスドメインのxhrリクエストを許可するFirefox拡張機能
### Usage
![screenshot](https://yobukodori.github.io/freedom/image/cors-for-me-screenshot.jpg)
- **Enable at startup**: Enable this feature when the browser is started.  
- **Print debug info**:  Output debug information at the bottom of the Options tab.  
- **Applied URLs**: Comma-Separated target [URL patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).
- **User-Agent**: (Optional). Sets this value to User-Agent header.  
Setting user-agent header in xhr causes preflight OPTIONS request. And some sites deny the request. 
In such cases you can set this option to avoid preflight request.
- **Save**: Save and apply settings.
- **Apply**: Apply settings. (doesn't save settings).
- **Get Status**: get current status and applied settings.
- **On** enables this feature. **Off** disables this feature. Or clicking the crossing arrows icon in toolbar toggles enable/disable. 
