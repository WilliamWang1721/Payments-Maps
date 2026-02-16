import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate, redirect } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import RouteError from '@/components/RouteError'

const Home = React.lazy(() => import('@/pages/Home'))
const Map = React.lazy(() => import('@/pages/Map'))
const List = React.lazy(() => import('@/pages/List'))
const CardAlbum = React.lazy(() => import('@/pages/CardAlbum'))
const POSDetail = React.lazy(() => import('@/pages/POSDetail'))
const Profile = React.lazy(() => import('@/pages/Profile'))
const Login = React.lazy(() => import('@/pages/Login'))
const AuthCallback = React.lazy(() => import('@/pages/AuthCallback'))
const GoogleCallback = React.lazy(() => import('@/components/GoogleCallback'))
const GitHubCallback = React.lazy(() => import('@/pages/auth/GitHubCallback'))
const MicrosoftCallback = React.lazy(() => import('@/pages/auth/MicrosoftCallback'))
const LinuxDOCallback = React.lazy(() => import('@/pages/auth/LinuxDOCallback'))
const AddPOS = React.lazy(() => import('@/pages/AddPOS'))
const EditPOS = React.lazy(() => import('@/pages/EditPOS'))
const Brands = React.lazy(() => import('@/pages/Brands'))
const RoleManagement = React.lazy(() => import('@/pages/RoleManagement'))
const MyPOS = React.lazy(() => import('@/pages/MyPOS'))
const Favorites = React.lazy(() => import('@/pages/Favorites'))
const Notifications = React.lazy(() => import('@/pages/Notifications'))
const History = React.lazy(() => import('@/pages/History'))
const Settings = React.lazy(() => import('@/pages/Settings'))
const OnboardingFlow = React.lazy(() => import('@/components/OnboardingFlow'))
const Drafts = React.lazy(() => import('@/pages/Drafts'))
const HelpCenter = React.lazy(() => import('@/pages/HelpCenter'))
const LandingPage = React.lazy(() => import('@/pages/LandingPage'))
const MCPSettings = React.lazy(() => import('@/pages/MCPSettings'))

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
        element: withSuspense(<Notifications />),
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
