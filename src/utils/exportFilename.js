/**
 * Shared export filename builder.
 *
 * Format: CostEstimate_{project}_{rev}_{scope}_{date}.{ext}
 *
 * - project : roomName → sponsor → 'CostEstimate'
 * - rev     : project.revision (omitted when blank)
 * - scope   : optional scope name (omitted for combined/summary exports)
 * - date    : project.date or today in YYYY-MM-DD format
 */
function slug(s, maxLen = 40) {
  return (s || '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, maxLen) || ''
}

export function buildExportFilename(rom, { scope = null, tag = '', ext = 'pdf' } = {}) {
  const project = rom.project || {}
  const name    = slug(project.roomName || project.sponsor, 40) || 'CostEstimate'
  const rev     = slug(project.revision, 12)
  const sc      = scope ? slug(scope.name, 30) : ''
  const date    = (project.date && /^\d{4}-\d{2}-\d{2}$/.test(project.date))
                    ? project.date
                    : new Date().toISOString().slice(0, 10)

  const parts = ['CostEstimate', name]
  if (rev)  parts.push(rev)
  if (sc)   parts.push(sc)
  if (tag)  parts.push(tag)
  parts.push(date)

  return parts.join('_') + '.' + ext
}
