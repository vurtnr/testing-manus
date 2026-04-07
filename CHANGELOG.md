# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0.0] - 2026-04-08

### Added
- Agent workbench homepage with welcome/task modes, capability cards, and scenario entries
- Plain LLM chat endpoint `/api/agent/chat` for general-purpose Agent conversations (no RAG overhead)
- Knowledge base page `/knowledge` with 3-column RAG layout (FileManager | ChatPanel | EvidencePanel)
- Nav header on knowledge base page with back button to workbench
- Quick tasks and scenario entries route knowledge-oriented queries to `/knowledge` instead of Agent chat
- TaskResultPanel shows suggested next actions (search knowledge base, continue conversation)
- Shared SSE stream parser extracted for DRY between `streamChat` and `streamAgentChat`

### Changed
- Homepage chat no longer routes through RAG pipeline. Uses stateless Agent endpoint for faster, citation-free responses.
- Knowledge card click navigates to `/knowledge` instead of triggering Agent chat.
- Removed citations state from homepage (Agent endpoint never emits citations).
