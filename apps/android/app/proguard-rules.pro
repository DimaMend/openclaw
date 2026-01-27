# Clawdbot Android ProGuard Rules
# https://www.guardsquare.com/manual/configuration/usage

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keepclasseswithmembers class * {
    @kotlinx.serialization.Serializable *;
}

# Keep Serializable classes
-keep class com.clawdbot.android.** implements kotlinx.serialization.KSerializer { *; }
-keep @kotlinx.serialization.Serializable class * { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep all enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }

# dnsjava (for DNS-SD discovery)
-dontwarn org.xbill.DNS.**
-keep class org.xbill.DNS.** { *; }

# CameraX
-keep class androidx.camera.** { *; }

# Keep R8 from stripping the companion objects used by serialization
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

# Prevent stripping of coroutine internals
-dontwarn kotlinx.coroutines.**
-keep class kotlinx.coroutines.** { *; }

# Keep data classes
-keep class com.clawdbot.android.chat.** { *; }
-keep class com.clawdbot.android.gateway.** { *; }
-keep class com.clawdbot.android.protocol.** { *; }
