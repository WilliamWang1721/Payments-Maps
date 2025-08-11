import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Map from '@/pages/Map'
import List from '@/pages/List'
import POSDetail from '@/pages/POSDetail'
import Profile from '@/pages/Profile'
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import AddPOS from '@/pages/AddPOS'
import EditPOS from '@/pages/EditPOS'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/map" replace />,
      },
      {
        path: 'home',
        element: <Home />,
      },
      {
        path: 'map',
        element: <Map />,
      },
      {
        path: 'list',
        element: <List />,
      },
      {
        path: 'pos/:id',
        element: <POSDetail />,
      },
      {
        path: 'add-pos',
        element: <AddPOS />,
      },
      {
        path: 'edit-pos/:id',
        element: <EditPOS />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
])