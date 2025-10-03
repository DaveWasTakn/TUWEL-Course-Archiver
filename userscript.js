// ==UserScript==
// @name         TUWEL Course Archiver
// @version      2025-10-02
// @description  Download archives of all your courses.
// @author       daveWasTakn
// @match        https://tuwel.tuwien.ac.at/my/courses.php
// @match        https://tuwel.tuwien.ac.at/local/downloadcenter/index.php?courseid=*&autoDL=true
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ac.at
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    function createStartButton() {
        const startDiv = document.createElement("div");
        const button = document.createElement("button");
        button.id = "downloadAllButton";
        button.textContent = "DOWNLOAD_ALL";
        button.onclick = start;
        startDiv.appendChild(button);

        startDiv.style.alignSelf = "center";
        startDiv.style.marginRight = "10px";

        document.getElementById("usernavigation").prepend(startDiv);
    }

    function showAllCourses() {
        const allItem = document.querySelector('[data-filter="grouping"][data-value="all"]');
        if (allItem) {
            allItem.click();
        }
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForElements(selector, maxTries = 100) {
        for (let i = 0; i < maxTries; i++) {
            const el = document.querySelectorAll(selector);
            if (el.length > 0) return el;
            await wait(500);
        }
        throw new Error(`Element not found: ${selector}`);
    }

    async function getAllCourseLinks() {
        const courses = await waitForElements('[data-region="course-content"] .aalink.coursename');
        return [...courses]
            .map(a => a.href)
            .map(url => new URLSearchParams(url.split("?")[1]).get("id"))
            .map(courseID => `https://tuwel.tuwien.ac.at/local/downloadcenter/index.php?courseid=${courseID}&autoDL=true`);
    }

    async function openTabsBatched(links, batchSize=10, delayMs=5000) {
        for (let i = 0; i < links.length; i++) {
            GM_openInTab(links[i], { active: false });

            if ((i + 1) % batchSize === 0) {
                await wait(delayMs);
            }
        }
    }

    async function start() {
        if (!confirm("Start downloading archives of all courses?")) return;

        document.getElementById("downloadAllButton").disabled = true;

        showAllCourses();

        const courses = await getAllCourseLinks();

        await openTabsBatched(courses);
    }

    function sanitizeFilename(name) {
        name = String(name || "archive");
        name = name.replace(/^"+|"+$/g, '');
        name = name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_').trim();
        if (!name.toLowerCase().endsWith(".zip")) name += ".zip";
        return name;
    }

    function extractFilenameFromHeaders(headers) { // used as fallback; extract the filename from content-disposition header
        if (!headers) return null;
        // Try filename*
        let m = headers.match(/filename\*\s*=\s*([^;\r\n]+)/i);
        if (m) {
            let val = m[1].trim();
            // remove optional UTF-8'' prefix
            val = val.replace(/^UTF-8''/i, '');
            try { return decodeURIComponent(val); } catch (e) { return val; }
        }
        m = headers.match(/filename\s*=\s*"([^"]+)"/i) || headers.match(/filename\s*=\s*([^;\r\n]+)/i);
        if (m) return m[1].trim().replace(/^"+|"+$/g, '');
        return null;
    }

    function getHeaderValue(headers, key) {
        if (!headers) return null;
        const re = new RegExp('^' + key + '\\s*:\\s*(.+)$', 'im');
        const m = headers.match(re);
        return m ? m[1].trim() : null;
    }

    async function downloadArchive() {
        try {
            const numberingCheckbox = document.getElementById("id_addnumbering");
            if (numberingCheckbox) numberingCheckbox.checked = true;

            const form = document.querySelector('.mform[action="https://tuwel.tuwien.ac.at/local/downloadcenter/index.php"]');
            if (!form) {
                console.error("form not found");
                return;
            }

            let formData = new URLSearchParams(new FormData(form)).toString();
            const submitName = form.querySelector('input[type="submit"][name="submitbutton"]');
            if (submitName) {
                formData += `&${encodeURIComponent(submitName.name)}=${encodeURIComponent(submitName.value).replace(/%20/g, '+')}`;
            }

            GM_xmlhttpRequest({
                method: "POST",
                url: form.action,
                data: formData,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                responseType: "arraybuffer",
                onload: function(response) {
                    if (response.status !== 200) {
                        console.error("Server returned", response.status, response.statusText);
                        return;
                    }

                    const headers = response.responseHeaders || "";
                    let filename = document.querySelector(".page-header-headings > .h2")?.innerText;
                    if (!filename) {
                        filename = extractFilenameFromHeaders(headers) || "";
                    }
                    filename = sanitizeFilename(filename);

                    const contentType = getHeaderValue(headers, "content-type") || "application/zip";
                    const arrayBuffer = response.response;
                    const blob = new Blob([arrayBuffer], { type: contentType });

                    try {
                        const objectUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
                        return;
                    } catch (err) {
                        console.warn("Download failed:", err);
                    }
                },
                onerror: function(err) {
                    console.error("Request Error:", err);
                }
            });

        } catch (e) {
            console.error("unexpected error:", e);
        }
    }

    function main() {
        if (document.URL.endsWith("&autoDL=true")) {
            downloadArchive();
        } else {
            createStartButton();
        }
    }

    main();
})();
