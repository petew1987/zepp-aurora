/**
 * Stealth Aurora Tracker - Smartphone Settings Page
 * Runs inside the Zepp Mobile App (Android & iOS)
 *
 * Features:
 * - Search any location worldwide via Open-Meteo Geocoding API
 * - Add search results directly to watch presets (up to 5 saved)
 * - Quick-add popular aurora observatories
 * - Remove saved locations
 * - Real-time sync with watch via settingsStorage
 */

const DEFAULT_AURORA_PRESETS = [
  { name: 'Tromso', lat: 69.65, lon: 18.96 },
  { name: 'Fairbanks', lat: 64.84, lon: -147.72 },
  { name: 'Reykjavik', lat: 64.14, lon: -21.94 },
  { name: 'Yellowknife', lat: 62.45, lon: -114.37 },
  { name: 'Abisko', lat: 68.35, lon: 18.82 }
]

const POPULAR_HOTSPOTS = [
  { name: 'Tromso, NO', lat: 69.65, lon: 18.96 },
  { name: 'Fairbanks, US', lat: 64.84, lon: -147.72 },
  { name: 'Reykjavik, IS', lat: 64.14, lon: -21.94 },
  { name: 'Yellowknife, CA', lat: 62.45, lon: -114.37 },
  { name: 'Abisko, SE', lat: 68.35, lon: 18.82 },
  { name: 'Rovaniemi, FI', lat: 66.50, lon: 25.72 },
  { name: 'Kiruna, SE', lat: 67.85, lon: 20.22 },
  { name: 'Anchorage, US', lat: 61.21, lon: -149.90 }
]

