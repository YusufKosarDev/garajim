import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Her testten sonra DOM'u temizle — testler birbirinin state'ini görmesin
afterEach(() => {
  cleanup()
  localStorage.clear()
})
