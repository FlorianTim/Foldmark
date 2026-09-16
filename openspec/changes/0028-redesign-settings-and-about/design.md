# Design: Settings and About

| Decision                                             | Alternative rejected            | Why                                                                      |
| ---------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Defaults in the settings registry, applied at create | Stored in a "template" document | The registry is enumerable, resettable and shows in diagnostics.         |
| Library table from generated JSON                    | Hand-maintained list            | The generator runs in `verify`; a hand list drifts on the first upgrade. |
