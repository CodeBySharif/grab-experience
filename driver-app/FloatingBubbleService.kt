package com.grab.driver

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Outline
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.*
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class FloatingBubbleService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var floatView: FrameLayout
    private lateinit var windowParams: WindowManager.LayoutParams
    private val channelId = "GrabDriverService"
    private val pwaUrl = "https://grab-experience-driver.netlify.app/"

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var touchSlop = 0

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("ClickableViewAccessibility", "SetJavaScriptEnabled")
    override fun onCreate() {
        super.onCreate()

        touchSlop = ViewConfiguration.get(this).scaledTouchSlop
        createNotificationChannel()
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Grab Driver Widget")
            .setContentText("Widget is active")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .build()
            
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(1, notification)
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        
        // Use 250x250 for the bubble size
        windowParams = WindowManager.LayoutParams(
            250, 250,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 100
            y = 100
        }

        floatView = object : FrameLayout(this) {
            override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = windowParams.x
                        initialY = windowParams.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                    }
                    MotionEvent.ACTION_MOVE -> {
                        if (abs(event.rawX - initialTouchX) > touchSlop || abs(event.rawY - initialTouchY) > touchSlop) {
                            return true
                        }
                    }
                }
                return super.onInterceptTouchEvent(event)
            }

            @SuppressLint("ClickableViewAccessibility")
            override fun onTouchEvent(event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_MOVE -> {
                        windowParams.x = initialX + (event.rawX - initialTouchX).toInt()
                        windowParams.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(floatView, windowParams)
                        return true
                    }
                }
                return super.onTouchEvent(event)
            }
        }
        
        floatView.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                // Circular for bubble, rounded corners for list
                val radius = if (windowParams.width < 400) view.width / 2f else 60f
                outline.setRoundRect(0, 0, view.width, view.height, radius)
            }
        }
        floatView.clipToOutline = true
        floatView.setBackgroundColor(0)

        val webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            setBackgroundColor(0)

            addJavascriptInterface(object {
                @JavascriptInterface
                fun resizeWidget(expanded: Boolean) {
                    floatView.post {
                        if (expanded) {
                            windowParams.width = 1100
                            windowParams.height = 1200
                            windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        } else {
                            windowParams.width = 250
                            windowParams.height = 250
                            windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        }
                        floatView.invalidateOutline()
                        windowManager.updateViewLayout(floatView, windowParams)
                    }
                }
            }, "Android")

            loadUrl(pwaUrl)
        }
        
        floatView.addView(webView)
        windowManager.addView(floatView, windowParams)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                channelId, "Grab Driver Widget Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::floatView.isInitialized) windowManager.removeView(floatView)
    }
}
