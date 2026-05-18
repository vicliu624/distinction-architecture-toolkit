# Final Owner Model

Every responsibility must have a final owner.

| Responsibility | Final owner |
|---|---|
| Hardware facts | `boards/<target>/` |
| Build entrypoint | `builds/<toolchain>/` |
| App wiring | `apps/<app-shell>/` |
| Target identity | `modules/product_composition/` |
| Page set | `modules/ui_presentation/page/` |
| Layout strategy | `modules/ui_presentation/layout/` |
| Renderer | `modules/ui_*_runtime/` |
| Platform glue | `platform/<platform>/` |
| Historical record | `docs/archive/` |
| Dead code | delete |
