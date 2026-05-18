---
name: leaderboard
description: Show the public token leaderboard. 482 tokens scored, ranked by Buzz score. Available at buzzbd.ai/scores.
---

# /leaderboard — Token Leaderboard

Public token rankings by Buzz score.

## Usage

```
/leaderboard                    # Top 20
/leaderboard --top 50           # Top 50
/leaderboard --chain base       # Filter by chain
/leaderboard --hot              # HOT tokens only (85+)
```

## Public URL

https://buzzbd.ai/scores — 482 tokens scored, real-time updates.

## Data

Pulls from token_pipeline table, sorted by score DESC.
Includes: token name, chain, score, classification, last scored timestamp.
