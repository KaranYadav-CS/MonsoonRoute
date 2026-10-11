from pathlib import Path
import re,sys
r=Path(__file__).resolve().parents[1]
assert (r/'supabase/migrations/20261010162239_monsoonroute_contract.sql').exists()
assert (r/'infra/aws/template.yaml').exists()
source='\n'.join(f.read_text(errors='replace') for f in (r/'app').rglob('*.ts'))
assert 'SUPABASE_SERVICE_ROLE_KEY' not in '\n'.join(f.read_text() for f in (r/'components').rglob('*.tsx'))
print('source-boundary contracts passed')
