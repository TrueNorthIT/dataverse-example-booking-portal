import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query"
import { useAuth0 } from "@auth0/auth0-react"
import { useDataverse, publicClient } from "./useDataverse"
import type { DataverseClient, QueryOptions } from "@truenorth-it/dataverse-client"

/**
 * React Query hook for fetching a public list from the citizen booking API.
 */
export function useApiList<T>(
  queryKey: readonly unknown[],
  table: string,
  options?: Pick<QueryOptions, "filter" | "select" | "expand" | "orderBy">,
  queryOptions?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const resp = await publicClient.public.list<T>(table, options)
      return resp.data
    },
    ...queryOptions,
  })
}

/**
 * Like useApiList, but follows the cursor (`page.next`) to return ALL rows, not
 * just the first page. Use for full-dataset maps (e.g. resource→category) where
 * a truncated first page would silently drop records.
 */
export function useApiListAll<T>(
  queryKey: readonly unknown[],
  table: string,
  options?: Pick<QueryOptions, "filter" | "select" | "expand" | "orderBy">,
  queryOptions?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const all: T[] = []
      for await (const page of publicClient.public.eachPage<T>(table, { top: 100, ...options })) {
        all.push(...page.data)
      }
      return all
    },
    ...queryOptions,
  })
}

/**
 * React Query hook for fetching a single public record.
 */
export function useApiGet<T>(
  queryKey: readonly unknown[],
  table: string,
  id: string | undefined,
  queryOptions?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const resp = await publicClient.public.get<T>(table, id!)
      return resp.data
    },
    ...queryOptions,
  })
}

/**
 * Authenticated list hook — uses SDK client.me for user-scoped data.
 */
export function useAuthenticatedList<T>(
  queryKey: readonly unknown[],
  table: string,
  options?: Pick<QueryOptions, "expand" | "orderBy" | "filter" | "select" | "top">,
  queryOptions?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">
) {
  const client = useDataverse()
  const { isAuthenticated } = useAuth0()
  return useQuery({
    queryKey,
    queryFn: async () => {
      const resp = await client.me.list<T>(table, options)
      return resp.data
    },
    enabled: isAuthenticated && (queryOptions?.enabled !== false),
    ...queryOptions,
  })
}

/**
 * Authenticated mutation — wraps useMutation with SDK client.
 * The mutationFn receives (variables, client).
 */
export function useAuthenticatedMutation<TVariables, TData = void>(
  mutationFn: (variables: TVariables, client: DataverseClient) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> & {
    invalidateKeys?: readonly (readonly unknown[])[]
  }
) {
  const client = useDataverse()
  const queryClient = useQueryClient()
  const { invalidateKeys, onSuccess, ...restOptions } = options ?? {}

  return useMutation({
    ...restOptions,
    mutationFn: async (variables: TVariables) => {
      return mutationFn(variables, client)
    },
    onSuccess: (...args) => {
      if (invalidateKeys) {
        for (const key of invalidateKeys)
          queryClient.invalidateQueries({ queryKey: key as unknown[] })
      }
      onSuccess?.(...args)
    },
  })
}
