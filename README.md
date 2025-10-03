# TUWEL-Course-Archiver

A Tampermonkey userscript to automatically download zip archives of all of your TUWEL courses.

## Run
0. <mark>Make sure to disable any options in your browser like: `Always ask you where to save files` (for Firefox) and adjust similar settings. Since we want to download the archives without user interaction! There may be different options with different names in other browsers! The worst that can happen is that you will get a pop-up save dialogue for every course.</mark>
1. Add the `userscript.js` file as a new userscript to Tampermonkey, for example by copying and pasting it into a new userscript in Tampermonkey.
2. Start the download by going to your course dashboard: https://tuwel.tuwien.ac.at/my/courses.php
3. In the header, there should then be a button labelled `DOWNLOAD ALL`.
4. The script will then open every course in a tab, request the zip archive from the TUWEL server, and download it to your Downloads folder.
5. Currently, there is no effective way to notify you when the entire script has finished[^1]. Depending on how many courses you have and how big their files are, downloading the ZIP files could take some time.

[^1]: Since the script will download archives in batches and open a tab for every course, these new tabs are **independent** of the main tab from which the download was started.
