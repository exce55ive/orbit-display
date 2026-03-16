# Changelog

## [0.0.8] - 2026-03-16

### Added
- **Display Switcher** — new System tab in Settings lets users choose which monitor Orbit runs on; lists all detected displays with resolution and primary indicator
- **Reset Settings** — three-step confirmation flow (click → "Are you sure?" → "Cannot be undone — confirm") wipes all config and relaunches the setup wizard clean

## [0.0.7] - 2026-03-16

### Fixed
- **Setup wizard — default panels:** New installs no longer include Tautulli (Now Playing) and Home Assistant (Lights) in the default dashboard layout. The starter layout is now Clock, System Monitor, and Quick Links — all always-available panels. Previously, users who did not configure these integrations would see "Configure Tautulli in Settings" placeholder panels even though they never selected them.
- **Setup wizard — panel save:** The Pages step now filters out any panels whose required integrations are not configured before saving. This prevents orphaned panels appearing on the dashboard after setup.
- **AMD GPU telemetry:** Added LibreHardwareMonitor (LHM) fallback for GPU usage and temperature. Windows WMI does not expose AMD GPU stats; Orbit now falls back to LHM's local HTTP API (`http://localhost:8085`) when WMI returns no data. **Requires LibreHardwareMonitor running with its web server enabled.** NVIDIA and Intel GPUs are unaffected.

## [0.0.6] - prior release

- Initial public release
