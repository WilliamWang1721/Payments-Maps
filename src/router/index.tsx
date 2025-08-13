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
const GoogleTest = React.lazy(() => import('@/pages/GoogleTest'))
const AddPOS = React.lazy(() => import('@/pages/AddPOS'))
const EditPOS = React.lazy(() => import('@/pages/EditPOS'))
const RoleManagement = React.lazy(() => import('@/pages/RoleManagement'))
const DebugRole = React.lazy(() => import('@/pages/DebugRole'))

// Fallback component for Suspense
const Loading = () => <div>Loading...</div>

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/map" replace />,
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
    ],
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
    path: '/google-test',
    element: <Suspense fallback={<Loading />}><GoogleTest /></Suspense>,
  },
])