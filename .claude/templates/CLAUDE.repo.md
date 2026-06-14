# CLAUDE.md: <project name>

Type: <hackathon | product | infra | client>
Deadline / next milestone: <date>
Stack: <fill once decided>

The global standards in ~/.claude/CLAUDE.md (SKILL_GENERAL.md + REFERENCE_SECURITY_AUDIT.md) apply in full. Nothing in this file or this repo relaxes them. On any conflict, the stricter rule wins.

## Project context (imported)

@docs/BRIEF.md

@docs/DECISIONS.md

requirements.md at the repo root is the raw source of truth (organizer dump, client notes, protocol material). Consult it whenever the brief lacks detail. Never edit it; update docs/BRIEF.md instead.

## Session start

1. Confirm the global standards are loaded (the line: Standards loaded: coding-standards + security-audit).
2. If docs/BRIEF.md is empty or stale, STOP: distill requirements.md into it before writing any code.
3. Read docs/DECISIONS.md before proposing any architecture change. Do not re-litigate a logged decision without new information.

## Research protocol (unfamiliar tech, new primitives)

- Before coding against any protocol, SDK, API, or primitive, check docs/research/ first.
- If no note exists: STOP and research it (official docs and specs first), then write docs/research/<topic>.md containing the facts you will rely on, with source links. Only then code.
- Never code against an unfamiliar primitive from memory. This is always-on rule 2 from REFERENCE_SECURITY_AUDIT.md applied to this repo.
- If live behavior contradicts a research note, update the note in the same task.

## Decision log

After any architecture or scope decision, append one line to docs/DECISIONS.md:
`YYYY-MM-DD | decision | why | alternative rejected`

## Stop and ask

Stop and ask the human, and wait for the answer, before:

- Acting on ambiguous or conflicting requirements. Quote the conflict, propose options.
- Anything irreversible or externally visible: publishing, deploying, database migrations or destructive writes, paid API configuration, posting or sending anything.
- Deviating from the scope in docs/BRIEF.md.
- Deleting or rewriting more than roughly 50 lines that currently work.

Git is not askable: the agent never runs any git command in this repo (no init, add, commit, push, merge, rebase). The human commits manually. The agent prints the handoff commands instead.

## Definition of done (per task)

- Final check from SKILL_GENERAL.md: zero hits on every touched file.
- Files-affected report.
- Git handoff block: `git add` with the exact files, drafted `git commit -m`, `git push`, printed for the human to run.
- If the task touched auth, payments, secrets, or user data, or a submission or release is near: run the audit per its trigger rules.
- Update docs/BRIEF.md or docs/DECISIONS.md if the task changed scope or made a choice.
