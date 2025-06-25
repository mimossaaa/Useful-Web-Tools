// ==UserScript==
// @name         Instagram Reels Downloader
// @namespace    https://github.com/your-username/userscripts
// @version      1.0
// @description  Adds a download button to Instagram Reels for direct video download.
// @author       AI Generated Script
// @match        https://www.instagram.com/reels/*
// @grant        GM_download
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const BUTTON_ID = 'reel-download-button';
    const BUTTON_TEXT = 'Download Reel';
    const BUTTON_DOWNLOADING_TEXT = 'Downloading...';
    const BUTTON_ERROR_TEXT = 'Error!';

    // --- Selectors ---
    // Using aria-label is more robust against Instagram's changing class names.
    const SHARE_BUTTON_SELECTOR = 'svg[aria-label="Share"]';
    // Scope selectors to the reel's dialog box to avoid conflicts.
    const DIALOG_VIDEO_SELECTOR = 'div[role="dialog"] video';
    const DIALOG_USERNAME_SELECTOR = 'div[role="dialog"] header a';

    // --- Style Injection ---
    // This adds the CSS for our button to the page.
    GM_addStyle(`
        #${BUTTON_ID} {
            background-color: #0095f6; /* A familiar blue */
            color: white;
            border: none;
            border-radius: 8px;
            padding: 7px 16px;
            margin-left: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            line-height: 1.3;
            text-align: center;
            transition: background-color 0.2s ease-in-out;
        }
        #${BUTTON_ID}:hover {
            background-color: #0077c6; /* Darker blue on hover */
        }
        #${BUTTON_ID}:disabled {
            background-color: #a2d2f7; /* Lighter blue when disabled */
            cursor: not-allowed;
        }
    `);

    /**
     * Creates the download button element with its click event listener.
     * @returns {HTMLButtonElement} The configured download button.
     */
    const createDownloadButton = () => {
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.textContent = BUTTON_TEXT;

        button.addEventListener('click', (event) => {
            // Prevent the click from bubbling up to other Instagram UI elements.
            event.preventDefault();
            event.stopPropagation();

            const videoElement = document.querySelector(DIALOG_VIDEO_SELECTOR);
            if (!videoElement || !videoElement.src) {
                console.error('Reels Downloader: Video element or its source was not found.');
                showButtonError(button, 'Video not found');
                return;
            }

            const videoUrl = videoElement.src;

            // Update button state to provide user feedback.
            button.disabled = true;
            button.textContent = BUTTON_DOWNLOADING_TEXT;

            try {
                // Generate a descriptive filename.
                const username = document.querySelector(DIALOG_USERNAME_SELECTOR)?.textContent || 'instagram_user';
                const postId = window.location.pathname.split('/reels/')[1]?.replace(/\//g, '') || Date.now();
                const filename = `reel_${username}_${postId}.mp4`;

                console.log(`Reels Downloader: Attempting to download from ${videoUrl}`);

                // Use Tampermonkey's download API for robust, cross-origin downloads.
                GM_download({
                    url: videoUrl,
                    name: filename,
                    onload: () => {
                        console.log(`Reels Downloader: Download started for ${filename}.`);
                        // Reset button after a short delay to show completion.
                        setTimeout(() => {
                           button.disabled = false;
                           button.textContent = BUTTON_TEXT;
                        }, 1000);
                    },
                    onerror: (err) => {
                        console.error('Reels Downloader: GM_download failed.', err);
                        showButtonError(button, `Download failed: ${err.error}`);
                        // As a fallback, try opening the video in a new tab.
                        window.open(videoUrl, '_blank');
                    },
                    ontimeout: () => {
                        console.error('Reels Downloader: Download timed out.');
                        showButtonError(button, 'Download timed out.');
                    }
                });
            } catch (error) {
                console.error('Reels Downloader: An error occurred during download initiation.', error);
                showButtonError(button, 'An error occurred.');
            }
        });

        return button;
    };

    /**
     * Temporarily shows an error message on the button.
     * @param {HTMLButtonElement} button - The button element.
     * @param {string} message - The error message for the console.
     */
    function showButtonError(button, message) {
        button.textContent = BUTTON_ERROR_TEXT;
        console.error(`Reels Downloader: ${message}`);
        setTimeout(() => {
            button.disabled = false;
            button.textContent = BUTTON_TEXT;
        }, 2500); // Reset after 2.5 seconds.
    }

    /**
     * Finds the correct location in the DOM and inserts the download button.
     */
    const placeButton = () => {
        // If the button is already on the page, do nothing.
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        // Find the "Share" button, which serves as an anchor for placement.
        const shareButtonSvg = document.querySelector(SHARE_BUTTON_SELECTOR);
        if (!shareButtonSvg) {
            return; // Anchor not found, UI not ready yet.
        }

        // Traverse up from the SVG to find the container of all action buttons.
        // The container is typically a div with several child elements (for like, comment, share, etc.).
        const actionBar = shareButtonSvg.closest('div[class*="x1i10hfl"]');
        
        if (actionBar && !actionBar.querySelector(`#${BUTTON_ID}`)) {
            console.log('Reels Downloader: Action bar found. Placing button.');
            const downloadButton = createDownloadButton();
            // Append our button to the end of the action bar.
            actionBar.appendChild(downloadButton);
        }
    };

    // --- Mutation Observer ---
    // Instagram is a Single Page Application (SPA), so content loads dynamically.
    // A MutationObserver is the most efficient way to detect when a Reel has been loaded into the DOM.

    let debounceTimer;
    const observer = new MutationObserver(() => {
        // Debounce the placement function to avoid running it excessively on rapid DOM changes.
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(placeButton, 500);
    });

    // Start observing the entire document body for additions and removals of nodes.
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
