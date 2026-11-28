import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const mainActivityPath = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'bossaluminium',
  'app',
  'MainActivity.java'
);

if (!fs.existsSync(manifestPath)) {
  console.error('AndroidManifest.xml not found at:', manifestPath);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

const requiredPermissions = [
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '<uses-permission android:name="android.permission.USE_BIOMETRIC" />',
  '<uses-permission android:name="android.permission.USE_FINGERPRINT" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
];

const permNamesToCheck = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.USE_BIOMETRIC',
  'android.permission.USE_FINGERPRINT',
  'android.hardware.camera',
  'android.hardware.location.gps',
];

const missingLines = [];
for (let i = 0; i < requiredPermissions.length; i++) {
  if (!manifest.includes(permNamesToCheck[i])) {
    missingLines.push('    ' + requiredPermissions[i]);
  }
}

if (missingLines.length > 0) {
  manifest = manifest.replace(
    '<application',
    missingLines.join('\n') + '\n\n    <application'
  );
}

// Ensure launchMode="singleTask" on MainActivity for seamless OAuth deep-link return
if (manifest.includes('android:launchMode=')) {
  manifest = manifest.replace(/android:launchMode="[^"]*"/, 'android:launchMode="singleTask"');
} else {
  manifest = manifest.replace(
    'android:name=".MainActivity"',
    'android:name=".MainActivity"\n            android:launchMode="singleTask"'
  );
}

// Ensure deep-link intent-filter for com.bossaluminium.app://login-callback
const deepLinkIntent = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.bossaluminium.app" android:host="login-callback" />
            </intent-filter>`;

if (!manifest.includes('android:scheme="com.bossaluminium.app"')) {
  manifest = manifest.replace('</activity>', `${deepLinkIntent}\n        </activity>`);
}

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('Updated AndroidManifest.xml with permissions and OAuth deep-link.');

const mainActivityJava = `package com.bossaluminium.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int BOSS_PERMISSIONS_REQUEST_CODE = 1001;
    private boolean chromeClientConfigured = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestBossRuntimePermissions();
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebViewPermissionsClient();
    }

    private void requestBossRuntimePermissions() {
        List<String> needed = new ArrayList<>();
        String[] basePerms = new String[] {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA
        };
        for (String perm : basePerms) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needed.add(perm);
            }
        }
        String storagePerm = Build.VERSION.SDK_INT >= 33
            ? "android.permission.READ_MEDIA_IMAGES"
            : Manifest.permission.READ_EXTERNAL_STORAGE;
        if (ContextCompat.checkSelfPermission(this, storagePerm) != PackageManager.PERMISSION_GRANTED) {
            needed.add(storagePerm);
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                needed.toArray(new String[0]),
                BOSS_PERMISSIONS_REQUEST_CODE
            );
        }
    }

    private void configureWebViewPermissionsClient() {
        if (chromeClientConfigured || this.bridge == null) {
            return;
        }
        WebView webView = this.bridge.getWebView();
        if (webView == null) {
            return;
        }
        chromeClientConfigured = true;
        WebSettings settings = webView.getSettings();
        if (settings != null) {
            settings.setGeolocationEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
        }
        webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onGeolocationPermissionsShowPrompt(
                String origin,
                GeolocationPermissions.Callback callback
            ) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    try {
                        request.grant(request.getResources());
                    } catch (Exception ignored) {
                    }
                });
            }
        });
    }
}
`;

fs.mkdirSync(path.dirname(mainActivityPath), { recursive: true });
fs.writeFileSync(mainActivityPath, mainActivityJava, 'utf8');
console.log('Updated MainActivity.java with native permissions and BridgeWebChromeClient.');
