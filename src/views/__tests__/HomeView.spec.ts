import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '../HomeView.vue'

describe('HomeView', () => {
  it('renders the hero copy', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
          'font-awesome-icon': {
            template: '<span class="fa-icon" />',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Build faster with a clean Vue starter')
  })
})

