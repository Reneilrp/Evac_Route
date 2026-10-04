# UI/UX Engineering Standard: Read-Only (View) vs. Editable (Form) Consistency

> [!NOTE]
> This standard is now part of the comprehensive project documentation suite located in [**`guidelines/ui-ux/`**](./guidelines/ui-ux/README.md) and [**`guidelines/backend-performance/`**](./guidelines/backend-performance/README.md).

## Executive Summary
In complex operational and mission-critical applications (such as Disaster Risk Reduction & Management portals), switching between **Viewing an entity's details** and **Editing that entity** is one of the most frequent user workflows.

When the Read-Only view and Edit mode look like two entirely distinct interfaces—with different layouts, shifting fields, jumping modal sizes, or mismatched visual hierarchies—it violates fundamental human-computer interaction (HCI) heuristics. This document outlines the psychological rationale, core rules, anti-patterns to avoid, and industry-standard patterns for building seamless View/Edit interfaces.

---

## 1. The Psychology Behind View vs. Edit Parity

### A. Spatial Memory & Cognitive Mapping
Human spatial cognition relies heavily on landmark memory. When a user looks at a View screen and locates the operator's **Email**, **Role**, and **Assigned Fleet**, their brain builds a **spatial mental map** of where each attribute resides.
* If clicking **"Edit"** shifts the layout into a completely different grid, relocates fields, or swaps top-down cards into tabs, the user experiences **spatial disorientation**.
* The brain cannot leverage muscle memory or rapid visual search; it is forced to re-scan the entire screen from scratch. This introduces high **extraneous cognitive load**.

### B. Gestalt Principle of Continuity & State Transformation
Users perceive an entity as an ongoing object. An "Edit" action should feel like a **change in the object's state**, not a **change in the room/environment**.
* **Good UX:** The object remains right in front of the user, and its values simply unlock into editable fields.
* **Bad UX:** The current view vanishes or is replaced by a completely alien form dialog with different proportions and styling.

### C. The Cost of Cumulative Layout Shift (CLS)
When containers suddenly resize (e.g., View modal is 500px wide, but Edit modal jumps to 720px or repositions action buttons), users experience visual stutter. This degrades the perceived polish and increases error rates (e.g., misclicking a destructive button that shifted position).

---

## 2. Core Anti-Patterns (What to AVOID)

### ❌ Anti-Pattern 1: "Structural Disconnect"
* **The Mistake:** View mode displays data in a 2-column info card format with big icon tiles, but Edit mode is a single-column tall stack of text boxes with completely different grouping.
* **The Impact:** The user has to hunt for the field they intended to change.

### ❌ Anti-Pattern 2: "The Modal-in-a-Modal / Chained Dialogs"
* **The Mistake:** Clicking "View Details" opens Modal A. Clicking "Edit" inside Modal A either stacks Modal B on top or closes Modal A and pops open Modal B with different dimensions.
* **The Impact:** Breaks browser history, creates awkward backdrop flashing, and feels disjointed.

### ❌ Anti-Pattern 3: "Disabled Input Hell" (Misusing `<input disabled>`)
* **The Mistake:** Creating View Mode by simply taking the entire form and adding `disabled` or `readonly` attributes to every text box, graying everything out.
* **The Impact:**
  * **Violates WCAG 1.4.3 (Contrast):** Grayed-out inputs routinely fail accessible contrast standards.
  * **Destroys Data Readability:** Users cannot easily select, highlight, or copy phone numbers, emails, or call signs.
  * **Broken Perception:** Users wonder why fields are disabled (e.g., "Do I not have permission? Is the backend failing?").

