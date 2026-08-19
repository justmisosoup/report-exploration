# intel prototype

## Policy workflow builder (src/policy/)

### Invariants
1. No unit id, check id, group name, result value, or answer option may appear as a literal in
   component code. Everything renders from the data files. Adding a unit is a data change.
2. Controls are generated from unit type and value_space. Never hand-write a control for a specific unit.
3. evaluate(workflow, business) is pure. No network, no clock, no randomness.
4. Informational units never affect the verdict. Enforce in the evaluator, not the UI.
5. The AI summary explains a verdict already computed. It never produces or alters one.
6. Two combinators only: single_check and first_true. Do not add a third or generalize them.
7. Claims must match evidence. "Could not confirm this site belongs to this business" is supported.
   "This site appears spoofed" is not — there is no impersonation detection.

### Scope discipline
A prototype to socialize an idea. No versioning, approvals, validators, multiple accounts, branching
engine, or real API integration. If a task seems to need one, stop and ask.

### Done means
Workflow A returns Review driven by adverse media, Workflow B returns Approve on identical data, and
the add-a-unit test passes (`?testunit=1` renders the fictional unit with zero component changes).

Run the evaluator tests with `node src/policy/evaluate.test.mjs`.
