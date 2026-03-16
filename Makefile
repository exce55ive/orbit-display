.PHONY: release hotfix build clean

# make release VERSION=0.0.9   → bump version, commit, tag, push (triggers CI build + publish)
# make hotfix VERSION=0.0.9    → bump version + tag (for out-of-band fixes — always use full semver, never x.y.z-N)
# make build                   → local build only (dist/)
# make clean                   → wipe dist/

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=x.y.z"; exit 1; fi
	@echo "→ Bumping version to $(VERSION)..."
	npm version $(VERSION) --no-git-tag-version
	git add package.json package-lock.json
	git commit -m "release: v$(VERSION)"
	git tag v$(VERSION)
	git push origin main --tags
	@echo "✅ Tagged v$(VERSION) — CI will build and publish to GitHub Releases"

hotfix:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make hotfix VERSION=x.y.z (full semver — never use x.y.z-N, that's a pre-release and auto-update ignores it)"; exit 1; fi
	npm version $(VERSION) --no-git-tag-version
	git add package.json package-lock.json
	git commit -m "release: v$(VERSION)"
	git tag v$(VERSION)
	git push origin main --tags
	@echo "✅ Tagged v$(VERSION) — CI will build and publish"

build:
	npm run build

clean:
	rm -rf dist/
