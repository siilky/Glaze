package com.hydall.glaze;

import com.getcapacitor.BridgeActivity;

import android.webkit.WebSettings; // Не забудьте импорт

public class MainActivity extends BridgeActivity {
    @Override
    public void onResume() {
        super.onResume();
        // Разрешаем Mixed Content (HTTP запросы из HTTPS контекста)
        WebSettings settings = this.bridge.getWebView().getSettings();
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
