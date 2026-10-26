# Questionnaire researcher pilot

This is an acceptance protocol for a small first-use pilot, not a record of completed user testing. Recruit or contact participants only under the owner's separate instruction. Use 3–5 researchers who work with questionnaire/scale networks and who were not involved in building the interface.

## Preparation

- Qualify the exact candidate deployment using the worker runbook before allowing real uploads. Record its source revision and runtime. Machine checks alone do not establish cloud reliability or researcher usability.
- Give each researcher the workbench URL, the supported scope (one XLSX sheet, 1–5 items, 6–40 items, 2–8 predefined communities with 3–12 items each, binary comparison), and the temporary-data policy.
- Start with the public synthetic workbook. A researcher may then use their own appropriately authorized, deidentified data; access permission is not implied by participation. Keep the workbook out of feedback logs and screenshots.
- Explain that task IDs grant access to aggregate results and should be kept private. The observer should record outcomes and errors, not the ID or source values.

## Independent tasks

1. Import a workbook and explain which columns are items and which column will define the comparison. Select or correct the item IDs and communities; identify any reverse scoring.
2. Run validation. Explain the original and analyzed sample counts, exclusions, and group sizes. Confirm the analysis only after checking those facts.
3. Start a 1,000-bootstrap task. Refresh during computation, leave the page, and return. Recover the same task without uploading the workbook again.
4. Read the network, full NCT table and stability results. Explain what the interface permits when the network is empty or a relevant CS coefficient is below .25.
5. Export the research package. Locate the complete edge tests, editable figure, methods/settings and source fingerprint. Reopen the result JSON in the workbench.
6. For a separate disposable synthetic task, cancel during computation and confirm that its terminal state is clear. Recover an expired/invalid task ID and explain the next step suggested by the interface.

## Record and decision

For each task record completion, time, error code, whether assistance was required, and the participant's own description of the result. Distinguish missing product capability from misunderstood copy, unsupported data scope and infrastructure failure. Do not record respondent data, participant credentials or private task IDs.

The first pilot passes only when every participant can complete the supported core flow without the developer editing their workbook, restarting their analysis, or manually generating the research outputs. Any misidentified variable, unacknowledged exclusion, lost successful task, incorrect table/figure, or misleading interpretation requires correction and a focused retest. Statistical suitability and manuscript claims remain research decisions; this usability pilot does not establish scientific validity or learning effectiveness.

Record the actual participant count, candidate revision, observed failures and retests before describing the version as independently usable by researchers. The implementation itself has not conducted this pilot.
