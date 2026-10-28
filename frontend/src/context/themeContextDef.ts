import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const THEME_STORAGE_KEY = 'metrocare_theme_preference'

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
