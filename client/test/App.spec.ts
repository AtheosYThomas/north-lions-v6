import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { describe, it, expect } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import router from '../src/router'

describe('App.vue', () => {
  it('should mount successfully', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: (fn) => fn,
          }),
          router
        ]
      }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
