import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types/project.types'

// H11: Exponential backoff — 1 s, 2 s, 4 s
const exponentialBackoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000)

export const useProjects = () => {
  const queryClient = useQueryClient()
  const { error: toastError } = useToast()

  // Get all projects
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; type?: string }) =>
      apiService.createProject(data),
    retry: 3,
    retryDelay: exponentialBackoff,
    onSuccess: (newProject) => {
      queryClient.setQueryData(['projects'], (old: Project[] | undefined) => [
        ...(old || []),
        newProject
      ])
    },
    onError: (err: Error) => {
      toastError('Failed to create project', err.message)
    }
  })

  return {
    projects: projects || [],
    isLoading,
    error,
    createProject: createMutation.mutate,
    createProjectAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error
  }
}

export const useProject = (projectId: string | null) => {
  const queryClient = useQueryClient()
  const { error: toastError } = useToast()

  // Get single project
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectId ? apiService.getProject(projectId) : null,
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  })

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Project>) =>
      projectId ? apiService.updateProject(projectId, data) : Promise.reject(new Error('No project ID')),
    retry: 3,
    retryDelay: exponentialBackoff,
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(['projects', projectId], updatedProject)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err: Error) => {
      toastError('Failed to update project', err.message)
    }
  })

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: () =>
      projectId ? apiService.deleteProject(projectId) : Promise.reject(new Error('No project ID')),
    retry: 3,
    retryDelay: exponentialBackoff,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['projects', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err: Error) => {
      toastError('Failed to delete project', err.message)
    }
  })

  return {
    project,
    isLoading,
    error,
    updateProject: updateMutation.mutate,
    updateProjectAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProject: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    deleteProjectAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending
  }
}

export const useCreateProject = () => {
  const { createProjectAsync } = useProjects()
  return {
    mutateAsync: createProjectAsync,
    isPending: false
  }
}

export const useProjectStats = (projectId: string) => {
  return useQuery({
    queryKey: ['projects', projectId, 'stats'],
    queryFn: async () => {
      return await apiService.getProjectStats(projectId)
    },
    enabled: !!projectId
  })
}
