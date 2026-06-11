import type { Pratikraman, SequenceStep, VidhiStep } from './types'

/**
 * Provenance of a step within a composed (full) recitation sequence:
 * - `base`     — a step of a base rite that defines its own full sequence (Devasi).
 * - `shared`   — a core sūtra/vidhi recited as in the base rite (the shared Āvaśyaka foundation).
 * - `specific` — a step unique to THIS rite (the delta to highlight).
 * - `inherited`— a step carried wholesale from the base rite of a by-reference rite
 *                (Cāumāsī/Sāṁvatsarī = Pākṣika); the delta there is the word-substitution + kāyotsarga.
 */
export type Provenance = 'base' | 'shared' | 'specific' | 'inherited'

export interface ComposedStep {
  step: SequenceStep
  provenance: Provenance
  /** For `shared`/`inherited`: the rite id this step is recited as-in. */
  from?: string
}

export interface ComposedSequence {
  steps: ComposedStep[]
  kind: 'base' | 'derived' | 'reference'
  /** The base rite this one builds on (for derived/reference rites). */
  baseId?: string
  /** Word-substitution + kāyotsarga override (reference rites only). */
  overrides?: Pratikraman['overrides']
  counts: { sutras: number; vidhis: number }
}

const isSutra = (s: SequenceStep): s is Extract<SequenceStep, { type: 'sutra' }> => s.type === 'sutra'

/**
 * The shared "conclude-samayika" frame of a base rite — the 6th Āvaśyaka (Paccakkhāṇa): the
 * concluding vidhi (avashyaka === 6) plus its anchor sūtra (Sāmāyika Pārvānī), up to but excluding
 * the base's own colophon. The book grounds this explicitly: the Rāi pratikramaṇa's printed vidhi
 * (book p.54) ends with "…conclude the samayika exactly as the procedure given in the Devasi
 * pratikramaṇa," and the appendix lists the conclude-samayika (book pp.41–44) as a shared, referenced
 * sub-procedure. Every samayika-based rite therefore closes with this frame (recited as in the base),
 * even though the book references rather than reprints it. Reuses existing data — nothing invented.
 */
function baseClosingFrame(base: Pratikraman): SequenceStep[] {
  const seq = base.sequence
  const av6 = seq.findIndex((s) => s.type === 'vidhi' && (s as VidhiStep).avashyaka === 6)
  if (av6 < 0) return []
  const frame: SequenceStep[] = []
  for (let i = av6; i < seq.length; i++) {
    const s = seq[i]
    // Stop at the base's own colophon: a trailing vidhi (not Āv-6) once a sūtra is already captured.
    if (s.type === 'vidhi' && (s as VidhiStep).avashyaka !== 6 && frame.some((f) => f.type === 'sutra')) break
    frame.push(s)
  }
  return frame
}

function counts(steps: ComposedStep[]) {
  return {
    sutras: steps.filter((s) => s.step.type === 'sutra').length,
    vidhis: steps.filter((s) => s.step.type === 'vidhi').length,
  }
}

/**
 * Compose the COMPLETE ordered recitation sequence for any pratikramaṇa, so every rite shows
 * the full vidhi + sūtras to recite — not just its delta. Honest about ritual order: a derived
 * rite is rendered as [its own opening vidhi] → [the shared Āvaśyaka foundation from its base, in
 * the base's canonical order] → [its specific body + colophon]. The shared foundation includes the
 * base's inter-sūtra ādeśa vidhi (which sit between two shared sūtras), matching the book's own
 * "core Āvaśyaka sūtras shared from <base>, recited per its vidhi". No interleave is invented.
 */
export function composeSequence(p: Pratikraman, all: Pratikraman[]): ComposedSequence {
  // Base rite (Devasi): its own sequence is already the full thing.
  if (p.sequence.length > 0 && !p.sharedFrom) {
    const steps = p.sequence.map<ComposedStep>((step) => ({ step, provenance: 'base' }))
    return { steps, kind: 'base', counts: counts(steps) }
  }

  // Derived rite (Rāi, Pākṣika): shared foundation + own body.
  if (p.sharedFrom) {
    const base = all.find((x) => x.id === p.sharedFrom!.pratikraman)
    const sharedSutras = new Set(p.sharedFrom.sutras)
    const foundation: ComposedStep[] = []

    if (base) {
      const seq = base.sequence
      const sharedIdx = seq
        .map((s, i) => (isSutra(s) && sharedSutras.has(s.sutraId) ? i : -1))
        .filter((i) => i >= 0)
      if (sharedIdx.length) {
        const first = sharedIdx[0]
        const last = sharedIdx[sharedIdx.length - 1]
        // The book directs each derived rite to "follow ALL the Devasi procedure up to the [shared
        // endpoint]" — so keep every step in the span (each sūtra AND the inter-sūtra ādeśa vidhi),
        // not only the subset named in sharedFrom.sutras. This restores the full opening run through
        // the 3rd Āvaśyaka vāndaṇā: gamaṇāgamaṇo, jīvarāśi, aḍhāra-pāpasthānaka, dravya-kṣetra-kāla-
        // bhāva, paḍilehaṇa, etc. The span endpoint (Rāi → laghu-atiyār / Av 4; Pākṣika → suguru
        // vāndaṇā / Av 3) is itself book-accurate, so non-shared replacements stay excluded.
        for (let i = first; i <= last; i++) {
          foundation.push({ step: seq[i], provenance: 'shared', from: base.id })
        }
      }
    }

    // Split the rite's own sequence: leading vidhi = its opening; trailing vidhi = its colophon;
    // the middle is the rite-specific body.
    const body = [...p.sequence]
    const lead: SequenceStep[] = []
    while (body.length && body[0].type === 'vidhi') lead.push(body.shift()!)
    const colophon: SequenceStep[] = []
    while (body.length && body[body.length - 1].type === 'vidhi') colophon.unshift(body.pop()!)

    // The shared conclude-samayika frame (Āv 6), for rites that open a samayika (share karemi-bhante).
    // Placed after the rite-specific body and before the colophon, exactly as the book directs.
    const closing: ComposedStep[] =
      base && sharedSutras.has('karemi-bhante')
        ? baseClosingFrame(base).map((step) => ({ step, provenance: 'shared', from: base.id }))
        : []

    const steps: ComposedStep[] = [
      ...lead.map<ComposedStep>((step) => ({ step, provenance: 'specific' })),
      ...foundation,
      ...body.map<ComposedStep>((step) => ({ step, provenance: 'specific' })),
      ...closing,
      ...colophon.map<ComposedStep>((step) => ({ step, provenance: 'specific' })),
    ]
    return { steps, kind: 'derived', baseId: base?.id, counts: counts(steps) }
  }

  // By-reference rite (Cāumāsī, Sāṁvatsarī): the full base sequence, inherited, + overrides banner.
  if (p.basedOn) {
    const base = all.find((x) => x.id === p.basedOn)
    if (base) {
      const composedBase = composeSequence(base, all)
      const steps = composedBase.steps.map<ComposedStep>(({ step }) => ({
        step,
        provenance: 'inherited',
        from: base.id,
      }))
      return { steps, kind: 'reference', baseId: base.id, overrides: p.overrides, counts: counts(steps) }
    }
  }

  // Fallback: whatever own sequence exists.
  const steps = p.sequence.map<ComposedStep>((step) => ({ step, provenance: 'base' }))
  return { steps, kind: 'base', counts: counts(steps) }
}
