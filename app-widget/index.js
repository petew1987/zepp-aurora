/**
 * Stealth Aurora Tracker - Primary App Widget (Watch Carousel / Glance Screen)
 * Target Device: Amazfit Active 3 (Round 466x466 AMOLED Screen)
 * Firmware: Zepp OS 2.x & 3.x
 */

import '../shared/device-polyfill.js'

const SCREEN_SIZE = 466

// Color Tokens
const COLOR_EMERALD = 0x10b981
const COLOR_CYAN = 0x06b6d4
const COLOR_SKY = 0x38bdf8
const COLOR_TRACK = 0x1e293b
const COLOR_WHITE = 0xf8fafc
const COLOR_SUBTLE = 0x94a3b8

function getColorByProb(prob) {
  if (prob >= 70) return COLOR_EMERALD
  if (prob >= 40) return COLOR_CYAN
  return COLOR_SKY
}

AppWidget({
  state: {
    prob: 78,
    kp: 4.5,
    clouds: 18,
    status: 'HIGH ACTIVITY',
    locationName: 'Local GPS'
  },

  widgets: {
    bgArc: null,
    probArc: null,
    titleLabel: null,
    heroProbLabel: null,
    metricsLabel: null,
    locLabel: null,
    clickOverlay: null
  },

  onInit() {
    console.log('[AuroraAppWidget] initialized')
    const app = typeof getApp === 'function' ? getApp() : null
    if (app && app._options && app._options.globalData) {
      const g = app._options.globalData
      if (g.auroraData && g.auroraData.now) {
        this.state.prob = g.auroraData.now.prob
        this.state.kp = g.auroraData.now.kp
        this.state.clouds = g.auroraData.now.clouds
        this.state.status = g.auroraData.now.status
        this.state.locationName = g.auroraData.now.locationName || 'Local GPS'
      }
    }
  },

  build() {
    if (typeof hmUI === 'undefined') return

    const prob = this.state.prob
    const arcColor = getColorByProb(prob)
    const endAngle = -90 + Math.round((prob / 100) * 360)

    // 1. Outer Background Track Arc
    this.widgets.bgArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 10,
      y: 10,
      w: 446,
      h: 446,
      start_angle: 0,
      end_angle: 360,
      line_width: 8,
      color: COLOR_TRACK
    })

    // 2. Outer Probability Sweep Arc
    this.widgets.probArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 10,
      y: 10,
      w: 446,
      h: 446,
      start_angle: -90,
      end_angle: endAngle,
      line_width: 8,
      color: arcColor
    })

    // 3. Title Header (y: 100)
    this.widgets.titleLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 100,
      w: 346,
      h: 24,
      color: COLOR_CYAN,
      text_size: 16,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: 'AURORA TRACKER'
    })

    // 4. Hero Probability (y: 136)
    this.widgets.heroProbLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 136,
      w: 346,
      h: 52,
      color: arcColor,
      text_size: 42,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: `${prob}%`
    })

    // 5. Activity Status (y: 198)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 198,
      w: 346,
      h: 22,
      color: COLOR_WHITE,
      text_size: 13,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: this.state.status
    })

    // 6. Compact metrics: KP · CLOUD (y: 226)
    this.widgets.metricsLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 226,
      w: 346,
      h: 26,
      color: COLOR_CYAN,
      text_size: 15,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: `KP ${this.state.kp.toFixed(1)} · CLOUD ${this.state.clouds}%`
    })

    // 7. Location (y: 260)
    this.widgets.locLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 260,
      w: 346,
      h: 24,
      color: COLOR_SUBTLE,
      text_size: 14,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: `${this.state.locationName} · Tap to open`
    })

    // 8. Click Overlay to open main watch app
    this.widgets.clickOverlay = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 0,
      y: 0,
      w: SCREEN_SIZE,
      h: SCREEN_SIZE,
      normal_color: 0x000000,
      press_color: 0x1e293b,
      click_func: () => {
        if (typeof hmApp !== 'undefined' && hmApp.gotoPage) {
          hmApp.gotoPage({ url: 'page/index' })
        }
      }
    })
  },

  onResume() {
    const app = typeof getApp === 'function' ? getApp() : null
    if (app && app._options && app._options.globalData) {
      const g = app._options.globalData
      if (g.auroraData && g.auroraData.now) {
        this.state.prob = g.auroraData.now.prob
        this.state.kp = g.auroraData.now.kp
        this.state.clouds = g.auroraData.now.clouds
        this.state.status = g.auroraData.now.status
        this.state.locationName = g.auroraData.now.locationName || 'Local GPS'

        if (this.widgets.heroProbLabel) {
          this.widgets.heroProbLabel.setProperty(hmUI.prop.TEXT, `${this.state.prob}%`)
        }
        if (this.widgets.metricsLabel) {
          this.widgets.metricsLabel.setProperty(
            hmUI.prop.TEXT,
            `KP ${this.state.kp.toFixed(1)} · CLOUD ${this.state.clouds}%`
          )
        }
        if (this.widgets.probArc) {
          const endAngle = -90 + Math.round((this.state.prob / 100) * 360)
          this.widgets.probArc.setProperty(hmUI.prop.MORE, {
            end_angle: endAngle,
            color: getColorByProb(this.state.prob)
          })
        }
      }
    }
  },

  onPause() {},
  onDestroy() {}
})
