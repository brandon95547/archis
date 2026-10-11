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

# Second sources for scripts/verify_roots.py: other dictionaries, read only to check the
# roots above and never shipped. About 720 MB, into second/. Licenses are listed in that
# script's docstring; pli2en_pts.json and sedrajs are non-commercial, checking only.
mkdir -p second/lsj
grab() { # <file under second/> <url> [extra curl arguments]
  local file="second/$1" url="$2"; shift 2
  [[ -s "$file" ]] && { echo "have $file"; return; }
  curl -sfL --retry 3 "$@" -o "$file.part" "$url" && mv "$file.part" "$file" \
    && echo "ok   $file $(du -h "$file" | cut -f1)" || { rm -f "$file.part"; echo "FAIL $file"; }
}
gh=https://raw.githubusercontent.com
for n in $(seq 1 27); do   # Liddell-Scott-Jones, Perseus
  grab "lsj/grc.lsj.perseus-eng$n.xml" "$gh/PerseusDL/lexica/master/CTS_XML_TEI/perseus/pdllex/grc/lsj/grc.lsj.perseus-eng$n.xml"
done
grab strongs-greek.js         "$gh/openscriptures/strongs/master/greek/strongs-greek-dictionary.js"
grab lewis-short.xml          "$gh/PerseusDL/lexica/master/CTS_XML_TEI/perseus/pdllex/lat/ls/lat.ls.perseus-eng2.xml"
grab whitaker-DICTLINE.GEN    "$gh/mk270/whitakers-words/master/DICTLINE.GEN"
grab mwxml.zip                https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/downloads/mwxml.zip
grab pli2en_ncped.json        "$gh/suttacentral/sc-data/main/dictionaries/simple/en/pli2en_ncped.json"
grab pli2en_pts.json          "$gh/suttacentral/sc-data/main/dictionaries/complex/en/pli2en_pts.json"
grab oe_bosworthtoller.txt    https://www.germanic-lexicon-project.org/txt/oe_bosworthtoller.txt
grab zoega.json               "$gh/stscoundrel/old-icelandic-zoega/master/json/zoega-no-markup.json"
grab cleasby-vigfusson.json   "$gh/stscoundrel/cleasby-vigfusson-dictionary/master/json/cleasby-vigfusson-no-markup.json"
grab goth_wright_glossary.xml https://www.germanic-lexicon-project.org/xml/goth_wright/goth_wright_glossary.xml
grab BrownDriverBriggs.xml    "$gh/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml"
grab LexicalIndex.xml         "$gh/openscriptures/HebrewLexicon/master/LexicalIndex.xml"
grab sedrajs-1.2.9.tgz        https://registry.npmjs.org/sedrajs/-/sedrajs-1.2.9.tgz
grab aed-dictionary.xml       "$gh/simondschweitzer/aed-tei/master/files/dictionary.xml"
# ORACC's server leaves the intermediate certificate out of its TLS chain, so curl cannot
# verify it against the system roots alone. The intermediate comes from the CA's own
# address and is checked against those roots before it is trusted; nothing is unverified.
roots="$(curl-config --ca 2>/dev/null)"; [[ -s "$roots" ]] || roots=/etc/ssl/certs/ca-certificates.crt
if [[ ! -s second/oracc-ca-bundle.pem ]]; then
  curl -sf --retry 3 -o second/incommon.crt http://crt.sectigo.com/InCommonRSAServerCA2.crt \
    && openssl x509 -inform der -in second/incommon.crt -out second/incommon-rsa-server-ca-2.pem \
    && openssl verify -CAfile "$roots" second/incommon-rsa-server-ca-2.pem >/dev/null \
    && cat "$roots" second/incommon-rsa-server-ca-2.pem > second/oracc-ca-bundle.pem \
    || echo "FAIL oracc certificate chain"
  rm -f second/incommon.crt
fi
grab oracc-epsd2.zip          https://oracc.museum.upenn.edu/json/epsd2.zip --cacert second/oracc-ca-bundle.pem
grab oracc-saao.zip           https://oracc.museum.upenn.edu/json/saao.zip  --cacert second/oracc-ca-bundle.pem
echo DONE
