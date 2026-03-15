import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate, redirect } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import RouteError from '@/components/RouteError'

const Home = React.lazy(() => import('@/pages/discovery/Home'))
const Map = React.lazy(() => import('@/pages/discovery/Map'))
const List = React.lazy(() => import('@/pages/discovery/List'))
const CardAlbum = React.lazy(() => import('@/pages/discovery/CardAlbum'))
const POSDetail = React.lazy(() => import('@/pages/pos/POSDetail'))
const Profile = React.lazy(() => import('@/pages/user/Profile'))
const Login = React.lazy(() => import('@/pages/auth/Login'))
const AuthCallback = React.lazy(() => import('@/pages/auth/AuthCallback'))
const GoogleCallback = React.lazy(() => import('@/pages/auth/GoogleCallback'))
const GitHubCallback = React.lazy(() => import('@/pages/auth/GitHubCallback'))
const MicrosoftCallback = React.lazy(() => import('@/pages/auth/MicrosoftCallback'))
const LinuxDOCallback = React.lazy(() => import('@/pages/auth/LinuxDOCallback'))
const AddPOS = React.lazy(() => import('@/pages/pos/AddPOS'))
const EditPOS = React.lazy(() => import('@/pages/pos/EditPOS'))
const Brands = React.lazy(() => import('@/pages/discovery/Brands'))
const RoleManagement = React.lazy(() => import('@/pages/admin/RoleManagement'))
const MyPOS = React.lazy(() => import('@/pages/pos/MyPOS'))
const Favorites = React.lazy(() => import('@/pages/pos/Favorites'))
const History = React.lazy(() => import('@/pages/pos/History'))
const Settings = React.lazy(() => import('@/pages/user/Settings'))
const OnboardingFlow = React.lazy(() => import('@/components/OnboardingFlow'))
const Drafts = React.lazy(() => import('@/pages/pos/Drafts'))
const HelpCenter = React.lazy(() => import('@/pages/support/HelpCenter'))
const LandingPage = React.lazy(() => import('@/pages/landing/LandingPage'))
const MCPSettings = React.lazy(() => import('@/pages/admin/MCPSettings'))

const loadingFallback = <div>Loading...</div>

const withSuspense = (element: React.ReactElement) => {
  return <Suspense fallback={loadingFallback}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteError />,
    element: withSuspense(<LandingPage />),
  },
  {
    path: '/app',
    errorElement: <RouteError />,
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/map" replace />,
      },
      {
        path: 'home',
        element: withSuspense(<Home />),
      },
      {
        path: 'map',
        element: withSuspense(<Map />),
      },
      {
        path: 'list',
        element: withSuspense(<List />),
      },
      {
        path: 'card-album',
        element: withSuspense(<CardAlbum />),
      },
      {
        path: 'brands',
        element: withSuspense(<Brands />),
      },
      {
        path: 'pos/:id',
        element: withSuspense(<POSDetail />),
      },
      {
        path: 'pos-detail/:id',
        loader: ({ params }) => redirect(params.id ? `/app/pos/${params.id}` : '/app/map'),
      },
      {
        path: 'add-pos',
        element: withSuspense(<AddPOS />),
      },
      {
        path: 'edit-pos/:id',
        element: withSuspense(<EditPOS />),
      },
      {
        path: 'profile',
        element: withSuspense(<Profile />),
      },
      {
        path: 'mcp-settings',
        element: withSuspense(<MCPSettings />),
      },
      {
        path: 'management',
        element: withSuspense(<RoleManagement />),
      },
      {
        path: 'role-management',
        loader: () => redirect('/app/management'),
      },
      {
        path: 'my-pos',
        element: withSuspense(<MyPOS />),
      },
      {
        path: 'favorites',
        element: withSuspense(<Favorites />),
      },
      {
        path: 'drafts',
        element: withSuspense(<Drafts />),
      },
      {
        path: 'history',
        element: withSuspense(<History />),
      },
      {
        path: 'notifications',
        loader: () => redirect('/app/settings'),
      },
      {
        path: 'settings',
        element: withSuspense(<Settings />),
      },
      {
        path: 'help',
        element: withSuspense(<HelpCenter />),
      },
    ],
  },
  {
    path: '/onboarding',
    errorElement: <RouteError />,
    element: withSuspense(<OnboardingFlow />),
  },
  {
    path: '/login',
    errorElement: <RouteError />,
    element: withSuspense(<Login />),
  },
  {
    path: '/auth/callback',
    errorElement: <RouteError />,
    element: withSuspense(<AuthCallback />),
  },
  {
    path: '/auth/google/callback',
    errorElement: <RouteError />,
    element: withSuspense(<GoogleCallback />),
  },
  {
    path: '/auth/github/callback',
    errorElement: <RouteError />,
    element: withSuspense(<GitHubCallback />),
  },
  {
    path: '/auth/microsoft/callback',
    errorElement: <RouteError />,
    element: withSuspense(<MicrosoftCallback />),
  },
  {
    path: '/auth/linuxdo/callback',
    errorElement: <RouteError />,
    element: withSuspense(<LinuxDOCallback />),
  },
])
