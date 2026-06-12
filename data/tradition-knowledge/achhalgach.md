# Achhalgach (Anchalgachchha / Vidhipaksha) Pancha Pratikramana — Tradition Knowledge Base

> **Status:** v1.0, 2026-06-07. **Authoritative system context for every per-shloka and per-vidhi translation/elaboration session.**
> This document is grounded **entirely in the authoritative printed edition** *પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત* (*Panch Pratikraman Sutra — Vidhi Sahit*), the Anchalgachchha (Vidhipaksha) edition. The machine-readable recitation tree is `data/corpus/pratikraman-structure.json`.
> When a fact is not attested by the book, this document says so explicitly. **Do not bluff; do not invent ritual placement.** The book is the single golden source.

---

## 0. The tradition and the source book

- **Tradition names (all the same gaccha):** Achhalgach, **Achalgachchha**, **Anchalgachchha** (Aanchalagaccha), and its self-designation in this book, **Vidhipaksha Gaccha** (વિધિપક્ષગચ્છ). Hindi अंचलगच्छ; Gujarati અંચલગચ્છ / અંચળગચ્છ. A Śvetāmbara Mūrtipūjaka branch.
- **Lineage:** The book names **Dādā Shri Āryarakṣitasūri** (આર્યરક્ષિતસૂરિ) — counted as the **47th paṭṭa (pontifical succession)** from **Gaṇadhara Sudharmāsvāmī** — as the *yugapradhāna* who codified the *śuddha vidhi* (pure procedure) for śrāvakas of this gaccha. **Kalyāṇasāgarasūri** (કલ્યાણસાગરસૂરિ) is the other founder-figure invoked by name in the Pakkhī Khāmaṇā. The reigning **gacchādhipati** of the day is also invoked there (by the current incumbent's name).
- **The book:** title running-header on every page is *પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત*. It is **vidhi-sahit** — i.e. it interleaves the **sūtra texts** with the **vidhi** (step-by-step ritual instructions, begin/end declarations, and "now recite X" cues). It spans **book pages 19–108**.

---

## 1. What is "Pancha Pratikramana"?

**Pratikramaṇa** = "turning back" — the ritual of reflection, confession (*ālocanā*), atonement, and renewal by which a practitioner returns from transgression to right conduct. **Pañca Pratikramaṇa** = the **five** pratikramaṇas, graded by the period of life they review:

| # | Pratikramaṇa | id in tree | Frequency | Covers | Kāyotsarga measure* |
|---|---|---|---|---|---|
| 1 | **Daivasika (Devasi)** | `devasi` | Daily, at sunset | Faults of the day | (per Devasi vidhi) |
| 2 | **Rātrika (Rāi)** | `rai` | Daily, before sunrise | Faults of the night | (per Rāi vidhi) |
| 3 | **Pākṣika (Pakkhī)** | `pakshik` | Fortnightly (chaudas) | Faults of 15 days | **12 Logassa** (300 breaths) |
| 4 | **Cāturmāsika (Cāumāsī)** | `chaumasi` | Thrice yearly (season-end) | Faults of 4 months | **20 Logassa** (500 breaths) |
| 5 | **Sāṁvatsarika (Saṁvatsarī)** | `samvatsari` | Annually (Paryushana) | Faults of the year | **40 Logassa + 1 Navkar** (1008 breaths) |

\* The breath-counts are cited **in the book itself** from **Āvaśyaka Niryukti gāthā 1532**: Pakkhī = 300 śvāsocchvāsa, Cāumāsī = 500, Sāṁvatsarī = 1008.

### 1.1 The book's own sharing model (CRITICAL — this is how the corpus is organized)

The five pratikramaṇas are **nested**, and **the book makes the sharing explicit**:

- **Devasi is the base.** The book teaches the Daivasika pratikramaṇa **in full** (book pp.19–44), printing every core sūtra once. It is also the source of the "take a sāmāyika" procedure (book pp.19–26, up to *Karemi Bhante*) and the "conclude a sāmāyika" procedure (book pp.41–44) that other observances reference by page number.
- **Rāi** reuses Devasi's core Āvaśyaka sūtras (recited per its vidhi) and adds its own material (the Kevalnāṇī bṛhat-caityavandana, the Bharahesar sajjhāy, closing maṅgala verses).
- **Pakkhī** reuses the core sūtras but swaps the **short** atichāra for the **extended** atichāra (`bruhad-atiyar`), and adds the **Aṣṭottarī Tīrthamālā**, the **two Nandī-sūtra sajjhāys**, the **nine Smaraṇas**, and the **Pakkhī Khāmaṇā**.
- **Cāumāsī and Sāṁvatsarī are defined purely by reference.** The book gives them **no separate sūtra text at all**. Verbatim instruction:
  - *Cāumāsī:* "The Cāumāsī pratikramaṇa vidhi is to be known as per the **Pākṣika**, except that wherever the word **‘પક્ખી’ (pakkhī)** occurs, say **‘ચઉમાસી’ (cāumāsī)** instead; and in place of the **12-Logassa** kāyotsarga, do a **20-Logassa** kāyotsarga. All other vidhi is as per the Pākṣika."
  - *Sāṁvatsarī:* same, with **‘પક્ખી’ → ‘સંવત્સરિ’** and the kāyotsarga becoming **40 Logassa + 1 Navkar**.

> **Consequence for translation/commentary:** Most sūtras are **shared**. A sūtra is defined **once** (see the inventory in §4 and `data/corpus/pratikraman-structure.json` → `sutras`) and **referenced** by each pratikramaṇa's `sequence`. When commenting on a shared sūtra, place it by its **role**, and note (where relevant) that the same sūtra recurs across pratikramaṇas with the pakkhī/cāumāsī/saṁvatsarī word-substitution. Never describe `chaumasi`/`samvatsari` as having independent text.

---

## 2. The six Āvaśyakas — the structural backbone

Every pratikramaṇa is built from the **six daily obligations** (*ṣaḍ-āvaśyaka*), recited in fixed order. Anchor sūtras as they appear in **this book**:

| # | Āvaśyaka (Prakrit) | Sanskrit | Function | Anchor sūtra(s) in this book |
|---|---|---|---|---|
| 1 | **Sāmāiya** | Sāmāyika | Equanimity vow | **`karemi-bhante`** (Karemi Bhante) |
| 2 | **Cauvīsattho** | Caturviṁśati-stava | Praise of the 24 Tīrthaṅkaras | **`logassa`** (Logassa) |
| 3 | **Vandanaa** | Vandanaka | Veneration of the guru | **`suguru-dwadashavarta-vandana`** (Dvādaśāvarta Vāndaṇā); also `panchindiya` (guru-sthāpanā) |
| 4 | **Paḍikkamaṇa** | Pratikramaṇa | Reflection + atonement of transgressions | **`laghu-atiyar`** (short, Devasi/Rāi) **or** **`bruhad-atiyar`** (extended, Pakkhī/Cāumāsī/Sāṁvatsarī) |
| 5 | **Kāussagga** | Kāyotsarga | Bodily abandonment / meditation | **`tassa-uttari`** + **`annattha`** (frame the kāyotsarga; counted in Logassa units) |
| 6 | **Paccakkhāṇa** | Pratyākhyāna | Renunciation/vow for the coming period | **`samayik-parvani`** (and the namukkārasahiaṁ / cauvihāra pratyākhyāna noted in the vidhi) |

The **Sajjhāy (Svādhyāya)** — sacred-study recitation — is **not** one of the six Āvaśyakas. It is performed in the **closing study-portion**. In **Devasi** the sajjhāy cluster is `drumapushpika-sajjhay` + `panch-parmeshthi-sajjhay` + `mannaha-jinanam-sajjhay`; in **Pakkhī** the sajjhāy/svādhyāya material is the two **Nandī-sūtra sajjhāys**; the **Bharahesar sajjhāy** appears in Rāi.

---

## 3. The recitation tree (per pratikramaṇa)

The authoritative, machine-readable ordering is **`data/corpus/pratikraman-structure.json`**. Summary:

### 3.1 Devasi (book pp.19–44) — the base
Maṅgalācaraṇa → **Navkar** → **Panchindiya** (guru-sthāpanā) → [adesh] → **Iriyāvahiyam → Tassa Uttari → Annattha** → [1 Logassa kāyotsarga] → **Logassa** (Āv. 2) → **Gamaṇāgamaṇo** → **Jīvarāśi** → **Aḍhāra Pāpasthānaka** → **Dravya-Kṣetra-Kāla-Bhāva** → **Karemi Bhante** (Āv. 1) → **Paḍilehaṇa (50 bol)** → **Dvādaśāvarta Vāndaṇā** (Āv. 3) → **Laghu Atiyār** (Āv. 4, short) → **Muni Vandanā** (+ Anchalgachchha paṭṭāvalī) → **Sajjhāy cluster** (Drumapuṣpikā, Pañca-Parameṣṭhi, Mannaha Jiṇāṇaṁ) → [conclude sāmāyika, Āv. 6] → **Sāmāyika Pārvānī** → colophon.

### 3.2 Rāi (book pp.44–54)
Rāi vidhi → **Kevalnāṇī Bṛhat Caityavandana** → **Bharahesar Sajjhāy** → **Maṅgalācaraṇa verses** (*Maṅgalaṁ Bhagavān Vīro…*) → colophon. (Core Āvaśyaka sūtras shared from Devasi.)

### 3.3 Pakkhī (book pp.54–103)
Pakkhī opening → **Bṛhad Atiyār** (Āv. 4, extended: 5 aṇuvrata + 3 guṇavrata + 4 śikṣāvrata) → **Aṣṭottarī Tīrthamālā** (108 tīrthas, by Mahendrasinhasūri) → **Nandī-sūtra Pratham Sajjhāy** (24 gāthās) → **Nandī-sūtra Dvitīya Sajjhāy** → **Nine Smaraṇas** (see §3.5) → **Pakkhī Khāmaṇā** → colophon. (Core Āvaśyaka sūtras shared from Devasi.)

### 3.4 Cāumāsī (book p.103) & Sāṁvatsarī (book p.104)
**No independent text.** = Pakkhī with the word-substitution and kāyotsarga override in §1.1.

### 3.5 The Nine Smaraṇas (Nava Smaraṇa) — within Pakkhī
A fixed set of nine protective stotras, printed and numbered in the book:

| # | Smaraṇa | sutraId | Author named in book |
|---|---|---|---|
| 1 | Bṛhannamaskāra | `smaran-1-bruhannamaskar` | "pūrva-sūris" |
| 2 | Ajitaśānti Stava | `smaran-2-ajitshanti` | Nandiṣeṇasūri |
| 3 | Vīrastava | `smaran-3-virstava` | — |
| 4 | Upasargahara Stotra | `smaran-4-upasargahar` | (to Pārśvanātha) |
| 5 | Namiūṇa Bhayahara Stotra | `smaran-5-namiun-bhayahar` | (to Pārśvanātha) |
| 6 | Jīrāpallī Pārśva Stava | `smaran-6-jirapalli-parshva` | Merutuṅgasūri |
| 7 | Śakrastava (Namuthuṇaṁ) | `smaran-7-shakrastava` | — |
| 8 | Laghu Ajitaśānti Stava | `smaran-8-laghu-ajitshanti` | Vīragaṇin |
| 9 | Bṛhad Ajitaśānti Stava | `smaran-9-bruhad-ajitshanti` | — |

### 3.6 Appendix observances (book pp.104–108)
**Sāmāyika leva/pārvānī vidhi** and the **Deśāvagāśika** (10th lay vow) procedure with its two pratyākhyānas (`deshavagasik-pachchakkhan`, `deshavagasik-samayik-pachchakkhan`). These reference the Devasi sāmāyika pages with word-substitution; they are **not** pratikramaṇas.

---

## 4. Sūtra inventory (verified from the book; ids match the structure tree)

> Full metadata (native name, page anchors, gāthā counts, `usedIn`) is in `data/corpus/pratikraman-structure.json`. Roles below; **treat any sūtra not listed as role-unknown and do not invent placement.**

| sutraId | Name | Role / core meaning |
|---|---|---|
| `navkar` | નવકાર મહામંત્ર | Universal namaskāra to the five Parameṣṭhins |
| `panchindiya` | પંચિંદિય | Guru's 36 attributes; guru-sthāpanā |
| `iriyavahiyam` | ઇરિયાવહિયં | Confession (micchāmi dukkaḍaṁ) for harm to jīvas while moving |
| `tassa-uttari` | તસ્સ ઉત્તરી | Resolve to purify via kāyotsarga |
| `annattha` | અન્નત્થ | Permitted exceptions that do not break kāyotsarga |
| `logassa` | લોગસ્સ | Praise of the 24 Tīrthaṅkaras (Āv. 2); kāyotsarga unit |
| `gamanagamano` | ગમણાગમણો | Faults of coming/going |
| `jivrashi` | જીવરાશિ | Classes of living beings |
| `adhar-papsthanak` | અઢાર પાપસ્થાનક | The 18 sources of sin |
| `dravya-kshetra-kaal-bhav` | દ્રવ્ય ક્ષેત્ર કાલ ભાવ | Four-fold scope declaration for a vow |
| `karemi-bhante` | કરેમિ ભંતે | The sāmāyika (equanimity) vow (Āv. 1) |
| `padilehana` | પડિલેહણ વિધિ (૫૦ બોલ) | 50-point inspection of cloth/body |
| `suguru-dwadashavarta-vandana` | દ્વાદશાવર્ત વાંદણા | Twelve-gesture guru-veneration (Āv. 3) |
| `laghu-atiyar` | લઘુ અતિયાર | **Short** confession of the 12 lay-vow transgressions (Āv. 4; Devasi/Rāi) |
| `bruhad-atiyar` | બૃહદ્ અતિયાર | **Extended** confession of the 12 lay-vow transgressions (Āv. 4; Pakkhī/Cāumāsī/Sāṁvatsarī) |
| `muni-vandana` | ગુરુવંદના (મુનિ વંદના) | Salutation to munis + Anchalgachchha paṭṭāvalī |
| `drumapushpika-sajjhay` | દ્રુમપુષ્પિકા સજ્ઝાય | Dashavaikālika ch.1, as svādhyāya |
| `panch-parmeshthi-sajjhay` | પંચ પરમેષ્ઠિ સજ્ઝાય | Svādhyāya on the five Parameṣṭhins |
| `mannaha-jinanam-sajjhay` | મન્નહ જિણાણં સજ્ઝાય | The śrāvaka's daily duties |
| `samayik-parvani` | સામાયિક પારવાની ગાથા/સૂત્ર | Concludes the 48-min sāmāyika (Āv. 6) |
| `kevalnani-chaityavandan` | કેવલનાણી બૃહત્ ચૈત્યવંદન | Extended caityavandana (by Vācak Mūlā) — Rāi |
| `bharahesar-sajjhay` | ભરહેસરની સજ્ઝાય | Litany of exemplary monks & satīs — Rāi |
| `rai-mangalacharan` | મંગલાચરણ (મંગલં ભગવાન વીરો) | Closing auspicious verses — Rāi |
| `ashtottari-tirthmala` | અષ્ટોત્તરી તીર્થમાળા | 108 tīrthas, by Mahendrasinhasūri — Pakkhī |
| `nandisutrani-pratham-sajay` | નંદીસૂત્રની પ્રથમ સજ્ઝાય | **24 gāthās**, Nandī-sūtra extract — Pakkhī svādhyāya |
| `nandisutrani-dvitiya-sajay` | નંદીસૂત્રની દ્વિતીય સજ્ઝાય | Second Nandī-sūtra extract — Pakkhī svādhyāya |
| `smaran-1..9-*` | નવ સ્મરણ | The nine protective stotras (see §3.5) — Pakkhī |
| `pakkhi-khamana` | પક્ખી ખામણા | Mutual forgiveness; names the gaccha founders — Pakkhī/Cāumāsī/Sāṁvatsarī |
| `deshavagasik-pachchakkhan` | દેશાવગાશિક પચ્ચખ્ખાણ | Pratyākhyāna of the 10th lay vow — appendix |
| `deshavagasik-samayik-pachchakkhan` | દેશાવગાશિક સામાયિક પચ્ચખ્ખાણ | Karemi-bhante adapted for deśāvagāśika — appendix |


---

## 5. Vidhi (procedural connective text) — what it is and how to translate it

Between the sūtras the book prints **vidhi**: the stage-directions of the ritual. Two recurring forms:

1. **Begin/end declarations (ādeśa dialogues).** A call-and-response between disciple and guru, e.g.:
   *"Icchākāreṇa saṁdisaha bhagavan! Iriyāvahiyaṁ paḍikkamāmi?"* — (guru) *"Paḍikkameh:"* — (disciple) *"Icchaṁ"* — then recites the named sūtra.
   These declare the **start** ("…paḍikkamāmi?", "…karuṁ?") and **completion** ("…ṭhāuṁ", "…pāruṁ") of each unit.
2. **"Now recite X" cues and counts** — e.g. "do one Logassa kāyotsarga up to *chandesu nimmalayara*", "now recite Panchindiya", substitution rules (devasi→rāi→pakkhī→cāumāsī→saṁvatsarī).

**Translation policy for vidhi:** vidhi is **procedural**, not a verse. Render an **idiomatic translation + a short plain-language explanation** in each of the three target languages. Keep ritual terms (*ādeśa, kāyotsarga, khamāsamaṇa*) transliterated with a parenthetical gloss. **Do NOT** give vidhi the full word-by-word treatment used for sūtras; do **not** invent steps not present in the native text.

---

## 6. Doctrinal themes recurring across the corpus

- **The four-fold Saṅgha** (sādhu, sādhvī, śrāvaka, śrāvikā) — celebrated in the Nandī-sūtra sajjhāy as a **city** (*saṅgha-nagara*: gaṇa-bhavana ramparts, śruta-ratna treasure, samyag-darśana streets, akhaṇḍa-cāritra walls), a **chariot** (*saṅgha-ratha*: śīla banner, tapa-niyama horses, sajjhāya-nandi-ghoṣa peal), a **wheel** (*saṅgha-cakra*), a **lotus** (*saṅgha-paüma*), the **moon** and the **ocean**.
- **The twelve lay vows (bāra vrata)** — 5 aṇuvrata + 3 guṇavrata + 4 śikṣāvrata — whose atichāras (transgressions) are confessed in `laghu-atiyar` (short) and `bruhad-atiyar` (extended). The Deśāvagāśika is the **10th** vow.
- **The eighteen pāpa-sthānaka** (`adhar-papsthanak`) — the 18 sources of sin.
- **Kāyotsarga** technique — bodily stillness measured in Logassa-counts (300/500/1008 breaths for pakkhī/cāumāsī/saṁvatsarī).
- **The 24 Tīrthaṅkaras** — praised in `logassa`; Mahāvīra as the last (*apaścima*); Ṛṣabha first.
- **Pilgrimage devotion** — the Aṣṭottarī Tīrthamālā's 108 tīrthas.
- **Protective recitation** — the Nine Smaraṇas (Ajitaśānti, Upasargahara, Namiūṇa, etc.) for removal of fear, affliction, disease.
- **Lineage devotion** — the Anchalgachchha paṭṭāvalī (`muni-vandana`) and the Pakkhī Khāmaṇā's invocation of Āryarakṣitasūri and Kalyāṇasāgarasūri.

---

## 7. Orthography & fidelity rules (book-specific, verified)

The book is the golden source; **preserve its readings verbatim** — including its internal inconsistencies. Verified examples to honor (do **not** normalize):

- **"Atichāra" is spelled `અતિયાર` (with ય), not `અતિચાર`** throughout this book.
- Doubled vs single conjuncts vary by occurrence: `ચઉવ્વીસંપિ` (p4) vs `ચઉવીસંપિ` (p5); `અપ્કાય` vs `અપૂકાય`; `કાઉસગ્ગ` vs `કાઉસ્સગ્ગ`; `સિજ્જાય` vs `સિજ્ઝાય`; `પચ્ચખાણ` vs `પચ્ચખ્ખાણ`. All verbatim.
- Long vs short mātrās are exact: e.g. `ધૂય` (long ū) and `પડાગુ` in the Nandī sajjhāy. The **book** is authoritative for every mātrā, anusvāra, and conjunct.
- Spaced bars `॥ ૧ ॥` and book punctuation (periods before verse numbers, etc.) are part of the text.
- Page-bottom **footnotes** are mostly *pāṭhāntare* (variant readings) and clarifications, captured verbatim — **not** errata to silently apply.

---

## 8. Style guidance for translation + elaboration sessions

- Place every sūtra by its **role and pratikramaṇa** as given in §3–§4 and the structure tree. Do **not** call any sūtra "the first utterance of the ritual" unless it actually is (the maṅgalācaraṇa / Navkar opens Devasi).
- Treat **sajjhāy** as study-recitation, not as an Āvaśyaka.
- For **shared sūtras**, note (briefly, where relevant) that the same text recurs across pratikramaṇas with the pakkhī/cāumāsī/saṁvatsarī word-substitution; never imply cāumāsī/saṁvatsarī have separate text.
- Ground every doctrinal claim in this document or in the verifiable shloka text. If a needed fact is absent here, mark it uncertain in `notes` rather than inventing it.
- Cite only **verifiable** dictionaries/editions in `sources`. Do not hallucinate citations.
- When the shloka text itself is uncertain, flag it in `notes`.

---

## 9. References to consult / add when verified

- The source book itself: *પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત* (Anchalgachchha/Vidhipaksha ed.), source text at `data/book/panch-pratikraman.full.md`.
- *Nandī-sūtra* (Mūlasūtra), Devardhigaṇi Kṣamāśramaṇa redaction — for the Pratham/Dvitīya Sajjhāy.
- *Dashavaikālika-sūtra* ch. 1 (Drumapuṣpikā) — for `drumapushpika-sajjhay`.
- *Āvaśyaka Niryukti* (g.1532 cited in-book for the kāyotsarga breath-counts).
- Sheth, *Pāia-sadda-mahaṇṇavo* (Prakrit dictionary); Cologne Digital Sanskrit Lexicon — for word-by-word glosses.
- Anchalgachchha publications on Āryarakṣitasūri & Kalyāṇasāgarasūri — for lineage facts.
- *(Add stable URLs only as verified.)*
