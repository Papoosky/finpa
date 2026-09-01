# Changelog

## [1.2.0](https://github.com/Papoosky/finpa/compare/finpa-v1.1.0...finpa-v1.2.0) (2026-09-01)


### Features

* change runner from cd file ([4e1e508](https://github.com/Papoosky/finpa/commit/4e1e508d62a806674adc4ae6f502bd14e8299df5))


### Bug Fixes

* **auth:** avoid lazy-load of refresh_record.user after async commit ([88d05c4](https://github.com/Papoosky/finpa/commit/88d05c4f66b3aa04ec0069c0135dc0eb7db3e2e1))
* capture user_id before the commit, then query User explicitly. ([88d05c4](https://github.com/Papoosky/finpa/commit/88d05c4f66b3aa04ec0069c0135dc0eb7db3e2e1))

## [1.1.0](https://github.com/Papoosky/finpa/compare/finpa-v1.0.0...finpa-v1.1.0) (2026-06-04)


### Features

* **backend:** Hermes Agent integration via service token + X-Act-As-User ([ba5802c](https://github.com/Papoosky/finpa/commit/ba5802c1cccbf40056266a6099f13e44a532852e)), closes [#9](https://github.com/Papoosky/finpa/issues/9)


### Bug Fixes

* **ci:** fallback COMMIT_MSG to ref name on workflow_dispatch ([07fb86a](https://github.com/Papoosky/finpa/commit/07fb86ac655b5a0492c6e30a9fe3e57c75fef450))
