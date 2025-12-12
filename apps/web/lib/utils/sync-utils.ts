/**
 * Utility functions for formatting sync-related data
 */

/**
 * Get formatted "time ago" string for last sync
 */
export function formatSyncTimeAgo(syncedAt: string): string {
  const syncDate = new Date(syncedAt)
  const now = new Date()
  const diffMs = now.getTime() - syncDate.getTime()
  
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}
