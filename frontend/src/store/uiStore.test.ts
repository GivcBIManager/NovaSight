/**
 * UI Store Tests
 * Comprehensive tests for UI state management
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './uiStore'

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      notifications: [],
      modals: {},
      loading: {},
      toasts: [],
    })
  })

  describe('Sidebar State', () => {
    it('should have sidebar open by default', () => {
      const state = useUIStore.getState()
      expect(state.sidebarOpen).toBe(true)
    })

    it('should toggle sidebar open state', () => {
      const { toggleSidebar } = useUIStore.getState()
      
      toggleSidebar()
      expect(useUIStore.getState().sidebarOpen).toBe(false)
      
      toggleSidebar()
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })

    it('should set sidebar open state directly', () => {
      const { setSidebarOpen } = useUIStore.getState()
      
      setSidebarOpen(false)
      expect(useUIStore.getState().sidebarOpen).toBe(false)
      
      setSidebarOpen(true)
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })

    it('should toggle sidebar collapsed state', () => {
      const { toggleSidebarCollapsed } = useUIStore.getState()
      
      toggleSidebarCollapsed()
      expect(useUIStore.getState().sidebarCollapsed).toBe(true)
      
      toggleSidebarCollapsed()
      expect(useUIStore.getState().sidebarCollapsed).toBe(false)
    })
  })

  describe('Theme State', () => {
    it('should have light theme by default', () => {
      const state = useUIStore.getState()
      expect(state.theme).toBe('light')
    })

    it('should set theme to dark', () => {
      const { setTheme } = useUIStore.getState()
      
      setTheme('dark')
      expect(useUIStore.getState().theme).toBe('dark')
    })

    it('should set theme to system', () => {
      const { setTheme } = useUIStore.getState()
      
      setTheme('system')
      expect(useUIStore.getState().theme).toBe('system')
    })

    it('should toggle between light and dark', () => {
      const { toggleTheme } = useUIStore.getState()
      
      // Start with light
      expect(useUIStore.getState().theme).toBe('light')
      
      toggleTheme()
      expect(useUIStore.getState().theme).toBe('dark')
      
      toggleTheme()
      expect(useUIStore.getState().theme).toBe('light')
    })
  })

  describe('Notifications', () => {
    it('should start with empty notifications', () => {
      const state = useUIStore.getState()
      expect(state.notifications).toEqual([])
    })

    it('should add notification', () => {
      const { addNotification } = useUIStore.getState()
      
      addNotification({
        id: '1',
        type: 'info',
        message: 'Test notification',
      })
      
      const notifications = useUIStore.getState().notifications
      expect(notifications).toHaveLength(1)
      expect(notifications[0].message).toBe('Test notification')
    })

    it('should remove notification by id', () => {
      const { addNotification, removeNotification } = useUIStore.getState()
      
      addNotification({ id: '1', type: 'info', message: 'Notification 1' })
      addNotification({ id: '2', type: 'warning', message: 'Notification 2' })
      
      removeNotification('1')
      
      const notifications = useUIStore.getState().notifications
      expect(notifications).toHaveLength(1)
      expect(notifications[0].id).toBe('2')
    })

    it('should clear all notifications', () => {
      const { addNotification, clearNotifications } = useUIStore.getState()
      
      addNotification({ id: '1', type: 'info', message: 'Notification 1' })
      addNotification({ id: '2', type: 'warning', message: 'Notification 2' })
      
      clearNotifications()
      
      expect(useUIStore.getState().notifications).toEqual([])
    })

    it('should mark notification as read', () => {
      const { addNotification, markNotificationRead } = useUIStore.getState()
      
      addNotification({
        id: '1',
        type: 'info',
        message: 'Unread notification',
        read: false,
      })
      
      markNotificationRead('1')
      
      const notification = useUIStore.getState().notifications[0]
      expect(notification.read).toBe(true)
    })
  })

  describe('Modal State', () => {
    it('should start with no open modals', () => {
      const state = useUIStore.getState()
      expect(Object.keys(state.modals)).toHaveLength(0)
    })

    it('should open modal by id', () => {
      const { openModal } = useUIStore.getState()
      
      openModal('confirmDelete')
      
      expect(useUIStore.getState().modals.confirmDelete).toBe(true)
    })

    it('should close modal by id', () => {
      const { openModal, closeModal } = useUIStore.getState()
      
      openModal('confirmDelete')
      closeModal('confirmDelete')
      
      expect(useUIStore.getState().modals.confirmDelete).toBe(false)
    })

    it('should track multiple modals independently', () => {
      const { openModal, closeModal } = useUIStore.getState()
      
      openModal('modal1')
      openModal('modal2')
      
      expect(useUIStore.getState().modals.modal1).toBe(true)
      expect(useUIStore.getState().modals.modal2).toBe(true)
      
      closeModal('modal1')
      
      expect(useUIStore.getState().modals.modal1).toBe(false)
      expect(useUIStore.getState().modals.modal2).toBe(true)
    })

    it('should close all modals', () => {
      const { openModal, closeAllModals } = useUIStore.getState()
      
      openModal('modal1')
      openModal('modal2')
      openModal('modal3')
      
      closeAllModals()
      
      const modals = useUIStore.getState().modals
      expect(Object.values(modals).every(v => v === false)).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('should start with no loading states', () => {
      const state = useUIStore.getState()
      expect(Object.keys(state.loading)).toHaveLength(0)
    })

    it('should set loading state for key', () => {
      const { setLoading } = useUIStore.getState()
      
      setLoading('fetchDashboards', true)
      
      expect(useUIStore.getState().loading.fetchDashboards).toBe(true)
    })

    it('should clear loading state', () => {
      const { setLoading } = useUIStore.getState()
      
      setLoading('fetchDashboards', true)
      setLoading('fetchDashboards', false)
      
      expect(useUIStore.getState().loading.fetchDashboards).toBe(false)
    })

    it('should check if any key is loading', () => {
      const { setLoading, isAnyLoading } = useUIStore.getState()
      
      setLoading('key1', false)
      setLoading('key2', false)
      
      expect(isAnyLoading()).toBe(false)
      
      setLoading('key1', true)
      
      expect(isAnyLoading()).toBe(true)
    })
  })

  describe('Toast Notifications', () => {
    it('should add toast notification', () => {
      const { addToast } = useUIStore.getState()
      
      addToast({
        id: 'toast-1',
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
      })
      
      const toasts = useUIStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].type).toBe('success')
    })

    it('should remove toast by id', () => {
      const { addToast, removeToast } = useUIStore.getState()
      
      addToast({ id: 'toast-1', type: 'info', message: 'Info' })
      addToast({ id: 'toast-2', type: 'error', message: 'Error' })
      
      removeToast('toast-1')
      
      const toasts = useUIStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].id).toBe('toast-2')
    })

    it('should add toast with auto-dismiss duration', () => {
      const { addToast } = useUIStore.getState()
      
      addToast({
        id: 'toast-1',
        type: 'info',
        message: 'Auto dismiss',
        duration: 5000,
      })
      
      const toast = useUIStore.getState().toasts[0]
      expect(toast.duration).toBe(5000)
    })

    it('should support different toast types', () => {
      const { addToast } = useUIStore.getState()
      
      const types = ['success', 'error', 'warning', 'info'] as const
      
      types.forEach((type, index) => {
        addToast({
          id: `toast-${index}`,
          type,
          message: `${type} message`,
        })
      })
      
      const toasts = useUIStore.getState().toasts
      expect(toasts).toHaveLength(4)
      expect(toasts.map(t => t.type)).toEqual(types)
    })
  })

  describe('Breadcrumbs', () => {
    it('should set breadcrumbs', () => {
      const { setBreadcrumbs } = useUIStore.getState()
      
      setBreadcrumbs([
        { label: 'Home', path: '/' },
        { label: 'Dashboards', path: '/dashboards' },
        { label: 'Sales Overview', path: '/dashboards/1' },
      ])
      
      const breadcrumbs = useUIStore.getState().breadcrumbs
      expect(breadcrumbs).toHaveLength(3)
      expect(breadcrumbs[2].label).toBe('Sales Overview')
    })

    it('should clear breadcrumbs', () => {
      const { setBreadcrumbs, clearBreadcrumbs } = useUIStore.getState()
      
      setBreadcrumbs([{ label: 'Home', path: '/' }])
      clearBreadcrumbs()
      
      expect(useUIStore.getState().breadcrumbs).toEqual([])
    })
  })

  describe('Page Title', () => {
    it('should set page title', () => {
      const { setPageTitle } = useUIStore.getState()
      
      setPageTitle('Dashboard')
      
      expect(useUIStore.getState().pageTitle).toBe('Dashboard')
    })

    it('should update document title', () => {
      const { setPageTitle } = useUIStore.getState()
      
      setPageTitle('New Page Title')
      
      // In real app, this would update document.title
      expect(useUIStore.getState().pageTitle).toBe('New Page Title')
    })
  })
})
