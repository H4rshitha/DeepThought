# Design Rationale — The Daily Reflection Tree

## Why These Questions

Every question in the tree was designed to pass one test: *Would a tired person at 7pm actually pause before answering?* If a question has an obviously "right" answer, it fails — people will click the virtuous option and learn nothing. If the options feel like a personality quiz, it fails — people disengage from anything that feels like measurement.

The opening question ("Describe today in one word") is deliberately low-stakes. It doesn't probe — it establishes a frame. The word the employee chooses tells us nothing directly about locus of control, but it sets the emotional register for everything that follows. Someone who says "Draining" needs a different conversational entry point than someone who says "Productive" — even though both will ultimately be asked about agency.

For **Axis 1 (Locus)**, I drew directly from Rotter's Internal-External (I-E) Scale (1966), which uses forced-choice pairs to surface whether someone attributes outcomes to their own actions or to external forces. Rather than abstract pairings ("People's misfortunes result from mistakes they make"), I translated the construct into concrete, workday-specific moments. The key design decision was separating the *positive-day path* from the *negative-day path*: someone who had a good day needs to be asked "what made it work?" (which can surface either preparation or luck), while someone who had a hard day needs "what was your instinct?" (which can surface either problem-solving or helplessness). Both paths converge on the same follow-up question about a specific setback, so the signal accumulates comparably regardless of the entry point.

Dweck's Growth Mindset framework (2006) informed the option design: options that frame outcomes as effort-based or strategy-based signal internal locus, while options that frame outcomes as circumstantial or talent-based signal external. I was careful to make the external options feel *legitimate* — "The right circumstances lined up" is genuinely true sometimes. The tree isn't trying to catch someone being wrong; it's surfacing a pattern.

For **Axis 2 (Orientation)**, the challenge was making entitlement visible without triggering defensiveness. Campbell et al. (2004) define psychological entitlement as a *stable belief* that one deserves more — but in a reflection tool, we can't measure stability; we can only surface a *moment*. So the questions ask about specific interactions: "Did you help someone?" vs. "Did you feel unacknowledged?" The follow-up for the entitlement path ("how does the ledger sit with you?") uses the metaphor of keeping score, which most people immediately recognize in themselves. Organ's OCB framework (1988) informed the contribution options — emphasizing discretionary, unrewarded effort.

For **Axis 3 (Radius)**, Maslow's late addition of self-transcendence (1969) provided the spectrum: from self-referential to other-aware to purpose-oriented. The critical design choice was making "Just me" a *valid, non-shaming option*. Some days, a person's frame is necessarily narrow — that's survival, not selfishness. Batson's empathy-altruism work (2011) informed the "what pulled your attention" question for the others-focused path: perspective-taking can be spontaneous, deliberate, systematic, or prompted, and each reveals something different.

## Branching Trade-offs

The tree uses a **diamond pattern** within each axis: one opening question branches into two paths (via a decision node), both paths converge on a shared second question, then a second decision routes to one of three reflections. This creates enough branching to feel personalized (the follow-up question matches your emotional framing) while keeping the tree tractable (216 total paths rather than an exponential explosion).

The key trade-off was **depth vs. breadth**. More questions per axis would produce finer-grained signal (reducing mixed/tie outcomes), but would also make the session feel like an assessment. I settled on 2 signal-producing questions per axis for Axis 1 (yielding 2 bits of signal) and 3 for Axes 2-3 (yielding 3 bits). The asymmetry is intentional: Axis 1 is the warmup — it should move faster. By Axes 2 and 3, the employee is engaged and will tolerate one more question.

Another trade-off: **per-option signals vs. per-node signals**. The sample TSV uses per-node signals (reaching a node tallies a pole). I chose per-option signals instead, because it allows *cross-path surprises*: a person on the "contribution path" who chooses "I wanted to be seen as someone who shows up" gets an entitlement signal. This prevents the tree from simply confirming the initial routing — which would make it feel like a foregone conclusion rather than a genuine probe.

Decision nodes use **ordered rule evaluation**: rules are checked top-to-bottom, first match wins. For Axis 3, I added a `signal_present` rule type to give transcendence priority — even one transcendent signal is noteworthy, since those options are the least "obvious" choices. This avoids the problem of transcendence being drowned out by a majority of self/others signals.

## Psychological Sources

| Concept | Source | How it informed the tree |
|---------|--------|--------------------------|
| Locus of Control | Rotter, J.B. (1966). *Generalized expectancies for internal versus external control of reinforcement.* Psychological Monographs, 80(1). | Internal/external option pairs; forced-choice format |
| Growth Mindset | Dweck, C.S. (2006). *Mindset: The New Psychology of Success.* Random House. | Effort/strategy-based framing; "yet" as embedded possibility |
| Psychological Entitlement | Campbell, W.K. et al. (2004). *Psychological entitlement: Interpersonal consequences and validation of a self-report measure.* Journal of Personality Assessment, 83(1). | Ledger metaphor; "deserving" vs. "contributing" framing |
| Organizational Citizenship | Organ, D.W. (1988). *Organizational Citizenship Behavior: The Good Soldier Syndrome.* Lexington Books. | Discretionary effort options; "without being asked" phrasing |
| Self-Transcendence | Maslow, A.H. (1969). *The farther reaches of human nature.* Journal of Transpersonal Psychology, 1(1). | Three-pole axis (self → others → transcendent); widening radius |
| Empathy-Altruism | Batson, C.D. (2011). *Altruism in Humans.* Oxford University Press. | Perspective-taking question design; empathy as cognition not emotion |

## What I'd Improve With More Time

1. **Temporal tracking.** The tree currently treats each session in isolation. With a simple storage layer, it could track patterns across days: "This is the third day you've leaned external on agency. Here's what that might mean over time." This would move from snapshot to trajectory — which is where the real insight lives.

2. **Sub-axis branching.** Each axis currently has one branch point. With more depth, I could distinguish between *types* of internal locus (preparation-based vs. adaptation-based) or *types* of contribution (helping vs. teaching vs. improving). This would make reflections sharper — "You tend to contribute by teaching" is more useful than "You contribute."

3. **Cross-axis conditional text.** The bridges currently use static text. With more time, I'd make bridge text reference the *specific* pole from the previous axis: "You noticed your own agency today. Now — people who see their choices clearly often also notice what they're choosing to give." This would make the three-axis progression feel genuinely cumulative rather than sequential.

4. **Anti-pattern detection.** Some option combinations reveal interesting psychological textures: someone with strong internal locus + strong entitlement ("I made this happen AND I wasn't recognized") has a qualitatively different profile than someone with external locus + entitlement. The summary could surface these combinations explicitly.

5. **Tone calibration.** The current reflections aim for "wise colleague" — but the right tone probably varies by context. A first-time user needs more warmth. A daily user needs less preamble. This could be handled with a `sessionCount` variable that adjusts bridge and reflection text.
