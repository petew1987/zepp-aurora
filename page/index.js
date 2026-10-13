/**
 * Stealth Aurora Tracker - Watch Page UI
 * Target Device: Amazfit Active 3 (Round 466x466 AMOLED Screen)
 * Firmware: Zepp OS 2.x & 3.x
 */

import '../shared/device-polyfill.js'
import * as zosUI from '@zos/ui'
import * as zosInteraction from '@zos/interaction'

// Universal UI Import Guard for Zepp OS 2.x / 3.x
const ui =
  typeof zosUI !== 'undefined' && zosUI && zosUI.createWidget
    ? zosUI
    : typeof hmUI !== 'undefined'
    ? hmUI
    : globalThis.hmUI

const SCREEN_SIZE = 466

// Color Tokens
const COLOR_EMERALD = 0x10b981 // >= 70%
const COLOR_CYAN = 0x06b6d4    // 40-69%
const COLOR_SKY = 0x38bdf8     // < 40%
const COLOR_TRACK = 0x1e293b   // Background track
const COLOR_WHITE = 0xf8fafc   // Primary text
const COLOR_SUBTLE = 0x94a3b8  // Labels / Titles
const COLOR_TRANSPARENT = 0x000000

function getColorByProb(prob) {
  if (prob >= 70) return COLOR_EMERALD
  if (prob >= 40) return COLOR_CYAN
  return COLOR_SKY
}

const DEFAULT_AURORA_DATA = {
  now: {
    time: '12',
    prob: 78,
    kp: 4.5,
    clouds: 18,
    status: 'HIGH ACTIVITY',
    locationName: 'Local GPS'
  },
  sixHour: [
    { time: '12', prob: 84, kp: 5.1, clouds: 18 },
    { time: '13', prob: 79, kp: 4.9, clouds: 20 },
    { time: '14', prob: 74, kp: 4.6, clouds: 25 },
    { time: '15', prob: 66, kp: 4.3, clouds: 32 },
    { time: '16', prob: 52, kp: 3.9, clouds: 45 },
    { time: '17', prob: 38, kp: 3.4, clouds: 58 }
  ],
  twelveHour: [
    { time: '02', prob: 84, kp: 5.1, clouds: 18 },
    { time: '04', prob: 76, kp: 4.8, clouds: 22 },
    { time: '06', prob: 68, kp: 4.5, clouds: 30 },
    { time: '08', prob: 55, kp: 4.1, clouds: 42 },
    { time: '10', prob: 42, kp: 3.7, clouds: 50 },
    { time: '12', prob: 30, kp: 3.2, clouds: 60 }
  ],
  twentyFourHour: [
    { time: '14', prob: 35, kp: 3.3, clouds: 55 },
    { time: '16', prob: 48, kp: 3.8, clouds: 42 },
    { time: '18', prob: 62, kp: 4.4, clouds: 30 },
    { time: '20', prob: 75, kp: 4.9, clouds: 22 },
    { time: '22', prob: 82, kp: 5.2, clouds: 16 },
    { time: '24', prob: 78, kp: 5.0, clouds: 20 }
  ],
  sevenDay: [
    { day: 'MON', prob: 82, kp: 5.2, clouds: 15 },
    { day: 'TUE', prob: 75, kp: 4.8, clouds: 20 },
    { day: 'WED', prob: 68, kp: 4.5, clouds: 30 },
    { day: 'THU', prob: 58, kp: 4.1, clouds: 38 },
    { day: 'FRI', prob: 45, kp: 3.7, clouds: 50 },
    { day: 'SAT', prob: 38, kp: 3.4, clouds: 55 },
    { day: 'SUN', prob: 48, kp: 3.9, clouds: 40 }
  ],
  locations: ['Local GPS', 'Tromso', 'Fairbanks', 'Reykjavik', 'Yellowknife', 'Abisko'],
  activeLocationIndex: 0
}

