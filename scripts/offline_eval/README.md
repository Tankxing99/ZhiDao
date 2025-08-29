# Offline Evaluation Skeleton

This folder contains a minimal skeleton for offline evaluation of the questionnaire + recommendation parameters.

## Structure
- data/
  - users.json (sample user answers)
  - plants.json (sample plant catalog)
- eval.js (entry script placeholder)

## Run
This repository does not bundle dependencies or node scripts by default. Use this as a reference skeleton. You can copy this folder out and run with Node.js >=16.

```bash
node eval.js
```

## What eval.js should do (pseudo):
- Load users.json and plants.json
- For each user, compute base scores and apply uncertainty penalty and MMR

## Sample Metrics
- NDCG@5 / NDCG@10
- ILAD (1 - avg pairwise jaccard) for top-N list
- Coverage: unique recommended items / catalog size

- Produce NDCG@5/10, ILAD and coverage metrics
- Dump results to stdout and JSON file

