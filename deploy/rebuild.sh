#!/usr/bin/env bash
#
# Rebuild the static bundle nginx serves at archis.skylanex.com.
#
# Archis has no server: the name engine runs in the browser, so "deploying" is
# building the bundle and letting nginx hand out the files. This is that step —
# `dist/` is gitignored, so a `git pull` on its own changes nothing a visitor
# can see. Run it through systemd —
#
#     cd /var/www/archis && git pull
#     sudo systemctl restart archis
#
# — or call this script directly; it behaves identically either way.
#
# The build goes to a staging directory and is swapped in with a single mv, so
# the document root is never half-written. A failed build leaves the live site
# exactly as it was.
set -euo pipefail

# Appended, not replaced: systemd hands the service a bare PATH, while a human
# running this by hand may well have node from nvm ahead of /usr/bin.
export PATH="${PATH}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAGE="$ROOT/dist.new"
LIVE="$ROOT/dist"
PREV="$ROOT/dist.old"

# npm ci wipes and reinstalls node_modules — a minute we only spend when the
# lockfile actually moved. `-nt` is false when node_modules is missing, hence
# the explicit -d test.
if [[ ! -d node_modules || package-lock.json -nt node_modules ]]; then
  echo "==> dependencies changed — npm ci"
  npm ci
else
  echo "==> dependencies unchanged — skipping npm ci"
fi

echo "==> building into $(basename "$STAGE")"
rm -rf "$STAGE"
# npm appends these to the end of the script, so they reach `vite build` rather
# than the `tsc -b` in front of it. tsc still runs first: a type error stops the
# deploy before anything is written.
npm run build -- --outDir "$STAGE" --emptyOutDir

# Refuse to publish a build that cannot work. A bundle whose index.html does not
# reference the JS is the shape a half-finished build takes, and it renders as a
# blank page — the one failure a visitor cannot tell from an outage.
if [[ ! -s "$STAGE/index.html" ]]; then
  echo "!! $STAGE/index.html is missing or empty — refusing to swap" >&2
  exit 1
fi
if ! grep -q 'src="/assets/.*\.js"' "$STAGE/index.html"; then
  echo "!! $STAGE/index.html references no bundle — refusing to swap" >&2
  exit 1
fi
if ! compgen -G "$STAGE/assets/*.js" > /dev/null; then
  echo "!! no JS bundle in $STAGE/assets — refusing to swap" >&2
  exit 1
fi

echo "==> swapping into place"
rm -rf "$PREV"
if [[ -d "$LIVE" ]]; then
  mv "$LIVE" "$PREV"
fi
mv "$STAGE" "$LIVE"

# The previous build stays on disk until the next run, so a bad deploy is one
# command away from undone:
#
#     mv dist dist.bad && mv dist.old dist
#
echo "==> done — $(find "$LIVE" -type f | wc -l) files live in $LIVE"
