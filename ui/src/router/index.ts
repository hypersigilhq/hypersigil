import { createRouter, createWebHistory } from 'vue-router'
import AuthFlow from '../components/auth/AuthFlow.vue'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Auth routes
    {
      path: '/auth',
      name: 'auth',
      component: AuthFlow,
    },
    {
      path: '/auth/invitation/:token',
      name: 'invitation-setup',
      component: () => import('../views/auth/InvitationSetupView.vue'),
      props: true,
    },

    // Protected routes
    {
      path: '/',
      name: 'home',
      component: () => import('../views/PromptsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/prompts',
      name: 'prompts',
      component: () => import('../views/PromptsView.vue'),
    },
    {
      path: '/executions',
      name: 'executions',
      component: () => import('../views/ExecutionsView.vue'),
    },
    {
      path: '/test-data',
      name: 'test-data',
      component: () => import('../views/TestDataView.vue'),
    },
    {
      path: '/test-data/:groupId',
      name: 'test-data-items',
      component: () => import('../views/TestDataItemsView.vue'),
      props: true,
    },
    {
      path: '/execution-bundles',
      name: 'execution-bundles',
      component: () => import('../views/ExecutionBundlesView.vue'),
    },
    {
      path: '/files',
      name: 'files',
      component: () => import('../views/FilesView.vue'),
    },
    {
      path: '/deployments',
      name: 'deployments',
      component: () => import('../views/DeploymentsView.vue'),
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: () => import('../views/JobsView.vue'),
    },
    {
      path: '/playground',
      name: 'playground',
      component: () => import('../views/PlaygroundView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
  ],
})

// Navigation guards
router.beforeEach(async (to, from, next) => {

  const { isAuthenticated, initAuth } = useAuth()

  // Initialize auth state
  await initAuth()

  // Allow access to auth routes without authentication
  if ((to.name === 'auth' || to.name === 'invitation-setup') && !isAuthenticated.value) {
    next()
    return
  }

  // If authenticated, allow access to all routes
  if (isAuthenticated.value) {
    next()
    return
  }

  // If not authenticated and trying to access protected route, redirect to auth
  next({ name: 'auth' })
})

export default router
