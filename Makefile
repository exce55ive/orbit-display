.PHONY: release hotfix build clean

# make release VERSION=0.0.11  → bump version, commit, create GitHub release as exce55ive, push tag (CI attaches assets)
# make hotfix VERSION=0.0.11   → same, but for out-of-band fixes (no functional difference — always full semver)
# make build                   → local build only
# make clean                   → wipe dist/

# Extract PAT from git remote URL (already stored there)
GH_TOKEN := $(shell git remote get-url origin | sed 's|.*x-access-token:\([^@]*\)@.*|\1|')
GH_REPO   := exce55ive/orbit-display

# Standard release body format — reads What's New from CHANGELOG.md for the given version
# Downloads table is always included for all 5 platforms
define create_release
	@echo "→ Creating GitHub release for v$(1) as exce55ive..."
	@python3 -c "\
import json, urllib.request, re; \
changelog = open('CHANGELOG.md').read(); \
match = re.search(r'## v$(1)\n(.*?)(?=\n## v|\Z)', changelog, re.DOTALL); \
changes = match.group(1).strip() if match else 'See CHANGELOG.md for details.'; \
body = '## What\'s New\n\n' + changes + '\n\n## Downloads\n\n| Platform | File |\n|---|---|\n| Windows x64 | \`OrbitSetup-$(1).exe\` |\n| Windows ARM64 (Snapdragon) | \`OrbitSetup-$(1)-arm64.exe\` |\n| macOS ARM64 | \`OrbitSetup-$(1)-arm64.dmg\` |\n| Linux AppImage | \`OrbitSetup-$(1).AppImage\` |\n| Linux .deb | \`OrbitSetup-$(1).deb\` |'; \
payload = json.dumps({'tag_name': 'v$(1)', 'name': 'Orbit v$(1)', 'body': body, 'draft': False, 'prerelease': False}).encode(); \
req = urllib.request.Request('https://api.github.com/repos/$(GH_REPO)/releases', data=payload, headers={'Authorization': 'token $(GH_TOKEN)', 'Content-Type': 'application/json'}); \
r = urllib.request.urlopen(req); \
d = json.loads(r.read()); \
print('  Release created:', d.get('html_url', 'ERROR: ' + str(d))); \
"
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
