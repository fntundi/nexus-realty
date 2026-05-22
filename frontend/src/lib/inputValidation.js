/**
 * Sanitizes a search query string by stripping potentially harmful characters
 * and normalizing whitespace.
 */
export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  return query
    .replace(/[<>'"`;]/g, '')  // strip HTML/injection chars
    .replace(/\s+/g, ' ')       // normalize whitespace
    .trim()
    .slice(0, 200);             // cap length
}