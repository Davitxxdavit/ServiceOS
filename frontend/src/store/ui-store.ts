import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface UiState {
  theme: Theme
  sidebarCollapsed: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarCollapsed: (value: boolean) => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('serviceos-theme', theme)
}

const saved = (localStorage.getItem('serviceos-theme') as Theme | null) ?? 'dark'
applyTheme(saved)

export const useUiStore = create<UiState>((set, get) => ({
  theme: saved,
  sidebarCollapsed: false,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}))
