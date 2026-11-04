import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { AppShell } from '../components/layout/AppShell.tsx'
import { NotFound } from '../components/layout/Page.tsx'
import DesignSystemPage from '../design-system/DesignSystemPage.tsx'
import { LoginPage } from '../features/auth/LoginPage.tsx'
import { MemberPage } from '../features/members/MemberPage.tsx'
import { MembersPage } from '../features/members/MembersPage.tsx'
import { NewMemberPage } from '../features/members/NewMemberPage.tsx'
import { MorePage } from '../features/more/MorePage.tsx'
import { NotificationsPage } from '../features/notifications/NotificationsPage.tsx'
import { PaymentPage } from '../features/payments/PaymentPage.tsx'
import { PaymentsPage } from '../features/payments/PaymentsPage.tsx'
import { RecordPaymentPage } from '../features/payments/RecordPaymentPage.tsx'
import { PlansPage } from '../features/plans/PlansPage.tsx'
import { SubscriptionsPage } from '../features/subscriptions/SubscriptionsPage.tsx'
import { TodayPage } from '../features/today/TodayPage.tsx'
import { session } from '../lib/api-client.ts'

function RequireAuth() {
  return session.get() ? <Outlet /> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  ...(import.meta.env.DEV ? [{ path: '/design-system', element: <DesignSystemPage /> }] : []),
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <TodayPage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'members/new', element: <NewMemberPage /> },
          { path: 'members/:id', element: <MemberPage /> },
          { path: 'subscriptions', element: <SubscriptionsPage /> },
          { path: 'payments', element: <PaymentsPage /> },
          { path: 'payments/new', element: <RecordPaymentPage /> },
          { path: 'payments/:id', element: <PaymentPage /> },
          { path: 'plans', element: <PlansPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'more', element: <MorePage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
