import { Outlet } from '@tanstack/react-router'

import { useFocusHeadingOnNavigate } from '@/shared/hooks/useFocusHeadingOnNavigate'

export function RootLayout() {
  useFocusHeadingOnNavigate()
  return <Outlet />
}
