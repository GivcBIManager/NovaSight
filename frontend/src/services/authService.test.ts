/**
 * Auth Service Tests
 * Comprehensive tests for authentication service
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Import after mocking
import { authService, User, LoginResponse } from '@/services/authService'

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    const mockLoginResponse: LoginResponse = {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: 'tenant-1',
        tenant_name: 'Test Tenant',
        roles: ['user'],
      },
    }

    it('should login successfully with valid credentials', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockLoginResponse })

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.access_token).toBe('mock-access-token')
      expect(result.user.email).toBe('test@example.com')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
        })
      )
    })

    it('should include tenant_slug when provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockLoginResponse })

      await authService.login({
        email: 'test@example.com',
        password: 'password123',
        tenant_slug: 'my-tenant',
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tenant_slug: 'my-tenant',
        })
      )
    })

    it('should throw error on invalid credentials', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { message: 'Invalid credentials' } },
      })

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'))

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network Error')
    })
  })

  describe('register', () => {
    it('should register new user successfully', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          id: '2',
          email: 'newuser@example.com',
          name: 'New User',
          tenant_id: 'tenant-1',
          tenant_name: 'Test Tenant',
          roles: ['user'],
        },
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      })

      expect(result.user.email).toBe('newuser@example.com')
      expect(result.access_token).toBe('new-access-token')
    })

    it('should reject registration with duplicate email', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Email already exists' } },
      })

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'User',
        })
      ).rejects.toThrow()
    })
  })

  describe('token management', () => {
    it('should store tokens in localStorage', () => {
      authService.setTokens('access-token')

      expect(authService.getAccessToken()).toBe('access-token')
    })

    it('should clear tokens on logout', () => {
      authService.setTokens('access-token')
      authService.clearTokens()

      expect(authService.getAccessToken()).toBeNull()
    })

    it('should refresh access token', async () => {
      authService.setTokens('old-access')

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
        },
      })

      const newToken = await authService.refreshAccessToken()

      expect(newToken).toBe('new-access-token')
    })

    it('should handle refresh token expiry', async () => {
      authService.setTokens('old-access')

      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { message: 'Refresh token expired' } },
      })

      await expect(authService.refreshAccessToken()).rejects.toThrow()
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch current user', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: 'tenant-1',
        tenant_name: 'Test Tenant',
        roles: ['user'],
      }

      authService.setTokens('valid-token')
      mockedAxios.get.mockResolvedValueOnce({ data: { user: mockUser } })

      const user = await authService.getCurrentUser()

      expect(user.email).toBe('test@example.com')
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      )
    })
  })

  describe('password operations', () => {
    it('should send forgot password email', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Email sent' } })

      await authService.forgotPassword('test@example.com')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/forgot-password'),
        { email: 'test@example.com' }
      )
    })
  })
})
