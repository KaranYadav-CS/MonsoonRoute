#!/usr/bin/env python3
"""Idempotently configure MonsoonRoute budget and approved email alerts.

This must be executed from an authorized operator environment, not the runtime.
The recipient is passed only as AWS_BUDGET_EMAIL; no email is included in source.
No cloud writes unless --execute, --credit-verified, and --confirm-recipient.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from decimal import Decimal

ACCOUNT = "043063712559"
NAME = "MonsoonRouteMonthly"
BUDGET = {
    "BudgetName": NAME,
    "BudgetLimit": {"Amount": "25", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostTypes": {
        "IncludeTax": True, "IncludeSubscription": True,
        "UseBlended": False, "IncludeRefund": False,
        "IncludeCredit": False, "IncludeUpfront": True,
        "IncludeRecurring": True, "IncludeOtherSubscription": True,
        "IncludeSupport": True, "IncludeDiscount": True,
        "UseAmortized": False,
    },
}


def alert_definitions() -> list[dict]:
    """Return exactly the four safety notifications, with no email included."""
    return [
        {
            "NotificationType": typ,
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": amount,
            "ThresholdType": "ABSOLUTE_VALUE",
        }
        for typ, amount in [
            ("ACTUAL", 10), ("ACTUAL", 20), ("ACTUAL", 25),
            ("FORECASTED", 25),
        ]
    ]


def alert_key(obj: dict) -> tuple[str, str, Decimal]:
    return (obj["NotificationType"], obj["ThresholdType"], Decimal(str(obj["Threshold"])))


def is_valid_budget(obj: dict) -> bool:
    return (
        obj.get("BudgetType") == "COST"
        and obj.get("TimeUnit") == "MONTHLY"
        and obj.get("BudgetLimit", {}).get("Unit") == "USD"
        and Decimal(str(obj.get("BudgetLimit", {}).get("Amount", "-1"))) == Decimal("25")
        and obj.get("CostTypes", {}).get("IncludeCredit") is False
    )


def ensure_budget(client, email: str) -> str:
    from botocore.exceptions import ClientError
    subscriber = [{"SubscriptionType": "EMAIL", "Address": email}]
    try:
        existing = client.describe_budget(AccountId=ACCOUNT, BudgetName=NAME)["Budget"]
    except ClientError as e:
        if e.response["Error"]["Code"] != "NotFoundException":
            raise
        client.create_budget(
            AccountId=ACCOUNT, Budget=BUDGET,
            NotificationsWithSubscribers=[
                {"Notification": n, "Subscribers": subscriber}
                for n in alert_definitions()
            ],
            ResourceTags=[{"Key": "Project", "Value": "MonsoonRoute"}],
        )
        existing = client.describe_budget(AccountId=ACCOUNT, BudgetName=NAME)["Budget"]
        status = "CREATED_BUDGET_AND_ALERTS"
    else:
        status = "EXISTING_BUDGET_CONFIGURED"
    if not is_valid_budget(existing):
        raise RuntimeError("Existing budget contract mismatch; refusing to change it")

    current = client.describe_notifications_for_budget(
        AccountId=ACCOUNT, BudgetName=NAME
    ).get("Notifications", [])
    expected = {alert_key(n): n for n in alert_definitions()}
    existing_keys = {alert_key(n) for n in current}
    if len(existing_keys) != len(current) or not existing_keys.issubset(expected):
        raise RuntimeError("Unexpected existing notifications; manual review required")
    # If any alert already exists, ensure its recipient is exactly the approved one.
    for n in current:
        subs = client.describe_subscribers_for_notification(
            AccountId=ACCOUNT, BudgetName=NAME, Notification=n
        ).get("Subscribers", [])
        if len(subs) != 1 or subs[0] != subscriber[0]:
            raise RuntimeError("Existing subscriber mismatch; no automatic overwrite")
    for key, n in expected.items():
        if key not in existing_keys:
            client.create_notification(
                AccountId=ACCOUNT, BudgetName=NAME,
                Notification=n, Subscribers=subscriber,
            )
    verified = client.describe_notifications_for_budget(
        AccountId=ACCOUNT, BudgetName=NAME
    ).get("Notifications", [])
    if {alert_key(x) for x in verified} != set(expected) or len(verified) != 4:
        raise RuntimeError("Read-back did not establish all four notifications")
    for n in verified:
        subs = client.describe_subscribers_for_notification(
            AccountId=ACCOUNT, BudgetName=NAME, Notification=n
        ).get("Subscribers", [])
        if len(subs) != 1 or subs[0] != subscriber[0]:
            raise RuntimeError("Notification read-back recipient mismatch")
    return status


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--execute", action="store_true")
    p.add_argument("--credit-verified", action="store_true")
    p.add_argument("--confirm-recipient", action="store_true")
    a = p.parse_args()
    email = os.environ.get("AWS_BUDGET_EMAIL", "").strip()
    if not a.execute:
        print(json.dumps({
            "status": "DRY_RUN_ONLY", "budget": NAME,
            "monthly_usd": "25", "thresholds": [10, 20, 25, "forecast:25"],
            "recipient_present": bool(email), "notifications_live": "NOT_CHECKED",
        }))
        return 0
    if not (a.credit_verified and a.confirm_recipient):
        p.error("--execute requires --credit-verified and --confirm-recipient")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        p.error("AWS_BUDGET_EMAIL must be a confirmed owner-approved email")
    import boto3
    session = boto3.Session(region_name="us-east-1")
    identity = session.client("sts").get_caller_identity()
    if identity["Account"] != ACCOUNT:
        raise SystemExit("Wrong AWS account; refused to mutate")
    status = ensure_budget(session.client("budgets"), email)
    print(json.dumps({
        "status": status, "name": NAME, "notifications_verified": 4,
        "recipient": "REDACTED", "recipient_confirmation": "OPERATOR_SUPPLIED",
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
