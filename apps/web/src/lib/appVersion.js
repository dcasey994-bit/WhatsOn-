import { isNative } from './platform.js'

// "1.1.0 (42) · Android", "1.1.0 (42) · iOS", or "Web · 14 Nov 2026" for the
// website, where the build date is the useful fact. Testers quote this in
// feedback so we know which build they are on.
export async function getAppVersionLabel() {
  if (isNative()) {
    try {
      const { App } = await import('@capacitor/app')
      const { Capacitor } = await import('@capacitor/core')
      const info = await App.getInfo()
      const platform = Capacitor.getPlatform() === 'ios' ? 'iOS' : 'Android'
      return `${info.version} (${info.build}) · ${platform}`
    } catch {
      return 'App'
    }
  }
  const built = new Date(__BUILD_TIME__)
  return `Web · ${built.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
