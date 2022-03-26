// ==UserScript==
// @name        Monkeytype - Streak Display
// @namespace   noc7c9
// @version     0.1.0
// @author      Athir Saleem <noc7c9@gmail.com>
// @match       https://monkeytype.com/
// @icon        https://www.google.com/s2/favicons?domain=monkeytype.com
// @grant       none
// ==/UserScript==

const ENABLE_DEBUG_LOGS = false;
const MAX_EVENTS = 50;

const MIN_WPM_KEY = 'min-wpm';
const MIN_ACC_KEY = 'min-acc';

// globally shared variables
let config = {
    minWpm: GM_getValue(MIN_WPM_KEY, 0),
    minAcc: GM_getValue(MIN_ACC_KEY, 0),
};
let state = null; // the current state of the Monkeytype UI
let events = []; // list of events

log('loaded config', config);

function main() {
    const updateDisplay = initializeDisplay();

    const onEvent = (event) => {
        pushEvent(event);
        updateDisplay();
    };

    addManualRestartListener(onEvent);
    addPageMutationListener(onEvent);
}

function pushEvent(event) {
    log('pushing event', event);
    event.date = new Date();
    events.push(event);
    if (events.length > MAX_EVENTS) {
        events = events.slice(MAX_EVENTS / 2);
    }
}

function initializeDisplay() {
    log('initializing display');

    GM_addStyle(`
        #streak-display {
            position: absolute;
            top: 1.2rem;
            left: 1.2rem;
            color: var(--sub-color);
        }

        #streak-display > .streak-count {
            margin: .5rem;
        }
        #streak-display > .streak-count > span {
            color: var(--main-color);
            font-size: 2rem;
        }

        #streak-display > .config {
            font-size: 0.75rem;
            margin-bottom: 0.25rem;
        }
        #streak-display > .config > input {
            font-size: 0.75rem;
            padding: .25rem .5rem;
            max-width: 3rem;
        }

        #streak-display > .events-list {
            padding-left: 1.2em;
            margin: 0;
        }
    `);

    const display = document.createElement('div');
    display.id = 'streak-display';

    display.innerHTML = `
        <div class="config">
            <span title="The minimum required word-per-minute for a test to be considered successful">Min WPM:</span>
            <input class="min-wpm" type="number" value="${config.minWpm}" min="0"/>

            <span title="The minimum required accuracy for a test to be considered successful">Min Acc:</span>
            <input class="min-acc" type="number" value="${config.minAcc}" min="0" max="100"/>
        </div>
        <div class="streak-count">Streak: <span>0</span></div>
        <ul class="events-list"></ul>
    `;

    document.body.appendChild(display);

    // handle changes to config
    const inputMinWpm = display.querySelector('.min-wpm');
    const inputMinAcc = display.querySelector('.min-acc');
    inputMinWpm.addEventListener('change', () => {
        config.minWpm = parseInt(inputMinWpm.value);
        log('config changed: min wpm =', config.minWpm);
        GM_setValue(MIN_WPM_KEY, config.minWpm);
    });
    inputMinAcc.addEventListener('change', () => {
        config.minAcc = parseInt(inputMinAcc.value);
        log('config changed: min acc =', config.minAcc);
        GM_setValue(MIN_ACC_KEY, config.minAcc);
    });
    // necessary since monkeytype will steal events otherwise
    inputMinAcc.addEventListener('keydown', (evt) => evt.stopPropagation());
    inputMinWpm.addEventListener('keydown', (evt) => evt.stopPropagation());

    // create function to update the display
    const streakCount = display.querySelector('.streak-count > span');
    const eventsList = display.querySelector('.events-list');

    const updateDisplay = () => {
        log('updating display');

        let streak = 0;
        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            if (event.type !== 'pass') break;
            streak += 1;
        }
        log('updating streak count', streak);
        streakCount.innerHTML = streak;

        log('updating events list', events);
        eventsList.innerHTML = events
            .map((event) => {
                switch (event.type) {
                    case 'pass': {
                        const { wpm, acc } = event.result;
                        return `<li>
                            <span style="color: var(--main-color);">Pass</span>
                            wpm: ${wpm} acc: ${acc}
                        </li>`;
                    }
                    case 'restart': {
                        return `<li>
                            <span style="color: var(--error-color);">Manual Restart</span>
                        </li>`;
                    }
                    case 'fail': {
                        const reason = event.result.failReason;
                        return `<li>
                            <span style="color: var(--error-color);">Fail</span>
                            ${reason}
                        </li>`;
                    }
                }
            })
            .reverse()
            .join('');
    };

    updateDisplay();
    return updateDisplay;
}

