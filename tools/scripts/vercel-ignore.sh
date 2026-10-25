#!/bin/sh
# « Ignored Build Step » de Vercel pour une application du dépôt : sortie 0 = déploiement ignoré, 1 = construit.
# Construit si l'application est touchée depuis le dernier déploiement, ou si on ne peut pas le savoir.
#
#   sh tools/scripts/vercel-ignore.sh <projet Nx>      (lancé depuis la racine du dépôt)
set -u
project="$1"
previous="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ -z "$previous" ] || ! git cat-file -e "$previous^{commit}" 2>/dev/null; then
  echo "vercel-ignore : pas de déploiement précédent connu, construction de $project"
  exit 1
fi

if npx nx show projects --affected --base="$previous" --head=HEAD | grep -qx "$project"; then
  echo "vercel-ignore : $project touché depuis $previous, construction"
  exit 1
fi

echo "vercel-ignore : $project inchangé depuis $previous, déploiement ignoré"
exit 0
