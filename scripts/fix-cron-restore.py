import json, os, sys

source = "/opt/buzz-cron/jobs.json"
target = "/data/.openclaw/cron/jobs.json"

if not os.path.exists(source):
    print("[cron-merge] No source cron file, skipping")
    sys.exit(0)

with open(source) as f:
    src_data = json.load(f)

# If target exists, merge: keep existing state, add new jobs from source
if os.path.exists(target):
    with open(target) as f:
        tgt_data = json.load(f)
    
    tgt_map = {j["id"]: j for j in tgt_data.get("jobs", [])}
    src_map = {j["id"]: j for j in src_data.get("jobs", [])}
    
    merged_jobs = []
    added = 0
    preserved = 0
    
    # Keep all existing jobs with their state
    for jid, job in tgt_map.items():
        if jid in src_map:
            # Update config from source but KEEP existing state
            new_job = dict(src_map[jid])
            new_job["state"] = job.get("state", {})
            merged_jobs.append(new_job)
            preserved += 1
        else:
            # Job removed from source, keep it anyway (disable if needed)
            merged_jobs.append(job)
            preserved += 1
    
    # Add any NEW jobs from source that dont exist yet
    for jid, job in src_map.items():
        if jid not in tgt_map:
            merged_jobs.append(job)
            added += 1
    
    result = dict(tgt_data)
    result["jobs"] = merged_jobs
    
    with open(target, "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"[cron-merge] Merged: {preserved} preserved, {added} new. State intact.")
else:
    # No existing target, just copy source
    import shutil
    shutil.copy2(source, target)
    print(f"[cron-merge] First boot: copied {len(src_data.get(\"jobs\", []))} jobs from source")