### ❌ Anti-Pattern 4: "Hidden or Disappearing Context"
* **The Mistake:** Showing metadata in View mode (e.g., *Created At*, *Account ID*, *Assigned Fleet Status*) that completely disappears once in Edit mode.
* **The Impact:** The user loses the context they needed to make the edit (e.g., needing to see the vehicle call sign while updating the operator's name).

### ❌ Anti-Pattern 5: "Destructive Ambiguity in Action Buttons"
* **The Mistake:** Placing the "Revoke / Delete" action right next to "Cancel", or changing button placements when switching modes.

---

## 3. The Golden Rules (What to DO)

### Rule 1: Single-Surface "In-Place Morphing"
Whenever possible, **View Mode and Edit Mode should occupy the exact same modal or page container**.
* Instead of two separate dialog components (`ViewModal` and `EditModal`), use **one unified modal** with a simple boolean state:
  ```jsx
  const [isEditing, setIsEditing] = useState(false);
  ```
* The modal header, dimensions (`max-w-2xl`), and backdrop stay 100% stationary. Clicking **"Edit"** simply unlocks the fields in place without any visual jump.

### Rule 2: 1:1 Spatial Parity ("Design Edit First, Derive View")
1. **Design the Edit form first:** It has the most constraints (inputs, labels, validation messages, helper text).
2. **Derive the View mode:** Keep the exact same layout grid. In View mode, replace the `<input>` box with high-contrast, clean plain text sitting in the exact same bounding box.
3. Every label must stay in the same position (e.g., top-aligned above the value).

### Rule 3: Clear Visual Contrast Between Modes
* **In View Mode:**
  * Clean, borderless or soft-tinted surfaces.
  * Maximum readability: dark, crisp typography (`text-slate-900 dark:text-slate-100`).
  * Text is fully selectable and copyable.
  * Badges and status pills clearly visible.
* **In Edit Mode:**
  * Active input affordances: visible borders (`border-slate-300 dark:border-slate-700`) and prominent focus rings (`focus:ring-2 focus:ring-blue-500`).
  * Non-editable system fields retain a subtle lock icon (`🔒 System Managed`).

### Rule 4: Standardized Action Button Transitions
Action placement must be strictly predictable:
* **View Mode Footer:**
  * Left: `[ Close ]`
  * Right: `[ Revoke / Delete (Red Outline) ]` &nbsp; `[ Edit Operator (Solid Blue) ]`
* **Edit Mode Footer:**
  * Left: `[ Cancel Changes (Reverts to View) ]`
  * Right: `[ Save Changes (Solid Blue with Loading Spinner) ]`
* The primary action button remains in the bottom-right corner across both states so the user never has to search for it.

### Rule 5: Seamless Keyboard & Accessibility Flow
* When entering Edit Mode, automatically focus the first editable input (`autoFocus`).
* Pressing `Escape` while in Edit Mode should cleanly return to View Mode.
* Pressing `Enter` inside a single-line input should trigger the primary Save action.

---

## 4. UI Comparison Checklist

| Feature / Attribute | ❌ Bad UI/UX Pattern | ✅ Optimal UI/UX Pattern |
| :--- | :--- | :--- |
| **Container** | Opens a separate modal or redirects to a different URL | Same modal container morphs in-place (`isEditing` flag) |
| **Modal Width** | View modal is 450px; Edit modal jumps to 750px | Consistent fixed width (e.g., `max-w-2xl` on both) |
| **Field Positions** | Fields swap places, collapse, or reorder | Strict 1:1 spatial coordinate parity |
| **Read-Only Data** | Grayed-out `disabled` text inputs (poor contrast) | Clean typography, fully selectable, high WCAG contrast |
| **System Info** | Disappears in edit mode | Visible as read-only badge with lock icon |
| **Destructive Action** | Hidden or placed right next to Cancel | Explicit separation with confirmation safety modal |
| **State Feedback** | Hard page reload or jarring popups | Smooth inline toast + non-blocking optimistic UI update |

---

## 5. Implementation Pattern: Unified In-Place Modal

```jsx
function UnifiedOperatorModal({ operator, isOpen, onClose, onSave, onRevoke }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...operator });

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* 1. Modal dimensions remain identical in both modes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        
        {/* 2. Header stays consistent with dynamic subtitle */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              {isEditing ? `Edit Operator #${operator.id}` : operator.name}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing ? 'Update credentials and fleet assignments' : `Operator Profile • ID #${operator.id}`}
            </p>
          </div>
          <button onClick={handleClose}><X size={20} /></button>
        </div>

        {/* 3. Fields maintain identical spatial layout */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Full Name / Callsign
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 py-1">
                {operator.name}
              </div>
            )}
          </div>
        </div>

        {/* 4. Predictable Action Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
              >
                Cancel Changes
              </button>
              <button
                type="button"
                onClick={() => onSave(formData)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onRevoke(operator)}
                  className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs"
                >
                  Revoke Access
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Edit Operator
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```
