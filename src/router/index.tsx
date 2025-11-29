import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import React, { Suspense } from 'react'
import RouteError from '@/components/RouteError'

// Dynamically import pages
const Home = React.lazy(() => import('@/pages/Home'))
const Map = React.lazy(() => import('@/pages/Map'))
const List = React.lazy(() => import('@/pages/List'))
const POSDetail = React.lazy(() => import('@/pages/POSDetail'))
const Profile = React.lazy(() => import('@/pages/Profile'))
const Login = React.lazy(() => import('@/pages/Login'))
const AuthCallback = React.lazy(() => import('@/pages/AuthCallback'))
const GoogleCallback = React.lazy(() => import('@/components/GoogleCallback'))
const GitHubCallback = React.lazy(() => import('@/pages/auth/GitHubCallback'))
const MicrosoftCallback = React.lazy(() => import('@/pages/auth/MicrosoftCallback'))
const LinuxDOCallback = React.lazy(() => import('@/pages/auth/LinuxDOCallback'))
// const GoogleTest = React.lazy(() => import('@/pages/GoogleTest'))  // 文件不存在，暂时注释
const AddPOS = React.lazy(() => import('@/pages/AddPOS'))
const EditPOS = React.lazy(() => import('@/pages/EditPOS'))
const Brands = React.lazy(() => import('@/pages/Brands'))
const RoleManagement = React.lazy(() => import('@/pages/RoleManagement'))
// const DebugRole = React.lazy(() => import('@/pages/DebugRole'))  // 文件不存在，暂时注释
// const SupabaseTest = React.lazy(() => import('@/pages/SupabaseTest'))  // 文件不存在，暂时注释
const MyPOS = React.lazy(() => import('@/pages/MyPOS'))
const Favorites = React.lazy(() => import('@/pages/Favorites'))
const Notifications = React.lazy(() => import('@/pages/Notifications'))
const History = React.lazy(() => import('@/pages/History'))
const Settings = React.lazy(() => import('@/pages/Settings'))
const OnboardingFlow = React.lazy(() => import('@/components/OnboardingFlow'))
const Drafts = React.lazy(() => import('@/pages/Drafts'))
// const SmartWelcome = React.lazy(() => import('@/components/SmartWelcome')) // removed
const HelpCenter = React.lazy(() => import('@/pages/HelpCenter'))
const LandingPage = React.lazy(() => import('@/pages/LandingPage'))
const MCPSettings = React.lazy(() => import('@/pages/MCPSettings'))
// Fallback component for Suspense
const Loading = () => <div>Loading...</div>

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><LandingPage /></Suspense>,
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
        element: <Suspense fallback={<Loading />}><Home /></Suspense>,
      },
      {
        path: 'map',
        element: <Suspense fallback={<Loading />}><Map /></Suspense>,
      },
      {
        path: 'list',
        element: <Suspense fallback={<Loading />}><List /></Suspense>,
      },
      {
        path: 'brands',
        element: <Suspense fallback={<Loading />}><Brands /></Suspense>,
      },
      {
        path: 'pos/:id',
        element: <Suspense fallback={<Loading />}><POSDetail /></Suspense>,
      },
      {
        path: 'add-pos',
        element: <Suspense fallback={<Loading />}><AddPOS /></Suspense>,
      },
      {
        path: 'edit-pos/:id',
        element: <Suspense fallback={<Loading />}><EditPOS /></Suspense>,
      },
      {
        path: 'profile',
        element: <Suspense fallback={<Loading />}><Profile /></Suspense>,
      },
      {
        path: 'mcp-settings',
        element: <Suspense fallback={<Loading />}><MCPSettings /></Suspense>,
      },
      {
        path: 'role-management',
        element: <Suspense fallback={<Loading />}><RoleManagement /></Suspense>,
      },
      // {
      //   path: 'debug-role',
      //   element: <Suspense fallback={<Loading />}><DebugRole /></Suspense>,
      // },
      // {
      //   path: 'supabase-test',
      //   element: <Suspense fallback={<Loading />}><SupabaseTest /></Suspense>,
      // },
      {
        path: 'my-pos',
        element: <Suspense fallback={<Loading />}><MyPOS /></Suspense>,
      },
      {
        path: 'favorites',
        element: <Suspense fallback={<Loading />}><Favorites /></Suspense>,
      },
      {
        path: 'drafts',
        element: <Suspense fallback={<Loading />}><Drafts /></Suspense>,
      },
      {
        path: 'history',
        element: <Suspense fallback={<Loading />}><History /></Suspense>,
      },
      {
        path: 'notifications',
        element: <Suspense fallback={<Loading />}><Notifications /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<Loading />}><Settings /></Suspense>,
      },
      {
        path: 'help',
        element: <Suspense fallback={<Loading />}><HelpCenter /></Suspense>,
      },
    ],
  },
  {
    path: '/onboarding',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><OnboardingFlow /></Suspense>,
  },
  // removed: /welcome route for SmartWelcome
  {
    path: '/login',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><Login /></Suspense>,
  },
  {
    path: '/auth/callback',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><AuthCallback /></Suspense>,
  },
  {
    path: '/auth/google/callback',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><GoogleCallback /></Suspense>,
  },
  {
    path: '/auth/github/callback',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><GitHubCallback /></Suspense>,
  },
  {
    path: '/auth/microsoft/callback',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><MicrosoftCallback /></Suspense>,
  },
  {
    path: '/auth/linuxdo/callback',
    errorElement: <RouteError />,
    element: <Suspense fallback={<Loading />}><LinuxDOCallback /></Suspense>,
  },
  // {
  //   path: '/google-test',
  //   element: <Suspense fallback={<Loading />}><GoogleTest /></Suspense>,
  // },
])
