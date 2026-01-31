# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-DLC (AI-Driven Development Life Cycle) is an AWS Labs methodology repository that provides reusable workflow rules for AI-assisted software development. It is not a compiled application — it consists entirely of Markdown rule files organized by development phase.

The rules guide AI coding assistants through a three-phase process: **INCEPTION** (planning) → **CONSTRUCTION** (implementation) → **OPERATIONS** (deployment). Rules are platform-agnostic and generated into platform-specific formats for Amazon Q Developer, Kiro CLI, and Claude Code.

## Repository Structure

- `.claude/aws-aidlc-rules/core-workflow.md` — Master workflow definition (single entry point)
- `.claude/aws-aidlc-rule-details/` — Detailed stage specifications:
  - `common/` — Shared guidance across all phases
  - `inception/` — Planning, requirements, architecture rules
  - `construction/` — Design and implementation rules
  - `operations/` — Deployment rules (placeholder)
- `.github/workflows/` — Release and changelog automation
- `cliff.toml` — git-cliff config for changelog generation

## Release Process

Releases are triggered by pushing a version tag:

```bash
git tag v1.2.0
git push origin v1.2.0
```

This triggers `.github/workflows/release.yml` which creates a `ai-dlc-rules-vX.X.X.zip` artifact and publishes a GitHub Release. A subsequent workflow auto-generates CHANGELOG.md via git-cliff and opens a PR.

## Conventions

- **Conventional commits** required: `feat:`, `fix:`, `docs:`, `chore:`, `perf:`, `refactor:`, `style:`, `test:`, `ci:`
- **No duplication**: Shared guidance goes in `common/` and is referenced, never copied
- **Platform-agnostic**: Core rules must not assume specific IDEs, agents, or models
- **Single source of truth**: Rule details in `aws-aidlc-rule-details/` are the source; platform-specific files are generated from them
- Test rule changes with at least one supported platform before submitting
