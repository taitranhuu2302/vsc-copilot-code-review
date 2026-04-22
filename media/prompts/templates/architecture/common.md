Act as a Senior Software Architect specializing in [Backend] and [Frontend (React/TypeScript)]. Please deeply analyze this entire project codebase and generate a highly comprehensive, multi-dimensional architectural documentation.

CRITICAL INSTRUCTIONS:

- MERMAID.JS: You MUST use Mermaid.js syntax for EVERY diagram requested below. Do not skip the visual representations.
- FILE OUTPUT: You MUST write the entire generated content into a single file named ARCHITECTURE.md located inside the docs folder (create the folder if it doesn't exist).
- EVIDENCE RULE: Every major statement must be grounded in concrete evidence from files, symbols, or configurations discovered in the repo.

Your analysis must format the output clearly using Markdown and include the following categorized sections in order:

1. Executive Summary: Provide a high-level overview of the project's primary purpose, core capabilities, and a brief assessment of the overall system health.
2. Tech Stack & Dependencies: Provide a comprehensive list of all Frameworks, Libraries, Tools, and Databases used. Explicitly identify any legacy dependencies, deprecated packages, or potential version conflicts I should be aware of.
3. High-Level System Architecture (MERMAID REQUIRED): Explain how the core components and microservices/modules interact. Draw a Mermaid Flowchart/Architecture diagram illustrating the complete high-level system topology.
4. Data Models & Database Schema (MERMAID REQUIRED): Analyze the database structures (ORMs, models). Draw a Mermaid Entity-Relationship (ER) Diagram to map out the core tables/collections and their relationships.
5. Core Business Logic & Data Flow (MERMAID REQUIRED): Map out the core business logic. Draw a Mermaid Sequence Diagram to illustrate the 1-2 most critical data flow paths (e.g., user checkout, data ingestion).
6. APIs & Entry Points: Detail the API Endpoints, routing structures, and WebSocket connections. Identify any potential data processing bottlenecks or unoptimized queries.
7. Actors, Authentication & Security: Identify all primary actors (roles/services) interacting with the system. Explain exactly how authentication (e.g., JWT, OAuth), authorization (RBAC/ABAC), and data encryption are implemented within the code.
8. Design Patterns & Architecture Styles: Analyze the core business logic and explain the underlying reasoning behind the chosen design patterns (e.g., Repository, Factory, Observer) and architecture styles (e.g., Clean Architecture, MVC, Event-Driven).
9. Async Events & Lifecycle (MERMAID REQUIRED): Detail the exact triggers and lifecycles for asynchronous events, background jobs, message queues (e.g., RabbitMQ, Kafka), or cron jobs. Draw a Mermaid State Diagram or Flowchart illustrating the lifecycle of a complex async task.
10. Error Handling & Observability: Describe how the system handles global exceptions. Detail the logging mechanisms, tracing, and any monitoring setups found in the codebase.
11. Testing Strategy & Coverage: Summarize the testing approach (Unit, Integration, E2E) found in the codebase, including the test frameworks used and areas lacking test coverage.
12. Deployment & Infrastructure (MERMAID REQUIRED): Based on Dockerfiles, CI/CD pipelines, or infrastructure-as-code files present in the repo, Draw a Mermaid Deployment Diagram showing how the application is built, deployed, and hosted.
13. Technical Debt & Trade-offs: Candidly highlight any technical debt, code smells, hardcoded secrets, or architectural trade-offs made by previous developers that require immediate attention.
14. Architecture Summary & Next Steps: A concluding summary wrapping up the architecture review and suggesting the top 3 most critical, actionable architectural improvements for the next sprint.
