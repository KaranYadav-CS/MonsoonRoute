"""Pure static release-readiness diagnostic; never prints secrets."""
import json,hashlib,pathlib,re,os,sys
r=pathlib.Path(__file__).resolve().parents[1]
checks={
 'aws_template_present':(r/'infra/aws/template.yaml').exists(),
 'db_migration_present':any((r/'supabase/migrations').glob('*.sql')),
 'graph_present':(r/'artifacts/graph.json').exists(),
 'model_verified':json.loads((r/'models/manifest.json').read_text()).get('parity_validated',False),
 'dependency_lock':(r/'package-lock.json').exists(),
 'hosted_oauth_implemented':False,
 'github_link_correct':False,
 'end_to_end_deployed':False,
}
print(json.dumps({'checks':checks,'release_ready':all(checks.values())},indent=2))
raise SystemExit(0 if all(checks.values()) else 2)
