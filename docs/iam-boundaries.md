# MonsoonRoute IAM boundary (P1)

- AWS account `043063712559`; primary workload region Mumbai. Root plugin principal is for audited bootstrap only and is never an app credential.
- `Karan@aws8957` has 0 access keys, 0 MFA devices, 0 groups, `IAMUserChangePassword` only. No additional managed policies have been granted. Do not attach `AdministratorAccess` or create static keys.
- GitHub OIDC identity provider exists and was read-back verified, but there is **no confirmed assume-role credential path yet**. The expected trust JSON includes **immutable** numeric GitHub owner/repo IDs for an October 2026 repository; **do not install the role** until environment protection and actual claims are verified.
- Vercel trust JSON is an unverified team-issuer proposal only. Needs Karan token/issuer claim validation, correct project name and exact environment. No Vercel OIDC provider or role is created in P1.
- When ready, Vercel runtime may ONLY `sqs:SendMessage` on the created vision queue and `lambda:InvokeFunction` on ingest ARN. No Secrets Manager/S3 privileges.
- Lambda vision gets S3 model object read, one backend secret read and SQS poll via event source; ingest gets weather prefix write, backend secret read; maintenance gets SQS send and S3 audit prefix write, backend secret read. Do not grant admin or broad S3 wildcard.
- GitHub deployment role must only manage project CloudFormation stack and approved deployment bucket prefix with restricted `iam:PassRole` to project Lambda/Scheduler execution roles. Avoid `Resource: '*'` beyond AWS APIs with unavoidable resource-level restrictions and document conditions.
- IAM-negative-case tests and live `sts:AssumeRoleWithWebIdentity` are P5 acceptance gates, not assumed from JSON formatting.