Page({
  state: {
    currentScreen: 0, // 0: NOW (6H), 1: 12H, 2: 24H (13-24H), 3: 7D
    auroraData: DEFAULT_AURORA_DATA
  },

  widgets: {
    frameBgArc: null,
    frameProbArc: null,
    frameTitle: null,
    contentWidgets: []
  },

  onInit() {
    console.log('[AuroraWatchPage] onInit')
    this.fetchDataFromCompanion()
  },

  build() {
    console.log('[AuroraWatchPage] build')
    this.registerGestures()
    this.renderViewFrame()
    this.renderScreen(this.state.currentScreen)
    this.renderEdgeNavigation()
  },

  fetchDataFromCompanion(cycle = false) {
    try {
      if (typeof this.request === 'function') {
        const reqType = cycle ? 'CYCLE_LOCATION' : 'GET_AURORA_DATA'
        this.request({ type: reqType })
          .then(res => {
            if (res && res.data) {
              this.state.auroraData = res.data
              this.refreshActiveScreen()
            }
          })
          .catch(e => {
            console.log('[AuroraWatchPage] Request error:', e)
          })
      }
    } catch (e) {
      console.log('[AuroraWatchPage] BLE error:', e)
    }
  },

  cycleLocation() {
    const locs = this.state.auroraData.locations || []
    if (locs.length > 0) {
      const nextIdx = (this.state.auroraData.activeLocationIndex + 1) % locs.length
      this.state.auroraData.activeLocationIndex = nextIdx
      this.state.auroraData.now.locationName = locs[nextIdx]
    }
    this.fetchDataFromCompanion(true)
    this.refreshActiveScreen()
  },

  registerGestures() {
    // Zepp OS 3.x
    try {
      if (zosInteraction && typeof zosInteraction.onGesture === 'function') {
        zosInteraction.onGesture({
          callback: (event) => {
            if (event === zosInteraction.GESTURE_LEFT) {
              this.nextScreen()
              return true
            } else if (event === zosInteraction.GESTURE_RIGHT) {
              this.prevScreen()
              return true
            }
            return false
          }
        })
      }
    } catch (e) {}

    // Zepp OS 2.x
    try {
      if (typeof hmApp !== 'undefined' && typeof hmApp.registerGestureEvent === 'function') {
        hmApp.registerGestureEvent((event) => {
          if (event === 0) { // swipe left
            this.nextScreen()
            return true
          } else if (event === 1) { // swipe right
            this.prevScreen()
            return true
          }
          return false
        })
      }
    } catch (e) {}
  },

  nextScreen() {
    this.state.currentScreen = (this.state.currentScreen + 1) % 4
    this.refreshActiveScreen()
  },

  prevScreen() {
    this.state.currentScreen = (this.state.currentScreen - 1 + 4) % 4
    this.refreshActiveScreen()
  },

  getScreenPeakProbability(screenIndex) {
    const data = this.state.auroraData
    if (screenIndex === 0) {
      return data.now ? data.now.prob : 78
    } else if (screenIndex === 1) {
      return Math.max(...data.twelveHour.map(i => i.prob), 0)
    } else if (screenIndex === 2) {
      return Math.max(...data.twentyFourHour.map(i => i.prob), 0)
    } else if (screenIndex === 3) {
      return Math.max(...data.sevenDay.map(i => i.prob), 0)
    }
    return 50
  },

  renderViewFrame() {
    const peakProb = this.getScreenPeakProbability(this.state.currentScreen)
    const arcColor = getColorByProb(peakProb)
    const endAngle = -90 + Math.round((peakProb / 100) * 360)

    // 1. Background Track Arc (464x464)
    this.widgets.frameBgArc = ui.createWidget(ui.widget.ARC, {
      x: 1,
      y: 1,
      w: 464,
      h: 464,
      start_angle: 0,
      end_angle: 360,
      line_width: 6,
      color: COLOR_TRACK
    })

    // 2. Dynamic Probability Arc
    this.widgets.frameProbArc = ui.createWidget(ui.widget.ARC, {
      x: 1,
      y: 1,
      w: 464,
      h: 464,
      start_angle: -90,
      end_angle: endAngle,
      line_width: 6,
      color: arcColor
    })

    // 3. View Frame Screen Title
    const titles = ['NOW', '12H OUTLOOK', '24H (13-24H)', '7-DAY OUTLOOK']
    this.widgets.frameTitle = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 14,
      w: 346,
      h: 22,
      text_size: 13,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: titles[this.state.currentScreen]
    })
  },

  updateViewFrame() {
    const peakProb = this.getScreenPeakProbability(this.state.currentScreen)
    const arcColor = getColorByProb(peakProb)
    const endAngle = -90 + Math.round((peakProb / 100) * 360)
    const titles = ['NOW', '12H OUTLOOK', '24H (13-24H)', '7-DAY OUTLOOK']

    if (this.widgets.frameProbArc) {
      this.widgets.frameProbArc.setProperty(ui.prop.MORE, {
        end_angle: endAngle,
        color: arcColor
      })
    }
    if (this.widgets.frameTitle) {
      this.widgets.frameTitle.setProperty(ui.prop.TEXT, titles[this.state.currentScreen])
    }
  },

  clearContentWidgets() {
    for (const w of this.widgets.contentWidgets) {
      try {
        if (ui.deleteWidget) {
          ui.deleteWidget(w)
        }
      } catch (e) {}
    }
    this.widgets.contentWidgets = []
  },

  refreshActiveScreen() {
    this.updateViewFrame()
    this.clearContentWidgets()
    this.renderScreen(this.state.currentScreen)
  },

  renderScreen(index) {
    if (index === 0) this.renderScreen0()
    else if (index === 1) this.renderScreen1()
    else if (index === 2) this.renderScreen2()
    else if (index === 3) this.renderScreen3()
  },

  // SCREEN 0: Main Screen (Now + 6-Hour Forecast)
  renderScreen0() {
    const data = this.state.auroraData
    const now = data.now || DEFAULT_AURORA_DATA.now
    const sixHour = data.sixHour || DEFAULT_AURORA_DATA.sixHour

    // Upper metrics (y: 40)
    const upperMetrics = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 40,
      w: 346,
      h: 24,
      text_size: 15,
      color: COLOR_CYAN,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: `KP ${now.kp.toFixed(1)}    ·    CLOUD ${now.clouds}%`
    })
    this.widgets.contentWidgets.push(upperMetrics)

    // Hero Probability (y: 64)
    const heroProb = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 46,
      text_size: 38,
      color: getColorByProb(now.prob),
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: `${now.prob}%`
    })
    this.widgets.contentWidgets.push(heroProb)

    // Activity Status (y: 110)
    const actStatus = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 110,
      w: 346,
      h: 20,
      text_size: 12,
      color: COLOR_WHITE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: now.status || 'HIGH ACTIVITY'
    })
    this.widgets.contentWidgets.push(actStatus)

    // Location Pill (y: 132, h: 28) - tap to cycle
    const locBtn = ui.createWidget(ui.widget.BUTTON, {
      x: 133,
      y: 132,
      w: 200,
      h: 28,
      radius: 14,
      normal_color: COLOR_TRACK,
      press_color: 0x334155,
      text_size: 12,
      color: COLOR_WHITE,
      text: `${now.locationName || 'Local GPS'} ▾`,
      click_func: () => {
        this.cycleLocation()
      }
    })
    this.widgets.contentWidgets.push(locBtn)

    // Forecast Header (y: 164)
    const header = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 164,
      w: 346,
      h: 18,
      text_size: 11,
      color: COLOR_CYAN,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: '6-HOUR FORECAST'
    })
    this.widgets.contentWidgets.push(header)

    // 6 Bar Chart Columns
    // Layout: startX = 77, colW = 44, gap = 8, barW = 12, barTop = 186, maxBarH = 46
    const startX = 77
    const colW = 44
    const gap = 8
    const barW = 12
    const barTop = 186
    const maxBarH = 46

    for (let i = 0; i < 6; i++) {
      const item = sixHour[i] || { time: '00', prob: 0, kp: 0.0, clouds: 0 }
      const colX = startX + i * (colW + gap)
      const barX = colX + Math.round((colW - barW) / 2)
      const fillH = Math.max(3, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      // Bar Track
      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 3
      })
      this.widgets.contentWidgets.push(track)

      // Bar Fill
      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 3
      })
      this.widgets.contentWidgets.push(fill)

      // Stacked Multiline Text (y: 236)
      const label = ui.createWidget(ui.widget.TEXT, {
        x: colX,
        y: 236,
        w: colW,
        h: 120,
        text_size: 12,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.time}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  // SCREEN 1: 12-Hour Forecast
  renderScreen1() {
    const data = this.state.auroraData
    const twelveHour = data.twelveHour || DEFAULT_AURORA_DATA.twelveHour

    // Title (y: 40)
    const title = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 40,
      w: 346,
      h: 24,
      text_size: 15,
      color: COLOR_CYAN,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: '12-HOUR OUTLOOK'
    })
    this.widgets.contentWidgets.push(title)

    // Guide Subtitle (y: 64)
    const guide = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 18,
      text_size: 11,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: 'TIME · PROB · KP · CLOUD'
    })
    this.widgets.contentWidgets.push(guide)

    // 6 Bar Columns
    // Layout: startX = 77, colW = 44, gap = 8, barW = 14, barTop = 92, maxBarH = 76
    const startX = 77
    const colW = 44
    const gap = 8
    const barW = 14
    const barTop = 92
    const maxBarH = 76

    for (let i = 0; i < 6; i++) {
      const item = twelveHour[i] || { time: '00', prob: 0, kp: 0.0, clouds: 0 }
      const colX = startX + i * (colW + gap)
      const barX = colX + Math.round((colW - barW) / 2)
      const fillH = Math.max(4, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 3
      })
      this.widgets.contentWidgets.push(track)

      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 3
      })
      this.widgets.contentWidgets.push(fill)

      const label = ui.createWidget(ui.widget.TEXT, {
        x: colX,
        y: 174,
        w: colW,
        h: 140,
        text_size: 13,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.time}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  // SCREEN 2: 24-Hour Forecast (Strictly Hours 13-24)
  renderScreen2() {
    const data = this.state.auroraData
    const twentyFourHour = data.twentyFourHour || DEFAULT_AURORA_DATA.twentyFourHour

    // Title (y: 40)
    const title = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 40,
      w: 346,
      h: 24,
      text_size: 15,
      color: COLOR_CYAN,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: '24-HOUR (HOURS 13 - 24)'
    })
    this.widgets.contentWidgets.push(title)

    // Guide Subtitle (y: 64)
    const guide = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 18,
      text_size: 11,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: 'TIME · PROB · KP · CLOUD'
    })
    this.widgets.contentWidgets.push(guide)

    // 6 Bar Columns (hours 14, 16, 18, 20, 22, 24)
    const startX = 77
    const colW = 44
    const gap = 8
    const barW = 14
    const barTop = 92
    const maxBarH = 76

    for (let i = 0; i < 6; i++) {
      const item = twentyFourHour[i] || { time: '00', prob: 0, kp: 0.0, clouds: 0 }
      const colX = startX + i * (colW + gap)
      const barX = colX + Math.round((colW - barW) / 2)
      const fillH = Math.max(4, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 3
      })
      this.widgets.contentWidgets.push(track)

      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 3
      })
      this.widgets.contentWidgets.push(fill)

      const label = ui.createWidget(ui.widget.TEXT, {
        x: colX,
        y: 174,
        w: colW,
        h: 140,
        text_size: 13,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.time}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  // SCREEN 3: 7-Day Forecast (Strict 3-char day names)
  renderScreen3() {
    const data = this.state.auroraData
    const sevenDay = data.sevenDay || DEFAULT_AURORA_DATA.sevenDay

    // Title (y: 40)
    const title = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 40,
      w: 346,
      h: 24,
      text_size: 15,
      color: COLOR_CYAN,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: '7-DAY OUTLOOK'
    })
    this.widgets.contentWidgets.push(title)

    // Guide Subtitle (y: 64)
    const guide = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 18,
      text_size: 11,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: 'DAY · PROB · KP · CLOUD'
    })
    this.widgets.contentWidgets.push(guide)

    // 7 Bar Columns
    // Layout: startX = 82, colW = 38, gap = 6, barW = 12, barTop = 92, maxBarH = 76
    const startX = 82
    const colW = 38
    const gap = 6
    const barW = 12
    const barTop = 92
    const maxBarH = 76

    for (let i = 0; i < 7; i++) {
      const item = sevenDay[i] || { day: 'DAY', prob: 0, kp: 0.0, clouds: 0 }
      const colX = startX + i * (colW + gap)
      const barX = colX + Math.round((colW - barW) / 2)
      const fillH = Math.max(4, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 3
      })
      this.widgets.contentWidgets.push(track)

      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 3
      })
      this.widgets.contentWidgets.push(fill)

      const label = ui.createWidget(ui.widget.TEXT, {
        x: colX,
        y: 174,
        w: colW,
        h: 140,
        text_size: 12,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.day}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  // Invisible Edge Tap Zones for screen switching fallback
  renderEdgeNavigation() {
    // Left edge (previous screen)
    ui.createWidget(ui.widget.BUTTON, {
      x: 0,
      y: 100,
      w: 64,
      h: 266,
      normal_color: COLOR_TRANSPARENT,
      press_color: 0x0f172a,
      click_func: () => {
        this.prevScreen()
      }
    })

    // Right edge (next screen)
    ui.createWidget(ui.widget.BUTTON, {
      x: 402,
      y: 100,
      w: 64,
      h: 266,
      normal_color: COLOR_TRANSPARENT,
      press_color: 0x0f172a,
      click_func: () => {
        this.nextScreen()
      }
    })
  },

  onDestroy() {
    console.log('[AuroraWatchPage] onDestroy')
    this.clearContentWidgets()
  }
})
