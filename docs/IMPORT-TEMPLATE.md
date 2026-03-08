# Import template (Trackers)

Use **Import template** from the Trackers toolbar to create **custom fields** from column headers and **tasks** from rows.

## Expected format

- **First row** = column headers (will become field names; non-standard names become custom fields).
- **Following rows** = one task per row. The first column (or the column named Title/Task/Name) is the task title.

## Standard columns (recognized, not created as custom fields)

- `Title`, `Task`, `Name`, `Initiative`, `Item` → task title
- `Description`, `Desc`, `Notes` → task description
- `Status`, `State` → task status
- `Priority` → task priority
- `Category`, `Due`, `Due Date`, `Owner`, `Assignee`, `Section`, `Tracker`, `Group` → mapped to task fields

Any other header (e.g. `Department`, `Estimated Hours`) is treated as a **custom field** and created for the project; values in that column are stored on each task.

## Sample file

Use `docs/sample-import-template.csv` to test:

1. Open a project and go to **Trackers**.
2. Click **Import template**.
3. Upload `sample-import-template.csv` or paste its contents.
4. Click **Preview** (you should see custom fields "Department" and "Estimated Hours", and 5 tasks).
5. Click **Import template**.

After import, the new custom fields appear in **Base Camp** and in the **Columns** list; you can show/hide them there or in the Trackers view.

## File types

- **CSV** or **TSV** (tab-separated) work. For Excel, save as CSV or copy the sheet and paste into the text area.
