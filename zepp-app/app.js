/**
 * ZeppHello - Zepp OS Application Entry Point
 * Publisher: Stealth Apps
 *
 * TEMPLATE ARCHITECTURE NOTES:
 * - Root app.js executed when the Zepp OS mini-app starts.
 * - globalData is shared across pages, widgets, and side services.
 * - Uses BaseApp from @zeppos/zml/base-app for lifecycle management.
 */
import { BaseApp } from '@zeppos/zml/base-app'

App(
  BaseApp({
    globalData: {
      appName: 'ZeppHello',
      vender: 'Stealth Apps',
      textColor: '#a855f7', // Core Purple
      clickCount: 0
    },
    onCreate(options) {
      console.log('[ZeppHello] App onCreate initialized by Stealth Apps')
    },
    onDestroy(options) {
      console.log('[ZeppHello] App onDestroy called')
    }
  })
)
