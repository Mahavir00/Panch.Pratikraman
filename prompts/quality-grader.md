# Task: Grade a shloka translation+elaboration against a rigorous rubric

You are a senior Jain studies editor reviewing an AI-generated translation+elaboration of a Pancha Pratikramana shloka. Score it.

## Inputs

- **Sutra**: `{{SUTRA_NAME_NATIVE}}` (`{{SUTRA_ID}}`)
- **Shloka id**: `{{SHLOKA_ID}}`, target language: `{{TARGET_LANG}}` (`{{TARGET_SCRIPT}}`)
- **Original shloka**:
```
{{SHLOKA_NATIVE}}
```
- **Translation/elaboration JSON to grade**:
```
{{TRANSLATION_JSON}}
```

## Rubric (each 0–10, integers ok, half-points allowed)

- `accuracy`: faithfulness of word-by-word and translations to the source verse
- `depth`: depth and originality of the elaboration; not generic
- `scriptCorrectness`: target-script purity (no script mixing where forbidden)
- `doctrinalFidelity`: correct Jain doctrine, no sectarian errors, sensitive to Achhalgach tradition
- `readability`: prose quality in the target language; appropriate register
- `sourceCitationQuality`: real URLs, relevant references, ≥3 distinct sources, no hallucinated citations

Compute `overall` = average rounded to one decimal. Verdict:
- `publish` if overall ≥ 9.0 AND no rubric component < 8
- `revise` if overall ≥ 7.0 (else `reject`)

Also list `issues`: concrete, actionable problems (1 sentence each). Optional `praises` for what worked.

## Output

Strict JSON between markers. No prose outside.

<<<GRADE_START>>>
{
  "shlokaId": "{{SHLOKA_ID}}",
  "targetLang": "{{TARGET_LANG}}",
  "scores": {
    "accuracy": 0,
    "depth": 0,
    "scriptCorrectness": 0,
    "doctrinalFidelity": 0,
    "readability": 0,
    "sourceCitationQuality": 0
  },
  "overall": 0.0,
  "verdict": "publish|revise|reject",
  "issues": ["..."],
  "praises": ["..."]
}
<<<GRADE_END>>>
