.PHONY: release hotfix build clean

# make release VERSION=0.0.9   → bump version, commit, tag, push (triggers CI build + publish)
# make hotfix VERSION=0.0.8-1  → tag current HEAD only, push tag (no version bump)
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
	@if [ -z "$(VERSION)" ]; then echo "Usage: make hotfix VERSION=x.y.z-N"; exit 1; fi
	git tag v$(VERSION)
	git push origin v$(VERSION)
	@echo "✅ Tagged v$(VERSION) — CI will build and attach artifacts to GitHub Releases"

build:
	npm run build

clean:
	rm -rf dist/
