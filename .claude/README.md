# AI-DLC for Claude Code

This directory contains the AI-DLC (AI-Driven Development Life Cycle) workflow configured for use with Claude Code for VSCode.

## What is AI-DLC?

AI-DLC is an intelligent software development workflow that adapts to your needs, maintains quality standards, and keeps you in control of the process. For more information, read the [AI-DLC blog post](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/) and the [Method Definition Paper](https://prod.d13rzhkk8cj2z0.amplifyapp.com/).

## Directory Structure

```
.claude/
├── README.md                           # This file
├── aws-aidlc-rules/                    # Core workflow rules
│   └── core-workflow.md                # Main workflow definition
└── aws-aidlc-rule-details/             # Detailed rule specifications
    ├── common/                         # Common rules for all phases
    ├── inception/                      # Inception phase rules
    ├── construction/                   # Construction phase rules
    └── operations/                     # Operations phase rules
```

## How to Use with Claude Code

### Setup for a New Project

1. **Copy this `.claude` directory to your project root**:
   ```bash
   # From your project directory
   cp -r /path/to/aidlc-workflows/.claude .
   ```

2. **Verify the rules are loaded**:
   - Open your project in VSCode with Claude Code extension
   - The rules will be automatically loaded from `.claude/aws-aidlc-rules/`

### Starting an AI-DLC Workflow

To activate the AI-DLC workflow in Claude Code:

1. Start a conversation in Claude Code
2. Begin your request with: **"Using AI-DLC, ..."**
   - Example: "Using AI-DLC, create a REST API for user management"
3. AI-DLC will automatically activate and guide you through the workflow

### What to Expect

The AI-DLC workflow consists of three phases:

#### 🔵 INCEPTION PHASE
Determines **WHAT** to build and **WHY**
- Workspace Detection (always)
- Reverse Engineering (for existing codebases)
- Requirements Analysis (always, adaptive depth)
- User Stories (conditional)
- Workflow Planning (always)
- Application Design (conditional)
- Units Generation (conditional)

#### 🟢 CONSTRUCTION PHASE
Determines **HOW** to build it
- Functional Design (conditional, per-unit)
- NFR Requirements (conditional, per-unit)
- NFR Design (conditional, per-unit)
- Infrastructure Design (conditional, per-unit)
- Code Generation (always, per-unit)
- Build and Test (always)

#### 🟡 OPERATIONS PHASE
Deployment and monitoring (placeholder for future expansion)

### Adaptive Execution

AI-DLC intelligently adapts based on:
- Your request clarity and intent
- Existing codebase state (greenfield vs brownfield)
- Complexity and scope of change
- Risk and impact assessment

Only the stages that add value to your specific request will be executed.

### Generated Artifacts

All documentation and artifacts will be created in the `aidlc-docs/` directory:

```
<your-project>/
├── aidlc-docs/                     # All AI-DLC documentation
│   ├── inception/
│   ├── construction/
│   ├── operations/
│   ├── aidlc-state.md             # Workflow state tracking
│   └── audit.md                   # Complete audit trail
├── .claude/                        # AI-DLC rules (this directory)
└── [your application code]         # Your actual code (NOT in aidlc-docs/)
```

**Important**: Application code is generated in your project root, NOT in `aidlc-docs/`. The `aidlc-docs/` directory contains only documentation and design artifacts.

## Key Features

- **Adaptive Intelligence**: Only executes stages that add value
- **Context-Aware**: Analyzes existing codebase and complexity
- **Risk-Based**: Complex changes get comprehensive treatment, simple changes stay efficient
- **Question-Driven**: Structured questions in files, not chat
- **Always in Control**: Review execution plans and approve each phase
- **Complete Audit Trail**: All decisions and changes are logged

## Customization

You can customize the workflow by:
- Editing rules in `aws-aidlc-rules/core-workflow.md`
- Modifying phase-specific rules in `aws-aidlc-rule-details/`
- Adjusting depth levels and execution criteria

## Support

For issues or questions:
- AI-DLC repository: https://github.com/awslabs/aidlc-workflows
- Claude Code documentation: https://claude.com/claude-code

## License

This library is licensed under the MIT-0 License. See the LICENSE file in the repository root.
