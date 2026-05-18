# Prompt: Target Matrix Cutover

Create a final target architecture matrix.

Each target must have:

- target_id
- board_id
- build_entrypoint
- app_shell
- platform
- renderer
- ux_pack_id
- ui_profile_id
- page_manifest_id
- layout_profile_id
- support_status
- owner

For each target, confirm:

- BoardFacts exist
- TargetProfile exists
- TargetBuildBinding exists
- TargetUxBinding exists
- TargetUiProfile exists
- PageManifest exists
- LayoutProfile exists
- AppShell exposes targetProfile and activeUxPackId
