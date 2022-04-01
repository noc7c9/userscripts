// ==UserScript==
// @name        Youtube - Yes! Continue Watching
// @namespace   noc7c9
// @version     0.1.0
// @author      Athir Saleem <noc7c9@gmail.com>
// @include     https://www.youtube.com/watch*
// @icon        https://www.google.com/s2/favicons?domain=youtube.com
// @grant       none
// @inject-into page
// ==/UserScript==

const ENABLE_DEBUG_LOGS = true;
const STATUS_PAUSED = 2;
const WAIT_TIMES = 25;
const WAIT_PAUSE = 100;

function main() {
    log('Setting up');

    const player = document.querySelector('.html5-video-player');
    log('YT Player:', player);

    // anytime the player pauses
    player.addEventListener('onStateChange', async (status) => {
        if (status !== STATUS_PAUSED) return;
        log('Video paused, checking for "Continue Watching?" pop up');

        const found = await (async () => {
            for (let i = 0; i < WAIT_TIMES; i++) {
                // check for the pop up
                log('checking...');
                const dialog = document.querySelector(
                    'yt-formatted-string.yt-confirm-dialog-renderer.line-text',
                );
                if (
                    dialog != null &&
                    dialog.innerText.endsWith('Continue watching?')
                ) {
                    return true;
                }

                // wait a bit before checking again
                log('sleeping...');
                await sleep(WAIT_PAUSE);
            }

            // we didn't find it
            return false;
        })();
        if (!found) {
            log('"Continue Watching?" pop up not found');
            return;
        }

        // click it!
        log('"Continue Watching?" pop up found, clicking "Yes"');
        const button = document.querySelector(
            '#confirm-button > a > tp-yt-paper-button',
        );
        if (button != null) {
            button.click();
            log('"Yes" Clicked!');
        } else {
            log('Selecting button failed');
        }
    });
}

function log(...msgs) {
    if (ENABLE_DEBUG_LOGS) {
        console.log(formatShortDate(new Date()), ...msgs);
    }
    return msgs[msgs.length - 1];
}

function formatShortDate(date) {
    const h = zeroPadded(date.getHours(), 2);
    const m = zeroPadded(date.getMinutes(), 2);
    const s = zeroPadded(date.getSeconds(), 2);
    const ms = zeroPadded(date.getMilliseconds(), 3);
    return `${h}:${m}:${s}.${ms}`;
}

function zeroPadded(num, width) {
    return String(num).padStart(width, '0');
}

function sleep(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}

main();
