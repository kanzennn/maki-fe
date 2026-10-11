#!/bin/sh
# Puts a build of maki-fe live on the VPS, in /srv/maki/web: the build's
# tarball, copied to incoming/<sha>.tar.gz, becomes releases/<sha>, and
# current, which Caddy serves, switches to it at once. The deploy job runs
# it over SSH (docs/deployment.md):
#
#   ssh deploy 'sh -s -- <sha>' < deploy/release.sh
set -eu

sha="${1:?usage: release.sh <commit sha>}"
cd /srv/maki/web
mkdir -p releases manifests

next="releases/.$sha"
rm -rf "$next"
mkdir -p "$next"
tar -xzf "incoming/$sha.tar.gz" -C "$next"
rm -f "incoming/$sha.tar.gz"

# Its own hashed files, before the running release's join them.
ls -1 "$next/assets" > "manifests/$sha"

# The running release's own files come along, so a tab still on it loads
# them after the switch: a file's name is its content's hash, so one both
# have is the same file. Only its own, so they don't pile up release after
# release.
running="$(readlink current 2>/dev/null || true)"
running="${running#releases/}"
if [ "$running" = "$sha" ]; then
  # The same commit again: it keeps the files it brought along before.
  cp -R "releases/$sha/assets/." "$next/assets/"
elif [ -n "$running" ] && [ -f "manifests/$running" ]; then
  while read -r file; do
    [ -f "releases/$running/assets/$file" ] && cp "releases/$running/assets/$file" "$next/assets/$file"
  done < "manifests/$running"
fi

rm -rf "releases/$sha"
mv "$next" "releases/$sha"
ln -sfn "releases/$sha" current.next
mv -Tf current.next current

# The five newest releases stay, for a rollback.
ls -1t releases | tail -n +6 | while read -r old; do
  rm -rf "releases/$old" "manifests/$old"
done
echo "release.sh: $sha is live"
