# Contributing to NaFT MRV Core

Read [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md) and [human boundaries](docs/human-in-the-loop.md). Changes must stay within the ten MRV responsibilities and the explicitly authorized branch.

Run `bash tests/run.sh`; all assertions and gates must pass. Add meaningful boundary coverage for changed behavior. Update the actual count and limitations in [test report](docs/test-report.md). Do not keep obsolete domain code solely to preserve tests.

[PR checklist](docs/pr-checklist.md)
