import { Outlet } from '@tanstack/react-router'

import { useFocusHeadingOnNavigate } from '@/hooks/use-focus-heading-on-navigate'

export function RootLayout() {
  useFocusHeadingOnNavigate()
  return <Outlet />
}
