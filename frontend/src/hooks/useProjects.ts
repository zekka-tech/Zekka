import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/services/api'
import type { Project } from '@/types/project.types'

export const useProjects = () => {
  const queryClient = useQueryClient()

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
    onSuccess: (newProject) => {
      queryClient.setQueryData(['projects'], (old: Project[] | undefined) => [
        ...(old || []),
        newProject
      ])
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
      projectId ? apiService.updateProject(projectId, data) : Promise.reject('No project ID'),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(['projects', projectId], updatedProject)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: () =>
      projectId ? apiService.deleteProject(projectId) : Promise.reject('No project ID'),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['projects', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
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
