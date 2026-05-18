# Regression Checklist

Use this after any large deletion or final-owner migration.

- [ ] Real UI files still exist under final owner.
- [ ] Real build environments still exist.
- [ ] Hardware targets still have sdkconfig/defaults/build env.
- [ ] Removed roots are not restored.
- [ ] Deleted code was either migrated, replaced, or intentionally removed.
- [ ] Checkers prove behavior-critical code was not replaced with skeleton-only code.
