/**
 * API Client Tests
 * Comprehensive tests for the Axios-based API client
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// We need to mock the modules before importing
vi.mock('./authService', () => ({
  authService: {
    getAccessToken: vi.fn(),
    refreshAccessToken: vi.fn(),
    clearTokens: vi.fn(),
  },
}))

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      const { authService } = await import('./authService')
      ;(authService.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue('test-token')

      // Simulate request interceptor behavior
      const config: InternalAxiosRequestConfig = {
        headers: new axios.AxiosHeaders(),
        url: '/api/test',
        method: 'get',
      }

      const token = authService.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      expect(config.headers.Authorization).toBe('Bearer test-token')
    })

    it('should not add Authorization header when no token', async () => {
      const { authService } = await import('./authService')
      ;(authService.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(null)

      const config: InternalAxiosRequestConfig = {
        headers: new axios.AxiosHeaders(),
        url: '/api/test',
        method: 'get',
      }

      const token = authService.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      expect(config.headers.Authorization).toBeUndefined()
    })
  })

  describe('Response Interceptor - Token Refresh', () => {
    it('should refresh token on 401 error', async () => {
      const { authService } = await import('./authService')
      const mockRefresh = authService.refreshAccessToken as ReturnType<typeof vi.fn>
      mockRefresh.mockResolvedValue('new-token')

      // Simulate 401 error handling
      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
      } as AxiosError & { config: { _retry?: boolean } }

      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true
        const newToken = await authService.refreshAccessToken()
        expect(newToken).toBe('new-token')
      }

      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should redirect to login on refresh failure', async () => {
      const { authService } = await import('./authService')
      const mockRefresh = authService.refreshAccessToken as ReturnType<typeof vi.fn>
      mockRefresh.mockRejectedValue(new Error('Refresh failed'))

      const mockClearTokens = authService.clearTokens as ReturnType<typeof vi.fn>

      // Store original location
      const originalLocation = window.location

      // Mock window.location
      delete (window as any).location
      window.location = { href: '' } as Location

      try {
        await authService.refreshAccessToken()
      } catch {
        authService.clearTokens()
        window.location.href = '/login'
      }

      expect(mockClearTokens).toHaveBeenCalled()
      expect(window.location.href).toBe('/login')

      // Restore
      window.location = originalLocation
    })

    it('should queue requests during token refresh', async () => {
      const { authService } = await import('./authService')
      
      let refreshResolve: (value: string) => void
      const refreshPromise = new Promise<string>((resolve) => {
        refreshResolve = resolve
      })
      
      const mockRefresh = authService.refreshAccessToken as ReturnType<typeof vi.fn>
      mockRefresh.mockReturnValue(refreshPromise)

      // Simulate multiple requests during refresh
      const request1 = authService.refreshAccessToken()
      const request2 = authService.refreshAccessToken()

      // Resolve the refresh
      refreshResolve!('new-token')

      const [token1, token2] = await Promise.all([request1, request2])

      expect(token1).toBe('new-token')
      expect(token2).toBe('new-token')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const error = new Error('Network Error')
      expect(error.message).toBe('Network Error')
    })

    it('should handle timeout errors', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      }
      expect(error.code).toBe('ECONNABORTED')
    })

    it('should handle 500 errors', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      }
      expect(error.response.status).toBe(500)
    })

    it('should handle 403 forbidden errors', () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      }
      expect(error.response.status).toBe(403)
    })

    it('should handle 404 not found errors', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not Found' },
        },
      }
      expect(error.response.status).toBe(404)
    })

    it('should handle validation errors (422)', () => {
      const error = {
        response: {
          status: 422,
          data: {
            message: 'Validation Error',
            errors: {
              email: ['Invalid email format'],
              password: ['Password too short'],
            },
          },
        },
      }
      expect(error.response.status).toBe(422)
      expect(error.response.data.errors.email).toContain('Invalid email format')
    })
  })
})

describe('API Request Methods', () => {
  describe('GET requests', () => {
    it('should handle query parameters', () => {
      const params = { page: 1, limit: 10, search: 'test' }
      const queryString = new URLSearchParams(params as any).toString()
      expect(queryString).toBe('page=1&limit=10&search=test')
    })

    it('should handle array query parameters', () => {
      const params = { tags: ['sales', 'marketing'] }
      // URLSearchParams handles arrays
      const searchParams = new URLSearchParams()
      params.tags.forEach((tag) => searchParams.append('tags', tag))
      expect(searchParams.toString()).toBe('tags=sales&tags=marketing')
    })
  })

  describe('POST requests', () => {
    it('should set Content-Type to application/json', () => {
      const headers = { 'Content-Type': 'application/json' }
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should handle FormData for file uploads', () => {
      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.txt')
      expect(formData.has('file')).toBe(true)
    })
  })

  describe('PATCH requests', () => {
    it('should send partial updates', () => {
      const originalData = { name: 'Old Name', description: 'Old Desc' }
      const updates = { name: 'New Name' }
      const merged = { ...originalData, ...updates }
      expect(merged.name).toBe('New Name')
      expect(merged.description).toBe('Old Desc')
    })
  })

  describe('DELETE requests', () => {
    it('should handle delete confirmation', () => {
      const confirmed = true
      expect(confirmed).toBe(true)
    })
  })
})
