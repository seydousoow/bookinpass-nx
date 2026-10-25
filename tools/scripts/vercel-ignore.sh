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

# Liste des projets touchés en JSON : un format stable, quelle que soit la sortie (terminal ou non).
affected="$(npx nx show projects --affected --json --base="$previous" --head=HEAD)" || {
  echo "vercel-ignore : projets touchés inconnus, construction de $project"
  exit 1
}
if printf '%s' "$affected" | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>process.exit(JSON.parse(s).includes(process.argv[1])?0:1))' "$project"; then
  echo "vercel-ignore : $project touché depuis $previous, construction"
  exit 1
fi

echo "vercel-ignore : $project inchangé depuis $previous, déploiement ignoré"
exit 0
