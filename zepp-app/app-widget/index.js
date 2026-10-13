/**
 * Stealth Aurora Tracker - Primary App Widget
 */

import '../shared/device-polyfill.js'

const SCREEN_SIZE = 466

// Stealth Apps Color Tokens (Minimalist Luxury AMOLED)
const COLOR_OBSIDIAN = 0x000000
const COLOR_TRACK = 0x241e38
const COLOR_ELECTRIC_PURPLE = 0xc084fc
const COLOR_ROYAL_VIOLET = 0x8b5cf6
const COLOR_DEEP_VIOLET = 0x6366f1
const COLOR_WHITE = 0xf8fafc
const COLOR_LILAC = 0xd8b4fe
const COLOR_SUBTLE = 0x94a3b8

function getColorByProb(prob) {
  if (prob >= 70) return COLOR_ELECTRIC_PURPLE
  if (prob >= 40) return COLOR_ROYAL_VIOLET
  return COLOR_DEEP_VIOLET
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
    const endAngle = 180 + Math.round((prob / 100) * 180)

    this.widgets.bgArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 8,
      y: 8,
      w: 450,
      h: 450,
      start_angle: 180,
      end_angle: 360,
      line_width: 14,
      color: COLOR_TRACK
    })

    this.widgets.probArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 8,
      y: 8,
      w: 450,
      h: 450,
      start_angle: 180,
      end_angle: endAngle,
      line_width: 14,
      color: arcColor
    })

    this.widgets.titleLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 100,
      w: 346,
      h: 24,
      color: COLOR_LILAC,
      text_size: 16,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: 'AURORA TRACKER'
    })

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

    this.widgets.metricsLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 226,
      w: 346,
      h: 26,
      color: COLOR_LILAC,
      text_size: 15,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: `KP ${this.state.kp.toFixed(1)} · CLOUD ${this.state.clouds}%`
    })

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

  onResume() {},
  onPause() {},
  onDestroy() {}
})
