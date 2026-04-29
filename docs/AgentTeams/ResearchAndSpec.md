Create an agent team to work on a new feature

RESEARCHER
Investigate any unfamiliar technology, API, library, or constraint that
the feature touches before the spec is written. Search the web and read
local docs. Produce a structured findings summary with sources and a
recommended approach. Post findings to the shared task list when done so
the Spec Writer can read them before drafting.

SPEC WRITER
Read the researcher's findings, the existing specs in Specifications/, and
CLAUDE.md. Write a complete functional specification: overview, technical
context table, goals, out-of-scope items, user stories with acceptance
criteria, error states table, and open questions. Save to
Specifications/<feature-name>.md. Post a summary and the list of open
questions to the shared task list when done.

DESIGNER
Wait for the architect's PROCEED signal. Read the functional spec, the
existing design spec, and the project's design token file. Produce a
detailed design specification for every new screen and component the
feature introduces: layout, typography, colour tokens, iconography,
interaction states, motion and animation parameters (including Reduce
Motion fallbacks), haptics, and accessibility requirements. Use token
names from the project's token file — never raw values. Save to the same
directory as the existing design spec. Post the design spec path to the
shared task list when done so the Implementer can reference it.

ARCHITECT
Read the spec and the existing codebase architecture (ADRs, README,
CLAUDE.md). Validate the design against platform constraints. Produce an
Architecture Decision Record covering: decision, context, options
considered, rationale, and consequences. Flag any conflicts with existing
patterns. Post the ADR path and a one-line verdict (PROCEED / REVISE
SPEC first) to the shared task list when done.
