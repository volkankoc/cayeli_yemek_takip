(function initScannerAdapters(global) {
  class BaseScannerAdapter {
    constructor(onScan) {
      this.onScan = onScan;
    }
    start() {}
    stop() {}
  }

  class KeyboardScannerAdapter extends BaseScannerAdapter {
    start() {}
    stop() {}
  }

  class NetworkScannerAdapter extends BaseScannerAdapter {
    constructor(onScan, endpoint) {
      super(onScan);
      this.endpoint = endpoint;
      this.ws = null;
    }
    start() {
      if (!this.endpoint) return;
      try {
        this.ws = new WebSocket(this.endpoint);
        this.ws.onmessage = (event) => {
          const barcode = String(event.data || '').trim();
          if (barcode) this.onScan(barcode);
        };
      } catch (_) {}
    }
    stop() {
      if (this.ws) this.ws.close();
    }
  }

  class SerialScannerAdapter extends BaseScannerAdapter {
    async start() {
      // Tarayıcı desteği cihaz/izin durumuna bağlıdır.
      return Promise.resolve();
    }
    stop() {}
  }

  global.ScannerAdapters = {
    KeyboardScannerAdapter,
    NetworkScannerAdapter,
    SerialScannerAdapter,
  };
})(window);
