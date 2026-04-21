/**
 * The Daily Reflection Tree — Agent Engine
 * 
 * A deterministic tree-walking engine that:
 * 1. Loads the reflection tree from a JSON data file
 * 2. Walks nodes sequentially — renders each, waits for input at questions
 * 3. Branches deterministically based on answers and accumulated signals
 * 4. Interpolates reflection text with earlier answers
 * 5. Produces an end-of-session summary
 * 
 * No LLM. No randomness. No API calls. Pure data-driven navigation.
 */

(function () {
    'use strict';

    // ─── State ─────────────────────────────────────────────────────────
    const state = {
        tree: null,           // loaded tree data
        nodeMap: {},          // quick lookup: id → node
        answers: {},          // nodeId → selected option label
        signals: {},          // "axis1:internal" → count
        currentNodeId: null,
        history: [],          // ordered list of visited node IDs
        reflections: {},      // axisId → { pole, text } — which reflection was shown
    };

    // ─── DOM References ────────────────────────────────────────────────
    const contentArea = document.getElementById('content-area');
    const progressBar = document.getElementById('progress-bar');
    const sessionFooter = document.getElementById('session-footer');
    const sessionDate = document.getElementById('session-date');

    // ─── Initialization ────────────────────────────────────────────────
    async function init() {
        try {
            const response = await fetch('../tree/reflection-tree.json');
            if (!response.ok) throw new Error(`Failed to load tree: ${response.status}`);
            state.tree = await response.json();

            // Build node lookup map
            state.tree.nodes.forEach(node => {
                state.nodeMap[node.id] = node;
            });

            // Set session date
            const now = new Date();
            const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            sessionDate.textContent = now.toLocaleDateString('en-US', opts);

            // Brief loading delay for polish
            await sleep(1200);

            // Start the tree
            processNode('START');
        } catch (err) {
            console.error('Initialization failed:', err);
            contentArea.innerHTML = `
                <div class="node-card node-start">
                    <span class="greeting-icon">⚠️</span>
                    <p class="greeting-text">
                        Could not load the reflection tree. 
                        Please ensure you're running this via a local HTTP server 
                        (e.g., <code>python -m http.server 8000</code> from the project root).
                    </p>
                </div>
            `;
        }
    }

    // ─── Node Processor ────────────────────────────────────────────────
    async function processNode(nodeId) {
        const node = state.nodeMap[nodeId];
        if (!node) {
            console.error(`Node not found: ${nodeId}`);
            return;
        }

        state.currentNodeId = nodeId;
        state.history.push(nodeId);
        updateProgress(node);

        switch (node.type) {
            case 'start':
                await renderStart(node);
                break;
            case 'question':
                await renderQuestion(node);
                break;
            case 'decision':
                await processDecision(node);
                break;
            case 'reflection':
                await renderReflection(node);
                break;
            case 'bridge':
                await renderBridge(node);
                break;
            case 'summary':
                await renderSummary(node);
                break;
            case 'end':
                await renderEnd(node);
                break;
            default:
                console.warn(`Unknown node type: ${node.type}`);
                if (node.next) processNode(node.next);
        }
    }

    // ─── Renderers ─────────────────────────────────────────────────────

    /**
     * START node — greeting, auto-advances
     */
    async function renderStart(node) {
        sessionFooter.classList.remove('hidden');

        const html = `
            <div class="node-card node-start" id="node-${node.id}">
                <span class="greeting-icon">🌙</span>
                <p class="greeting-text">${interpolate(node.text)}</p>
            </div>
        `;

        await transitionContent(html);
        await sleep(3000);

        if (node.next) {
            await exitCurrent();
            processNode(node.next);
        }
    }

    /**
     * QUESTION node — shows options, waits for selection
     */
    async function renderQuestion(node) {
        progressBar.classList.remove('hidden');

        const markers = ['A', 'B', 'C', 'D', 'E'];
        const optionsHtml = node.options.map((opt, i) => `
            <button class="option-btn" 
                    id="opt-${node.id}-${i}" 
                    data-node-id="${node.id}" 
                    data-option-index="${i}"
                    data-option-label="${escapeAttr(opt.label)}"
                    data-option-signal="${opt.signal || ''}">
                <span class="option-marker">${markers[i] || i + 1}</span>
                <span class="option-label">${opt.label}</span>
            </button>
        `).join('');

        const html = `
            <div class="node-card node-question" id="node-${node.id}">
                <p class="question-text">${interpolate(node.text)}</p>
                <div class="options-grid" id="options-${node.id}">
                    ${optionsHtml}
                </div>
            </div>
        `;

        await transitionContent(html);

        // Wait for option selection
        return new Promise(resolve => {
            const optionsContainer = document.getElementById(`options-${node.id}`);
            optionsContainer.addEventListener('click', async function handler(e) {
                const btn = e.target.closest('.option-btn');
                if (!btn) return;

                // Prevent double-clicks
                optionsContainer.removeEventListener('click', handler);

                // Visual feedback
                btn.classList.add('selected');
                const allBtns = optionsContainer.querySelectorAll('.option-btn');
                allBtns.forEach(b => {
                    if (b !== btn) {
                        b.style.opacity = '0.4';
                        b.style.pointerEvents = 'none';
                    }
                });

                // Record answer
                const label = btn.dataset.optionLabel;
                const signal = btn.dataset.optionSignal;
                state.answers[node.id] = label;

                // Record signal
                if (signal) {
                    tallySignal(signal);
                }

                // Brief pause for visual feedback
                await sleep(600);

                // Advance
                if (node.next) {
                    await exitCurrent();
                    processNode(node.next);
                }

                resolve();
            });
        });
    }

    /**
     * DECISION node — invisible routing, auto-advances
     */
    async function processDecision(node) {
        const nextNodeId = evaluateRules(node.rules);
        if (nextNodeId) {
            processNode(nextNodeId);
        } else {
            console.error(`Decision node ${node.id} could not resolve a target`);
        }
    }

    /**
     * REFLECTION node — shows insight, waits for Continue
     */
    async function renderReflection(node) {
        // Store which reflection was shown for this axis
        if (node.axis) {
            state.reflections[node.axis] = {
                pole: node.pole,
                text: node.text
            };
        }

        const html = `
            <div class="node-card node-reflection" id="node-${node.id}">
                <span class="reflection-icon">✦</span>
                <div class="reflection-text">
                    ${interpolate(node.text)}
                </div>
                <button class="continue-btn" id="continue-${node.id}">
                    Continue <span class="arrow">→</span>
                </button>
            </div>
        `;

        await transitionContent(html);

        // Wait for continue click
        return new Promise(resolve => {
            const btn = document.getElementById(`continue-${node.id}`);
            btn.addEventListener('click', async function handler() {
                btn.removeEventListener('click', handler);

                if (node.next) {
                    await exitCurrent();
                    processNode(node.next);
                }
                resolve();
            }, { once: true });
        });
    }

    /**
     * BRIDGE node — transition text, auto-advances
     */
    async function renderBridge(node) {
        const html = `
            <div class="node-card node-bridge" id="node-${node.id}">
                <div class="bridge-divider">
                    <div class="bridge-line"></div>
                    <div class="bridge-dot"></div>
                    <div class="bridge-line"></div>
                </div>
                <p class="bridge-text">${interpolate(node.text)}</p>
            </div>
        `;

        await transitionContent(html);
        await sleep(2500);

        if (node.next) {
            await exitCurrent();
            processNode(node.next);
        }
    }

    /**
     * SUMMARY node — end-of-session synthesis
     */
    async function renderSummary(node) {
        const templates = node.templates;

        // Determine dominant pole for each axis
        const axis1Dom = getDominant('axis1', ['internal', 'external']);
        const axis2Dom = getDominant('axis2', ['contribution', 'entitlement']);
        const axis3Dom = getDominantAxis3();

        // Build axis cards
        const axisCards = [
            { axis: 'axis1', label: templates.axis1.label, pole: axis1Dom, text: templates.axis1[axis1Dom] },
            { axis: 'axis2', label: templates.axis2.label, pole: axis2Dom, text: templates.axis2[axis2Dom] },
            { axis: 'axis3', label: templates.axis3.label, pole: axis3Dom, text: templates.axis3[axis3Dom] },
        ];

        const cardsHtml = axisCards.map(card => `
            <div class="summary-axis-card ${card.axis}">
                <div class="summary-axis-label">${card.label}</div>
                <div class="summary-axis-pole">Leaning: ${formatPole(card.pole)}</div>
                <div class="summary-axis-text">${card.text}</div>
            </div>
        `).join('');

        const html = `
            <div class="node-card node-summary" id="node-${node.id}">
                <h2 class="summary-header">${interpolate(node.text)}</h2>
                <div class="summary-axes">
                    ${cardsHtml}
                </div>
                <div class="summary-closing">
                    ${templates.closing}
                </div>
                <div class="summary-continue">
                    <button class="continue-btn" id="continue-${node.id}">
                        Finish <span class="arrow">→</span>
                    </button>
                </div>
            </div>
        `;

        await transitionContent(html);

        // Wait for continue
        return new Promise(resolve => {
            const btn = document.getElementById(`continue-${node.id}`);
            btn.addEventListener('click', async function handler() {
                btn.removeEventListener('click', handler);
                if (node.next) {
                    await exitCurrent();
                    processNode(node.next);
                }
                resolve();
            }, { once: true });
        });
    }

    /**
     * END node — closing message
     */
    async function renderEnd(node) {
        progressBar.classList.add('hidden');

        const html = `
            <div class="node-card node-end" id="node-${node.id}">
                <span class="end-icon">🌙</span>
                <p class="end-text">${interpolate(node.text)}</p>
                <button class="restart-btn" id="restart-btn">
                    Start a new session
                </button>
            </div>
        `;

        await transitionContent(html);

        // Log the full session to console for transcript purposes
        logSessionTranscript();

        // Restart button
        document.getElementById('restart-btn').addEventListener('click', () => {
            resetState();
            processNode('START');
        });
    }

    // ─── Rule Evaluation ───────────────────────────────────────────────

    /**
     * Evaluate decision rules in order, return the first matching target
     */
    function evaluateRules(rules) {
        for (const rule of rules) {
            switch (rule.type) {
                case 'answer': {
                    const answer = state.answers[rule.ref];
                    if (answer && rule.match.includes(answer)) {
                        return rule.next;
                    }
                    break;
                }
                case 'signal_dominant': {
                    const dominant = getDominant(rule.axis,
                        Object.keys(getAxisTallies(rule.axis)));
                    if (dominant === rule.value) {
                        return rule.next;
                    }
                    break;
                }
                case 'signal_present': {
                    const count = state.signals[rule.signal] || 0;
                    if (count >= (rule.min || 1)) {
                        return rule.next;
                    }
                    break;
                }
                case 'default': {
                    return rule.next;
                }
            }
        }
        // Fallback: return last rule's target
        return rules[rules.length - 1]?.next || null;
    }

    // ─── Signal System ─────────────────────────────────────────────────

    /**
     * Tally a signal: "axis1:internal" → state.signals["axis1:internal"] += 1
     */
    function tallySignal(signal) {
        state.signals[signal] = (state.signals[signal] || 0) + 1;
    }

    /**
     * Get all tallies for an axis: { internal: 2, external: 1 }
     */
    function getAxisTallies(axis) {
        const tallies = {};
        for (const [key, count] of Object.entries(state.signals)) {
            if (key.startsWith(axis + ':')) {
                const pole = key.split(':')[1];
                tallies[pole] = count;
            }
        }
        return tallies;
    }

    /**
     * Get the dominant pole for an axis (highest tally)
     * Returns 'mixed' if tied
     */
    function getDominant(axis, poles) {
        const tallies = getAxisTallies(axis);
        let maxCount = 0;
        let maxPole = null;
        let tied = false;

        for (const pole of poles) {
            const count = tallies[pole] || 0;
            if (count > maxCount) {
                maxCount = count;
                maxPole = pole;
                tied = false;
            } else if (count === maxCount && count > 0) {
                tied = true;
            }
        }

        if (maxCount === 0 || tied) return 'mixed';
        return maxPole;
    }

    /**
     * Special dominant logic for Axis 3 (has 3 poles + transcendent priority)
     */
    function getDominantAxis3() {
        const tallies = getAxisTallies('axis3');
        const transcendent = tallies['transcendent'] || 0;
        const others = tallies['others'] || 0;
        const self = tallies['self'] || 0;

        // Transcendent takes priority if present
        if (transcendent >= 1 && transcendent >= others && transcendent >= self) {
            return 'transcendent';
        }
        if (others > self) return 'others';
        if (self > others) return 'self';
        // Tie: if transcendent exists at all, lean transcendent
        if (transcendent >= 1) return 'transcendent';
        if (others > 0) return 'others';
        return 'self';
    }

    // ─── Text Interpolation ────────────────────────────────────────────

    /**
     * Replace {NODE_ID.answer} placeholders with actual stored answers
     */
    function interpolate(text) {
        if (!text) return '';
        return text.replace(/\{(\w+)\.answer\}/g, (match, nodeId) => {
            const answer = state.answers[nodeId];
            if (answer) {
                return `<span class="interpolated">${answer}</span>`;
            }
            return match; // Leave placeholder if not yet answered
        });
    }

    // ─── Progress Bar ──────────────────────────────────────────────────

    function updateProgress(node) {
        const seg1 = document.getElementById('seg-axis1');
        const seg2 = document.getElementById('seg-axis2');
        const seg3 = document.getElementById('seg-axis3');

        // Determine which axis we're in based on node ID
        const id = node.id || '';

        if (id.startsWith('A3') || id === 'BRIDGE_2_3') {
            seg1.className = 'progress-segment completed';
            seg2.className = 'progress-segment completed';
            seg3.className = 'progress-segment active';
        } else if (id.startsWith('A2') || id === 'BRIDGE_1_2') {
            seg1.className = 'progress-segment completed';
            seg2.className = 'progress-segment active';
            seg3.className = 'progress-segment';
        } else if (id.startsWith('A1')) {
            seg1.className = 'progress-segment active';
            seg2.className = 'progress-segment';
            seg3.className = 'progress-segment';
        } else if (id === 'SUMMARY' || id === 'END') {
            seg1.className = 'progress-segment completed';
            seg2.className = 'progress-segment completed';
            seg3.className = 'progress-segment completed';
        }
    }

    // ─── DOM Transitions ───────────────────────────────────────────────

    async function transitionContent(newHtml) {
        contentArea.innerHTML = newHtml;
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function exitCurrent() {
        const currentCard = contentArea.querySelector('.node-card');
        if (currentCard) {
            currentCard.classList.add('exiting');
            await sleep(350);
        }
    }

    // ─── Utilities ─────────────────────────────────────────────────────

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatPole(pole) {
        const labels = {
            'internal': 'Internal Locus (Victor)',
            'external': 'External Locus (Victim)',
            'mixed': 'Balanced',
            'contribution': 'Contribution-Oriented',
            'entitlement': 'Entitlement-Aware',
            'self': 'Self-Focused',
            'others': 'Other-Aware',
            'transcendent': 'Transcendent'
        };
        return labels[pole] || pole;
    }

    function resetState() {
        state.answers = {};
        state.signals = {};
        state.currentNodeId = null;
        state.history = [];
        state.reflections = {};
    }

    // ─── Transcript Logger ─────────────────────────────────────────────

    function logSessionTranscript() {
        console.log('\n══════════════════════════════════════════');
        console.log('  SESSION TRANSCRIPT');
        console.log('══════════════════════════════════════════\n');

        for (const nodeId of state.history) {
            const node = state.nodeMap[nodeId];
            if (!node) continue;

            switch (node.type) {
                case 'start':
                    console.log(`[Start] ${stripHtml(node.text)}`);
                    console.log('');
                    break;
                case 'question':
                    console.log(`[Question: ${nodeId}]`);
                    console.log(`  "${stripHtml(interpolateRaw(node.text))}"`);
                    const answer = state.answers[nodeId];
                    if (answer) {
                        console.log(`  ➤ Selected: "${answer}"`);
                        const opt = node.options.find(o => o.label === answer);
                        if (opt?.signal) console.log(`    Signal: ${opt.signal}`);
                    }
                    console.log('');
                    break;
                case 'decision':
                    // Silent in transcript
                    break;
                case 'reflection':
                    console.log(`[Reflection: ${nodeId}]`);
                    console.log(`  "${stripHtml(interpolateRaw(node.text))}"`);
                    console.log('');
                    break;
                case 'bridge':
                    console.log(`[Bridge] ${stripHtml(node.text)}`);
                    console.log('');
                    break;
                case 'summary':
                    console.log(`[Summary]`);
                    const a1 = getDominant('axis1', ['internal', 'external']);
                    const a2 = getDominant('axis2', ['contribution', 'entitlement']);
                    const a3 = getDominantAxis3();
                    console.log(`  Axis 1 (Agency): ${formatPole(a1)}`);
                    console.log(`  Axis 2 (Contribution): ${formatPole(a2)}`);
                    console.log(`  Axis 3 (Radius): ${formatPole(a3)}`);
                    console.log('');
                    break;
                case 'end':
                    console.log(`[End] ${stripHtml(node.text)}`);
                    break;
            }
        }

        console.log('\n══════════════════════════════════════════');
        console.log('  SIGNAL TALLIES');
        console.log('══════════════════════════════════════════');
        for (const [signal, count] of Object.entries(state.signals)) {
            console.log(`  ${signal}: ${count}`);
        }
        console.log('══════════════════════════════════════════\n');
    }

    /**
     * Interpolate without HTML wrappers (for console logging)
     */
    function interpolateRaw(text) {
        if (!text) return '';
        return text.replace(/\{(\w+)\.answer\}/g, (match, nodeId) => {
            return state.answers[nodeId] || match;
        });
    }

    function stripHtml(text) {
        return text.replace(/<[^>]*>/g, '');
    }

    // ─── Boot ──────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

})();
