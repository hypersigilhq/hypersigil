import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
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

export default router
