import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Source, SourceFolder } from '@/types/project.types'

// These hooks will fetch from the backend once the APIs are implemented
// For now they return empty arrays to prevent errors

export const useSources = (projectId: string) => {
  return useQuery({
    queryKey: ['sources', projectId],
    queryFn: async () => {
      // TODO: Implement sources API endpoint
      return [] as Source[]
    },
    enabled: !!projectId
  })
}

export const useSourceFolders = (projectId: string) => {
  return useQuery({
    queryKey: ['source-folders', projectId],
    queryFn: async () => {
      // TODO: Implement source folders API endpoint
      return [] as SourceFolder[]
    },
    enabled: !!projectId
  })
}

export const useCreateSource = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      // TODO: Implement create source API endpoint
      const file = formData.get('file') as File
      return {
        id: Math.random().toString(),
        projectId,
        name: file.name,
        type: 'file' as const,
        fileSize: file.size,
        uploadedAt: new Date(),
        metadata: { mimeType: file.type }
      } as Source
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', projectId] })
    }
  })
}

export const useDeleteSource = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // TODO: Implement delete source API endpoint
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
      // TODO: Implement create source folder API endpoint
      return {
        id: Math.random().toString(),
        projectId,
        name: data.name,
        parentId: data.parentId,
        createdAt: new Date()
      } as SourceFolder
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
      // TODO: Implement search sources API endpoint
      return [] as Source[]
    },
    enabled: !!projectId && query.length > 0
  })
}
