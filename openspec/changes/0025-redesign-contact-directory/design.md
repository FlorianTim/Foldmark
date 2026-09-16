# Design: Contact directory

| Decision                                                  | Alternative rejected                | Why                                                                                                                       |
| --------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Lists plus primary projections on the same record         | Replace the scalar fields           | Every renderer and the snapshot read `postal` / `email`; keeping them as projections makes the migration a no-op on read. |
| Schema defaults derive the lists from the scalars on read | Rewrite every record in the upgrade | Idempotent, no data loss on a failed upgrade, and 1.0 backups still import.                                               |
| Fuzzy = subsequence match after folding diacritics        | Levenshtein                         | "nie" → Niederlande/Niger/Nigeria is a prefix/subsequence question; edit distance over-matches short terms.               |
| Pagination in the panel over the filtered array           | Repository paging                   | Five thousand records filter in memory in milliseconds; the index search stays for the picker.                            |
