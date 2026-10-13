import React, { useState, useEffect, useRef } from 'react';
import {
  Watch,
  QrCode,
  Sliders,
  BookOpen,
  Copy,
  Check,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Compass,
  Cloud,
  Zap,
  MapPin,
  RefreshCw,
  Sparkles,
  Layers,
  Radio,
  Search,
  Plus,
  Trash2,
  Loader2,
  Navigation
} from 'lucide-react';
import QRCode from 'qrcode';

// Stealth Apps Color Tokens (Minimalist Luxury AMOLED)
const COLOR_OBSIDIAN = '#000000';        // Pure AMOLED black canvas
const COLOR_TRACK = '#241e38';           // Subtle midnight-violet track
const COLOR_TRACK_BTN = '#19152b';       // Obsidian velvet button surface
const COLOR_PRESS_BTN = '#2d244a';       // Button active press surface
const COLOR_ELECTRIC_PURPLE = '#c084fc'; // High probability >= 70% (Electric purple)
const COLOR_ROYAL_VIOLET = '#8b5cf6';    // Moderate probability 40-69% (Royal violet)
const COLOR_DEEP_VIOLET = '#7c3aed';     // Low probability < 40% (Velvet deep violet)
const COLOR_WHITE = '#f8fafc';           // Optical crisp white
const COLOR_LILAC = '#d8b4fe';           // Soft lilac for secondary telemetry
const COLOR_SUBTLE = '#94a3b8';          // Muted slate for titles / guides

function getColorByProb(prob: number): string {
  if (prob >= 70) return COLOR_ELECTRIC_PURPLE;
  if (prob >= 40) return COLOR_ROYAL_VIOLET;
  return COLOR_DEEP_VIOLET;
}

interface LocationPreset {
  name: string;
  lat: number;
  lon: number;
  defaultClouds?: number;
  defaultKp?: number;
  cityName?: string;
  isLiveGps?: boolean;
}

const DEFAULT_PRESETS: LocationPreset[] = [
  { name: 'Local GPS', lat: 69.65, lon: 18.96, defaultClouds: 18, defaultKp: 4.5 },
  { name: 'Tromso', lat: 69.65, lon: 18.96, defaultClouds: 20, defaultKp: 4.8 },
  { name: 'Fairbanks', lat: 64.84, lon: -147.72, defaultClouds: 35, defaultKp: 5.2 },
  { name: 'Reykjavik', lat: 64.14, lon: -21.94, defaultClouds: 68, defaultKp: 4.2 },
  { name: 'Yellowknife', lat: 62.45, lon: -114.37, defaultClouds: 12, defaultKp: 5.5 },
  { name: 'Abisko', lat: 68.35, lon: 18.82, defaultClouds: 22, defaultKp: 4.9 }
];

