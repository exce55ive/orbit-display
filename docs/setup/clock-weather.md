# Clock & Weather Panel

The Clock & Weather panel shows the current time, date, and a 5-day weather forecast with detailed conditions — no account or API key required.

## What it shows

- Current time and date
- 5-day weather forecast including:
  - Feels-like temperature
  - Humidity
  - UV index
  - Wind speed and direction

## Requirements

- Internet connection (for weather data)
- No account or API key needed — uses [Open-Meteo](https://open-meteo.com/), a free weather service

## Configuration

1. Open **Settings** (⚙ button in the bottom bar).
2. Go to **Clock & Weather**.
3. Enter your **city name** in the location field.
4. Save — the forecast loads automatically.

## Notes

- Weather data is provided by Open-Meteo, which is free and requires no registration.
- The clock displays your local system time.

## Troubleshooting

**Wrong location or no forecast showing:**
- Double-check the spelling of your city name.
- Try a nearby major city if your town isn't recognised.
- Ensure the machine running Orbit has internet access — Open-Meteo is an external service.

**Clock shows wrong time:**
- Orbit uses your Windows system clock. Verify your system time and timezone are set correctly in Windows Settings.
