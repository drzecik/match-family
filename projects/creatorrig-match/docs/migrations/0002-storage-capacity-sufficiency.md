# 0002 — Storage capacity sufficiency

Date: 2026-07-17.

Adds the optional calculated field `cardCapacitySufficientForPlannedDuration` to the storage-calculation output. The value is derived only when bitrate, planned duration, capacity, and safety margin are available. A false result produces `STORAGE_CAPACITY_TOO_SMALL` and makes a rig incomplete.

No persisted user-rig migration is required. Existing versioned rig imports already carry planned duration and selected product IDs; the result is recalculated after import. Synthetic complete fixtures now select explicit SD or CFexpress capacity variants that cover their planned durations with margin.
