# CareRelay VN

Synthetic, offline workflow prototype for checking whether a person can repeat back critical instructions from an approved source.

> Current status: deterministic synthetic MVP. OCR, speech recognition, a trained Vietnamese SLM, clinical integration and clinical validation are not claimed.

## Run

```powershell
npm test
npm run benchmark
npm run serve
```

Open `http://localhost:8080/`.

## Implemented

- source-preserving checklist generation;
- citation coverage and zero-invention audit field;
- deterministic Vietnamese teach-back matching;
- confirmation route for missing critical items;
- responsive browser demo;
- automated tests and reproducible benchmark.

All bundled scenarios are synthetic and are not instructions for real-world use.
