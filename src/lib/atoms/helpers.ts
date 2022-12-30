export function createTimeoutCacheShouldRemove(removeAfterMinutes = 5) {
  function shouldRemove(createdAt: number, value: any) {
    if (!value) return true
    const diff = Date.now() - createdAt
    const minutesAgo = diff / 1000 / 60
    return minutesAgo > removeAfterMinutes
  }

  return shouldRemove
}

export const defaultCacheOptions = {
  shouldRemove: createTimeoutCacheShouldRemove(),
}
