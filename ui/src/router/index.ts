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
  ],
})

// Navigation guards
router.beforeEach(async (to, from, next) => {

  const { isAuthenticated, initAuth } = useAuth()

  // Initialize auth state
  await initAuth()

  if (to.name === 'auth' && !isAuthenticated.value) {
    next()
    return
  }

  if (isAuthenticated.value) {
    next()
    return
  }
})

export default router
