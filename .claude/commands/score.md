---
name: score
description: Quick-score a token already in the pipeline. Returns cached score if fresh (<1h), re-scores if stale.
---

# /score — Quick Token Score

Get the current Buzz score for a token in the pipeline.

## Usage

```
/score PEPE
/score 0x... --refresh          # Force re-score
/score --top 20                 # Top 20 by score
```

## Behavior

- If token is in pipeline and score is <1h old → return cached score
- If stale or not in pipeline → run /scan automatically
- `--refresh` forces re-scoring regardless of cache age
- `--top N` returns top N tokens from the 482-token leaderboard

## API Equivalent

```
GET https://api.buzzbd.ai/api/score/{address}
GET https://buzzbd.ai/scores  (public leaderboard)
```
