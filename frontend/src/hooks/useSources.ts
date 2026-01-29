import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/services/api'

export const useSources = (projectId: string) => {
  return useQuery({
    queryKey: ['sources', projectId],
    queryFn: async () => {
      return await apiService.getSources(projectId)
    },
    enabled: !!projectId
  })
}

export const useSourceFolders = (projectId: string) => {
  return useQuery({
    queryKey: ['source-folders', projectId],
    queryFn: async () => {
      return await apiService.getSourceFolders(projectId)
    },
    enabled: !!projectId
  })
}

export const useCreateSource = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiService.createSource(projectId, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', projectId] })
    }
  })
}

export const useDeleteSource = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sourceId: string) => {
      return await apiService.deleteSource(sourceId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', projectId] })
    }
  })
}

export const useCreateSourceFolder = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; parentId?: string }) => {
      return await apiService.createSourceFolder(projectId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-folders', projectId] })
    }
  })
}

export const useSearchSources = (projectId: string, query: string) => {
  return useQuery({
    queryKey: ['sources', projectId, 'search', query],
    queryFn: async () => {
      return await apiService.searchSources(projectId, query)
    },
    enabled: !!projectId && query.length > 0
  })
}
