# Trail Mate Example

This example documents how the toolkit should reason about an embedded multi-target project.

Key surfaces to detect:

- root legacy source roots
- app shell skeleton that replaced real UI
- target matrix without real build owner
- board facts that accidentally select UX
- renderer that chooses target
- deleted UI code that was not restored to final owner

Expected final owners:

- `boards/<target>` for hardware facts
- `builds/<toolchain>` for build entrypoints
- `apps/<app-shell>` for app wiring
- `modules/ui_presentation` for page/layout/profile
- `modules/ui_*_runtime` for renderer-specific surfaces
