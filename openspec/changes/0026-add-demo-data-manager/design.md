# Design: Demo data

| Decision                                     | Alternative rejected     | Why                                                                           |
| -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `demoData: true` on every record + fixed ids | Only fixed ids           | A user could create an id collision; the flag is what removal keys on.        |
| Seed image generated on a canvas             | Ship a PNG in the bundle | No binary in the repository; a 400 × 300 gradient is enough to test the path. |
