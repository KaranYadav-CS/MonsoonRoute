#!/usr/bin/env bash
set -euo pipefail
if [[ "${AWS_ENABLE_DEPLOYMENT:-}" != "reviewed-manual-p5" ]]; then echo 'Deployment disabled until P5 signed-off role and artifacts'; exit 2; fi
sam validate --template-file infra/aws/template.yaml
sam build --template-file infra/aws/template.yaml
# No automatic deploy; controlled P5 workflow validates hashes, trust and rollback before mutation.
