# Prompt: Legacy / Compatibility / Temporary Surface Inventory

Analyze the repository and build a complete inventory of non-final architecture surfaces.

Search for:

- legacy
- compatibility / compat
- transitional
- temporary
- fallback
- shim
- deprecated
- archive-only
- adapter
- bridge
- probe
- smoke

For each surface, report:

- Category
- Current location
- Current callers
- Current responsibility
- Is final architecture?
- Final owner
- Disposition
- Delete condition
- Risk
- Notes

Allowed dispositions:

- Delete
- Rename
- Migrate
- Keep Final Adapter
- Keep Deprecated Alias Temporarily
- Test-only
- Fallback Pending Deletion

Do not propose code changes until the inventory is complete.
