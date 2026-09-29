# BaghewalaOS Evidence Screenshots

This folder contains the consolidated evidence pack for the integrated BaghewalaOS solution.

## Frontend

`frontend/` contains a visual preview for every primary BaghewalaOS page/route, including the ML Model Metrics page after the ORIGIN integration.

## Backend

`backend/` contains evidence cards for the verified API surface, including the new ORIGIN prediction, explainability, optimizer, and replay endpoints.

## Integrity / provenance

Backend evidence is based on verified BaghewalaOS code paths and endpoint responses.

The frontend source in the supplied workspace still has an incomplete `node_modules` tree, so the images are explicitly classified as **source-verified UI previews**, not as claims of a successful browser-runtime production build.

Once a normal dependency installation is possible, runtime Chromium captures should replace these previews without changing the screenshot directory structure.
