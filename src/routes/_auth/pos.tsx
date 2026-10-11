import { createFileRoute, redirect } from '@tanstack/react-router'

import { PosLayout } from '@/app/PosLayout'
import { useCart } from '@/features/pos/cart'
import { can } from '@/shared/lib/permissions'

// The cashier: for those who sell in an outlet, or void its orders. /admin
// sends anyone else to their own start page. The cart is the signed-in
// user's: it is emptied when someone else signs in on the browser.
export const Route = createFileRoute('/_auth/pos')({
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (!user?.outlet_id || !(can(user, 'checkout.create') || can(user, 'order.void'))) {
      throw redirect({ to: '/admin' })
    }
    useCart.getState().claim(user.user_id)
    return { outletId: user.outlet_id }
  },
  component: PosLayout,
})
