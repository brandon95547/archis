import type { Root } from '../types'

/**
 * The root lexicon.
 *
 * Two forms per entry, and the difference matters:
 *   · `form` is the citation shape — how the tradition actually writes it, diacritics and
 *     all. It is what the detail panel shows, because that is the honest record.
 *   · `stem` is what the engine may cut up and join: plain ASCII, no macrons, no
 *     laryngeals. Reconstructed roots cannot be blended in their cited shape at all —
 *     *ǵneh₃- has to be "gno" before a name can be built from it.
 *
 * `weight` is how completely the root carries its concepts on its own. Greek *alētheia*
 * is truth and nothing else, so it weighs more for "truth" than a root where truth is one
 * shade of a broader sense. It decides which roots reach the blender, not which names win.
 *
 * Coverage is deliberately wide. Reaching for Greek and Latin every time is the failure
 * mode this list exists to avoid, so the scorer rewards batches that spread across
 * traditions and the pool is built to make that possible.
 */

const r = (
  id: string,
  form: string,
  stem: string,
  language: string,
  gloss: string,
  concepts: string[],
  weight = 0.7,
): Root => ({ id, form, stem, language, gloss, concepts, weight })

export const LEXICON: Root[] = [
  // ── Ancient Greek ─────────────────────────────────────────────────────────
  r('gr-aletheia', 'alḗtheia', 'aleth', 'greek', 'truth; the unconcealed', ['truth', 'clarity', 'hidden'], 1),
  r('gr-sophia', 'sophía', 'soph', 'greek', 'wisdom, skill', ['wisdom', 'learning'], 1),
  r('gr-gnosis', 'gnôsis', 'gnos', 'greek', 'knowing, insight', ['knowledge', 'consciousness'], 0.95),
  r('gr-episteme', 'epistḗmē', 'epist', 'greek', 'sure knowledge, science', ['knowledge', 'learning'], 0.85),
  r('gr-kryptos', 'kryptós', 'kryp', 'greek', 'hidden, covered', ['hidden', 'depth'], 0.9),
  r('gr-logos', 'lógos', 'log', 'greek', 'word, reason, account', ['word', 'speech', 'order', 'mind'], 0.95),
  r('gr-nomos', 'nómos', 'nom', 'greek', 'law, custom', ['law', 'order'], 0.85),
  r('gr-arche', 'arkhḗ', 'arkh', 'greek', 'beginning; first principle', ['origin', 'foundation', 'law'], 0.95),
  r('gr-genesis', 'génesis', 'genes', 'greek', 'coming into being', ['creation', 'origin', 'life'], 0.9),
  r('gr-heuresis', 'heúresis', 'heur', 'greek', 'a finding out, discovery', ['discovery'], 0.9),
  r('gr-phaos', 'pháos', 'phae', 'greek', 'light, daylight', ['light', 'clarity'], 0.9),
  r('gr-aither', 'aithḗr', 'aith', 'greek', 'the bright upper air', ['light', 'sky'], 0.75),
  r('gr-morphe', 'morphḗ', 'morph', 'greek', 'form, shape', ['transformation', 'creation'], 0.8),
  r('gr-mneme', 'mnḗmē', 'mnem', 'greek', 'memory, remembrance', ['memory'], 0.95),
  r('gr-noos', 'nóos', 'noe', 'greek', 'mind, perception', ['mind', 'consciousness', 'thought'], 0.9),
  r('gr-chronos', 'khrónos', 'khron', 'greek', 'time, duration', ['time'], 0.95),
  r('gr-aion', 'aiṓn', 'aion', 'greek', 'age, lifetime, eternity', ['time', 'eternity'], 0.85),
  r('gr-kosmos', 'kósmos', 'kosm', 'greek', 'order; the ordered world', ['order', 'law'], 0.9),
  r('gr-onoma', 'ónoma', 'onom', 'greek', 'name', ['name', 'word'], 0.95),
  r('gr-theoria', 'theōría', 'theor', 'greek', 'contemplation, looking at', ['thought', 'sight', 'knowledge'], 0.8),
  r('gr-sema', 'sêma', 'sem', 'greek', 'sign, token', ['word', 'name', 'discovery'], 0.7),
  r('gr-lexis', 'léxis', 'lex', 'greek', 'speech, diction', ['word', 'speech'], 0.8),
  r('gr-eidos', 'eîdos', 'eid', 'greek', 'form seen; idea', ['sight', 'thought', 'creation'], 0.75),
  r('gr-telos', 'télos', 'tel', 'greek', 'end, purpose, completion', ['order', 'path'], 0.7),
  r('gr-pneuma', 'pneûma', 'pneu', 'greek', 'breath, spirit', ['breath', 'life'], 0.7),
  // Making and fitting together. The lexicon had roots for creating out of
  // nothing and none at all for *composing* — putting made things together —
  // so any query about building, modelling or synthesis had nothing to answer
  // it and fell through to the house concepts.
  r('gr-harmonia', 'harmonía', 'harmon', 'greek', 'a joining, a fitting together', ['harmony', 'order', 'creation'], 0.95),
  r('gr-synthesis', 'sýnthesis', 'synth', 'greek', 'a putting together, composition', ['creation', 'order', 'harmony'], 0.9),
  r('gr-techne', 'tékhnē', 'tekhn', 'greek', 'craft, skill, art', ['creation', 'learning'], 0.9),
  r('gr-typos', 'týpos', 'typ', 'greek', 'a stamp; the model struck from a die', ['creation', 'order'], 0.85),

  // ── Latin ─────────────────────────────────────────────────────────────────
  r('la-veritas', 'vēritās', 'ver', 'latin', 'truth', ['truth'], 1),
  r('la-sapientia', 'sapientia', 'sapi', 'latin', 'wisdom, good sense', ['wisdom'], 0.95),
  r('la-scientia', 'scientia', 'scien', 'latin', 'knowledge', ['knowledge', 'learning'], 0.9),
  r('la-arcanum', 'arcānum', 'arcan', 'latin', 'a secret, a closed thing', ['hidden'], 0.95),
  r('la-occultus', 'occultus', 'occul', 'latin', 'hidden, covered over', ['hidden', 'depth'], 0.85),
  r('la-lex', 'lēx', 'leg', 'latin', 'law', ['law', 'order'], 0.9),
  r('la-origo', 'orīgō', 'orig', 'latin', 'source, beginning', ['origin', 'foundation'], 0.9),
  r('la-lumen', 'lūmen', 'lum', 'latin', 'light, the light of a lamp', ['light', 'clarity'], 0.95),
  r('la-inventio', 'inventiō', 'invent', 'latin', 'a finding, discovery', ['discovery'], 0.85),
  r('la-memoria', 'memoria', 'memor', 'latin', 'memory', ['memory'], 0.95),
  r('la-mens', 'mēns', 'ment', 'latin', 'mind, intention', ['mind', 'consciousness'], 0.9),
  r('la-tempus', 'tempus', 'tempor', 'latin', 'time, season', ['time'], 0.9),
  r('la-aevum', 'aevum', 'aev', 'latin', 'an age, lifetime', ['time', 'eternity'], 0.8),
  r('la-ordo', 'ōrdō', 'ordin', 'latin', 'order, rank, arrangement', ['order'], 0.9),
  r('la-verbum', 'verbum', 'verb', 'latin', 'word', ['word', 'speech'], 0.9),
  r('la-nomen', 'nōmen', 'nomin', 'latin', 'name', ['name'], 0.95),
  r('la-ratio', 'ratiō', 'rat', 'latin', 'reason, reckoning', ['mind', 'order', 'thought'], 0.8),
  r('la-vestigium', 'vestīgium', 'vestig', 'latin', 'footprint, trace', ['discovery', 'memory'], 0.75),
  r('la-fons', 'fōns', 'font', 'latin', 'spring, source', ['origin', 'water'], 0.8),
  r('la-creare', 'creāre', 'crea', 'latin', 'to make, to bring forth', ['creation'], 0.9),
  r('la-vertere', 'vertere', 'vert', 'latin', 'to turn, to change', ['transformation'], 0.8),
  r('la-serenus', 'serēnus', 'seren', 'latin', 'clear, unclouded', ['clarity', 'light'], 0.7),
  r('la-forma', 'fōrma', 'form', 'latin', 'form, shape, mould', ['creation', 'order', 'transformation'], 0.9),
  r('la-structura', 'strūctūra', 'struct', 'latin', 'a fitting together, a building', ['order', 'foundation', 'creation'], 0.85),
  r('la-texere', 'texere', 'tex', 'latin', 'to weave', ['creation', 'order'], 0.8),
  r('la-fingere', 'fingere', 'fing', 'latin', 'to shape, to mould', ['creation', 'transformation'], 0.8),

  // ── Sanskrit ──────────────────────────────────────────────────────────────
  r('sa-satya', 'satya', 'saty', 'sanskrit', 'truth, what is real', ['truth'], 1),
  r('sa-rta', 'ṛta', 'rita', 'sanskrit', 'cosmic order; the way things truly run', ['order', 'law', 'truth'], 1),
  r('sa-vidya', 'vidyā', 'vidy', 'sanskrit', 'knowledge, learning', ['knowledge', 'learning'], 0.95),
  r('sa-jnana', 'jñāna', 'jnan', 'sanskrit', 'knowing, gnosis', ['knowledge', 'consciousness'], 0.95),
  r('sa-prajna', 'prajñā', 'praj', 'sanskrit', 'discerning wisdom', ['wisdom'], 0.95),
  r('sa-guhya', 'guhya', 'guhy', 'sanskrit', 'secret, to be concealed', ['hidden'], 0.9),
  r('sa-dharma', 'dharma', 'dharm', 'sanskrit', 'law, what upholds', ['law', 'order', 'foundation'], 0.95),
  r('sa-adi', 'ādi', 'adi', 'sanskrit', 'beginning, first', ['origin', 'beginning'], 0.9),
  r('sa-srsti', 'sṛṣṭi', 'srish', 'sanskrit', 'creation, letting forth', ['creation'], 0.85),
  r('sa-bodha', 'bodha', 'bodh', 'sanskrit', 'awakening, understanding', ['consciousness', 'knowledge'], 0.9),
  r('sa-jyoti', 'jyoti', 'jyot', 'sanskrit', 'light, radiance', ['light'], 0.95),
  r('sa-prakasa', 'prakāśa', 'prakash', 'sanskrit', 'light; being made manifest', ['light', 'clarity'], 0.85),
  r('sa-parinama', 'pariṇāma', 'parin', 'sanskrit', 'transformation, ripening', ['transformation'], 0.9),
  r('sa-smrti', 'smṛti', 'smrit', 'sanskrit', 'memory, what is remembered', ['memory'], 0.95),
  r('sa-citta', 'citta', 'chit', 'sanskrit', 'mind, awareness', ['consciousness', 'mind'], 0.9),
  r('sa-kala', 'kāla', 'kal', 'sanskrit', 'time', ['time'], 0.9),
  r('sa-yoga', 'yoga', 'yog', 'sanskrit', 'yoking, joining, union', ['harmony', 'order', 'path'], 0.9),
  r('sa-rupa', 'rūpa', 'rup', 'sanskrit', 'form, shape as it appears', ['creation', 'sight'], 0.85),
  r('sa-vac', 'vāc', 'vach', 'sanskrit', 'speech, the spoken word', ['word', 'speech', 'voice'], 0.95),
  r('sa-naman', 'nāman', 'nam', 'sanskrit', 'name', ['name'], 0.95),
  r('sa-manas', 'manas', 'man', 'sanskrit', 'mind, thought', ['mind', 'thought'], 0.85),
  r('sa-veda', 'veda', 'ved', 'sanskrit', 'knowledge, sacred knowing', ['knowledge', 'sacred'], 0.9),
  r('sa-sutra', 'sūtra', 'sutr', 'sanskrit', 'thread; a line of teaching', ['word', 'path', 'learning'], 0.75),
  r('sa-akasa', 'ākāśa', 'akash', 'sanskrit', 'space, the open ether', ['sky', 'depth'], 0.75),
  r('sa-amrta', 'amṛta', 'amrit', 'sanskrit', 'deathless, undying', ['eternity', 'life'], 0.8),
  r('sa-tejas', 'tejas', 'tej', 'sanskrit', 'brilliance, fiery power', ['light', 'fire'], 0.8),

  // ── Pali ──────────────────────────────────────────────────────────────────
  r('pa-sacca', 'sacca', 'sacc', 'pali', 'truth', ['truth'], 0.95),
  r('pa-panna', 'paññā', 'pann', 'pali', 'wisdom, insight', ['wisdom'], 0.95),
  r('pa-vijja', 'vijjā', 'vijj', 'pali', 'true knowledge', ['knowledge'], 0.9),
  r('pa-sati', 'sati', 'sat', 'pali', 'mindfulness; keeping in mind', ['memory', 'consciousness'], 0.9),
  r('pa-aloka', 'āloka', 'alok', 'pali', 'light, looking', ['light', 'sight'], 0.85),
  r('pa-dhamma', 'dhamma', 'dham', 'pali', 'law, teaching, thing-as-it-is', ['law', 'order'], 0.9),

  // ── Ancient Egyptian ──────────────────────────────────────────────────────
  r('eg-maat', 'mꜣꜥt (maat)', 'maat', 'egyptian', 'truth, order, right measure', ['truth', 'order', 'law'], 1),
  r('eg-ren', 'rn (ren)', 'ren', 'egyptian', 'name — one of the parts of a person', ['name'], 0.95),
  r('eg-sia', 'sjꜣ (sia)', 'sia', 'egyptian', 'perception, understanding', ['knowledge', 'consciousness'], 0.9),
  r('eg-heka', 'ḥkꜣ (heka)', 'heka', 'egyptian', 'the power in spoken words', ['word', 'speech', 'sacred'], 0.85),
  r('eg-akh', 'ꜣḫ (akh)', 'akh', 'egyptian', 'radiant, effective; the shining one', ['light', 'transformation'], 0.8),
  r('eg-kheper', 'ḫpr (kheper)', 'kheper', 'egyptian', 'to come into being, to become', ['transformation', 'creation'], 0.9),
  r('eg-neheh', 'nḥḥ (neheh)', 'neheh', 'egyptian', 'time that returns; cyclical eternity', ['time', 'eternity'], 0.85),
  r('eg-djet', 'ḏt (djet)', 'djet', 'egyptian', 'time that endures; unchanging eternity', ['eternity', 'time'], 0.8),
  r('eg-sesh', 'sš (sesh)', 'sesh', 'egyptian', 'writing, the scribe', ['word', 'memory', 'learning'], 0.85),
  r('eg-nun', 'nwn (nun)', 'nun', 'egyptian', 'the first waters, before anything', ['origin', 'water', 'depth'], 0.85),
  r('eg-benben', 'bnbn (benben)', 'ben', 'egyptian', 'the first mound to rise', ['origin', 'foundation'], 0.75),
  r('eg-wehem', 'wḥm (wehem)', 'wehem', 'egyptian', 'to repeat, to tell again', ['memory', 'speech'], 0.7),

  // ── Sumerian ──────────────────────────────────────────────────────────────
  r('su-me', 'me', 'me', 'sumerian', 'the decrees that hold the world in shape', ['law', 'order', 'sacred'], 0.9),
  r('su-zu', 'zu', 'zu', 'sumerian', 'to know', ['knowledge'], 0.85),
  r('su-gestu', 'ĝeštug', 'geshtu', 'sumerian', 'ear; and so, understanding', ['wisdom', 'mind'], 0.85),
  r('su-nam', 'nam', 'nam', 'sumerian', 'destiny, what is allotted', ['law', 'time'], 0.8),
  r('su-mu', 'mu', 'mu', 'sumerian', 'name; also year', ['name', 'time'], 0.85),
  r('su-zalag', 'zalag', 'zalag', 'sumerian', 'to shine, to be bright', ['light'], 0.85),
  r('su-abzu', 'abzu', 'abzu', 'sumerian', 'the deep fresh water under the earth', ['depth', 'water', 'hidden'], 0.85),
  r('su-an', 'an', 'an', 'sumerian', 'sky, heaven', ['sky'], 0.8),
  r('su-ud', 'ud', 'ud', 'sumerian', 'day, light, time', ['light', 'time'], 0.75),
  r('su-eresh', 'ereš', 'eresh', 'sumerian', 'wise, a wise woman', ['wisdom'], 0.8),
  r('su-dim', 'dím', 'dim', 'sumerian', 'to make, to fashion', ['creation'], 0.85),

  // ── Akkadian ──────────────────────────────────────────────────────────────
  r('ak-kittu', 'kittu', 'kitt', 'akkadian', 'truth, what is firm', ['truth', 'foundation'], 0.95),
  r('ak-nemequ', 'nēmequ', 'nemeq', 'akkadian', 'wisdom, deep skill', ['wisdom'], 0.95),
  r('ak-nuru', 'nūru', 'nur', 'akkadian', 'light', ['light'], 0.95),
  r('ak-shumu', 'šumu', 'shum', 'akkadian', 'name, reputation', ['name'], 0.9),
  r('ak-amatu', 'amātu', 'amat', 'akkadian', 'word, matter spoken', ['word', 'speech'], 0.85),
  r('ak-pirishtu', 'pirištu', 'pirish', 'akkadian', 'a secret, a thing withheld', ['hidden'], 0.95),
  r('ak-shimtu', 'šīmtu', 'shim', 'akkadian', 'destiny, what is fixed', ['law', 'time'], 0.8),
  r('ak-uznu', 'uznu', 'uzn', 'akkadian', 'ear; and so, discernment', ['wisdom', 'mind'], 0.75),
  r('ak-reshtu', 'rēštu', 'resh', 'akkadian', 'first, foremost', ['origin', 'beginning'], 0.85),
  r('ak-banu', 'banû', 'ban', 'akkadian', 'to build, to bring into being', ['creation'], 0.8),
  r('ak-temu', 'ṭēmu', 'tem', 'akkadian', 'reason, understanding, report', ['mind', 'word'], 0.8),

  // ── Avestan & Old Persian ─────────────────────────────────────────────────
  r('av-asha', 'aša', 'asha', 'avestan', 'truth and right order, together', ['truth', 'order', 'law'], 1),
  r('av-mazda', 'mazdā', 'mazd', 'avestan', 'wisdom, the wise one', ['wisdom'], 0.95),
  r('av-khratu', 'xratu', 'khrat', 'avestan', 'intellect, formed wisdom', ['wisdom', 'mind'], 0.9),
  r('av-raocah', 'raocah', 'raoc', 'avestan', 'light, brightness', ['light'], 0.95),
  r('av-daena', 'daēnā', 'daen', 'avestan', 'inner sight, conscience', ['consciousness', 'sight'], 0.85),
  r('av-zrvan', 'zruuan', 'zrvan', 'avestan', 'time', ['time', 'eternity'], 0.85),
  r('av-spenta', 'spəṇta', 'spen', 'avestan', 'holy, furthering', ['sacred'], 0.75),
  r('av-vohu', 'vohu', 'vohu', 'avestan', 'good', ['harmony'], 0.65),
  r('op-arta', 'arta', 'art', 'oldpersian', 'truth, right order', ['truth', 'order'], 0.95),
  r('op-baga', 'baga', 'bag', 'oldpersian', 'lord, the one who apportions', ['sacred'], 0.7),
  r('op-vazraka', 'vazraka', 'vazr', 'oldpersian', 'great', ['strength'], 0.65),

  // ── Hebrew & Aramaic ──────────────────────────────────────────────────────
  r('he-emet', 'ʾemet', 'emet', 'hebrew', 'truth; what holds firm', ['truth', 'foundation'], 1),
  r('he-chokhmah', 'ḥokmāh', 'hokm', 'hebrew', 'wisdom, practised skill', ['wisdom'], 0.95),
  r('he-daat', 'daʿat', 'daat', 'hebrew', 'knowledge, intimate knowing', ['knowledge'], 0.95),
  r('he-binah', 'bînāh', 'bin', 'hebrew', 'understanding; telling apart', ['wisdom', 'mind'], 0.9),
  r('he-sod', 'sôd', 'sod', 'hebrew', 'secret, an inner council', ['hidden'], 0.95),
  r('he-torah', 'tôrāh', 'tor', 'hebrew', 'instruction, teaching', ['law', 'learning'], 0.85),
  r('he-reshit', 'rēʾšît', 'reshit', 'hebrew', 'beginning, the first of it', ['origin', 'beginning'], 0.9),
  r('he-bara', 'bārāʾ', 'bara', 'hebrew', 'to create', ['creation'], 0.85),
  r('he-or', 'ʾôr', 'or', 'hebrew', 'light', ['light'], 0.9),
  r('he-zikaron', 'zikkārôn', 'zikar', 'hebrew', 'remembrance, a memorial', ['memory'], 0.9),
  r('he-ruach', 'rûaḥ', 'ruah', 'hebrew', 'wind, breath, spirit', ['breath', 'life'], 0.8),
  r('he-davar', 'dābār', 'davar', 'hebrew', 'word; and the thing it names', ['word', 'speech'], 0.9),
  r('he-shem', 'šēm', 'shem', 'hebrew', 'name', ['name'], 0.95),
  r('he-seder', 'sēder', 'seder', 'hebrew', 'order, arrangement', ['order'], 0.85),
  r('ar-qushta', 'quštā', 'qusht', 'aramaic', 'truth', ['truth'], 0.9),
  r('ar-raza', 'rāzā', 'raz', 'aramaic', 'mystery, hidden thing', ['hidden', 'depth'], 0.95),
  r('ar-nuhra', 'nûhrā', 'nuhr', 'aramaic', 'light', ['light'], 0.9),
  r('ar-melta', 'melltā', 'melt', 'aramaic', 'word, utterance', ['word', 'speech'], 0.85),
  r('ar-zabna', 'zaḇnā', 'zabn', 'aramaic', 'time, season', ['time'], 0.8),
  r('ar-sukkala', 'sukkālā', 'sukal', 'aramaic', 'understanding, sense', ['mind', 'wisdom'], 0.75),

  // ── Phoenician ────────────────────────────────────────────────────────────
  // Attested almost entirely in inscriptions, so the pool here is small on purpose.
  r('ph-shem', 'šm (shem)', 'shem', 'phoenician', 'name', ['name'], 0.85),
  r('ph-dabar', 'dbr (dabar)', 'dabar', 'phoenician', 'word, to speak', ['word', 'speech'], 0.8),
  r('ph-kun', 'kn (kun)', 'kun', 'phoenician', 'to be firm, to be established', ['foundation', 'truth'], 0.8),
  r('ph-olam', 'ʿlm (olam)', 'olam', 'phoenician', 'lasting time, the far past or future', ['eternity', 'time'], 0.85),
  r('ph-ur', 'ʾr (ur)', 'ur', 'phoenician', 'light, flame', ['light', 'fire'], 0.8),
  r('ph-yada', 'ydʿ (yada)', 'yada', 'phoenician', 'to know', ['knowledge'], 0.8),

  // ── Classical Chinese ─────────────────────────────────────────────────────
  r('zh-zhen', '真 zhēn', 'zhen', 'chinese', 'true, genuine', ['truth'], 0.95),
  r('zh-dao', '道 dào', 'dao', 'chinese', 'the way; the course of things', ['path', 'law', 'order'], 0.95),
  r('zh-zhi', '智 zhì', 'zhi', 'chinese', 'wisdom', ['wisdom'], 0.9),
  r('zh-zhi2', '知 zhī', 'zhir', 'chinese', 'to know', ['knowledge'], 0.85),
  r('zh-ming', '明 míng', 'ming', 'chinese', 'bright, clear-sighted', ['light', 'clarity'], 0.9),
  r('zh-yuan', '元 yuán', 'yuan', 'chinese', 'origin, the first', ['origin', 'beginning'], 0.9),
  r('zh-xuan', '玄 xuán', 'xuan', 'chinese', 'dark, deep, mysterious', ['hidden', 'depth'], 0.95),
  r('zh-li', '理 lǐ', 'li', 'chinese', 'pattern, the grain of things', ['order', 'law'], 0.85),
  r('zh-mingn', '名 míng', 'mingm', 'chinese', 'name', ['name'], 0.9),
  r('zh-yan', '言 yán', 'yan', 'chinese', 'word, to speak', ['word', 'speech'], 0.85),
  r('zh-ji', '記 jì', 'ji', 'chinese', 'to record, to remember', ['memory'], 0.85),
  r('zh-xin', '心 xīn', 'xin', 'chinese', 'heart-mind', ['mind', 'consciousness'], 0.85),
  r('zh-shi', '時 shí', 'shi', 'chinese', 'time, the right season', ['time'], 0.85),
  r('zh-hua', '化 huà', 'hua', 'chinese', 'to transform', ['transformation'], 0.9),
  r('zh-zao', '造 zào', 'zao', 'chinese', 'to make, to build', ['creation'], 0.85),
  r('zh-cheng', '成 chéng', 'cheng', 'chinese', 'to complete, to bring into form', ['creation', 'transformation'], 0.8),
  r('zh-jue', '覺 jué', 'jue', 'chinese', 'to wake, to become aware', ['consciousness'], 0.85),
  r('zh-wen', '文 wén', 'wen', 'chinese', 'writing, pattern, culture', ['word', 'learning'], 0.8),

  // ── Ge'ez ─────────────────────────────────────────────────────────────────
  r('gz-sedq', 'ṣədq', 'sedeq', 'geez', 'righteousness, what is true', ['truth', 'law'], 0.9),
  r('gz-tebab', 'ṭəbäb', 'tebab', 'geez', 'wisdom', ['wisdom'], 0.9),
  r('gz-berhan', 'bərhan', 'berhan', 'geez', 'light', ['light'], 0.95),
  r('gz-qal', 'qal', 'qal', 'geez', 'voice, word', ['word', 'voice'], 0.85),
  r('gz-sem', 'səm', 'sem', 'geez', 'name', ['name'], 0.85),
  r('gz-gize', 'gize', 'gize', 'geez', 'time', ['time'], 0.8),
  r('gz-fetrat', 'fəṭrät', 'fetr', 'geez', 'creation, the made world', ['creation', 'origin'], 0.85),
  r('gz-zekr', 'zəkr', 'zekr', 'geez', 'remembrance', ['memory'], 0.8),
  r('gz-alem', 'ʿaläm', 'alem', 'geez', 'world, age', ['eternity', 'time'], 0.75),

  // ── Proto-Indo-European (reconstructed) ───────────────────────────────────
  r('pie-weid', '*wéyd-', 'weid', 'pie', 'to see, and so to know', ['knowledge', 'sight'], 0.9),
  r('pie-gnoh', '*ǵneh₃-', 'gno', 'pie', 'to know', ['knowledge'], 0.9),
  r('pie-leuk', '*lewk-', 'leuk', 'pie', 'light, brightness', ['light'], 0.9),
  r('pie-men', '*men-', 'men', 'pie', 'to think', ['mind', 'thought', 'memory'], 0.9),
  r('pie-bheh', '*bʰeh₂-', 'bha', 'pie', 'to shine; also to speak', ['light', 'speech'], 0.8),
  r('pie-nomn', '*h₁nómn̥', 'nomen', 'pie', 'name', ['name'], 0.9),
  r('pie-ar', '*h₂er-', 'ar', 'pie', 'to fit together', ['order', 'harmony'], 0.85),
  r('pie-teks', '*teḱs-', 'teks', 'pie', 'to fashion, to weave', ['creation', 'order'], 0.85),
  r('pie-ayu', '*h₂éyu-', 'ayu', 'pie', 'vital force, long life', ['life', 'eternity'], 0.8),
  r('pie-dheh', '*dʰeh₁-', 'dhe', 'pie', 'to set in place, to make', ['creation', 'foundation'], 0.8),
  r('pie-klew', '*ḱlew-', 'klew', 'pie', 'to hear; and so, fame', ['voice', 'memory'], 0.8),
  r('pie-derk', '*derḱ-', 'derk', 'pie', 'to see clearly', ['sight', 'clarity'], 0.8),
  r('pie-reg', '*h₃reǵ-', 'reg', 'pie', 'to straighten, to rule', ['order', 'law'], 0.85),
  r('pie-wer', '*weh₁r-', 'wer', 'pie', 'true, trustworthy', ['truth'], 0.85),
  r('pie-sew', '*sewH-', 'sev', 'pie', 'to give birth, to bring forth', ['creation', 'origin'], 0.75),

  // ── Proto-Semitic (reconstructed) ─────────────────────────────────────────
  r('ps-amn', '*ʾ-m-n', 'amin', 'psem', 'to be firm, to be trusted', ['truth', 'foundation'], 0.9),
  r('ps-hkm', '*ḥ-k-m', 'hakim', 'psem', 'to be wise', ['wisdom'], 0.9),
  r('ps-ydʿ', '*y-d-ʿ', 'yad', 'psem', 'to know', ['knowledge'], 0.85),
  r('ps-nwr', '*n-w-r', 'nawr', 'psem', 'light, fire', ['light', 'fire'], 0.9),
  r('ps-dbr', '*d-b-r', 'debar', 'psem', 'to speak, a word', ['word', 'speech'], 0.85),
  r('ps-ktb', '*k-t-b', 'katab', 'psem', 'to write', ['word', 'memory'], 0.8),
  r('ps-ʿlm', '*ʿ-l-m', 'alam', 'psem', 'hidden; and so, distant time', ['hidden', 'eternity'], 0.9),
  r('ps-zkr', '*ḏ-k-r', 'zakar', 'psem', 'to remember, to name', ['memory', 'name'], 0.85),
  r('ps-brʾ', '*b-r-ʾ', 'bar', 'psem', 'to create, to shape', ['creation'], 0.8),
  r('ps-ṣdq', '*ṣ-d-q', 'sadeq', 'psem', 'to be right, to be just', ['truth', 'law'], 0.85),

  /**
   * ── Euphonic endings ─────────────────────────────────────────────────────
   * Sound with no meaning: shapes admired for how they fall, not words. They may only
   * ever close a name, and only after a real root has said what the name means. Nothing
   * here is borrowed vocabulary from any invented language, and the scorer will not let
   * two of them meet.
   */
  r('eu-iel', '-iel', 'iel', 'euphonic', 'a soft falling close', [], 0.3),
  r('eu-ien', '-ien', 'ien', 'euphonic', 'an open, unhurried close', [], 0.3),
  r('eu-eth', '-eth', 'eth', 'euphonic', 'a quiet, breathed close', [], 0.3),
  r('eu-yr', '-yr', 'yr', 'euphonic', 'a short, cool close', [], 0.3),
  r('eu-ael', '-ael', 'ael', 'euphonic', 'a bright, held close', [], 0.3),
  r('eu-um', '-um', 'um', 'euphonic', 'a low, settled close', [], 0.3),
  r('eu-is', '-is', 'is', 'euphonic', 'a clean, closing hiss', [], 0.3),
  r('eu-on', '-on', 'on', 'euphonic', 'a rounded, final close', [], 0.3),
]

export const rootById = new Map(LEXICON.map((root) => [root.id, root]))

/** Every concept any root can answer to — used to sanity-check the concept vocabulary. */
export const LEXICON_CONCEPTS = [...new Set(LEXICON.flatMap((root) => root.concepts))].sort()
