export const CARD = { width: 188, height: 96 }
export const MIN_ZOOM = .25
export const MAX_ZOOM = 3

// Camera translation is in viewport pixels. Card positions are in canvas units.
export function zoomAt(camera, factor, from, to = from) {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.k * factor))
  const ratio = k / camera.k
  return { x: to.x - (from.x - camera.x) * ratio, y: to.y - (from.y - camera.y) * ratio, k }
}

export function centered(node, k, width, height) {
  return { k, x: width / 2 - (node.x + CARD.width / 2) * k, y: height / 2 - (node.y + CARD.height / 2) * k }
}

export function readPositions(storageKey) {
  try {
    const pairs = JSON.parse(localStorage.getItem(storageKey))
    return new Map(Array.isArray(pairs) ? pairs.filter(entry => Array.isArray(entry) && entry.length === 2 &&
      Number.isSafeInteger(entry[0]) && entry[0] > 0 && Number.isFinite(entry[1]?.x) && Number.isFinite(entry[1]?.y)) : [])
  } catch { return new Map() }
}
