import { createFileRoute, redirect } from '@tanstack/react-router'

import { useCart } from '@/hooks/pos/use-cart'
import { canUsePos } from '@/modules/pos/permissions'

import { PosLayout } from './_components/pos-layout'

// The cashier: for those who sell in an outlet, or void its orders. /admin
// sends anyone else to their own start page. The cart is the signed-in
// user's: it is emptied when someone else signs in on the browser.
export const Route = createFileRoute('/_auth/pos')({
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (!user?.outlet_id || !canUsePos(user)) throw redirect({ to: '/admin' })
    useCart.getState().claim(user.user_id)
    return { outletId: user.outlet_id }
  },
  component: PosLayout,
})
