import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import React, { Suspense } from 'react'

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
const GoogleTest = React.lazy(() => import('@/pages/GoogleTest'))
const AddPOS = React.lazy(() => import('@/pages/AddPOS'))
const EditPOS = React.lazy(() => import('@/pages/EditPOS'))
const Brands = React.lazy(() => import('@/pages/Brands'))
const RoleManagement = React.lazy(() => import('@/pages/RoleManagement'))
const DebugRole = React.lazy(() => import('@/pages/DebugRole'))
const SupabaseTest = React.lazy(() => import('@/pages/SupabaseTest'))
const MyPOS = React.lazy(() => import('@/pages/MyPOS'))
const Favorites = React.lazy(() => import('@/pages/Favorites'))
const History = React.lazy(() => import('@/pages/History'))
const Settings = React.lazy(() => import('@/pages/Settings'))
const OnboardingFlow = React.lazy(() => import('@/components/OnboardingFlow'))
const SmartWelcome = React.lazy(() => import('@/components/SmartWelcome'))
const HelpCenter = React.lazy(() => import('@/pages/HelpCenter'))
const LandingPage = React.lazy(() => import('@/pages/LandingPage'))

// Fallback component for Suspense
const Loading = () => <div>Loading...</div>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<Loading />}><LandingPage /></Suspense>,
  },
  {
    path: '/app',
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
        path: 'role-management',
        element: <Suspense fallback={<Loading />}><RoleManagement /></Suspense>,
      },
      {
        path: 'debug-role',
        element: <Suspense fallback={<Loading />}><DebugRole /></Suspense>,
      },
      {
        path: 'supabase-test',
        element: <Suspense fallback={<Loading />}><SupabaseTest /></Suspense>,
      },
      {
        path: 'my-pos',
        element: <Suspense fallback={<Loading />}><MyPOS /></Suspense>,
      },
      {
        path: 'favorites',
        element: <Suspense fallback={<Loading />}><Favorites /></Suspense>,
      },
      {
        path: 'history',
        element: <Suspense fallback={<Loading />}><History /></Suspense>,
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
    element: <Suspense fallback={<Loading />}><OnboardingFlow /></Suspense>,
  },
  {
    path: '/welcome',
    element: <Suspense fallback={<Loading />}><SmartWelcome /></Suspense>,
  },
  {
    path: '/login',
    element: <Suspense fallback={<Loading />}><Login /></Suspense>,
  },
  {
    path: '/auth/callback',
    element: <Suspense fallback={<Loading />}><AuthCallback /></Suspense>,
  },
  {
    path: '/auth/google/callback',
    element: <Suspense fallback={<Loading />}><GoogleCallback /></Suspense>,
  },
  {
    path: '/auth/github/callback',
    element: <Suspense fallback={<Loading />}><GitHubCallback /></Suspense>,
  },
  {
    path: '/auth/microsoft/callback',
    element: <Suspense fallback={<Loading />}><MicrosoftCallback /></Suspense>,
  },
  {
    path: '/auth/linuxdo/callback',
    element: <Suspense fallback={<Loading />}><LinuxDOCallback /></Suspense>,
  },
  {
    path: '/google-test',
    element: <Suspense fallback={<Loading />}><GoogleTest /></Suspense>,
  },
])