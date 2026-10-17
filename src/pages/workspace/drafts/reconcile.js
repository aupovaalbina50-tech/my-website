// What to do with a copy of a document kept on this device when the editor
// opens it, and whether a refused save is a real conflict. Pure functions
// (no IndexedDB, no network): the editor and the tests use them.
//
// A copy = { payload: { values, title, lang, … }, baseContent, savedAt }
//   baseContent  the content key of the server text the copy was edited from

// Where the editor was (step of the wizard, chosen method) is not content.
const UI_STATE = ['__flow']

/** What the user edits; status, check results, timestamps and the editor's own UI state are not content. */
export const contentKey = ({ values, title, lang }) => {
  const v = { ...(values ?? {}) }
  for (const k of UI_STATE) delete v[k]
  return JSON.stringify({ values: v, title: title ?? '', lang: lang ?? 'ru' })
}

/**
 * 'none'     no copy on this device
 * 'discard'  the server already holds exactly this text, or the copy holds no edit
 * 'restore'  the copy has edits not yet saved, made on top of the text the server still holds
 * 'conflict' the server text changed since the copy was made (another tab / device):
 *            the user compares and chooses — nothing is overwritten silently
 */
export function reconcile(server, copy) {
  if (!copy) return 'none'
  const serverKey = contentKey(server)
  const copyKey = contentKey(copy.payload)
  if (copyKey === serverKey) return 'discard'
  // The copy holds no edit of its own (only the editor's state changed): nothing to restore.
  if (copyKey === copy.baseContent) return 'discard'
  if (copy.baseContent === serverKey) return 'restore'
  return 'conflict'
}

/**
 * A save was refused because updated_at moved. It is a conflict only when the
 * content on the server is not the content this editor last confirmed (a new
 * version number or a status change elsewhere moves updated_at too).
 */
export const isRealConflict = (serverRow, confirmedContent) => contentKey(serverRow) !== confirmedContent

/** Network failure (no connection) vs. a refusal of the server. */
export const isOffline = (error, online = typeof navigator === 'undefined' ? true : navigator.onLine) =>
  !online || /failed to fetch|network|load failed|fetch failed|networkerror/i.test(`${error?.message ?? ''} ${error?.name ?? ''}`)
