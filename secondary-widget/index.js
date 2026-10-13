/**
 * Stealth Aurora Tracker - Secondary Glance Widget
 * Target Device: Amazfit Active 3 (Round 466x466 AMOLED Screen)
 * Size: 466x200 card
 */

import '../shared/device-polyfill.js'

const SCREEN_WIDTH = 466
const CARD_HEIGHT = 180

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

SecondaryWidget({
  state: {
    prob: 78,
    kp: 4.5,
    clouds: 18,
    status: 'HIGH ACTIVITY',
    locationName: 'Local GPS'
  },

  widgets: {
    bgCard: null,
    probPill: null,
    titleText: null,
    metricsText: null,
    clickOverlay: null
  },

  onInit() {
    console.log('[AuroraGlanceWidget] onInit')
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

    const startX = 24
    const startY = 10
    const cardW = SCREEN_WIDTH - 48
    const prob = this.state.prob
    const pillColor = getColorByProb(prob)

    // 1. Background Card
    this.widgets.bgCard = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: startX,
      y: startY,
      w: cardW,
      h: CARD_HEIGHT,
      radius: 20,
      color: 0x0f172a
    })

    // 2. Probability Pill (Hero Left)
    this.widgets.probPill = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: startX + 16,
      y: startY + 28,
      w: 110,
      h: 56,
      radius: 14,
      color: pillColor
    })

    // Hero Probability Text inside Pill
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: startX + 16,
      y: startY + 28,
      w: 110,
      h: 56,
      color: 0x000000,
      text_size: 28,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: `${prob}%`
    })

    // 3. Title & Location (Right side)
    this.widgets.titleText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: startX + 138,
      y: startY + 28,
      w: cardW - 150,
      h: 26,
      color: COLOR_CYAN,
      text_size: 16,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text: 'AURORA GLANCE'
    })

    // 4. Activity status
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: startX + 138,
      y: startY + 56,
      w: cardW - 150,
      h: 22,
      color: COLOR_WHITE,
      text_size: 13,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text: this.state.status
    })

    // 5. Bottom Metrics Bar
    this.widgets.metricsText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: startX + 16,
      y: startY + 104,
      w: cardW - 32,
      h: 26,
      color: COLOR_SUBTLE,
      text_size: 14,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text: `KP ${this.state.kp.toFixed(1)} · CLOUD ${this.state.clouds}% · ${this.state.locationName}`
    })

    // Tap to open main watch app
    this.widgets.clickOverlay = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: startX,
      y: startY,
      w: cardW,
      h: CARD_HEIGHT,
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
