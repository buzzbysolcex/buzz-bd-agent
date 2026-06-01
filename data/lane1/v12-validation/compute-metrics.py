#!/usr/bin/env python3
"""Reproducible v1.2 validation metrics (Ogie msg 8097 TASK 3). Hand-labels embedded."""
import json, os
HERE=os.path.dirname(__file__)
TRUE={10,18,25,29,33, 35,39, 42,44,45}  # hand-labeled genuine-signal indices (see VALIDATION-REPORT.md)
sample={json.loads(l)["idx"]:json.loads(l) for l in open(f"{HERE}/sample-50.jsonl")}
verds={json.loads(l)["idx"]:json.loads(l)["verdict"] for l in open(f"{HERE}/v12-results.jsonl")}
TP=FP=FN=TN=gt_true=gt_fd=0
for i in sorted(sample):
    t=i in TRUE; keep=verds.get(i)=="KEEP"
    TP+=keep and t; FP+=keep and not t; FN+=(not keep) and t; TN+=(not keep) and not t
    if sample[i]["cls"]=="GROUND_TRUTH" and t: gt_true+=1; gt_fd+=not keep
print(f"v1.1 prec={100*len(TRUE)/len(sample):.0f}%  v1.2 prec={100*TP/(TP+FP):.0f}%  recall={100*TP/(TP+FN):.0f}%  GT-false-drop={gt_fd}/{gt_true}")
