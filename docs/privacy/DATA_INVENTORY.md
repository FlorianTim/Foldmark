# Data inventory

| Data                                                           | Purpose                              | Location and key                           | Retention and deletion                                                             | Recipient |
| -------------------------------------------------------------- | ------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------- | --------- |
| Todo Markdown source, completion state, identifier, timestamps | Demonstrate local-first persistence  | IndexedDB `<slug>-db`, table `todos`       | Until the user deletes one/all records, uses Settings deletion or clears site data | None      |
| Theme                                                          | Restore visual preference            | localStorage `<slug>:ui:theme`             | Until changed, Settings deletion or site-data clearing                             | None      |
| Locale                                                         | Restore German/English preference    | localStorage `<slug>:ui:locale`            | Until changed, Settings deletion or site-data clearing                             | None      |
| Privacy-notice acknowledgement                                 | Avoid repeating the first-run notice | localStorage `<slug>:ui:privacy-notice-v1` | Until Settings deletion or site-data clearing                                      | None      |

The generic demo stores at most 1,000 Todos with Markdown sources of at most 2,000 characters. It
has no default export because the Todo data is replaceable demonstration content. A concrete app
must replace this inventory and provide domain-appropriate export, retention, and deletion behavior.
