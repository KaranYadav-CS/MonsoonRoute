"""Print stop-cost instructions; never delete unrelated account resources."""
print('Disable AWS function/event triggers and schedules, make SQS processing inert, verify DLQ/retention, keep budget alerts and audit trail. Inspect the exact MonsoonRoute CloudFormation stacks before authorized cleanup.')
