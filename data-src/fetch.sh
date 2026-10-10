#!/usr/bin/env bash
# Raw dictionary dumps for scripts/build_roots.py. Not committed (see .gitignore).
set -u
cd "$(dirname "$0")"
get() { # <language name on kaikki.org>
  local lang="$1" enc file
  enc="${lang// /%20}"; enc="${enc//\'/%27}"
  file="$(printf '%s' "$lang" | tr -d " '-")"
  [[ -s "$file.jsonl" ]] && { echo "have $file"; return; }
  curl -sfL --retry 3 -o "$file.jsonl.part" "https://kaikki.org/dictionary/$enc/kaikki.org-dictionary-$file.jsonl" \
    && mv "$file.jsonl.part" "$file.jsonl" && echo "ok   $file $(du -h "$file.jsonl" | cut -f1)" \
    || { rm -f "$file.jsonl.part"; echo "FAIL $file"; }
}
for lang in "Proto-Indo-European" "Proto-Semitic" "Proto-Germanic" "Proto-Celtic" "Akkadian" "Sumerian" \
  "Egyptian" "Avestan" "Old Persian" "Phoenician" "Ugaritic" "Hittite" "Ge'ez" "Gothic" "Pali" "Aramaic" \
  "Classical Syriac" "Old Norse" "Old Irish" "Hebrew" "Old English" "Sanskrit" "Ancient Greek" "Latin"; do
  get "$lang"
done
[[ -s eldamo-data.xml ]] || curl -sfL --retry 3 -o eldamo-data.xml https://github.com/pfstrack/eldamo/raw/master/src/data/eldamo-data.xml && echo "ok   eldamo"
[[ -s strongs-hebrew.js ]] || curl -sfL --retry 3 -o strongs-hebrew.js https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js && echo "ok   strongs-hebrew"
echo DONE
