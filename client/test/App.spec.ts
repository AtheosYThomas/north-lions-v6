import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { describe, it, expect } from 'vitest'

describe('App.vue', () => {
  it('should mount successfully', () => {
    const wrapper = mount(App)
    expect(wrapper.exists()).toBe(true)
  })
})
