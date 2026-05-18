# Architecture Review Checklist

## Inventory

- [ ] Legacy/compat/temp surfaces are listed.
- [ ] Each surface has a final owner.
- [ ] Each surface has a disposition.
- [ ] Each surface has a delete condition.

## Responsibility

- [ ] Board facts do not select UX.
- [ ] Build entrypoints do not decide page sets.
- [ ] Renderers do not choose targets.
- [ ] App shells do not own page manifests.
- [ ] Runtime state access goes through ports/projections.

## Migration

- [ ] No intermediate UI layer.
- [ ] No transitional UI layer.
- [ ] No migration adapter.
- [ ] No archive-only source root.
- [ ] Real UI/build code was restored to final owners, not deleted.

## Checkers

- [ ] No root legacy checker.
- [ ] No intermediate UI checker.
- [ ] Board facts boundary checker.
- [ ] Target architecture checker.
- [ ] Deprecated alias usage checker.
