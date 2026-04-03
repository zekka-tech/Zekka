import { useEffect, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/services/api'

export const useAuth = () => {
  const queryClient = useQueryClient()
  const hasToken = useSyncExternalStore(
    (listener) => apiService.subscribeAuthChange(listener),
    () => apiService.isAuthenticated(),
    () => false
  )

  useEffect(() => {
    if (!hasToken) {
      queryClient.setQueryData(['auth', 'user'], null)
    }
  }, [hasToken, queryClient])

  // Get current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => apiService.getMe(),
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiService.login(credentials.email, credentials.password),
    onSuccess: (data: any) => {
      queryClient.setQueryData(['auth', 'user'], data.user || data)
      // Invalidate all queries to refresh
      queryClient.invalidateQueries()
    }
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: { email: string; password: string; name: string }) =>
      apiService.register(data.email, data.password, data.name),
    onSuccess: (data: any) => {
      queryClient.setQueryData(['auth', 'user'], data.user || data)
      queryClient.invalidateQueries()
    }
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiService.logout(),
    onSuccess: () => {
      queryClient.clear()
    }
  })

  return {
    user,
    isLoading,
    error,
    isAuthenticated: hasToken && !!user && !error,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending
  }
}
