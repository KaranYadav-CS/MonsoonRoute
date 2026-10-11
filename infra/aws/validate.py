#!/usr/bin/env python3
"""Static/offline validator. NOT cloud verification, not SAM transform validation."""
import json
import pathlib
import re
import sys
try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML needed for offline validation") from exc

root=pathlib.Path(__file__).resolve().parent
class Loader(yaml.SafeLoader): pass
for tag in ("!Ref","!GetAtt","!Sub","!Join","!If","!Equals","!FindInMap","!GetAZs","!ImportValue","!Select","!Split","!Not","!And","!Or"):
    Loader.add_constructor(tag,lambda loader,node: loader.construct_scalar(node) if isinstance(node,yaml.ScalarNode) else loader.construct_sequence(node) if isinstance(node,yaml.SequenceNode) else loader.construct_mapping(node))

def load_yaml(path):
    return yaml.load(path.read_text(), Loader=Loader)

def check():
    foundation=load_yaml(root/"foundation.yaml")
    full=load_yaml(root/"template.yaml")
    assert foundation["AWSTemplateFormatVersion"]=="2010-09-09"
    assert "DeploymentBucket" in foundation["Resources"]
    for f in (foundation,full):
        for name,res in f["Resources"].items():
            if res["Type"]=="AWS::S3::Bucket":
                b=res["Properties"]["PublicAccessBlockConfiguration"]
                assert all(b[k] for k in ("BlockPublicAcls","IgnorePublicAcls","BlockPublicPolicy","RestrictPublicBuckets")),name
                assert res["Properties"]["BucketEncryption"]
    assert full["Resources"]["WeatherSchedule"]["Properties"]["State"]=="DISABLED"
    assert full["Resources"]["MaintenanceSchedule"]["Properties"]["State"]=="DISABLED"
    ev=full["Resources"]["Vision"]["Properties"]["Events"]["Queue"]["Properties"]
    assert ev["Enabled"] is False and ev["BatchSize"]==1 and ev["ScalingConfig"]["MaximumConcurrency"]==2
    assert full["Resources"]["VisionQueue"]["Properties"]["VisibilityTimeout"]==720
    assert full["Resources"]["VisionQueue"]["Properties"]["RedrivePolicy"]["maxReceiveCount"]==3
    assert full["Resources"]["Vision"]["Properties"]["Timeout"]==120
    assert full["Resources"]["Vision"]["Properties"]["MemorySize"]==3072
    assert full["Globals"]["Function"]["Runtime"]=="python3.12"
    assert "ArtifactBucket" in full["Resources"]
    assert full["Resources"]["VisionDLQ"]["Properties"]["MessageRetentionPeriod"]==1209600
    gh=json.loads((root/"github-trust.expected.json").read_text())
    cond=gh["Statement"][0]["Condition"]["StringEquals"]
    assert cond["token.actions.githubusercontent.com:aud"]=="sts.amazonaws.com"
    assert cond["token.actions.githubusercontent.com:sub"]=="repo:KaranYadav-CS@237170955/MonsoonRoute@1410686612:environment:production"
    assert all("*" not in v for v in cond.values())
    vl=json.loads((root/"vercel-trust.expected.json").read_text())
    assert vl["Statement"][0]["Condition"]["StringEquals"]["oidc.vercel.com/karan898989:aud"]=="https://vercel.com/karan898989"
    budgets=json.loads((root/"budgets.json").read_text())
    assert budgets["BudgetLimit"]=={"Amount":"25","Unit":"USD"}
    assert budgets["CostTypes"]["IncludeCredit"] is False
    assert len(budgets["Alerts"])==4
    print("PASS: 2 YAML files parsed, 2 trust JSON files parsed, budgets schema, IAM boundaries and disabled-trigger invariants")

if __name__=="__main__":
    check()
