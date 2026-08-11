/**
 * Global type declarations for the component library
 */

declare global {
  interface Window {
    Turbo?: {
      visit: (url: string, options?: { advance?: boolean }) => void
    }
  }
}

export {}
