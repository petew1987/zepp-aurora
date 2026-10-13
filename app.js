/**
 * Stealth Aurora Tracker - Zepp OS Application Entry Point
 * Publisher: Stealth Apps
 * Target: Amazfit Active 3 (Zepp OS 2.x & 3.x)
 */
import './shared/device-polyfill.js'
import { BaseApp } from '@zeppos/zml/base-app'

App(
  BaseApp({
    globalData: {
      appName: 'Aurora',
      vender: 'Stealth Apps',
      currentLocationName: 'Local GPS',
      auroraData: null
    },
    onCreate(options) {
      console.log('[Aurora] App onCreate initialized by Stealth Apps')
    },
    onDestroy(options) {
      console.log('[Aurora] App onDestroy called')
    }
  })
)
