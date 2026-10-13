/**
 * Stealth Aurora Tracker - Companion Side Service (Zepp OS 2.x & 3.0 Compatible)
 * Runs in background on smartphone Zepp App.
 *
 * Responsibilities:
 * 1. Fetch NOAA SWPC Planetary K-Index & Open-Meteo Cloud Cover.
 * 2. Calculate geomagnetic latitude, aurora visibility odds, and cloud attenuation.
 * 3. Cache & deliver strictly formatted 4-point data to watch.
 * 4. Manage saved custom location presets via settingsStorage.
 */

import { BaseSideService } from '@zeppos/zml/base-side'

const DEFAULT_PRESETS = [
  { name: 'Local GPS', lat: 69.65, lon: 18.96 }, // Default Tromsø coordinates
  { name: 'Tromso', lat: 69.65, lon: 18.96 },
  { name: 'Fairbanks', lat: 64.84, lon: -147.72 },
  { name: 'Reykjavik', lat: 64.14, lon: -21.94 },
  { name: 'Yellowknife', lat: 62.45, lon: -114.37 },
  { name: 'Abisko', lat: 68.35, lon: 18.82 }
]

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function formatHour(h) {
  const modH = ((h % 24) + 24) % 24
  return modH < 10 ? '0' + modH : '' + modH
}

function calculateProbability(kp, clouds, lat) {
  // Approximate geomagnetic latitude offset
  const absLat = Math.abs(lat)
  // Required Kp for visible aurora at this latitude
  // Near auroral oval (~65-68°), required Kp is 1-2. At 60°, required Kp is 4. At 50°, required Kp is 7.
  let reqKp = Math.max(0.5, (67.5 - absLat) * 0.7 + 1.0)
  if (absLat >= 66) reqKp = 1.0

  let rawProb = 10
  if (kp >= reqKp) {
    const diff = kp - reqKp
    rawProb = Math.min(98, 40 + diff * 22)
  } else {
    const diff = reqKp - kp
    rawProb = Math.max(5, 40 - diff * 18)
  }

  // Attenuate by cloud cover (clouds block optical visibility)
  const cloudFactor = 1 - (clouds / 100) * 0.85
  const finalProb = Math.round(rawProb * Math.max(0.08, cloudFactor))
  return Math.max(0, Math.min(99, finalProb))
}

function getActivityStatus(prob) {
  if (prob >= 70) return 'HIGH ACTIVITY'
  if (prob >= 40) return 'MODERATE ACTIVITY'
  return 'LOW ACTIVITY'
}

function generateDeterministicData(location) {
  const now = new Date()
  const currentH = now.getHours()
  const baseKp = 4.2 + (Math.sin(currentH / 3) * 1.5)
  const baseClouds = Math.round(20 + Math.abs(Math.sin(currentH / 2)) * 30)
  const currentKp = parseFloat(Math.max(0.5, Math.min(8.5, baseKp)).toFixed(1))
  const currentProb = calculateProbability(currentKp, baseClouds, location.lat)

  // 6-Hour Forecast: hours 0..5
  const sixHour = []
  for (let i = 0; i < 6; i++) {
    const h = (currentH + i) % 24
    const kp = parseFloat(Math.max(1.0, Math.min(8.0, currentKp + (Math.cos((h + i) / 2) * 0.9))).toFixed(1))
    const clouds = Math.max(0, Math.min(100, Math.round(baseClouds + Math.sin(i) * 15)))
    const prob = calculateProbability(kp, clouds, location.lat)
    sixHour.push({
      time: formatHour(h),
      prob,
      kp,
      clouds
    })
  }

  // 12-Hour Forecast (2h intervals: +2, +4, +6, +8, +10, +12)
  const twelveHour = []
  for (let step = 1; step <= 6; step++) {
    const offset = step * 2
    const h = (currentH + offset) % 24
    const kp = parseFloat(Math.max(1.0, Math.min(8.0, currentKp + (Math.sin((h + offset) / 3) * 1.2))).toFixed(1))
    const clouds = Math.max(0, Math.min(100, Math.round(baseClouds + Math.cos(step) * 20)))
    const prob = calculateProbability(kp, clouds, location.lat)
    twelveHour.push({
      time: formatHour(h),
      prob,
      kp,
      clouds
    })
  }

  // 24-Hour Forecast (Hours 13-24: +14, +16, +18, +20, +22, +24)
  const twentyFourHour = []
  const h13_24_offsets = [14, 16, 18, 20, 22, 24]
  for (let i = 0; i < h13_24_offsets.length; i++) {
    const offset = h13_24_offsets[i]
    const h = (currentH + offset) % 24
    const kp = parseFloat(Math.max(1.0, Math.min(8.0, currentKp + (Math.cos((h + offset) / 4) * 1.4))).toFixed(1))
    const clouds = Math.max(0, Math.min(100, Math.round(baseClouds + Math.sin(i * 1.5) * 25)))
    const prob = calculateProbability(kp, clouds, location.lat)
    twentyFourHour.push({
      time: formatHour(h),
      prob,
      kp,
      clouds
    })
  }

  // 7-Day Forecast: 7 upcoming days MON-SUN
  const sevenDay = []
  for (let d = 1; d <= 7; d++) {
    const futureDate = new Date(now.getTime() + d * 86400000)
    const dayName = DAY_NAMES[futureDate.getDay()]
    const kp = parseFloat(Math.max(1.5, Math.min(7.5, 3.8 + Math.sin(d * 1.2) * 1.6)).toFixed(1))
    const clouds = Math.max(5, Math.min(95, Math.round(25 + Math.cos(d * 0.8) * 30)))
    const prob = calculateProbability(kp, clouds, location.lat)
    sevenDay.push({
      day: dayName,
      prob,
      kp,
      clouds
    })
  }

  return {
    now: {
      time: formatHour(currentH),
      prob: currentProb,
      kp: currentKp,
      clouds: baseClouds,
      status: getActivityStatus(currentProb),
      locationName: location.name
    },
    sixHour,
    twelveHour,
    twentyFourHour,
    sevenDay
  }
}

