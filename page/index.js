/**
 * Stealth Aurora Tracker - Watch Page UI
 * Target Device: Amazfit Active 3 (Round 466x466 AMOLED Screen)
 * Firmware: Zepp OS 2.x & 3.x
 *
 * Updates:
 * - Removed edge navigation buttons so outer bezel circle chart is completely uninterrupted.
 * - Horizontal gap between bars is strictly 1px (barX = startX + i * (barW + 1px), bars are full width).
 * - Immediate refresh of all metrics, probabilities, and charts upon selecting/cycling a location.
 * - Single unified title on the top bezel.
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

function getColorByProb(prob) {
  if (prob >= 70) return COLOR_EMERALD
  if (prob >= 40) return COLOR_CYAN
  return COLOR_SKY
}

const LOCATION_PRESETS = [
  { name: 'Local GPS', lat: 69.65, lon: 18.96, baseClouds: 18, baseKp: 4.5 },
  { name: 'Tromso', lat: 69.65, lon: 18.96, baseClouds: 20, baseKp: 4.8 },
  { name: 'Fairbanks', lat: 64.84, lon: -147.72, baseClouds: 35, baseKp: 5.2 },
  { name: 'Reykjavik', lat: 64.14, lon: -21.94, baseClouds: 65, baseKp: 4.2 },
  { name: 'Yellowknife', lat: 62.45, lon: -114.37, baseClouds: 12, baseKp: 5.5 },
  { name: 'Abisko', lat: 68.35, lon: 18.82, baseClouds: 22, baseKp: 4.9 },
  { name: 'Rovaniemi', lat: 66.50, lon: 25.72, baseClouds: 40, baseKp: 4.6 },
  { name: 'Kiruna', lat: 67.85, lon: 20.22, baseClouds: 25, baseKp: 4.8 },
  { name: 'Anchorage', lat: 61.21, lon: -149.90, baseClouds: 50, baseKp: 4.0 }
]

function calcProbability(kp, clouds, lat) {
  const absLat = Math.abs(lat)
  let reqKp = Math.max(0.5, (67.5 - absLat) * 0.7 + 1.0)
  if (absLat >= 66) reqKp = 1.0

  let rawProb = 10
  if (kp >= reqKp) {
    rawProb = Math.min(98, 40 + (kp - reqKp) * 22)
  } else {
    rawProb = Math.max(5, 40 - (reqKp - kp) * 18)
  }

  const cloudFactor = 1 - (clouds / 100) * 0.85
  return Math.max(0, Math.min(99, Math.round(rawProb * Math.max(0.08, cloudFactor))))
}

function getActivityStatus(prob) {
  if (prob >= 70) return 'HIGH ACTIVITY'
  if (prob >= 40) return 'MODERATE ACTIVITY'
  return 'LOW ACTIVITY'
}

function formatHour(h) {
  const modH = ((h % 24) + 24) % 24
  return modH < 10 ? '0' + modH : '' + modH
}

function buildLocationForecast(locationName) {
  const loc = LOCATION_PRESETS.find(p => p.name === locationName || locationName.startsWith(p.name)) || LOCATION_PRESETS[0]
  const now = new Date()
  const currentH = now.getHours()
  const currentKp = loc.baseKp
  const currentClouds = loc.baseClouds
  const currentProb = calcProbability(currentKp, currentClouds, loc.lat)

  // 6-Hour Forecast
  const sixHour = []
  for (let i = 0; i < 6; i++) {
    const h = (currentH + i) % 24
    const kp = parseFloat(Math.max(1.0, Math.min(8.5, currentKp + Math.sin(i / 1.5) * 0.5)).toFixed(1))
    const clouds = Math.max(0, Math.min(100, Math.round(currentClouds + Math.sin(i) * 10)))
    const prob = calcProbability(kp, clouds, loc.lat)
    sixHour.push({ time: formatHour(h), prob, kp, clouds })
  }

  // 12-Hour Forecast (+2, +4, +6, +8, +10, +12)
  const twelveHour = []
  for (let step = 1; step <= 6; step++) {
    const offset = step * 2
    const h = (currentH + offset) % 24
    const kp = parseFloat(Math.max(1.0, Math.min(8.5, currentKp + Math.cos(step) * 0.7)).toFixed(1))
    const clouds = Math.max(0, Math.min(100, Math.round(currentClouds + Math.cos(step / 2) * 15)))
    const prob = calcProbability(kp, clouds, loc.lat)
    twelveHour.push({ time: formatHour(h), prob, kp, clouds })
  }

  // 24-Hour Forecast (Hours 13-24: +14, +16, +18, +20, +22, +24)
  const twentyFourHour = []
  const offsets = [14, 16, 18, 20, 22, 24]
  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i]
    const h = (currentH + offset) % 24
    const kp = parseFloat(Math.max(1.0, Math.min(8.5, currentKp + Math.sin(i) * 0.8)).toFixed(1))
    const clouds = Math.max(0, Math.min(100, Math.round(currentClouds + Math.sin(offset / 3) * 20)))
    const prob = calcProbability(kp, clouds, loc.lat)
    twentyFourHour.push({ time: formatHour(h), prob, kp, clouds })
  }

  // 7-Day Forecast (Strictly 3-char day names)
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const sevenDay = []
  for (let d = 1; d <= 7; d++) {
    const future = new Date(now.getTime() + d * 86400000)
    const day = dayNames[future.getDay()]
    const kp = parseFloat(Math.max(1.5, Math.min(7.5, currentKp + Math.sin(d * 1.3) * 1.1)).toFixed(1))
    const clouds = Math.max(5, Math.min(95, Math.round(currentClouds + Math.cos(d) * 22)))
    const prob = calcProbability(kp, clouds, loc.lat)
    sevenDay.push({ day, prob, kp, clouds })
  }

  return {
    now: {
      time: formatHour(currentH),
      prob: currentProb,
      kp: currentKp,
      clouds: currentClouds,
      status: getActivityStatus(currentProb),
      locationName: loc.name
    },
    sixHour,
    twelveHour,
    twentyFourHour,
    sevenDay
  }
}

const DEFAULT_AURORA_DATA = {
  ...buildLocationForecast('Local GPS'),
  locations: ['Local GPS', 'Tromso', 'Fairbanks', 'Reykjavik', 'Yellowknife', 'Abisko'],
  activeLocationIndex: 0
}

Page({
  state: {
    currentScreen: 0, // 0: NOW, 1: 12H, 2: 24H (13-24H), 3: 7D
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
  },

  fetchDataFromCompanion(cycle = false) {
    try {
      if (typeof this.request === 'function') {
        const reqType = cycle ? 'CYCLE_LOCATION' : 'GET_AURORA_DATA'
        const reqPayload = {
          type: reqType,
          locationIndex: this.state.auroraData.activeLocationIndex
        }

        this.request(reqPayload)
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
    const locs = this.state.auroraData.locations || LOCATION_PRESETS.map(p => p.name)
    const nextIdx = (this.state.auroraData.activeLocationIndex + 1) % locs.length
    const nextName = locs[nextIdx]

    console.log('[AuroraWatchPage] Switching location to:', nextName)

    // Immediately recalculate entire forecast locally for this location
    const freshForecast = buildLocationForecast(nextName)
    this.state.auroraData = {
      ...freshForecast,
      locations: locs,
      activeLocationIndex: nextIdx
    }

    // Immediately refresh UI with newly selected location data
    this.refreshActiveScreen()

    // Request companion to sync live NOAA & weather for this location
    this.fetchDataFromCompanion(true)
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
    const endAngle = 180 + Math.round((peakProb / 100) * 180)

    // 1. Background Track Arc (Arch over top: from 9 o'clock (180°) to 3 o'clock (360°))
    this.widgets.frameBgArc = ui.createWidget(ui.widget.ARC, {
      x: 8,
      y: 8,
      w: 450,
      h: 450,
      start_angle: 180,
      end_angle: 360,
      line_width: 14,
      color: COLOR_TRACK
    })

    // 2. Dynamic Probability Arc (Sweeps over top: from 9 o'clock towards 3 o'clock)
    this.widgets.frameProbArc = ui.createWidget(ui.widget.ARC, {
      x: 8,
      y: 8,
      w: 450,
      h: 450,
      start_angle: 180,
      end_angle: endAngle,
      line_width: 14,
      color: arcColor
    })

    // 3. Single Unified Screen Title on Top Bezel Rim
    const titles = ['NOW', '12H OUTLOOK', '24H (13-24H)', '7-DAY OUTLOOK']
    this.widgets.frameTitle = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 20,
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
    const endAngle = 180 + Math.round((peakProb / 100) * 180)
    const titles = ['NOW', '12H OUTLOOK', '24H (13-24H)', '7-DAY OUTLOOK']

    if (this.widgets.frameProbArc) {
      this.widgets.frameProbArc.setProperty(ui.prop.MORE, {
        start_angle: 180,
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

  // SCREEN 0: Main Screen (Centered, Location Switcher at Bottom, Strict 1px Bar Gap)
  renderScreen0() {
    const data = this.state.auroraData
    const now = data.now || DEFAULT_AURORA_DATA.now
    const sixHour = data.sixHour || DEFAULT_AURORA_DATA.sixHour

    // 1. Upper metrics (y: 56)
    const upperMetrics = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 56,
      w: 346,
      h: 24,
      text_size: 15,
      color: COLOR_CYAN,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: `KP ${now.kp.toFixed(1)}    ·    CLOUD ${now.clouds}%`
    })
    this.widgets.contentWidgets.push(upperMetrics)

    // 2. Hero Probability (y: 82, text_size: 42)
    const heroProb = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 82,
      w: 346,
      h: 50,
      text_size: 42,
      color: getColorByProb(now.prob),
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: `${now.prob}%`
    })
    this.widgets.contentWidgets.push(heroProb)

    // 3. Activity Status (y: 134)
    const actStatus = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 134,
      w: 346,
      h: 22,
      text_size: 13,
      color: COLOR_WHITE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: now.status || 'HIGH ACTIVITY'
    })
    this.widgets.contentWidgets.push(actStatus)

    // 4. 6 Bar Chart Columns (STRICT 1px HORIZONTAL GAP BETWEEN BARS)
    // 6 bars * 54px + 5 * 1px gap = 329px total width, centered at startX = 69
    const startX = 69
    const barW = 54
    const gap = 1
    const barTop = 168
    const maxBarH = 50

    for (let i = 0; i < 6; i++) {
      const item = sixHour[i] || { time: '00', prob: 0, kp: 0.0, clouds: 0 }
      // Each bar starts exactly 1px after the preceding bar:
      const barX = startX + i * (barW + gap)
      const fillH = Math.max(4, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      // Bar Track (full width 54px, 1px gap)
      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 2
      })
      this.widgets.contentWidgets.push(track)

      // Bar Fill (full width 54px)
      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 2
      })
      this.widgets.contentWidgets.push(fill)

      // Stacked Multiline Text: centered under barX with width barW
      const label = ui.createWidget(ui.widget.TEXT, {
        x: barX,
        y: 224,
        w: barW,
        h: 130,
        text_size: 14,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.time}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }

    // 5. Location Switcher Button at the Bottom (y: 372, h: 36)
    const locBtn = ui.createWidget(ui.widget.BUTTON, {
      x: 123,
      y: 372,
      w: 220,
      h: 36,
      radius: 18,
      normal_color: COLOR_TRACK,
      press_color: 0x334155,
      text_size: 14,
      color: COLOR_WHITE,
      text: `${now.locationName || 'Local GPS'} ▾`,
      click_func: () => {
        this.cycleLocation()
      }
    })
    this.widgets.contentWidgets.push(locBtn)
  },

  // SCREEN 1: 12-Hour Forecast (Centered, Single Title, Strict 1px Bar Gap)
  renderScreen1() {
    const data = this.state.auroraData
    const twelveHour = data.twelveHour || DEFAULT_AURORA_DATA.twelveHour

    // Subtitle Guide (y: 64)
    const guide = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 22,
      text_size: 13,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: 'TIME · PROB · KP · CLOUD'
    })
    this.widgets.contentWidgets.push(guide)

    // 6 Bar Columns (startX = 69, barW = 54, gap = 1)
    const startX = 69
    const barW = 54
    const gap = 1
    const barTop = 104
    const maxBarH = 92

    for (let i = 0; i < 6; i++) {
      const item = twelveHour[i] || { time: '00', prob: 0, kp: 0.0, clouds: 0 }
      const barX = startX + i * (barW + gap)
      const fillH = Math.max(5, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 2
      })
      this.widgets.contentWidgets.push(track)

      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 2
      })
      this.widgets.contentWidgets.push(fill)

      const label = ui.createWidget(ui.widget.TEXT, {
        x: barX,
        y: 206,
        w: barW,
        h: 146,
        text_size: 15,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.time}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  // SCREEN 2: 24-Hour Forecast (Centered, Single Title, Strict 1px Bar Gap)
  renderScreen2() {
    const data = this.state.auroraData
    const twentyFourHour = data.twentyFourHour || DEFAULT_AURORA_DATA.twentyFourHour

    // Subtitle Guide (y: 64)
    const guide = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 22,
      text_size: 13,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: 'TIME · PROB · KP · CLOUD'
    })
    this.widgets.contentWidgets.push(guide)

    // 6 Bar Columns (hours 14, 16, 18, 20, 22, 24)
    const startX = 69
    const barW = 54
    const gap = 1
    const barTop = 104
    const maxBarH = 92

    for (let i = 0; i < 6; i++) {
      const item = twentyFourHour[i] || { time: '00', prob: 0, kp: 0.0, clouds: 0 }
      const barX = startX + i * (barW + gap)
      const fillH = Math.max(5, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 2
      })
      this.widgets.contentWidgets.push(track)

      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 2
      })
      this.widgets.contentWidgets.push(fill)

      const label = ui.createWidget(ui.widget.TEXT, {
        x: barX,
        y: 206,
        w: barW,
        h: 146,
        text_size: 15,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.time}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  // SCREEN 3: 7-Day Forecast (Centered, Single Title, Strict 1px Bar Gap, 7 Days)
  renderScreen3() {
    const data = this.state.auroraData
    const sevenDay = data.sevenDay || DEFAULT_AURORA_DATA.sevenDay

    // Subtitle Guide (y: 64)
    const guide = ui.createWidget(ui.widget.TEXT, {
      x: 60,
      y: 64,
      w: 346,
      h: 22,
      text_size: 13,
      color: COLOR_SUBTLE,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text: 'DAY · PROB · KP · CLOUD'
    })
    this.widgets.contentWidgets.push(guide)

    // 7 Bar Columns (startX = 69, barW = 46, gap = 1, totalW = 328)
    const startX = 69
    const barW = 46
    const gap = 1
    const barTop = 104
    const maxBarH = 92

    for (let i = 0; i < 7; i++) {
      const item = sevenDay[i] || { day: 'DAY', prob: 0, kp: 0.0, clouds: 0 }
      const barX = startX + i * (barW + gap)
      const fillH = Math.max(5, Math.round((item.prob / 100) * maxBarH))
      const colColor = getColorByProb(item.prob)

      const track = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop,
        w: barW,
        h: maxBarH,
        color: COLOR_TRACK,
        radius: 2
      })
      this.widgets.contentWidgets.push(track)

      const fill = ui.createWidget(ui.widget.FILL_RECT, {
        x: barX,
        y: barTop + (maxBarH - fillH),
        w: barW,
        h: fillH,
        color: colColor,
        radius: 2
      })
      this.widgets.contentWidgets.push(fill)

      const label = ui.createWidget(ui.widget.TEXT, {
        x: barX,
        y: 206,
        w: barW,
        h: 146,
        text_size: 14,
        color: COLOR_WHITE,
        align_h: ui.align.CENTER_H,
        text: `${item.day}\n${item.prob}%\n${item.kp.toFixed(1)}\n${item.clouds}%`
      })
      this.widgets.contentWidgets.push(label)
    }
  },

  onDestroy() {
    console.log('[AuroraWatchPage] onDestroy')
    this.clearContentWidgets()
  }
})
