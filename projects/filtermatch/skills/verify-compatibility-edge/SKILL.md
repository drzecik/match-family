---
name: verify-compatibility-edge
description: Prepare and record an evidence-led review of a FilterMatch compatibility edge. Use when an authorized human reviewer supplies a device, consumable, evidence set, publication policy, and explicit verification decision.
---

# Verify Compatibility Edge

Require device ID, consumable ID, proposed relation type, evidence IDs, evidence metadata, reviewer ID, review date, and an explicit decision from an authorized non-AI reviewer. Without that decision, keep the edge `candidate`.

1. Validate that referenced entities and evidence exist.
2. Compare sources using the documented source hierarchy and flag contradictions, expired validity, and model-suffix mismatches.
3. Reject an attempted downgrade or overwrite when existing evidence is stronger.
4. Record the supplied decision as an append-only `ReviewDecision` with the current `previousStatus`, explicit evidence IDs, reviewer, time, rationale, and `decisionAuthority: authorized_human_reviewer`; never infer approval.
5. Run publication-policy validation. `candidate`, `unknown`, `conflicting`, `rejected`, and `deprecated` never become public compatibility.

Use the repository's prepare-review command before the decision and apply-review only after the authorized human supplies the separate decision file and confirmation. A stale previous status, duplicate decision ID, evidence downgrade, or failed publication policy must stop the operation without mutating data.

Produce a report containing inputs, evidence table, conflicts, current and proposed states, reviewer decision, publication eligibility, and required follow-ups. Never claim that the AI itself verified compatibility.