// triggers when the user manually restarts the test by pressing tab
function addManualRestartListener(callback) {
    window.addEventListener('keydown', (evt) => {
        if (evt.key !== 'Tab') return;
        if (state === 'TEST') {
            callback({ type: 'restart' });
        }
    });
}

// triggers when the page changes (eg: when user finishes a test)
function addPageMutationListener(callback) {
    const container = document.querySelector('.page.pageTest');
    const test = document.getElementById('typingTest');
    const result = document.getElementById('result');

    const getStateFromElems = () => {
        if (!container.classList.contains('active')) {
            return 'OTHER';
        }
        const testOpacity = parseFloat(test.style.opacity.trim() || 0);
        const resultOpacity = parseFloat(result.style.opacity.trim() || 0);

        // transitioning, so return null
        if (
            (testOpacity !== 1 && testOpacity !== 0) ||
            (resultOpacity !== 1 && resultOpacity !== 0)
        ) {
            return null;
        }

        const testActive = testOpacity === 1;
        const resultActive = resultOpacity === 1;
        return testActive ? 'TEST' : resultActive ? 'RESULT' : state;
    };

    const getText = (sel) => result.querySelector(sel).textContent;
    const getTestResultData = () => {
        const wpm = parseFloat(getText('.group.wpm > .bottom'));
        const acc = parseFloat(getText('.group.acc > .bottom'));
        const raw = getText('.group.raw > .bottom');
        const chars = getText('.group.key > .bottom');
        const cons = getText('.group.consistency > .bottom');
        const time = getText('.group.time > .bottom > .text');
        const afk = getText('.group.time > .bottom > .afk');

        let pass = true;
        let failReason = null;
        if (wpm < config.minWpm) {
            pass = false;
            failReason = `wpm too low: ${wpm} (min ${config.minWpm})`;
        } else if (acc < config.minAcc) {
            pass = false;
            failReason = `acc too low: ${acc} (min ${config.minAcc})`;
        } else if (
            !result.querySelector('.group.info').classList.contains('hidden')
        ) {
            pass = false;
            failReason = 'wpm/acc running avg too low';
        }

        const hash = [wpm, acc, raw, chars, cons, time, afk].join(',');

        return {
            pass,
            failReason,
            wpm,
            acc,
            raw,
            chars,
            cons,
            time,
            afk,
            hash,
        };
    };

    const observer = new MutationObserver(() => {
        const newState = getStateFromElems();
        if (newState === null) return; // transitioning
        state = newState;

        if (state === 'TEST' || state === 'OTHER') return;
        if (state === 'RESULT') {
            const result = getTestResultData();
            if (
                events.length === 0 ||
                result.hash !== events[events.length - 1].hash
            ) {
                callback({
                    type: result.pass ? 'pass' : 'fail',
                    result,
                    hash: result.hash,
                });
            }
        }
    });
    observer.observe(container, { attributes: true });
    observer.observe(test, { attributes: true });
    observer.observe(result, { attributes: true });
}

function log(...msgs) {
    if (ENABLE_DEBUG_LOGS) {
        console.log(...msgs);
    }
    return msgs[msgs.length - 1];
}

// start the script
main();
