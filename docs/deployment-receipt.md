# Deployment receipt

**Prior confirmed READY production app:** deployment dpl_4KEnb4CoaefwLRyWbm2t5sNdvGok from 8bf6006f36bd3787274d0c045da673e8a5f663bc. Public homepage https://monsoon-route-omega.vercel.app/ externally readable; /api/v1/status returned HTTP 503 (backend unavailable).

**Latest verified npm reproducibility:** package-lock.json, 319083 bytes, Git blob SHA 7cecc8e2f4c33f81ac3046e3419fb50818def386; GitHub Actions artifact from run 38076941291; npm ci --ignore-scripts passed in runner.

**AWS:** Stack monsoonroute-prod-p5-inactive CREATE_COMPLETE in ap-south-1, bucket monsoonroute-prod-artifacts-043063712559-ap-south-1, queue arn:aws:sqs:ap-south-1:043063712559:monsoonroute-p5-inactive-vision, DLQ arn:aws:sqs:ap-south-1:043063712559:monsoonroute-p5-inactive-vision-dlq; alarms monsoonroute-p5-vision-queue-backlog and monsoonroute-p5-vision-dlq. SQS redrive canary passed and test message deleted. This stack does not contain Lambda or schedules and does not replace full SAM. Further deployment must reconcile temporary queue/bucket staging to avoid duplicate resources.

**Supabase:** 0 published road graphs, 0 edges, 0 weather runs, 0 OAuth users. Status PARTIAL.
