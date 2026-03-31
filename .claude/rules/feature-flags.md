---
paths: ["**/feature*", "**/flags*", "**/hsaas*", "**/enterprise*"]
---
# Feature Flag Rules
- NEVER ship code behind a false flag to production endpoints
- All new features start as false, flip to true after testing
- HSaaS tiers stay false until payment infra is live
- GPU_BURST stays false until revenue justifies costs
- Check feature('FLAG_NAME') before executing gated code
