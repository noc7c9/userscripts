// ==UserScript==
// @name        Github - Readme Better
// @namespace   noc7c9
// @version     0.1.0
// @author      Athir Saleem <noc7c9@gmail.com>
// @match       https://github.com/*/*
// @icon        https://www.google.com/s2/favicons?domain=github.com
// @grant       none
// ==/UserScript==

const ENABLE_DEBUG_LOGS = false;

function main() {
    setupFluidFixedWidthToggle();
}

function setupFluidFixedWidthToggle() {
    log('setting up fluid-fixed width toggle');

    GM_addStyle(`
        #github-readme-better--toggle-fixed-width {
            margin-right: 8px;
        }
    `);

    const toggle = document.createElement('input');
    toggle.id = 'github-readme-better--toggle-fixed-width';
    toggle.type = 'checkbox';
    toggle.title = 'Toggle fixed width';

    const containerOuter = document.querySelector(
        '#repo-content-pjax-container > .container-xl',
    );
    const containerInner = document.querySelector(
        '#repo-content-pjax-container .markdown-body.container-lg',
    );
    const defaultOuterMaxWidth = containerOuter.style.maxWidth;
    const defaultInnerMaxWidth = containerInner.style.maxWidth;

    let status = false;
    toggle.addEventListener('change', () => {
        if (status) {
            log('toggling to fixed with');
            containerOuter.style.maxWidth = defaultOuterMaxWidth;
            containerInner.style.maxWidth = defaultInnerMaxWidth;
            status = false;
        } else {
            log('toggling to fluid with');
            containerOuter.style.maxWidth = 'none';
            containerInner.style.maxWidth = 'none';
            status = true;
        }
    });

    const readmeHeader = document.querySelector('#readme > div');
    readmeHeader.appendChild(toggle);

    log('setup done');
}

function log(...msgs) {
    if (ENABLE_DEBUG_LOGS) {
        console.log(...msgs);
    }
    return msgs[msgs.length - 1];
}

// start the script
main();
