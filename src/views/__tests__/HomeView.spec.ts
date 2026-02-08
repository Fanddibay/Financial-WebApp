import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import i18n from '@/i18n'
import HomeView from '../HomeView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', name: 'home', component: HomeView }],
})

describe('HomeView', () => {
  it('renders home content with total balance section', async () => {
    await router.push('/')
    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), i18n, router],
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          'font-awesome-icon': { template: '<span class="fa-icon" />' },
          WeeklyTransactionsBarChart: { template: '<div class="chart-stub" />' },
        },
      },
    })

    // Home shows total balance label (ID: "Total Saldo", EN: "Total Balance")
    expect(wrapper.text()).toMatch(/Total Saldo|Total Balance/)
  })
})

