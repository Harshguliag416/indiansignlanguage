# Public Dataset Registry

This file lists the public ISL datasets we want to use together with the local training pipeline.

## Registry File

Machine-readable registry:

- `training/public_datasets.json`

Each entry includes:

- dataset id
- task type
- format
- source link
- expected local folder
- quick recommendation

## Current Strategy

Use the datasets by specialty instead of forcing one flat model:

- letters:
  - local archives already in `C:\Users\harsh\Downloads\Dataset`
  - `Indian Sign Language Alphabet Dataset`
- words and phrases:
  - `Indian Sign Language Real-life Words`
  - `Common Phrases in Indian Sign Language`
  - `Dataset for everyday phrases and words in Indian sign language`
- sentences and translation:
  - `ISLTranslate`
  - `ISL-CSLTR`
  - `ISLVT`

## Expected Local Layout

Put downloaded datasets under:

```text
h:\HACKATHON\isl-bridge\public_datasets\
```

Expected folders:

```text
public_datasets/
  isltranslate/
  isl_csltr/
  islvt/
  isl_alphabet_github/
  isl_real_life_words/
  isl_common_phrases/
  isl_everyday_phrases_words/
```

## How To Use Them With The Current Pipeline

- Alphabet datasets should be normalized into the same `A-Z` label space and merged with the existing alnum pipeline.
- Word and phrase datasets should be converted into a separate phrase dataset with consistent folder names.
- Sentence datasets should stay sequence-based and feed the sentence pipeline, not the static image pipeline.

## Important Notes

- Do not assume all public datasets use identical labels.
- Always check the dataset license or terms before redistribution or public deployment.
- For sentence datasets, keep clip- or signer-level validation splits to avoid inflated accuracy.
- For mixed-source training, prefer landmark extraction or strong normalization so background differences do not dominate learning.

## Source Links

- ISLTranslate: https://github.com/Exploration-Lab/ISLTranslate
- ISL-CSLTR: https://data.mendeley.com/datasets/kcmpdxky7p/1
- ISLVT: https://data.mendeley.com/datasets/98mzk82wbb/1
- Indian Sign Language Alphabet Dataset: https://github.com/ayeshatasnim-h/Indian-Sign-Language-dataset
- Indian Sign Language Real-life Words: https://data.mendeley.com/datasets/s6kgb6r3ss
- Common Phrases in Indian Sign Language: https://data.mendeley.com/datasets/y8vg69brn2
- Dataset for everyday phrases and words in Indian sign language: https://data.mendeley.com/datasets/w7fgy7jvs8/3
