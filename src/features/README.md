# Feature modules

Each directory owns one business capability. A feature may expose application
use cases, domain rules, infrastructure adapters, presentation components, and
validation schemas. Other modules must import through the feature's public
entry point rather than reaching into internal files.

Create internal subdirectories only when implementation exists; empty Clean
Architecture layers are intentionally avoided.
