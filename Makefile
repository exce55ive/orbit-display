.PHONY: release hotfix build clean

# make release VERSION=0.0.10  → bump version, commit, create GitHub release as exce55ive, push tag (CI attaches assets)
# make hotfix VERSION=0.0.10   → same, but for out-of-band fixes (no functional difference — always full semver)
# make build                   → local build only
# make clean                   → wipe dist/

# Extract PAT from git remote URL (already stored there)
GH_TOKEN := $(shell git remote get-url origin | sed 's|.*x-access-token:\([^@]*\)@.*|\1|')
GH_REPO   := exce55ive/orbit-display

define create_release
	@echo "→ Creating GitHub release for v$(1) as exce55ive..."
	@curl -s -X POST \
	  -H "Authorization: token $(GH_TOKEN)" \
	  -H "Content-Type: application/json" \
	  "https://api.github.com/repos/$(GH_REPO)/releases" \
	  -d "{\"tag_name\":\"v$(1)\",\"name\":\"Orbit v$(1)\",\"body\":\"## Orbit v$(1)\n\n### Install\nDownload **OrbitSetup-$(1).exe** below and run the installer.\n\nExisting installs will be notified automatically via in-app update.\n\n### Changes\nSee [CHANGELOG.md](https://github.com/$(GH_REPO)/blob/main/CHANGELOG.md) for full history.\",\"draft\":false,\"prerelease\":false}" \
	  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Release created:', d.get('html_url','error: '+str(d)))"
endef

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=x.y.z"; exit 1; fi
	@echo "→ Bumping version to $(VERSION)..."
	@npm version $(VERSION) --no-git-tag-version --silent
	@git add package.json package-lock.json
	@git commit -m "release: v$(VERSION)"
	@git tag v$(VERSION)
	$(call create_release,$(VERSION))
	@git push origin main --tags
	@echo "✅ v$(VERSION) released — CI will build and attach installer"

hotfix:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make hotfix VERSION=x.y.z"; exit 1; fi
	@npm version $(VERSION) --no-git-tag-version --silent
	@git add package.json package-lock.json
	@git commit -m "release: v$(VERSION)"
	@git tag v$(VERSION)
	$(call create_release,$(VERSION))
	@git push origin main --tags
	@echo "✅ v$(VERSION) hotfix released — CI will build and attach installer"

build:
	npm run build

clean:
	rm -rf dist/
