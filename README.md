brew install openjdk@17
2. Install Android Studio from https://developer.android.com/studio
3. Set environment variables:
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_SDK_ROOT=~/Library/Android/sdk
4. Build the APK:
cd android && ./gradlew assembleDebug

4. Or open in Android Studio:
bun run cap:open
5. APK location: android/app/build/outputs/apk/debug/app-debug.apk

New Scripts Available

bun run android:build   # Build web + sync to Android
bun run cap:sync        # Sync web assets to Android
bun run cap:open        # Open in Android Studio