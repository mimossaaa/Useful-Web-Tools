// ==UserScript==
// @name         Instagram Reels Downloader
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a download button to Instagram Reels videos.
// @author       ChatGPT (with user requested modifications)
// @match        https://www.instagram.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Function to create and add the download button
    function addDownloadButton(reelContainer) {
        // Check if a download button already exists in this container
        if (reelContainer.querySelector('.instagram-reel-download-button')) {
            return; // Button already added
        }

        // Find the video element within the reel container
        const videoElement = reelContainer.querySelector('video[src*="cdninstagram"]');
        if (!videoElement || !videoElement.src) {
            return; // No video or no source found
        }

        // Find the container where we want to place the button
        // This is often the section that holds the Like, Comment, Share, Save buttons.
        // Look for the "Share" button's parent as a reliable anchor point.
        let actionButtonsContainer = null;
        const shareButton = reelContainer.querySelector('div[role="button"][aria-label="Share"]'); // Common for share button
        if (shareButton) {
            // The share button is often in a div, and its parent is the row of action buttons.
            actionButtonsContainer = shareButton.closest('div[style*="flex-direction: row;"][style*="align-items: center;"]');
            if (!actionButtonsContainer) {
                 // Fallback: If not found, try the parent of the parent of the share button, which often contains all action buttons.
                 actionButtonsContainer = shareButton.parentElement;
                 if (actionButtonsContainer && actionButtonsContainer.childElementCount > 2) { // Ensure it's a multi-button container
                    actionButtonsContainer = actionButtonsContainer.parentElement;
                 }
            }
        }

        // If a specific action buttons container isn't found, try a more general approach
        if (!actionButtonsContainer) {
            // Look for a section with role="group" which often contains the action buttons in the main feed or profile
            actionButtonsContainer = reelContainer.querySelector('section[role="group"]');
        }

        if (!actionButtonsContainer) {
            console.warn('Instagram Reels Downloader: Could not find suitable button container for the download button.');
            return;
        }

        // Create the download button
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download';
        downloadButton.classList.add('instagram-reel-download-button'); // Custom class for identification

        // Apply some basic styling to match Instagram's look and feel
        downloadButton.style.cssText = `
            background-color: #0095f6; /* Instagram blue */
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-left: 10px; /* Space from other buttons */
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px; /* Space between icon and text */
            min-width: unset; /* Override Instagram's min-width on some buttons */
            height: 36px; /* Match height of other buttons */
            transition: background-color 0.2s ease;
        `;
        downloadButton.onmouseover = () => downloadButton.style.backgroundColor = '#007acc';
        downloadButton.onmouseout = () => downloadButton.style.backgroundColor = '#0095f6';

        // Add a download icon (Instagram's SVG format, slightly modified viewBox/size for fit)
        const downloadIcon = document.createElement('span');
        downloadIcon.innerHTML = `
            <svg aria-label="Download" color="rgb(255, 255, 255)" fill="rgb(255, 255, 255)" height="18" role="img" viewBox="0 0 24 24" width="18">
                <path d="M19.349 11.666a1.5 1.5 0 0 1-.444 1.06l-4.254 4.253a1.5 1.5 0 0 1-2.122 0l-4.253-4.253a1.5 1.5 0 0 1 2.122-2.121l2.402 2.402V3.415a1.5 1.5 0 0 1 3 0v10.426l2.402-2.402a1.5 1.5 0 0 1 1.06-.444Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                <path d="M21.5 17.5v3a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
        `;
        downloadButton.prepend(downloadIcon);

        // Add click listener
        downloadButton.addEventListener('click', () => {
            const videoSrc = videoElement.src;
            if (videoSrc) {
                // Create a temporary anchor tag for downloading
                const a = document.createElement('a');
                a.href = videoSrc;
                // Suggest a filename. Use a timestamp to ensure uniqueness.
                a.download = `instagram-reel-${Date.now()}.mp4`;
                document.body.appendChild(a); // Required for Firefox to trigger download
                a.click();
                document.body.removeChild(a); // Clean up the temporary element
            } else {
                alert('Instagram Reels Downloader: Could not find video source to download!');
            }
        });

        // Append the button to the found action container
        actionButtonsContainer.appendChild(downloadButton);
        console.log('Instagram Reels Downloader: Download button added to Reel.');
    }

    // Function to find the main container for a Reel post
    function findReelContainer(element) {
        // Prioritize modal dialogs (when a Reel is opened in a pop-up)
        let container = element.closest('div[role="dialog"]');
        if (container) return container;

        // Then look for article elements (common for posts in feed, profile, or explore)
        container = element.closest('article');
        if (container) return container;

        // Fallback: More generic container. Instagram's structure varies a lot.
        // Look for a parent div that seems to encompass the entire post content (video + actions).
        container = element.closest('div[style*="flex-direction: column;"]');
        if (container) return container;

        return null;
    }

    // Use a MutationObserver to detect when new elements (Reels) are added to the DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    // Only process element nodes
                    if (node.nodeType === 1) {
                        let videoElement = null;
                        // Check if the added node itself is a video tag with an Instagram source
                        if (node.tagName === 'VIDEO' && node.src && node.src.includes('cdninstagram')) {
                            videoElement = node;
                        } else {
                            // Or if the added node contains a video tag with an Instagram source
                            videoElement = node.querySelector('video[src*="cdninstagram"]');
                        }

                        if (videoElement) {
                            const reelContainer = findReelContainer(videoElement);
                            if (reelContainer) {
                                addDownloadButton(reelContainer);
                            }
                        }
                    }
                });
            }
        });
    });

    // Start observing the entire document body for changes
    // subtree: true means it will observe changes in all descendants of the body
    // childList: true means it will observe additions/removals of direct children
    observer.observe(document.body, { childList: true, subtree: true });

    // Also, run once on page load for any Reels that are already present in the DOM
    document.querySelectorAll('video[src*="cdninstagram"]').forEach(videoElement => {
        const reelContainer = findReelContainer(videoElement);
        if (reelContainer) {
            addDownloadButton(reelContainer);
        }
    });

})();
