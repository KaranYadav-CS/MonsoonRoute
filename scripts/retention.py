"""Retention safety gate. Verify Storage deletion before clearing persisted paths."""
import sys
print('RETENTION_NOT_RUN: requires authenticated owner-scoped Storage client and maintenance audit',file=sys.stderr)
raise SystemExit(2)
