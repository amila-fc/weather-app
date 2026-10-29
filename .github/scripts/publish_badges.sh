#!/usr/bin/env bash
# Publishes the generated coverage badge files to the `badges` branch, which is where the README's
# shields.io endpoint badges read them from. Requires a workflow token with contents: write.
#
# Usage: GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo bash .github/scripts/publish_badges.sh <dir> [branch]
set -euo pipefail

source_dir="${1:-coverage-badges}"
branch="${2:-badges}"

if [ ! -d "$source_dir" ]; then
  echo "::warning::$source_dir does not exist, nothing to publish"
  exit 0
fi

repo_url="https://x-access-token:${GITHUB_TOKEN:?GITHUB_TOKEN is required}@github.com/${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}.git"
workdir="$(mktemp -d)"

git init --quiet "$workdir"
git -C "$workdir" remote add origin "$repo_url"

if git -C "$workdir" fetch --depth 1 --quiet origin "$branch"; then
  git -C "$workdir" checkout --quiet -B "$branch" FETCH_HEAD
else
  echo "Branch $branch does not exist yet, creating it as an orphan branch"
  git -C "$workdir" checkout --quiet --orphan "$branch"
fi

cp "$source_dir"/* "$workdir"/
cd "$workdir"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A

if git diff --cached --quiet; then
  echo "Badges are already up to date"
  exit 0
fi

git commit --quiet -m "chore: update coverage badges"

for attempt in 1 2 3; do
  if git push --quiet origin "HEAD:$branch"; then
    echo "Published badges to $branch"
    exit 0
  fi
  echo "Push attempt $attempt failed, retrying after a rebase"
  sleep 3
  git fetch --quiet origin "$branch" || true
  git rebase --quiet "origin/$branch" || true
done

# Publishing the badge must never fail the build: the tests already ran and reported their result.
echo "::warning::Could not publish the coverage badges after 3 attempts"
exit 0
