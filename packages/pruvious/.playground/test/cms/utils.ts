import { $fetch } from '@nuxt/test-utils/e2e'
import type { Paginated } from '@pruvious/orm'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack/types'
import { expect } from 'vitest'

let adminToken: string
let userToken: string
let authorToken: string
let editorToken: string
let managerToken: string

export function $post(
  request: NitroFetchRequest,
  body: Record<string, any> | Record<string, any>[] = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'post',
    body,
  })
}

export function $postAsAdmin(
  request: NitroFetchRequest,
  body: Record<string, any> | Record<string, any>[] = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'post',
    headers: withAuth(opts, 'admin'),
    body,
  })
}

export function $postAsUser(
  request: NitroFetchRequest,
  body: Record<string, any> | Record<string, any>[] = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'post',
    headers: withAuth(opts, 'user'),
    body,
  })
}

export function $postAsAuthor(
  request: NitroFetchRequest,
  body: Record<string, any> | Record<string, any>[] = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'post',
    headers: withAuth(opts, 'author'),
    body,
  })
}

export function $postAsEditor(
  request: NitroFetchRequest,
  body: Record<string, any> | Record<string, any>[] = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'post',
    headers: withAuth(opts, 'editor'),
    body,
  })
}

export function $postAsManager(
  request: NitroFetchRequest,
  body: Record<string, any> | Record<string, any>[] = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'post',
    headers: withAuth(opts, 'manager'),
    body,
  })
}

export function $get(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'get'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'get',
  })
}

export function $getAsAdmin(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'get'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'get',
    headers: withAuth(opts, 'admin'),
  })
}

export function $getAsUser(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'get'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'get',
    headers: withAuth(opts, 'user'),
  })
}

export function $getAsAuthor(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'get'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'get',
    headers: withAuth(opts, 'author'),
  })
}

export function $getAsEditor(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'get'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'get',
    headers: withAuth(opts, 'editor'),
  })
}

export function $getAsManager(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'get'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'get',
    headers: withAuth(opts, 'manager'),
  })
}

export function $patch(
  request: NitroFetchRequest,
  body: Record<string, any> = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'patch'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'patch',
    body,
  })
}

export function $patchAsAdmin(
  request: NitroFetchRequest,
  body: Record<string, any> = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'patch'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'patch',
    headers: withAuth(opts, 'admin'),
    body,
  })
}

export function $patchAsUser(
  request: NitroFetchRequest,
  body: Record<string, any> = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'patch'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'patch',
    headers: withAuth(opts, 'user'),
    body,
  })
}

export function $patchAsAuthor(
  request: NitroFetchRequest,
  body: Record<string, any> = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'patch'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'patch',
    headers: withAuth(opts, 'author'),
    body,
  })
}

export function $patchAsEditor(
  request: NitroFetchRequest,
  body: Record<string, any> = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'patch'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'patch',
    headers: withAuth(opts, 'editor'),
    body,
  })
}

export function $patchAsManager(
  request: NitroFetchRequest,
  body: Record<string, any> = {},
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'patch'>, 'method' | 'body'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'patch',
    headers: withAuth(opts, 'manager'),
    body,
  })
}

export function $delete(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'delete'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'delete',
  })
}

export function $deleteAsAdmin(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'delete'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'delete',
    headers: withAuth(opts, 'admin'),
  })
}

export function $deleteAsUser(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'delete'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'delete',
    headers: withAuth(opts, 'user'),
  })
}

export function $deleteAsAuthor(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'delete'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'delete',
    headers: withAuth(opts, 'author'),
  })
}

export function $deleteAsEditor(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'delete'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'delete',
    headers: withAuth(opts, 'editor'),
  })
}

export function $deleteAsManager(
  request: NitroFetchRequest,
  opts?: Omit<NitroFetchOptions<NitroFetchRequest, 'delete'>, 'method'> | undefined,
) {
  return $fetch(request, {
    ignoreResponseError: true,
    ...opts,
    method: 'delete',
    headers: withAuth(opts, 'manager'),
  })
}

export function $paginated<T extends Record<string, any>>(
  records: T[],
  currentPage?: number,
  lastPage?: number,
  perPage?: number,
  total?: number,
): Paginated<T> {
  return {
    records,
    currentPage: currentPage ?? 1,
    lastPage: lastPage ?? (records.length ? 1 : 0),
    perPage: perPage ?? records.length,
    total: total ?? records.length,
  }
}

export function $400(message = 'Bad Request') {
  return { statusCode: 400, statusMessage: 'Bad Request', message, url: expect.any(String), error: true }
}

export function $401(message = 'Unauthorized') {
  return { statusCode: 401, statusMessage: 'Unauthorized', message, url: expect.any(String), error: true }
}

export function $403(message = 'Forbidden') {
  return { statusCode: 403, statusMessage: 'Forbidden', message, url: expect.any(String), error: true }
}

export function $404(message = 'Not Found') {
  return { statusCode: 404, statusMessage: 'Not Found', message, url: expect.any(String), error: true }
}

export function $422(data: Record<string, any> | Record<string, any>[], message = 'Invalid input') {
  return { statusCode: 422, statusMessage: 'Unprocessable Entity', data, message, url: expect.any(String), error: true }
}

export function setAdminToken(token: string) {
  adminToken = token
}

export function setUserToken(token: string) {
  userToken = token
}

export function setAuthorToken(token: string) {
  authorToken = token
}

export function setEditorToken(token: string) {
  editorToken = token
}

export function setManagerToken(token: string) {
  managerToken = token
}

function withAuth(
  opts: Omit<NitroFetchOptions<NitroFetchRequest, 'post'>, 'method' | 'body'> | undefined,
  user: 'admin' | 'user' | 'author' | 'editor' | 'manager' = 'admin',
) {
  const headers: Record<string, any> = opts?.headers ?? {}

  if (user === 'admin' && adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`
  } else if (user === 'user' && userToken) {
    headers['Authorization'] = `Bearer ${userToken}`
  } else if (user === 'author' && authorToken) {
    headers['Authorization'] = `Bearer ${authorToken}`
  } else if (user === 'editor' && editorToken) {
    headers['Authorization'] = `Bearer ${editorToken}`
  } else if (user === 'manager' && managerToken) {
    headers['Authorization'] = `Bearer ${managerToken}`
  }

  return headers
}
