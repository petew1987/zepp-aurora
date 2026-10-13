const DEFAULT_AURORA_PRESETS = [
  { name: 'Tromso', lat: 69.65, lon: 18.96 },
  { name: 'Fairbanks', lat: 64.84, lon: -147.72 },
  { name: 'Reykjavik', lat: 64.14, lon: -21.94 },
  { name: 'Yellowknife', lat: 62.45, lon: -114.37 },
  { name: 'Abisko', lat: 68.35, lon: 18.82 }
]

AppSettingsPage({
  state: {
    locations: DEFAULT_AURORA_PRESETS
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
    } catch (e) {}

    const saveLocations = (newLocs) => {
      try {
        props.settingsStorage.setItem('customLocations', JSON.stringify(newLocs))
      } catch (err) {}
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
        View(
          { style: { paddingBottom: '12px', borderBottom: '1px solid #27272a' } },
          [
            Text({
              style: { fontSize: '18px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }
            }, 'Stealth Aurora Tracker'),
            Text({
              style: { fontSize: '13px', color: '#a1a1aa' }
            }, 'Configure custom observation locations synced to your Amazfit watch.')
          ]
        ),
        Section(
          {
            title: 'PRIMARY TRACKING LOCATION',
            style: { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '14px' }
          },
          [
            View(
              { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
              [
                View({}, [
                  Text({ style: { fontSize: '15px', fontWeight: '600', color: '#f8fafc' } }, 'Local GPS (Automatic)'),
                  Text({ style: { fontSize: '12px', color: '#10b981', marginTop: '2px' } }, 'Always Active · High Precision NOAA Model')
                ]),
                Text({
                  style: { fontSize: '11px', fontWeight: '700', color: '#06b6d4', backgroundColor: '#164e63', padding: '4px 8px', borderRadius: '6px' }
                }, 'DEFAULT')
              ]
            )
          ]
        ),
        Section(
          {
            title: `SAVED PRESET LOCATIONS (${savedLocations.length}/5)`,
            style: { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '14px' }
          },
          [
            Text({ style: { fontSize: '12px', color: '#a1a1aa', marginBottom: '12px' } }, 'Cycle through presets on your watch by tapping the location pill on Screen 0:'),
            View(
              { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              savedLocations.map((loc, idx) => {
                return View(
                  {
                    style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#27272a', borderRadius: '8px' }
                  },
                  [
                    View({}, [
                      Text({ style: { fontSize: '14px', fontWeight: '600', color: '#ffffff' } }, loc.name),
                      Text({ style: { fontSize: '11px', color: '#94a3b8' } }, `${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E`)
                    ]),
                    Button({
                      label: 'Remove',
                      style: { fontSize: '11px', fontWeight: '600', color: '#f43f5e', backgroundColor: '#3f151e', padding: '6px 10px', borderRadius: '6px', border: 'none' },
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
        Section(
          {
            title: 'POPULAR AURORA OBSERVATORIES',
            style: { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '14px' }
          },
          [
            View(
              { style: { display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap' } },
              DEFAULT_AURORA_PRESETS.map((hotspot) => {
                const alreadyAdded = savedLocations.some(l => l.name === hotspot.name)
                return Button({
                  label: alreadyAdded ? `✓ ${hotspot.name}` : `+ ${hotspot.name}`,
                  style: { fontSize: '12px', fontWeight: '600', padding: '8px 12px', backgroundColor: alreadyAdded ? '#064e3b' : '#27272a', color: alreadyAdded ? '#34d399' : '#ffffff', borderRadius: '8px', border: '1px solid #3f3f46' },
                  onClick: () => {
                    if (alreadyAdded || savedLocations.length >= 5) return
                    saveLocations([...savedLocations, hotspot])
                  }
                })
              })
            )
          ]
        )
      ]
    )
  }
})
