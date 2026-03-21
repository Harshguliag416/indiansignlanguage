# ISL Bridge Demo Mapping

## Scope

For the current presentation build, keep the app behavior simple:

- live real recognition: letters only
- word-level output: demo words only
- no open-ended live vocabulary beyond the approved demo set

## Demo-Ready Letters

- `A`
- `B`
- `H`
- `W`
- `Y`
- `L` when used in the live gesture override path

## Demo-Ready Words

- `HI`
- `HELLO`
- `YES`
- `NO`
- `HELP`
- `WATER`
- `YOU` in the live gesture override path

## Fixed Demo Gesture Mapping

These are the presentation mappings currently intended for the web demo:

- thumbs up -> `YES`
- `B` hand sign -> `B`
- `L` hand sign -> `L`
- waving hand -> `HELLO`
- finger pointing toward camera -> `YOU`

## Word Notes For Presentation

### `WATER`

Use this as a fixed demo word sign, not as arbitrary live open-vocabulary recognition.
A common teaching-style sign brings the hand toward the mouth to suggest drinking.

### `HELP`

Use this as a fixed demo word sign, not as a general live word prediction.
A common teaching-style form uses one hand supporting the other and moving upward or outward.

### `NO`

Use this as a fixed demo word sign, not as a general live word prediction.
This sign is often motion-sensitive, so it is safer in the current project as a demo word than as a true live free-form word model.

## Presentation Rule

When presenting:

- if you want reliable live output, stay on letters
- if you want word output, use only the approved demo words above
- do not describe the app as full open-vocabulary live ISL translation yet
