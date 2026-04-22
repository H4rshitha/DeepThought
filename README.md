# The Daily Reflection Tree

A deterministic end-of-day reflection tool that walks an employee through a structured conversation using a decision tree. No LLM. No free text. No randomness. Every path is fully deterministic — same answers, same conversation, every time.

## Project Structure

```
/tree/
  reflection-tree.json       ← Part A: the tree data (32 nodes, 216 unique paths)
  tree-diagram.svg            ← Part A: visual Mermaid diagram

/agent/                      ← Part B: runnable web agent
  index.html                 ← Entry point
  style.css                  ← Dark-themed, calming UI  
  app.js                     ← Deterministic tree-walking engine

/transcripts/                ← Part B: sample runs
  persona-1-transcript.md    ← Victim / Entitled / Self-Centric path
  persona-2-transcript.md    ← Victor / Contributing / Altrocentric path

write-up.md                  ← Part A: design rationale (question design, branching, sources)
README.md                    ← This file
```

## The Three Axes

The tree guides reflection across three psychological axes, in sequence:

| # | Axis | Spectrum | Psychology |
|---|------|----------|------------|
| 1 | **Locus** | Victim ↔ Victor | Rotter (1966) Locus of Control; Dweck (2006) Growth Mindset |
| 2 | **Orientation** | Entitlement ↔ Contribution | Campbell et al. (2004) Psychological Entitlement; Organ (1988) OCB |
| 3 | **Radius** | Self-Centrism ↔ Altrocentrism | Maslow (1969) Self-Transcendence; Batson (2011) Empathy-Altruism |

## Reading the Tree

Open `tree/reflection-tree.json`. The tree is an array of 32 nodes. Each node has:

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier |
| `parentId` | Tree hierarchy parent (for traceability) |
| `type` | Node type: `start`, `question`, `decision`, `reflection`, `bridge`, `summary`, `end` |
| `text` | What the employee sees. May contain `{NODE_ID.answer}` interpolation. |
| `options` | For questions: array of `{ label, signal }`. For decisions: absent (uses `rules`). |
| `rules` | Decision routing: ordered rules evaluated top-to-bottom, first match wins. |
| `next` | Next node to advance to (except decisions, which use rule targets). |
| `signal` | On question options: `"axis1:internal"` tallies +1 for that pole. |

### Decision Rule Types

```
answer       — routes based on a previous question's answer
signal_dominant — routes based on which pole has the most tallies for an axis
signal_present  — routes if a specific signal has been tallied at least N times
default      — fallback route (always matches)
```

### Tree Statistics

| Metric | Count |
|--------|-------|
| Total nodes | 32 |
| Question nodes | 12 (4 per axis) |
| Decision nodes | 6 (2 per axis) |
| Reflection nodes | 9 (3 per axis) |
| Bridge nodes | 2 |
| Summary nodes | 1 |
| Start/End nodes | 2 |
| Options per question | 4 |
| Total unique paths | 216 |

## Running the Agent

The web agent loads `reflection-tree.json` via `fetch()`, so it must be served over HTTP (not opened as a file).

### Quick Start

```bash
# From the project root directory:

# Option 1: Python (most systems have this)
python -m http.server 8000

# Option 2: Node.js
npx -y serve .

# Option 3: PHP
php -S localhost:8000
```

Then open **http://localhost:8000/agent/** in your browser.

### What to Expect

1. A warm greeting opens the session
2. The tree asks 9 questions across 3 axes (with 4 options each)
3. Between each axis, a bridge text transitions the conversation
4. After each axis, a personalized reflection is shown based on accumulated signals
5. At the end, a summary synthesizes all three axes
6. The full session transcript is logged to the browser console (F12 → Console)

### Technical Details

- **Zero dependencies.** Vanilla HTML + CSS + JavaScript. No build step.
- **No API calls.** The agent loads one JSON file and runs entirely client-side.
- **Deterministic.** Same answers → identical conversation → identical summary. Always.
- **Responsive.** Works on desktop and mobile screens.

## Sample Transcripts

Two complete transcripts are in `/transcripts/`:

- **Persona 1:** Consistently external, entitled, self-focused → receives reflections about noticing agency, watching the ledger, and widening the frame
- **Persona 2:** Consistently internal, contributing, transcendent → receives reflections about skill-building through awareness, effort that compounds, and the value of holding the big picture

Both personas answer 9 questions and visit 22 nodes, but receive completely different conversations with different reflections and summaries.

## Design Principles

1. **No moralizing.** "Self-focused" isn't bad. "Transcendent" isn't good. The tree names patterns — it doesn't grade them.
2. **Options must be honest.** Every option is something a real person would genuinely say. No straw men, no obvious "correct answers."
3. **The tree is the product.** The JSON file is the deliverable. The agent is a rendering layer. Another developer could build a CLI, mobile app, or Slack bot from the same data file.
4. **Signals, not scores.** The tree tallies signals and picks the dominant pole — it doesn't compute a numerical score.
5. **Conversation, not survey.** Bridges connect the axes narratively. Reflections reference what was surfaced. The session should feel like a conversation with a thoughtful colleague, not a questionnaire.