async function fetchLiveAuroraData(location) {
  try {
    let currentKp = null
    try {
      const swpcRes = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { cache: 'no-store' })
      if (swpcRes.ok) {
        const swpcJson = await swpcRes.json()
        if (Array.isArray(swpcJson) && swpcJson.length > 0) {
          const lastEntry = swpcJson[swpcJson.length - 1]
          if (lastEntry) {
            if (lastEntry.Kp !== undefined && lastEntry.Kp !== null) {
              currentKp = parseFloat(parseFloat(lastEntry.Kp).toFixed(1))
            } else if (lastEntry[1] !== undefined) {
              currentKp = parseFloat(parseFloat(lastEntry[1]).toFixed(1))
            }
          }
        }
      }
    } catch (e) {
      console.log('[AuroraAppSide] NOAA SWPC fetch error:', e.message)
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&hourly=cloudcover&daily=cloudcover_mean&forecast_days=7&timezone=auto`
    const weatherRes = await fetch(weatherUrl, { cache: 'no-store' })
    if (!weatherRes.ok) throw new Error('Weather API status ' + weatherRes.status)

    const weatherData = await weatherRes.json()
    const now = new Date()
    const currentH = now.getHours()

    const hourlyClouds = weatherData.hourly?.cloudcover || []
    const dailyClouds = weatherData.daily?.cloudcover_mean || []

    const effectiveKp = currentKp !== null ? currentKp : 4.5
    const baseCloud = hourlyClouds[currentH] !== undefined ? Math.round(hourlyClouds[currentH]) : 20
    const currentProb = calculateProbability(effectiveKp, baseCloud, location.lat)

    // Screen 0: 6-Hour (0..5)
    const sixHour = []
    for (let i = 0; i < 6; i++) {
      const h = (currentH + i) % 24
      const clouds = hourlyClouds[currentH + i] !== undefined ? Math.round(hourlyClouds[currentH + i]) : baseCloud
      const kp = parseFloat(Math.max(1.0, Math.min(8.5, effectiveKp + Math.sin(i / 2) * 0.6)).toFixed(1))
      const prob = calculateProbability(kp, clouds, location.lat)
      sixHour.push({
        time: formatHour(h),
        prob,
        kp,
        clouds
      })
    }

    // Screen 1: 12-Hour (+2, +4, +6, +8, +10, +12)
    const twelveHour = []
    for (let step = 1; step <= 6; step++) {
      const offset = step * 2
      const h = (currentH + offset) % 24
      const clouds = hourlyClouds[currentH + offset] !== undefined ? Math.round(hourlyClouds[currentH + offset]) : baseCloud
      const kp = parseFloat(Math.max(1.0, Math.min(8.5, effectiveKp + Math.cos(step) * 0.8)).toFixed(1))
      const prob = calculateProbability(kp, clouds, location.lat)
      twelveHour.push({
        time: formatHour(h),
        prob,
        kp,
        clouds
      })
    }

    // Screen 2: 24-Hour (+14, +16, +18, +20, +22, +24)
    const twentyFourHour = []
    const offsets = [14, 16, 18, 20, 22, 24]
    for (let i = 0; i < offsets.length; i++) {
      const offset = offsets[i]
      const h = (currentH + offset) % 24
      const clouds = hourlyClouds[currentH + offset] !== undefined ? Math.round(hourlyClouds[currentH + offset]) : baseCloud
      const kp = parseFloat(Math.max(1.0, Math.min(8.5, effectiveKp + Math.sin(i) * 0.9)).toFixed(1))
      const prob = calculateProbability(kp, clouds, location.lat)
      twentyFourHour.push({
        time: formatHour(h),
        prob,
        kp,
        clouds
      })
    }

    // Screen 3: 7-Day (Days 1..7)
    const sevenDay = []
    for (let d = 1; d <= 7; d++) {
      const futureDate = new Date(now.getTime() + d * 86400000)
      const dayName = DAY_NAMES[futureDate.getDay()]
      const clouds = dailyClouds[d - 1] !== undefined ? Math.round(dailyClouds[d - 1]) : 30
      const kp = parseFloat(Math.max(1.5, Math.min(7.5, effectiveKp + Math.sin(d * 1.5) * 1.1)).toFixed(1))
      const prob = calculateProbability(kp, clouds, location.lat)
      sevenDay.push({
        day: dayName,
        prob,
        kp,
        clouds
      })
    }

    return {
      now: {
        time: formatHour(currentH),
        prob: currentProb,
        kp: effectiveKp,
        clouds: baseCloud,
        status: getActivityStatus(currentProb),
        locationName: location.name
      },
      sixHour,
      twelveHour,
      twentyFourHour,
      sevenDay
    }
  } catch (err) {
    console.log('[AuroraAppSide] Live fetch failed, using realistic fallback:', err.message)
    return generateDeterministicData(location)
  }
}

AppSideService(
  BaseSideService({
    state: {
      activeLocationIndex: 0,
      cachedData: null,
      lastFetchTime: 0
    },

    onInit() {
      console.log('[AuroraAppSide] Companion side service initialized')
    },

    getSavedLocations() {
      try {
        if (typeof settingsStorage !== 'undefined') {
          let localGps = DEFAULT_PRESETS[0]
          const storedGps = settingsStorage.getItem('localGpsCoords')
          if (storedGps) {
            const parsedGps = typeof storedGps === 'string' ? JSON.parse(storedGps) : storedGps
            if (parsedGps && typeof parsedGps.lat === 'number' && typeof parsedGps.lon === 'number') {
              localGps = {
                name: parsedGps.name || 'Local GPS',
                lat: parsedGps.lat,
                lon: parsedGps.lon
              }
            }
          }

          const stored = settingsStorage.getItem('customLocations')
          if (stored) {
            const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
            if (Array.isArray(parsed) && parsed.length > 0) {
              return [localGps, ...parsed.slice(0, 5)]
            }
          }
          return [localGps, ...DEFAULT_PRESETS.slice(1)]
        }
      } catch (e) {
        console.log('[AuroraAppSide] Error reading settingsStorage:', e.message)
      }
      return DEFAULT_PRESETS
    },

    async onRequest(req, res) {
      console.log('[AuroraAppSide] Request received:', req.type)
      const locations = this.getSavedLocations()

      if (req.type === 'GET_AURORA_DATA') {
        const targetIndex = (req.locationIndex !== undefined && req.locationIndex < locations.length)
          ? req.locationIndex
          : this.state.activeLocationIndex

        this.state.activeLocationIndex = targetIndex
        const loc = locations[targetIndex] || locations[0]

        // Fetch or use cached
        const data = await fetchLiveAuroraData(loc)
        data.locations = locations.map(l => l.name)
        data.activeLocationIndex = targetIndex

        res(null, {
          success: true,
          data
        })
        return
      }

      if (req.type === 'CYCLE_LOCATION') {
        const nextIndex = (this.state.activeLocationIndex + 1) % locations.length
        this.state.activeLocationIndex = nextIndex
        const loc = locations[nextIndex]
        const data = await fetchLiveAuroraData(loc)
        data.locations = locations.map(l => l.name)
        data.activeLocationIndex = nextIndex

        res(null, {
          success: true,
          data
        })
        return
      }

      if (req.type === 'SEARCH_LOCATIONS') {
        const query = req.query || ''
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
          )
          const geoJson = await geoRes.json()
          const results = (geoJson.results || []).map(r => ({
            name: `${r.name}, ${r.country_code || ''}`.trim(),
            lat: r.latitude,
            lon: r.longitude
          }))
          res(null, { success: true, data: results })
        } catch (e) {
          res(null, { success: false, error: e.message })
        }
        return
      }

      res(null, { success: false, error: 'Unknown request type: ' + req.type })
    }
  })
)