AppSettingsPage({
  state: {
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: ''
  },

  build(props) {
    let savedLocations = DEFAULT_AURORA_PRESETS
    try {
      const stored = props.settingsStorage.getItem('customLocations')
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
        if (Array.isArray(parsed) && parsed.length > 0) {
          savedLocations = parsed
        }
      }
    } catch (e) {
      console.log('[AuroraSettings] Error reading settingsStorage:', e)
    }

    const saveLocations = (newLocs) => {
      try {
        props.settingsStorage.setItem('customLocations', JSON.stringify(newLocs))
      } catch (err) {
        console.log('[AuroraSettings] Error saving locations:', err)
      }
    }

    const handleSearch = async () => {
      const q = (this.state.searchQuery || '').trim()
      if (!q || q.length < 2) {
        this.state.searchError = 'Please enter at least 2 characters to search'
        return
      }

      this.state.isSearching = true
      this.state.searchError = ''

      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
        )
        if (res.ok) {
          const data = await res.json()
          if (data && data.results && data.results.length > 0) {
            this.state.searchResults = data.results.map(r => ({
              name: `${r.name}${r.country_code ? ', ' + r.country_code : ''}`,
              lat: parseFloat(r.latitude.toFixed(2)),
              lon: parseFloat(r.longitude.toFixed(2))
            }))
            this.state.searchError = ''
          } else {
            this.state.searchResults = []
            this.state.searchError = `No locations found matching "${q}"`
          }
        } else {
          this.state.searchError = 'Geocoding service error. Try again.'
        }
      } catch (err) {
        this.state.searchError = 'Network error searching location.'
      } finally {
        this.state.isSearching = false
      }
    }

    return View(
      {
        style: {
          padding: '16px 14px',
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      },
      [
        // Header
        View(
          {
            style: {
              paddingBottom: '12px',
              borderBottom: '1px solid #27272a'
            }
          },
          [
            Text({
              style: {
                fontSize: '18px',
                fontWeight: '700',
                color: '#10b981',
                marginBottom: '4px',
                lineHeight: '24px'
              }
            }, 'Stealth Aurora Tracker'),
            Text({
              style: {
                fontSize: '13px',
                color: '#a1a1aa',
                lineHeight: '18px'
              }
            }, 'Search and manage observation locations synced to your Amazfit watch.')
          ]
        ),

        // Default GPS Local Card
        Section(
          {
            title: 'PRIMARY TRACKING LOCATION',
            style: {
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '14px'
            }
          },
          [
            View(
              {
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              },
              [
                View({}, [
                  Text({
                    style: { fontSize: '15px', fontWeight: '600', color: '#f8fafc' }
                  }, 'Local GPS (Automatic)'),
                  Text({
                    style: { fontSize: '12px', color: '#10b981', marginTop: '2px' }
                  }, 'Always Active · High Precision NOAA Geomagnetic Model')
                ]),
                Text({
                  style: {
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#06b6d4',
                    backgroundColor: '#164e63',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }
                }, 'DEFAULT')
              ]
            )
          ]
        ),

        // Search Location Section
        Section(
          {
            title: 'SEARCH & ADD NEW LOCATION',
            style: {
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '14px'
            }
          },
          [
            Text({
              style: { fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }
            }, 'Search any city worldwide (e.g. Tromso, Rovaniemi, Kiruna, Anchorage):'),

            TextInput({
              label: 'City or Observatory Name',
              value: this.state.searchQuery,
              onChange: (val) => {
                this.state.searchQuery = val
              }
            }),

            Button({
              label: this.state.isSearching ? 'Searching...' : 'Search Location',
              style: {
                marginTop: '10px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#ffffff',
                backgroundColor: '#10b981',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                width: '100%'
              },
              onClick: () => {
                handleSearch()
              }
            }),

            // Error notice if any
            this.state.searchError ? Text({
              style: { fontSize: '12px', color: '#f43f5e', marginTop: '8px' }
            }, this.state.searchError) : null,

            // Search Results Display
            this.state.searchResults && this.state.searchResults.length > 0 ? View(
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #27272a'
                }
              },
              [
                Text({
                  style: { fontSize: '11px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase' }
                }, 'SEARCH RESULTS'),

                ...this.state.searchResults.map((result) => {
                  const alreadySaved = savedLocations.some(l => l.name === result.name)
                  const isMaxPresets = savedLocations.length >= 5

                  return View(
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#27272a',
                        borderRadius: '8px'
                      }
                    },
                    [
                      View({}, [
                        Text({
                          style: { fontSize: '13px', fontWeight: '600', color: '#ffffff' }
                        }, result.name),
                        Text({
                          style: { fontSize: '11px', color: '#94a3b8' }
                        }, `${result.lat.toFixed(2)}°N, ${result.lon.toFixed(2)}°E`)
                      ]),

                      Button({
                        label: alreadySaved ? 'Added' : (isMaxPresets ? 'Full (5/5)' : '+ Add'),
                        style: {
                          fontSize: '11px',
                          fontWeight: '600',
                          color: alreadySaved ? '#34d399' : (isMaxPresets ? '#71717a' : '#ffffff'),
                          backgroundColor: alreadySaved ? '#064e3b' : (isMaxPresets ? '#18181b' : '#10b981'),
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none'
                        },
                        onClick: () => {
                          if (alreadySaved || isMaxPresets) return
                          const updated = [...savedLocations, result]
                          saveLocations(updated)
                        }
                      })
                    ]
                  )
                })
              ]
            ) : null
          ].filter(Boolean)
        ),

        // Saved Custom Locations (Up to 5)
        Section(
          {
            title: `SAVED PRESET LOCATIONS (${savedLocations.length}/5)`,
            style: {
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '14px'
            }
          },
          [
            Text({
              style: { fontSize: '12px', color: '#a1a1aa', marginBottom: '12px' }
            }, 'Cycle through these presets on your watch by tapping the location pill at the bottom of Screen 0:'),

            View(
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }
              },
              savedLocations.map((loc, idx) => {
                return View(
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: '#27272a',
                      borderRadius: '8px'
                    }
                  },
                  [
                    View({}, [
                      Text({
                        style: { fontSize: '14px', fontWeight: '600', color: '#ffffff' }
                      }, loc.name),
                      Text({
                        style: { fontSize: '11px', color: '#94a3b8' }
                      }, `${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E`)
                    ]),

                    Button({
                      label: 'Remove',
                      style: {
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#f43f5e',
                        backgroundColor: '#3f151e',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none'
                      },
                      onClick: () => {
                        const updated = savedLocations.filter((_, i) => i !== idx)
                        saveLocations(updated)
                      }
                    })
                  ]
                )
              })
            )
          ]
        ),

        // Quick Aurora Hotspot Presets
        Section(
          {
            title: 'POPULAR AURORA OBSERVATORIES',
            style: {
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '14px'
            }
          },
          [
            Text({
              style: { fontSize: '12px', color: '#a1a1aa', marginBottom: '10px' }
            }, 'Tap any global observatory to add instantly:'),

            View(
              {
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  flexWrap: 'wrap'
                }
              },
              POPULAR_HOTSPOTS.map((hotspot) => {
                const alreadyAdded = savedLocations.some(l => l.name.startsWith(hotspot.name.split(',')[0]))
                return Button({
                  label: alreadyAdded ? `✓ ${hotspot.name}` : `+ ${hotspot.name}`,
                  style: {
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '8px 10px',
                    backgroundColor: alreadyAdded ? '#064e3b' : '#27272a',
                    color: alreadyAdded ? '#34d399' : '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #3f3f46'
                  },
                  onClick: () => {
                    if (alreadyAdded) return
                    if (savedLocations.length >= 5) return
                    const updated = [...savedLocations, hotspot]
                    saveLocations(updated)
                  }
                })
              })
            )
          ]
        ),

        // Footer Guidance
        View(
          {
            style: {
              backgroundColor: '#121215',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '12px',
              marginTop: '4px'
            }
          },
          [
            Text({
              style: { fontSize: '12px', fontWeight: '700', color: '#10b981', marginBottom: '2px' }
            }, 'Automatic Watch Synchronization'),
            Text({
              style: { fontSize: '11px', color: '#71717a', lineHeight: '16px' }
            }, 'Locations synchronize over Bluetooth Low Energy automatically when opening the watch app.')
          ]
        )
      ]
    )
  }
})
