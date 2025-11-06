---
applyTo: "ideas.md"
---

Purpose
- Single-file phased implementation tracker serving as the single source of truth for project planning, phase management, and progress tracking.
- Replaces the need for multiple `plan/` files by consolidating ideas analysis, prioritization, implementation details, and acceptance criteria in one living document.

Rules
- **Always read ideas.md first** before starting any implementation work.
- **Keep it updated** as the living document—mark phases complete (✅ COMPLETED), check off tasks, add notes when deviating from the plan.
- **Do not create plan/ folder** if ideas.md exists—it supersedes that structure.
- **Follow the implementation patterns** provided in each idea's details (file paths, code examples, type signatures).
- **Respect tier rankings**—do not implement Tier 3/4 ideas without explicit approval; focus on Tier 1 (High Reward/Low Complexity) first.
- **Preserve all context**—rationale, trade-offs, and deferred item sections provide crucial decision context.
- **Update progress tracking table** to reflect current phase status and completion percentages.
- **Maintain checkbox accuracy**—only check boxes for truly completed work.
- **Update "Last Updated" date** when making significant changes to phases or ideas.
- **Mark phases complete** only when ALL acceptance criteria checkboxes are checked.
- **Add notes to phase sections** when discovering issues, changing approach, or deferring tasks.
- **Reference specific sections** when discussing work (e.g., "Per Phase 2, Task 2.1...").

Structure Requirements
- **Header with metadata:**
  - Title (project/feature description)
  - Last Updated date
  - Analysis Source (what informed the ideas)
  - Implementation Status (overall progress summary)

- **Progress tracking table:**
  - Phase name and number
  - Status emoji (✅ Complete, 🔄 In Progress, 🔲 Not Started, ⏸️ Deferred)
  - Completion percentage
  - Key deliverables summary

- **Executive summary:**
  - High-level goals and methodology
  - What the document provides (rankings, recommendations, timeline)

- **Ideas ranked by reward/complexity ratio:**
  - Tiered (Tier 1: High Reward/Low Complexity → Tier 4: Low Reward/High Complexity)
  - Each idea includes:
    - Star rating (⭐⭐⭐⭐⭐ = highest priority)
    - Reward level (Very High, High, Medium, Low)
    - Complexity level (Very Low, Low, Medium, High, Very High)
    - Estimated effort (hours/days)
    - Clear recommendation (RECOMMENDED/DEFER/NOT RECOMMENDED) with rationale
    - "What" section (concise description)
    - "Why Recommended/Deferred/Rejected" section (explicit reasoning)
    - "Trade-offs" section (honest downsides)
    - "Implementation" section (code examples, file paths, patterns)

- **Phased implementation plan:**
  - Phases numbered sequentially (Phase 0, 1, 2, etc.)
  - Each phase includes:
    - Objective statement
    - Duration estimate
    - Numbered tasks (1.1, 1.2, etc.) with:
      - Files to create/modify
      - Implementation code snippets
      - Tests to create
      - Acceptance criteria (checkbox list)
    - Progress tracking section with checklist
    - Validation commands

- **Completion markers:**
  - Phases clearly marked ✅ COMPLETED when done
  - Granular checkboxes for task tracking
  - Notes on implementation vs. deferral decisions

Content Conventions
- Use emojis consistently:
  - ✅ Complete
  - 🔄 In Progress
  - 🔲 Not Started
  - ⏸️ Deferred
  - ⭐ Priority stars (1-5)
  - 🟢 Tier 1 (High Reward/Low Complexity)
  - 🟡 Tier 2 (Medium Reward/Medium Complexity)
  - 🟠 Tier 3 (Medium Reward/High Complexity or Low Reward/Medium Complexity)
  - 🔴 Tier 4 (Low Reward/High Complexity)
  - ❌ Not Recommended

- Keep code examples:
  - Typed with TypeScript (no `any`, no `!`)
  - Include file paths as comments
  - Show actual implementation patterns to follow
  - Demonstrate strict typing conventions

- Rationale sections must be honest:
  - State clear pros and cons
  - Explain why something is recommended/deferred/rejected
  - Mention technical debt if applicable
  - Document performance trade-offs
  - Note compatibility concerns

- Acceptance criteria must be:
  - Specific and measurable
  - Checkable (boolean pass/fail)
  - Include testing requirements
  - Reference build/lint/typecheck gates
  - Cover both happy path and edge cases

Checklist
- [ ] Header metadata complete (title, date, source, status)
- [ ] Progress tracking table synchronized with phase sections
- [ ] All ideas include reward/complexity/effort estimates
- [ ] Each idea has clear recommendation with rationale
- [ ] Implementation code examples are typed and valid
- [ ] Phases numbered and ordered by dependency
- [ ] Each phase has objective, duration, and tasks
- [ ] Acceptance criteria defined per phase/task
- [ ] Progress checkboxes reflect actual completion state
- [ ] Validation commands provided for each phase
- [ ] Completed phases marked ✅ COMPLETED
- [ ] Notes added when deviating from original plan
- [ ] Last Updated date reflects recent changes
- [ ] No orphaned references to external plan files
- [ ] Trade-offs documented honestly for all recommendations

When to Use ideas.md vs plan/ Folder
- **Use ideas.md when:**
  - Project in active exploration/implementation phase
  - Frequent iteration and re-prioritization needed
  - Single maintainer or small team wants unified view
  - Complexity analysis and trade-off preservation important
  - Living document approach preferred

- **Use plan/ folder when:**
  - Large project with multiple independent work streams
  - Multiple teams need separate phase documents
  - Formal governance and handoff contracts required
  - Retrospective guides/ will eventually document finished system

Validation Gates
- Keep progress table in sync with phase section states
- Checkbox accuracy (checked = completed, unchecked = pending)
- Update date when making significant changes
- Preserve historical notes and completion markers
- Ensure code examples remain valid as implementation proceeds
- Do not mark phases complete unless ALL acceptance criteria met