const POPULAR_HOTSPOTS: LocationPreset[] = [
  { name: 'Tromso, NO', lat: 69.65, lon: 18.96, defaultClouds: 20, defaultKp: 4.8 },
  { name: 'Fairbanks, US', lat: 64.84, lon: -147.72, defaultClouds: 35, defaultKp: 5.2 },
  { name: 'Reykjavik, IS', lat: 64.14, lon: -21.94, defaultClouds: 68, defaultKp: 4.2 },
  { name: 'Yellowknife, CA', lat: 62.45, lon: -114.37, defaultClouds: 12, defaultKp: 5.5 },
  { name: 'Abisko, SE', lat: 68.35, lon: 18.82, defaultClouds: 22, defaultKp: 4.9 },
  { name: 'Rovaniemi, FI', lat: 66.50, lon: 25.72, defaultClouds: 42, defaultKp: 4.6 },
  { name: 'Kiruna, SE', lat: 67.85, lon: 20.22, defaultClouds: 26, defaultKp: 4.8 },
  { name: 'Anchorage, US', lat: 61.21, lon: -149.90, defaultClouds: 54, defaultKp: 4.0 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'watch' | 'install' | 'settings' | 'guide'>('watch');
  
  // Watch Emulator State
  const [currentScreen, setCurrentScreen] = useState<number>(0); // 0: NOW, 1: 12H, 2: 24H, 3: 7D
  const [watchViewMode, setWatchViewMode] = useState<'app' | 'widget' | 'glance'>('app');
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(0);
  const [refreshNotification, setRefreshNotification] = useState<string>('');
  
  // Real GPS & Live Telemetry State
  const [localGps, setLocalGps] = useState<LocationPreset>(() => {
    try {
      const saved = localStorage.getItem('stealth_local_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return {
      name: 'Local GPS',
      lat: 69.65,
      lon: 18.96,
      defaultClouds: 18,
      defaultKp: 4.5,
      cityName: 'Acquiring GPS...',
      isLiveGps: false
    };
  });
  const [gpsStatus, setGpsStatus] = useState<{
    source: 'gps' | 'ip' | 'default';
    isLoading: boolean;
    cityName: string;
    error: string | null;
    lastUpdated: string | null;
  }>({
    source: 'default',
    isLoading: false,
    cityName: 'Local Area',
    error: null,
    lastUpdated: null
  });

  const [isLiveFetching, setIsLiveFetching] = useState<boolean>(false);
  const [liveHourlyClouds, setLiveHourlyClouds] = useState<number[] | null>(null);
  const [liveDailyClouds, setLiveDailyClouds] = useState<number[] | null>(null);

  // Live Space Weather Parameters (driven by real NOAA & Open-Meteo)
  const [simKp, setSimKp] = useState<number>(4.5);
  const [simClouds, setSimClouds] = useState<number>(18);
  const [savedLocations, setSavedLocations] = useState<LocationPreset[]>(DEFAULT_PRESETS.slice(1));
  
  // Search & Geocoding in Settings Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationPreset[]>([]);
  const [searchError, setSearchError] = useState('');
  
  // Installer Settings
  const [githubRepo, setGithubRepo] = useState('petew1987/zepp-aurora');
  const [installSource, setInstallSource] = useState<'github' | 'live'>('github');
  const [packageFormat, setPackageFormat] = useState<'zab' | 'zpk'>('zab');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Touch & Swipe handlers for watch screen emulator
  const touchStartX = useRef<number | null>(null);

  // Active locations pool includes Local GPS (with live coordinates) + saved presets
  const allLocations = [localGps, ...savedLocations];
  const currentLocation = allLocations[activeLocationIndex] || allLocations[0];

  // Calculate probability based on NOAA Kp, latitude, and cloud cover
  const calcProb = (kp: number, clouds: number, lat: number): number => {
    const absLat = Math.abs(lat);
    let reqKp = Math.max(0.5, (67.5 - absLat) * 0.7 + 1.0);
    if (absLat >= 66) reqKp = 1.0;

    let rawProb = 10;
    if (kp >= reqKp) {
      rawProb = Math.min(98, 40 + (kp - reqKp) * 22);
    } else {
      rawProb = Math.max(5, 40 - (reqKp - kp) * 18);
    }

    const cloudFactor = 1 - (clouds / 100) * 0.85;
    return Math.max(0, Math.min(99, Math.round(rawProb * Math.max(0.08, cloudFactor))));
  };

  const currentProb = calcProb(simKp, simClouds, currentLocation.lat);

  const getActivityStatus = (prob: number) => {
    if (prob >= 70) return 'HIGH ACTIVITY';
    if (prob >= 40) return 'MODERATE ACTIVITY';
    return 'LOW ACTIVITY';
  };

  // Fetches live real-time NOAA SWPC Planetary K-Index and Open-Meteo Cloud Cover
  const fetchLiveTelemetry = async (lat: number, lon: number, locationName: string) => {
    setIsLiveFetching(true);
    let resolvedKp = simKp;
    let resolvedClouds = simClouds;

    // 1. Live NOAA SWPC Planetary K-Index
    try {
      const swpcRes = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { cache: 'no-store' });
      if (swpcRes.ok) {
        const swpcJson = await swpcRes.json();
        if (Array.isArray(swpcJson) && swpcJson.length > 0) {
          const last = swpcJson[swpcJson.length - 1];
          const val = last.Kp !== undefined && last.Kp !== null ? last.Kp : (last[1] !== undefined ? last[1] : null);
          if (val !== null && val !== undefined) {
            const parsed = parseFloat(parseFloat(val).toFixed(1));
            if (!isNaN(parsed)) {
              resolvedKp = parsed;
              setSimKp(parsed);
            }
          }
        }
      }
    } catch (err) {
      console.log('[LiveTelemetry] NOAA fetch error:', err);
    }

    // 2. Live Open-Meteo Cloud Cover & Weather
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover&hourly=cloud_cover&daily=cloud_cover_mean&forecast_days=7&timezone=auto`;
      const weatherRes = await fetch(weatherUrl, { cache: 'no-store' });
      if (weatherRes.ok) {
        const weatherJson = await weatherRes.json();
        const currentH = new Date().getHours();
        const curCloud = weatherJson.current?.cloud_cover !== undefined
          ? Math.round(weatherJson.current.cloud_cover)
          : (weatherJson.hourly?.cloud_cover?.[currentH] !== undefined
              ? Math.round(weatherJson.hourly.cloud_cover[currentH])
              : 20);

        resolvedClouds = curCloud;
        setSimClouds(curCloud);

        if (Array.isArray(weatherJson.hourly?.cloud_cover)) {
          setLiveHourlyClouds(weatherJson.hourly.cloud_cover.map((c: number) => Math.round(c)));
        }
        if (Array.isArray(weatherJson.daily?.cloud_cover_mean)) {
          setLiveDailyClouds(weatherJson.daily.cloud_cover_mean.map((c: number) => Math.round(c)));
        }
      }
    } catch (err) {
      console.log('[LiveTelemetry] Weather fetch error:', err);
    }

    setIsLiveFetching(false);
    setRefreshNotification(`Live Data: ${locationName} · Kp ${resolvedKp} · ${resolvedClouds}% Clouds`);
    setTimeout(() => setRefreshNotification(''), 3000);
  };

  // Acquires user's real GPS coordinates via IP geolocator (ipinfo.io) with browser geolocation fallback
  const acquireRealGps = async () => {
    setGpsStatus(prev => ({ ...prev, isLoading: true, error: null }));

    const applyGpsCoords = async (lat: number, lon: number, source: 'gps' | 'ip', cityNameHint?: string) => {
      let detectedCity = cityNameHint || '';
      if (!detectedCity) {
        try {
          const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { 'Accept': 'application/json' }
          });
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            const addr = nomData.address || {};
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || '';
            const country = addr.country_code ? addr.country_code.toUpperCase() : '';
            detectedCity = city ? (country ? `${city}, ${country}` : city) : '';
          }
        } catch (e) {
          console.log('[GPS] Reverse geocoding error:', e);
        }
      }

      const cityLabel = detectedCity || `${lat > 0 ? lat.toFixed(1) + '°N' : Math.abs(lat).toFixed(1) + '°S'}, ${lon > 0 ? lon.toFixed(1) + '°E' : Math.abs(lon).toFixed(1) + '°W'}`;

      const updatedLocalGps: LocationPreset = {
        name: 'Local GPS',
        lat,
        lon,
        defaultClouds: simClouds,
        defaultKp: simKp,
        cityName: cityLabel,
        isLiveGps: true
      };

      setLocalGps(updatedLocalGps);
      try {
        localStorage.setItem('stealth_local_gps', JSON.stringify(updatedLocalGps));
      } catch (e) {}

      setGpsStatus({
        source,
        isLoading: false,
        cityName: cityLabel,
        error: null,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      await fetchLiveTelemetry(lat, lon, `Local GPS (${cityLabel})`);
    };

    // 1. Try robust IP geolocation first (ipinfo.io)
    try {
      const ipRes = await fetch('https://ipinfo.io/json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData && ipData.loc) {
          const parts = ipData.loc.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parseFloat(parts[0]).toFixed(2));
            const lon = parseFloat(parseFloat(parts[1]).toFixed(2));
            const city = ipData.city ? `${ipData.city}, ${ipData.country || ''}` : '';
            await applyGpsCoords(lat, lon, 'ip', city);
            return;
          }
        }
      }
    } catch (ipErr) {
      console.log('[GPS] IP location fallback failed:', ipErr);
    }

    // 2. Fall back to browser HTML5 geolocation
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(2));
          const lon = parseFloat(pos.coords.longitude.toFixed(2));
          await applyGpsCoords(lat, lon, 'gps');
        },
        async (err) => {
          console.log('[GPS] Browser geolocation rejected/timed out:', err.message);
          setGpsStatus(prev => ({
            ...prev,
            isLoading: false,
            error: 'GPS acquisition failed. Using default region.'
          }));
          await fetchLiveTelemetry(localGps.lat, localGps.lon, localGps.name);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setGpsStatus(prev => ({ ...prev, isLoading: false, error: 'Geolocation not supported.' }));
      await fetchLiveTelemetry(localGps.lat, localGps.lon, localGps.name);
    }
  };

  // Automatically acquire real GPS coordinates and live space weather on load!
  useEffect(() => {
    acquireRealGps();
  }, []);

  // Screen 0: 6-Hour Forecast (uses real live hourly cloud cover when available)
  const currentH = new Date().getHours();
  const sixHourForecast = [0, 1, 2, 3, 4, 5].map((offset) => {
    const time = ((currentH + offset) % 24).toString().padStart(2, '0');
    const kp = parseFloat(Math.max(1.0, Math.min(8.5, simKp + Math.sin(offset / 1.5) * 0.4)).toFixed(1));
    const clouds = liveHourlyClouds && liveHourlyClouds[currentH + offset] !== undefined
      ? liveHourlyClouds[currentH + offset]
      : Math.max(0, Math.min(100, Math.round(simClouds + Math.sin(offset) * 10)));
    const prob = calcProb(kp, clouds, currentLocation.lat);
    return { time, prob, kp, clouds };
  });

  // Screen 1: 12-Hour Forecast (+2, +4, +6, +8, +10, +12)
  const twelveHourForecast = [2, 4, 6, 8, 10, 12].map((offset) => {
    const time = ((currentH + offset) % 24).toString().padStart(2, '0');
    const kp = parseFloat(Math.max(1.0, Math.min(8.5, simKp + Math.cos(offset / 3) * 0.6)).toFixed(1));
    const clouds = liveHourlyClouds && liveHourlyClouds[currentH + offset] !== undefined
      ? liveHourlyClouds[currentH + offset]
      : Math.max(0, Math.min(100, Math.round(simClouds + Math.cos(offset / 2) * 15)));
    const prob = calcProb(kp, clouds, currentLocation.lat);
    return { time, prob, kp, clouds };
  });

  // Screen 2: 24-Hour Forecast (Strictly Hours 13-24: +14, +16, +18, +20, +22, +24)
  const twentyFourHourForecast = [14, 16, 18, 20, 22, 24].map((offset) => {
    const time = ((currentH + offset) % 24).toString().padStart(2, '0');
    const kp = parseFloat(Math.max(1.0, Math.min(8.5, simKp + Math.sin(offset / 4) * 0.8)).toFixed(1));
    const clouds = liveHourlyClouds && liveHourlyClouds[currentH + offset] !== undefined
      ? liveHourlyClouds[currentH + offset]
      : Math.max(0, Math.min(100, Math.round(simClouds + Math.sin(offset / 3) * 18)));
    const prob = calcProb(kp, clouds, currentLocation.lat);
    return { time, prob, kp, clouds };
  });

  // Screen 3: 7-Day Forecast (Strictly 3-char day names)
  const sevenDayForecast = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
    const futureDate = new Date(Date.now() + dayOffset * 86400000);
    const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][futureDate.getDay()];
    const kp = parseFloat(Math.max(1.5, Math.min(7.5, simKp + Math.sin((dayOffset + 1) * 1.3) * 1.1)).toFixed(1));
    const clouds = liveDailyClouds && liveDailyClouds[dayOffset] !== undefined
      ? liveDailyClouds[dayOffset]
      : Math.max(5, Math.min(95, Math.round(simClouds + Math.cos(dayOffset) * 20)));
    const prob = calcProb(kp, clouds, currentLocation.lat);
    return { day, prob, kp, clouds };
  });

  // Peak prob for active screen's perimeter bezel arc
  const getActiveScreenPeakProb = () => {
    if (currentScreen === 0) return currentProb;
    if (currentScreen === 1) return Math.max(...twelveHourForecast.map(f => f.prob));
    if (currentScreen === 2) return Math.max(...twentyFourHourForecast.map(f => f.prob));
    return Math.max(...sevenDayForecast.map(f => f.prob));
  };

  const peakProb = getActiveScreenPeakProb();
  const screenTitles = ['NOW', '12H OUTLOOK', '24H (13-24H)', '7-DAY OUTLOOK'];

  // Refreshes the forecast to match a newly selected location with real live data
  const refreshLocationData = async (loc: LocationPreset) => {
    const targetLat = loc.name === 'Local GPS' ? localGps.lat : loc.lat;
    const targetLon = loc.name === 'Local GPS' ? localGps.lon : loc.lon;
    const label = loc.name === 'Local GPS' ? (localGps.cityName || 'Local GPS') : loc.name;

    await fetchLiveTelemetry(targetLat, targetLon, label);
  };

  // Cycle location on watch pill tap
  const handleCycleLocation = () => {
    const nextIdx = (activeLocationIndex + 1) % allLocations.length;
    setActiveLocationIndex(nextIdx);
    const nextLoc = allLocations[nextIdx];
    refreshLocationData(nextLoc);
  };

  // Select location explicitly from list
  const handleSelectLocation = (idx: number) => {
    setActiveLocationIndex(idx);
    const loc = allLocations[idx];
    if (loc) {
      refreshLocationData(loc);
    }
  };

  // Touch Swipe on watch face
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX.current === null) return;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        // Swipe Left -> Next screen
        setCurrentScreen(prev => (prev + 1) % 4);
      } else {
        // Swipe Right -> Prev screen
        setCurrentScreen(prev => (prev - 1 + 4) % 4);
      }
    }
  };

  // Perform Open-Meteo Geocoding search
  const handleSearchLocations = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      setSearchError('Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          const mapped: LocationPreset[] = data.results.map((r: { name: string; country_code?: string; latitude: number; longitude: number }) => {
            const lat = parseFloat(r.latitude.toFixed(2));
            const lon = parseFloat(r.longitude.toFixed(2));
            const defaultClouds = Math.round(15 + Math.abs(Math.sin(lat * 12.98 + lon * 7.82)) * 50);
            const defaultKp = parseFloat((3.8 + Math.abs(Math.cos(lat * 5.1)) * 1.8).toFixed(1));
            return {
              name: `${r.name}${r.country_code ? ', ' + r.country_code : ''}`,
              lat,
              lon,
              defaultClouds,
              defaultKp
            };
          });
          setSearchResults(mapped);
          setSearchError('');
        } else {
          setSearchResults([]);
          setSearchError(`No locations found matching "${query}"`);
        }
      } else {
        setSearchError('Geocoding service unavailable.');
      }
    } catch {
      setSearchError('Network error searching location.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add location to presets
  const handleAddPreset = (loc: LocationPreset) => {
    if (savedLocations.some(l => l.name === loc.name)) return;
    if (savedLocations.length >= 5) {
      setSearchError('Maximum of 5 custom presets allowed. Please remove one first.');
      return;
    }
    const updated = [...savedLocations, loc];
    setSavedLocations(updated);
    // Switch to newly added location
    setActiveLocationIndex(updated.length); // index in allLocations
    refreshLocationData(loc);
  };

  // QR Code generator logic
  const getActiveDownloadUrl = () => {
    if (installSource === 'github') {
      const cleanRepo = githubRepo.trim() || 'petew1987/zepp-aurora';
      return `https://github.com/${cleanRepo}/releases/latest/download/aurora.${packageFormat}`;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
    return `${origin}/aurora.${packageFormat}`;
  };

  const getActiveZpkd1Url = () => {
    const rawUrl = getActiveDownloadUrl();
    return `zpkd1://${rawUrl.replace(/^https?:\/\//, '')}`;
  };

  useEffect(() => {
    const uri = getActiveZpkd1Url();
    QRCode.toDataURL(uri, {
      width: 260,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then((url: string) => setQrDataUrl(url))
      .catch((err: unknown) => console.error('QR error:', err));
  }, [installSource, packageFormat, githubRepo]);

  const copyScheme = () => {
    navigator.clipboard.writeText(getActiveZpkd1Url());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased selection:bg-purple-600/30 selection:text-purple-300 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-black/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white">Stealth Aurora</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                  Zepp OS 3.x / 2.x
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Amazfit Active 3 (466x466 AMOLED Round)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg">
              <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>NOAA Space Weather</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-28">
        {/* TAB 1: WATCH EMULATOR & TESTER */}
        {activeTab === 'watch' && (
          <div className="space-y-6">
            {/* View Mode Segment & Screen Switcher */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex p-1 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-medium">
                <button
                  onClick={() => setWatchViewMode('app')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    watchViewMode === 'app' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Full App (4 Screens)
                </button>
                <button
                  onClick={() => setWatchViewMode('widget')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    watchViewMode === 'widget' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  App Widget (466x466)
                </button>
                <button
                  onClick={() => setWatchViewMode('glance')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    watchViewMode === 'glance' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Glance Card (466x180)
                </button>
              </div>

              {watchViewMode === 'app' && (
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-xl">
                  <button
                    onClick={() => setCurrentScreen((prev) => (prev - 1 + 4) % 4)}
                    className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-300 transition-colors"
                    title="Previous Screen (or swipe on watch face)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-zinc-300 px-1.5">
                    {screenTitles[currentScreen]} ({currentScreen + 1}/4)
                  </span>
                  <button
                    onClick={() => setCurrentScreen((prev) => (prev + 1) % 4)}
                    className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-300 transition-colors"
                    title="Next Screen (or swipe on watch face)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Notice Toast */}
            {refreshNotification && (
              <div className="flex items-center justify-center">
                <div className="px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-medium flex items-center gap-1.5 animate-fadeIn">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{refreshNotification}</span>
                </div>
              </div>
            )}

            {/* Physical Watch Chassis (466x466 AMOLED Round Screen, Zero Interruption on Circle) */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative p-3 rounded-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-black shadow-2xl border border-zinc-800">
                {/* Watch Bezel Outer Rim */}
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleTouchStart}
                  onMouseUp={handleTouchEnd}
                  className="relative w-[360px] h-[360px] sm:w-[466px] sm:h-[466px] rounded-full bg-black overflow-hidden select-none border-2 border-zinc-900 cursor-grab active:cursor-grabbing"
                  title="Swipe horizontally across the watch face to switch screens"
                >
                  {/* VIEW 1: FULL WATCH APPLICATION */}
                  {watchViewMode === 'app' && (
                    <div className="relative w-full h-full text-center flex flex-col justify-between py-4">
                      {/* Outer Perimeter Bezel Arcs - TOP SEMICIRCLE (9 o'clock to 3 o'clock arch over top) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 466 466">
                        {/* Background Track Arc (9 o'clock to 3 o'clock over the top) */}
                        <path
                          d="M 9 233 A 224 224 0 0 1 457 233"
                          fill="none"
                          stroke={COLOR_TRACK}
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        {/* Dynamic Chance Indicator Arc (Sweeps 9 o'clock -> 12 o'clock -> 3 o'clock) */}
                        <path
                          d="M 9 233 A 224 224 0 0 1 457 233"
                          fill="none"
                          stroke={getColorByProb(peakProb)}
                          strokeWidth="14"
                          strokeDasharray={`${(peakProb / 100) * (Math.PI * 224)} ${Math.PI * 224}`}
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Single Unified Bezel Title (Top Rim) */}
                      <div className="pt-1 z-10">
                        <span className="text-[13px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                          {screenTitles[currentScreen]}
                        </span>
                      </div>

                      {/* SCREEN 0: NOW + 6-HOUR FORECAST (Vertically Centered, Location Switcher at Bottom, Strict 1px Gap) */}
                      {currentScreen === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 space-y-1">
                          {/* Upper Metrics */}
                          <div
                            className="text-[14px] sm:text-[15px] font-bold font-mono tracking-wide"
                            style={{ color: COLOR_LILAC }}
                          >
                            KP {simKp.toFixed(1)} &nbsp; · &nbsp; CLOUD {simClouds}%
                          </div>

                          {/* Hero Probability */}
                          <div
                            className="text-4xl sm:text-[42px] font-extrabold tracking-tight leading-none"
                            style={{ color: getColorByProb(currentProb) }}
                          >
                            {currentProb}%
                          </div>

                          {/* Activity Status */}
                          <div className="text-[12px] font-bold text-slate-100 uppercase tracking-wider">
                            {getActivityStatus(currentProb)}
                          </div>

                          {/* 6 Bar Chart Columns with STRICT 1px Horizontal Gap Between Bars */}
                          <div className="flex w-full max-w-[330px] sm:max-w-[348px] pt-1 items-end justify-center">
                            {sixHourForecast.map((col, i) => {
                              const barHeight = Math.max(5, Math.round((col.prob / 100) * 48));
                              const color = getColorByProb(col.prob);
                              return (
                                <div
                                  key={i}
                                  className="flex-1 flex flex-col items-center"
                                  style={{ marginRight: i < 5 ? '1px' : '0' }}
                                >
                                  {/* Bar Track & Fill (Wider bar filling 100% of column width with 1px margin) */}
                                  <div
                                    className="w-full h-12 rounded-xs relative flex flex-col justify-end overflow-hidden"
                                    style={{ backgroundColor: COLOR_TRACK }}
                                  >
                                    <div
                                      className="w-full transition-all"
                                      style={{ height: `${barHeight}px`, backgroundColor: color }}
                                    />
                                  </div>
                                  {/* Stacked 4-Point Data (Time, Prob, Kp, Clouds) */}
                                  <div className="mt-1 w-full text-center text-[11px] sm:text-[13px] font-mono leading-tight flex flex-col items-center">
                                    <span className="font-bold text-slate-100">{col.time}</span>
                                    <span className="font-bold" style={{ color }}>{col.prob}%</span>
                                    <span style={{ color: COLOR_LILAC }}>{col.kp.toFixed(1)}</span>
                                    <span style={{ color: COLOR_SUBTLE }}>{col.clouds}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Location Switcher Button at the Bottom */}
                          <div className="pt-2">
                            <button
                              onClick={handleCycleLocation}
                              style={{ backgroundColor: COLOR_TRACK_BTN }}
                              className="px-4 py-1.5 rounded-full hover:brightness-125 active:scale-95 text-slate-100 text-[12px] sm:text-[13px] font-medium flex items-center gap-1.5 transition-all border border-[#2d244a] shadow-md"
                              title="Tap to cycle and refresh to newly selected location"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#c084fc]" />
                              <span>{currentLocation.name} ▾</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SCREEN 1: 12-HOUR FORECAST (Strict 1px Gap) */}
                      {currentScreen === 1 && (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 space-y-2">
                          <div
                            className="text-[12px] tracking-wider font-mono"
                            style={{ color: COLOR_SUBTLE }}
                          >
                            TIME · PROB · KP · CLOUD
                          </div>

                          {/* 6 Bar Columns with STRICT 1px Horizontal Gap */}
                          <div className="flex w-full max-w-[330px] sm:max-w-[348px] pt-1 items-end justify-center">
                            {twelveHourForecast.map((col, i) => {
                              const barHeight = Math.max(6, Math.round((col.prob / 100) * 88));
                              const color = getColorByProb(col.prob);
                              return (
                                <div
                                  key={i}
                                  className="flex-1 flex flex-col items-center"
                                  style={{ marginRight: i < 5 ? '1px' : '0' }}
                                >
                                  <div
                                    className="w-full h-20 sm:h-24 rounded-xs relative flex flex-col justify-end overflow-hidden"
                                    style={{ backgroundColor: COLOR_TRACK }}
                                  >
                                    <div
                                      className="w-full transition-all"
                                      style={{ height: `${barHeight}px`, backgroundColor: color }}
                                    />
                                  </div>
                                  <div className="mt-2 w-full text-center text-[12px] sm:text-[14px] font-mono leading-tight flex flex-col items-center">
                                    <span className="font-bold text-slate-100">{col.time}</span>
                                    <span className="font-bold" style={{ color }}>{col.prob}%</span>
                                    <span style={{ color: COLOR_LILAC }}>{col.kp.toFixed(1)}</span>
                                    <span style={{ color: COLOR_SUBTLE }}>{col.clouds}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* SCREEN 2: 24-HOUR FORECAST (Hours 13-24, Strict 1px Gap) */}
                      {currentScreen === 2 && (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 space-y-2">
                          <div
                            className="text-[12px] tracking-wider font-mono"
                            style={{ color: COLOR_SUBTLE }}
                          >
                            TIME · PROB · KP · CLOUD
                          </div>

                          <div className="flex w-full max-w-[330px] sm:max-w-[348px] pt-1 items-end justify-center">
                            {twentyFourHourForecast.map((col, i) => {
                              const barHeight = Math.max(6, Math.round((col.prob / 100) * 88));
                              const color = getColorByProb(col.prob);
                              return (
                                <div
                                  key={i}
                                  className="flex-1 flex flex-col items-center"
                                  style={{ marginRight: i < 5 ? '1px' : '0' }}
                                >
                                  <div
                                    className="w-full h-20 sm:h-24 rounded-xs relative flex flex-col justify-end overflow-hidden"
                                    style={{ backgroundColor: COLOR_TRACK }}
                                  >
                                    <div
                                      className="w-full transition-all"
                                      style={{ height: `${barHeight}px`, backgroundColor: color }}
                                    />
                                  </div>
                                  <div className="mt-2 w-full text-center text-[12px] sm:text-[14px] font-mono leading-tight flex flex-col items-center">
                                    <span className="font-bold text-slate-100">{col.time}</span>
                                    <span className="font-bold" style={{ color }}>{col.prob}%</span>
                                    <span style={{ color: COLOR_LILAC }}>{col.kp.toFixed(1)}</span>
                                    <span style={{ color: COLOR_SUBTLE }}>{col.clouds}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* SCREEN 3: 7-DAY FORECAST (Strict 1px Gap, 7 Days) */}
                      {currentScreen === 3 && (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 space-y-2">
                          <div
                            className="text-[12px] tracking-wider font-mono"
                            style={{ color: COLOR_SUBTLE }}
                          >
                            DAY · PROB · KP · CLOUD
                          </div>

                          <div className="flex w-full max-w-[330px] sm:max-w-[348px] pt-1 items-end justify-center">
                            {sevenDayForecast.map((col, i) => {
                              const barHeight = Math.max(6, Math.round((col.prob / 100) * 88));
                              const color = getColorByProb(col.prob);
                              return (
                                <div
                                  key={i}
                                  className="flex-1 flex flex-col items-center"
                                  style={{ marginRight: i < 6 ? '1px' : '0' }}
                                >
                                  <div
                                    className="w-full h-20 sm:h-24 rounded-xs relative flex flex-col justify-end overflow-hidden"
                                    style={{ backgroundColor: COLOR_TRACK }}
                                  >
                                    <div
                                      className="w-full transition-all"
                                      style={{ height: `${barHeight}px`, backgroundColor: color }}
                                    />
                                  </div>
                                  <div className="mt-2 w-full text-center text-[11px] sm:text-[13px] font-mono leading-tight flex flex-col items-center">
                                    <span className="font-bold text-slate-100">{col.day}</span>
                                    <span className="font-bold" style={{ color }}>{col.prob}%</span>
                                    <span style={{ color: COLOR_LILAC }}>{col.kp.toFixed(1)}</span>
                                    <span style={{ color: COLOR_SUBTLE }}>{col.clouds}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* VIEW 2: PRIMARY APP WIDGET (466x466 carousel widget) */}
                  {watchViewMode === 'widget' && (
                    <div className="relative w-full h-full text-center flex flex-col items-center justify-center p-8 select-none">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 466 466">
                        <path
                          d="M 9 233 A 224 224 0 0 1 457 233"
                          fill="none"
                          stroke={COLOR_TRACK}
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 9 233 A 224 224 0 0 1 457 233"
                          fill="none"
                          stroke={getColorByProb(currentProb)}
                          strokeWidth="14"
                          strokeDasharray={`${(currentProb / 100) * (Math.PI * 224)} ${Math.PI * 224}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="z-10 space-y-2">
                        <div
                          className="text-sm font-semibold tracking-wider uppercase font-mono"
                          style={{ color: COLOR_SUBTLE }}
                        >
                          AURORA TRACKER
                        </div>
                        <div
                          className="text-5xl font-black tracking-tight"
                          style={{ color: getColorByProb(currentProb) }}
                        >
                          {currentProb}%
                        </div>
                        <div className="text-xs font-semibold uppercase text-slate-100">
                          {getActivityStatus(currentProb)}
                        </div>
                        <div
                          className="text-sm font-bold font-mono"
                          style={{ color: COLOR_LILAC }}
                        >
                          KP {simKp.toFixed(1)} · CLOUD {simClouds}%
                        </div>
                        <div
                          className="text-xs pt-2 font-mono"
                          style={{ color: COLOR_SUBTLE }}
                        >
                          {currentLocation.name} · Tap to open
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW 3: SECONDARY GLANCE WIDGET (466x180 card) */}
                  {watchViewMode === 'glance' && (
                    <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
                      <div className="w-full bg-[#130f1e] border border-[#2d2242] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div
                            className="px-3.5 py-1.5 rounded-xl font-bold text-xl text-black flex items-center justify-center"
                            style={{ backgroundColor: getColorByProb(currentProb) }}
                          >
                            {currentProb}%
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold" style={{ color: COLOR_LILAC }}>
                              AURORA GLANCE
                            </div>
                            <div className="text-[11px] text-slate-200">{getActivityStatus(currentProb)}</div>
                          </div>
                        </div>
                        <div className="text-xs font-mono border-t border-[#2d2242] pt-2 flex justify-between" style={{ color: COLOR_SUBTLE }}>
                          <span style={{ color: COLOR_LILAC }}>KP {simKp.toFixed(1)} · CLOUD {simClouds}%</span>
                          <span className="text-slate-300 font-semibold">{currentLocation.name}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Switch Location Bar */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-zinc-300 font-medium">Quick Location Switch:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {allLocations.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      idx === activeLocationIndex
                        ? 'bg-purple-600 text-white font-semibold shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {loc.name.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Space Weather & Atmosphere Simulation Panel */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Live Space Weather Controls
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">Fine Tuning</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kp Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Planetary K-Index:
                    </span>
                    <span className="font-mono font-bold text-white">{simKp.toFixed(1)} Kp</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    step="0.1"
                    value={simKp}
                    onChange={(e) => setSimKp(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Quiet (0-2)</span>
                    <span>Unsettled (3-4)</span>
                    <span>Storm (G1-G5: 5-9)</span>
                  </div>
                </div>

                {/* Cloud Cover Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-slate-400" />
                      Cloud Cover Attenuation:
                    </span>
                    <span className="font-mono font-bold text-white">{simClouds}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={simClouds}
                    onChange={(e) => setSimClouds(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Clear (0%)</span>
                    <span>Scattered (50%)</span>
                    <span>Overcast (100%)</span>
                  </div>
                </div>
              </div>

              {/* Quick Scenario Buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-900/80">
                <button
                  onClick={() => { setSimKp(6.8); setSimClouds(10); }}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 text-xs font-medium border border-purple-800/40 flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  G3 Geomagnetic Storm (Kp 6.8, Clear)
                </button>
                <button
                  onClick={() => { setSimKp(4.2); setSimClouds(92); }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 flex items-center gap-1.5 transition-all"
                >
                  <Cloud className="w-3 h-3 text-slate-400" />
                  Overcast Sky (Kp 4.2, 92% Cloud)
                </button>
                <button
                  onClick={() => { setSimKp(1.8); setSimClouds(5); }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3 h-3 text-purple-400" />
                  Quiet Baseline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSTALL VIA QR CODE */}
        {activeTab === 'install' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Install on Amazfit Active 3</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Scan with the Developer Mode QR scanner in the smartphone Zepp App.
              </p>
            </div>

            {/* Source Segment Control */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-medium">
              <button
                onClick={() => setInstallSource('github')}
                className={`py-2 rounded-lg transition-all ${
                  installSource === 'github'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                GitHub Release (zepp-aurora)
              </button>
              <button
                onClick={() => setInstallSource('live')}
                className={`py-2 rounded-lg transition-all ${
                  installSource === 'live'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Live Web Server
              </button>
            </div>

            {/* GitHub Repo Input */}
            {installSource === 'github' && (
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Target GitHub Repository:</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repository"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* Format Toggle (.zab bundle vs .zpk) */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-400">Package Format:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPackageFormat('zab')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    packageFormat === 'zab'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  .zab Multi-Platform Bundle
                </button>
                <button
                  onClick={() => setPackageFormat('zpk')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    packageFormat === 'zpk'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  .zpk Single
                </button>
              </div>
            </div>

            {/* QR Code Presentation */}
            <div className="flex flex-col items-center justify-center py-3">
              <div className="p-4 bg-white rounded-2xl shadow-xl">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Zepp OS QR Installer" className="w-52 h-52 sm:w-60 sm:h-60" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-zinc-400">
                    Generating QR code...
                  </div>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 mt-2 font-mono">
                {installSource === 'github' ? `${githubRepo} · aurora.${packageFormat}` : `Live server · aurora.${packageFormat}`}
              </span>
            </div>

            {/* Numbered Steps */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Installation Steps on Amazfit Active 3
              </h3>
              <div className="divide-y divide-zinc-900 border-t border-b border-zinc-900 text-xs">
                <div className="py-2.5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span className="text-zinc-300">
                    Open <strong>Zepp App</strong> &rarr; Profile &rarr; Settings &rarr; About &rarr; tap Zepp logo 7 times until Developer Mode enabled popup appears.
                  </span>
                </div>
                <div className="py-2.5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span className="text-zinc-300">
                    Return to <strong>Profile &rarr; Amazfit Active 3 &rarr; Developer Mode</strong>.
                  </span>
                </div>
                <div className="py-2.5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span className="text-zinc-300">
                    Tap the <strong>QR scanner icon</strong> in top right and scan the QR code above.
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={copyScheme}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-purple-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                {copied ? 'Link Copied' : 'Copy Install Link (zpkd1://)'}
              </button>

              <a
                href={getActiveDownloadUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-zinc-400" />
                Test Download
              </a>

              <a
                href="/aurora.zab"
                download="aurora.zab"
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-950/30"
              >
                <Download className="w-4 h-4" />
                Download .zab
              </a>
            </div>
          </div>
        )}

        {/* TAB 3: SMARTPHONE SETTINGS PREVIEW & LOCATION SEARCH */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            {/* Stealth Apps Brand Signature Header */}
            <div className="p-4 rounded-2xl bg-[#130f1e] border border-[#3b2d54] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#c084fc] tracking-[0.18em] uppercase">
                  STEALTH APPS
                </span>
                <span className="text-[10px] font-bold text-[#e9d5ff] bg-[#3b1d60] px-2 py-0.5 rounded-md">
                  SIGNATURE
                </span>
              </div>
              <div className="text-base font-bold text-[#f8fafc]">
                Aurora Tracker · Companion Settings
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Manage observation coordinates and customize synced presets for your Amazfit watch.
              </p>
            </div>

            {/* GPS Local Card */}
            <div className="p-4 rounded-xl bg-[#130f1e] border border-[#2d2242] flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-purple-400" />
                  Local GPS (Automatic)
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Tracks device GPS coordinates and maps geomagnetic oval offset.
                </div>
              </div>
              <button
                onClick={() => handleSelectLocation(0)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                  activeLocationIndex === 0
                    ? 'bg-[#3b1d60] text-purple-200 border-purple-700/60'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {activeLocationIndex === 0 ? 'ACTIVE ON WATCH' : 'SET ACTIVE'}
              </button>
            </div>

            {/* Location Search Input & Online Search */}
            <div className="p-4 rounded-xl bg-[#130f1e] border border-[#2d2242] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Search & Add Location
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">Open-Meteo Geocoding API</span>
              </div>

              <form onSubmit={handleSearchLocations} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city (e.g. Tromso, Kiruna, Rovaniemi, Fairbanks)..."
                  className="flex-1 bg-[#1c162b] border border-[#2d2242] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </form>

              {searchError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg">
                  {searchError}
                </div>
              )}

              {/* Search Results Display */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#2d2242]">
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                    Search Results ({searchResults.length}):
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.map((res, i) => {
                      const alreadyAdded = savedLocations.some(l => l.name === res.name);
                      const isFull = savedLocations.length >= 5;
                      return (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-[#1c162b] border border-[#2d2242] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">{res.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {res.lat.toFixed(2)}°N, {res.lon.toFixed(2)}°E
                            </div>
                          </div>
                          <button
                            disabled={alreadyAdded || isFull}
                            onClick={() => handleAddPreset(res)}
                            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                              alreadyAdded
                                ? 'bg-[#3b1d60] text-purple-200 border border-purple-700/60 cursor-default'
                                : isFull
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                          >
                            {alreadyAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                {isFull ? 'Limit (5/5)' : 'Add'}
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Saved Locations List */}
            <div className="p-4 rounded-xl bg-[#130f1e] border border-[#2d2242] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Custom Location Presets ({savedLocations.length}/5)
                </h3>
                <span className="text-[11px] text-zinc-400">Synced to Watch Screen 0</span>
              </div>

              <div className="space-y-2">
                {savedLocations.map((loc, idx) => {
                  const locationIndexInAll = idx + 1;
                  const isActive = activeLocationIndex === locationIndexInAll;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#1c162b] border border-[#2d2242] flex items-center justify-between text-xs"
                    >
                      <div className="cursor-pointer" onClick={() => handleSelectLocation(locationIndexInAll)}>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{loc.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-bold text-purple-300 bg-[#3b1d60] px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-400 font-mono text-[11px]">
                          {loc.lat.toFixed(2)}°N, {loc.lon.toFixed(2)}°E · Tap to activate on watch
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectLocation(locationIndexInAll)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            isActive
                              ? 'bg-purple-600 text-white font-semibold'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          Select
                        </button>
                        <button
                          onClick={() => setSavedLocations(prev => prev.filter((_, i) => i !== idx))}
                          className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 text-[11px] flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Quick Preset */}
              <div className="pt-2 border-t border-[#2d2242] space-y-2">
                <span className="text-xs text-zinc-400">Popular Aurora Observatories:</span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_HOTSPOTS.map((hotspot, i) => {
                    const isAdded = savedLocations.some(l => l.name === hotspot.name);
                    return (
                      <button
                        key={i}
                        disabled={isAdded || savedLocations.length >= 5}
                        onClick={() => {
                          if (!isAdded && savedLocations.length < 5) {
                            handleAddPreset(hotspot);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          isAdded
                            ? 'bg-[#3b1d60] text-purple-200 border-purple-700/60'
                            : 'bg-[#1c162b] hover:bg-[#251d38] text-zinc-300 border-[#3b2d54]'
                        }`}
                      >
                        {isAdded ? `✓ ${hotspot.name}` : `+ ${hotspot.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE & GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-6 text-xs text-zinc-300 leading-relaxed">
            <div>
              <h2 className="text-base font-semibold text-white">Stealth Aurora Architecture</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Complete system blueprint for Amazfit Active 3 / Zepp OS 3.x & 2.x.
              </p>
            </div>

            {/* Split Architecture Section */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                1. Split-Architecture Execution
              </h3>
              <p>
                Smartwatches running Zepp OS cannot execute direct HTTP <code className="text-purple-300">fetch</code> requests from watch pages (<code className="text-purple-300">page/index.js</code>).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong className="text-zinc-200">Watch:</strong> Pure UI rendering with native widgets (<code className="text-zinc-300">ARC</code>, <code className="text-zinc-300">FILL_RECT</code>, <code className="text-zinc-300">TEXT</code>, <code className="text-zinc-300">BUTTON</code>). Zero edge button overlays interrupt the circle chart.</li>
                <li><strong className="text-zinc-200">Companion Side Service (app-side):</strong> Fetches NOAA SWPC planetary K-index and Open-Meteo cloud cover. Calculates geomagnetic latitude and passes only clean numbers to the watch.</li>
                <li><strong className="text-zinc-200">Settings:</strong> Stores custom location presets in <code className="text-zinc-300">settingsStorage</code> and syncs over BLE.</li>
              </ul>
            </div>

            {/* The 4 Mandatory Data Points */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                2. The 4 Mandatory Data Points
              </h3>
              <div className="grid grid-cols-2 gap-2 text-zinc-300 font-mono text-[11px]">
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-purple-300 font-bold">1. Time / Day:</span>
                  <div className="text-zinc-400 mt-0.5">Strict HH (e.g. "12") or 3-char Day (e.g. "MON")</div>
                </div>
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-purple-300 font-bold">2. Probability:</span>
                  <div className="text-zinc-400 mt-0.5">Integer % (e.g. "78%")</div>
                </div>
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-purple-300 font-bold">3. KP Index:</span>
                  <div className="text-zinc-400 mt-0.5">1 decimal place (e.g. "4.5")</div>
                </div>
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-purple-300 font-bold">4. Cloud Cover:</span>
                  <div className="text-zinc-400 mt-0.5">Integer % (e.g. "18%")</div>
                </div>
              </div>
            </div>

            {/* Geometry Coordinates */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-2">
              <h3 className="font-semibold text-white text-sm">3. Exact 466x466 AMOLED Geometry</h3>
              <div className="space-y-1 font-mono text-[11px] text-zinc-400">
                <div>• Screen 0 (NOW): y:56 metrics, y:82 hero prob (42px), y:168 6-bar chart (gap 1px), y:372 bottom location switcher</div>
                <div>• Screen 1 (12H): y:18 bezel title, y:64 guide, y:104 6-bar chart (92px h, 54px barW, gap 1px), y:206 stacked text (15px)</div>
                <div>• Screen 2 (24H): strictly hours 13-24 (+14, +16, +18, +20, +22, +24), gap 1px</div>
                <div>• Screen 3 (7D): 7-day columns (MON-SUN), y:104 7-bar chart (46px barW), gap 1px, y:206 stacked text</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur border-t border-zinc-900">
        <div className="max-w-2xl mx-auto px-4 h-16 grid grid-cols-4 items-center">
          <button
            onClick={() => setActiveTab('watch')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'watch' ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Watch className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Watch</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'install' ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Install</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'settings' ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'guide' ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Guide</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
