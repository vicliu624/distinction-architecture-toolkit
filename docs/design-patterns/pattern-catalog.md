# Design Pattern Catalog

## Board Facts Pattern

`boards/` describes hardware facts only. It does not choose UX, renderer, app shell, or page set.

## Target Profile Pattern

`TargetProfile` maps a product target to board, build, app shell, renderer, UX pack, UI profile, page manifest, layout profile, and capabilities.

## Page Manifest Pattern

A page manifest is the final owner for a target's page set.

## Layout Profile Pattern

A layout profile is the final owner for layout strategy and display density decisions.

## Renderer Adapter Pattern

A renderer consumes descriptors and profiles. It does not choose targets or UX.

## Null Object Pattern

Headless targets use a headless renderer instead of bypassing the target/UI model.

## Guardrail Checker Pattern

Architecture rules are codified as executable checkers to prevent regression.
