/**
 * Navigation utility that uses Turbo.visit when available, falling back to window.open
 */

export type NavigationTarget = '_self' | '_blank'

/**
 * Check if a URL is external (different origin)
 */
const isExternalUrl = (url: string): boolean => {
  if (typeof window === 'undefined') return false

  try {
    const urlObj = new URL(url, window.location.href)

    return urlObj.origin !== window.location.origin
  } catch {
    // If URL parsing fails, treat as internal for safety
    return false
  }
}

/**
 * Navigate to a URL using Turbo.visit if available, otherwise fallback to window.open
 * @param url - The URL to navigate to
 * @param target - Navigation target: '_self' for same window, '_blank' for new window/tab
 */
export const navigateWithTurbo = (
  url: string,
  target: NavigationTarget = '_self'
) => {
  if (typeof window === 'undefined') return

  // Always use window.open for external URLs since Turbo can't handle them
  if (isExternalUrl(url)) {
    window.open(url, target, 'noreferrer')

    return
  }

  // Use Turbo for internal same-tab navigation only
  if (window.Turbo && window.Turbo.visit && target !== '_blank') {
    window.Turbo.visit(url)

    return
  }

  // Fallback for internal URLs
  window.open(url, target)
}
