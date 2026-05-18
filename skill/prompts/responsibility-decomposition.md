# Prompt: Responsibility Decomposition

For the selected file or symbol, identify mixed responsibilities.

Classify responsibilities into:

- target detection
- hardware facts
- build entrypoint
- app shell wiring
- runtime state access
- action dispatch
- page manifest
- layout decision
- renderer creation
- platform adapter
- domain behavior
- test/smoke
- documentation

Then assign final owners:

- boards/
- builds/
- apps/
- platform/
- modules/product_composition/
- modules/ui_presentation/
- modules/ui_*_runtime/
- modules/domain-runtime/
- tests/
- delete

Do not introduce intermediate layers.
