package com.sbci.schoolstudy;

import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String NOTIFICATION_CHANNEL_ID = "school_study_channel";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Enable Full Edge-to-Edge: Transparent Status Bar (Top Notch) & Transparent Bottom Safe Area / Navigation Bar
        setupEdgeToEdgeTransparentSystemBars();

        // 2. Create High-Priority Notification Channel for FCM & Local Alerts
        createNotificationChannel();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();

            // 3. Prevent White/Black Flashes & Ensure Smooth Native Appearance with Transparent Background
            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            // 4. Enable cookies and third-party cookies for seamless Firebase and API auth
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // 5. Enable DOM storage and caching for persistent client-side state
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // 6. Seamless file and PDF downloads handling via Android DownloadManager
            webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimetype);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null) {
                        request.addRequestHeader("cookie", cookies);
                    }
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setDescription("Downloading file from School Study...");
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    request.setTitle(filename);
                    request.allowScanningByMediaScanner();
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(request);
                    }
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    private void setupEdgeToEdgeTransparentSystemBars() {
        Window window = getWindow();
        if (window == null) return;

        // Allow window to draw behind both status bar (notch) and bottom navigation bar
        WindowCompat.setDecorFitsSystemWindows(window, false);

        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        // Set fully transparent status bar & navigation bar
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Android 10+ (API 29+): Disable contrast enforcement so navigation bar is 100% transparent without any gray scrim
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // Android 9+ (API 28+): Extend window into display cutout / notch area
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams layoutParams = window.getAttributes();
            layoutParams.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(layoutParams);
        }

        // Configure system bar icons to be clearly visible against light content
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(true);
            insetsController.setAppearanceLightNavigationBars(true);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                NotificationChannel existing = notificationManager.getNotificationChannel(NOTIFICATION_CHANNEL_ID);
                if (existing == null) {
                    CharSequence name = "School Study Alerts";
                    String description = "Class alerts, timetables, fee notices, and urgent announcements";
                    int importance = NotificationManager.IMPORTANCE_HIGH;
                    NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID, name, importance);
                    channel.setDescription(description);
                    channel.enableLights(true);
                    channel.setLightColor(Color.parseColor("#2563eb"));
                    channel.enableVibration(true);
                    channel.setShowBadge(true);
                    notificationManager.createNotificationChannel(channel);
                }
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Flush cookies immediately to ensure sessions and auth persist during background/kill
        try {
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        try {
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {}
    }
}
