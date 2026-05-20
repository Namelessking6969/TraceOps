# Delete Closed Incidents — Design Spec

**Date:** 2026-05-20
**Status:** Approved

## Overview

Allow users to permanently delete closed incidents (and all their entries) from three entry points: a sidebar hover button, a right-click context menu on the sidebar item, and a button in the incident header. Deletion requires a confirmation step and offers a 5-second undo window before the DB write.

## Constraints

- Only **closed** incidents can be deleted. Active incidents have no delete affordance.
- Deletion is permanent once the undo window expires.

## Data Flow

1. User triggers delete via any entry point.
2. A confirmation modal appears showing the incident title and a warning that all entries will be lost.
3. User confirms → `removeIncident(id)` removes the incident from the Zustand store immediately (UI clears). A 5-second `setTimeout` is queued to call `deleteIncident(id)` in the DB. An undo toast is shown.
4. **Undo path:** User clicks "Undo" in the toast → timeout is cancelled, `addIncident` restores the incident to the store. No DB write ever happened.
5. **Commit path:** 5 seconds elapse → `deleteIncident(id)` executes, cascade-deleting entries then the incident from SQLite. Toast clears.

If the app crashes during the 5-second window, the incident remains in the DB and reappears on next load (acceptable trade-off vs. schema complexity).

## DB Layer — `db.ts`

Add:

```ts
export async function deleteIncident(id: string): Promise<void> {
  await db.execute('DELETE FROM entries WHERE incident_id = ?', [id])
  await db.execute('DELETE FROM incidents WHERE id = ?', [id])
}
```

No schema changes required.

## Store — `store.ts`

Add `removeIncident(id: string)` action:
- Filters the incident out of `incidents`.
- If `selectedIncidentId === id`, also clears `selectedIncidentId` and `entries`.

## Components

### `DeleteIncidentModal.tsx` (new)
- Consistent with `CloseIncidentModal` styling.
- Displays incident title + warning copy: "This will permanently delete this incident and all its entries."
- Cancel (neutral) and Delete (red) buttons.
- Props: `incidentTitle: string`, `onClose: () => void`, `onConfirm: () => void`.

### `IncidentItem.tsx` (modified)
- Add a trash icon button, visible only on hover and only when `incident.status === 'closed'`.
- Add `onContextMenu` handler that shows a positioned context menu with a single "Delete" item.
- Context menu dismisses on click-outside (`useEffect` + `mousedown` listener) or Escape key.
- Clicking the trash button or the context menu "Delete" item opens `DeleteIncidentModal`.

### `IncidentHeader.tsx` (modified)
- Add a "Delete" button in the button row, rendered only when `incident.status === 'closed'`.
- Styled like the "Export" button but with a red tint (`bg-red-900 hover:bg-red-800 text-red-300`).
- Opens `DeleteIncidentModal`.

### `Toast.tsx` (modified)
- Extend `Toast` interface with optional `onUndo?: () => void`.
- If `onUndo` is provided, render an "Undo" button inline in the toast.

### `store.ts` (modified)
- Extend `showToast` or add a dedicated `showUndoToast(message, onUndo)` — pass the undo callback through store so any component can trigger undo.
- The undo timeout handle is managed locally in whichever component triggers the delete (not in the store), to keep side-effect logic out of Zustand.

## Error Handling

- If `deleteIncident` throws, show an error toast: "Failed to delete incident — please try again."
- The incident will have already been removed from the store at that point; on next app load it reappears from the DB. Acceptable edge case.

## Testing

- Confirm modal renders with correct title.
- Undo cancels the timeout and restores the incident in the store.
- After 5 seconds without undo, `deleteIncident` is called with the correct id.
- Delete button/context menu only appear on closed incidents.
