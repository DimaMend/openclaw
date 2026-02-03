---
name: twenty
description: Twenty CRM CLI - Comprehensive CRM operations including people, companies, opportunities, tasks, notes, calendar events, and custom fields.
homepage: https://twenty.com
metadata: {"clawdis":{"emoji":"🏢","requires":{"bins":["uv"],"env":["TWENTY_API_KEY"]},"primaryEnv":"TWENTY_API_KEY"}}
---

# Twenty CRM

Comprehensive CLI for Twenty CRM operations - manage people, companies, opportunities, tasks, notes, activities, and custom objects.

## Setup

**Environment Variables:**
- `TWENTY_API_KEY` — API key from Twenty Settings → Developers → API Keys (required)
- `TWENTY_API_URL` — API base URL (default: `https://api.mollified.app`)

## Quick Reference

| Operation | Command |
|-----------|---------|
| List people | `twenty.py people` |
| Create person | `twenty.py create-person --email x@y.com --name "John Doe"` |
| List companies | `twenty.py companies` |
| Create company | `twenty.py create-company --name "Acme Inc"` |
| List tasks | `twenty.py tasks` |
| Create task | `twenty.py create-task --title "Follow up" --due 2026-02-15` |
| Add note | `twenty.py add-note --person-id <ID> --body "Notes here"` |
| Search | `twenty.py search "query"` |

## Commands

### People (Contacts/Leads)

```bash
# List people
uv run {baseDir}/scripts/twenty.py people
uv run {baseDir}/scripts/twenty.py people -n 50              # Limit 50
uv run {baseDir}/scripts/twenty.py people --json             # JSON output

# Get person details
uv run {baseDir}/scripts/twenty.py person <ID>
uv run {baseDir}/scripts/twenty.py person <ID> --json

# Create person
uv run {baseDir}/scripts/twenty.py create-person \
  --email "john@example.com" \
  --name "John Doe" \
  --phone "+1234567890" \
  --job-title "CTO" \
  --company-id <COMPANY_ID>

# Update person
uv run {baseDir}/scripts/twenty.py update-person <ID> \
  --lead-status "QUALIFIED" \
  --use-case "CODING_AGENT" \
  --current-plan "PRO"

# Delete person
uv run {baseDir}/scripts/twenty.py delete-person <ID>
```

### Companies

```bash
# List companies
uv run {baseDir}/scripts/twenty.py companies
uv run {baseDir}/scripts/twenty.py companies -n 50 --json

# Get company details
uv run {baseDir}/scripts/twenty.py company <ID>

# Create company
uv run {baseDir}/scripts/twenty.py create-company \
  --name "Acme Inc" \
  --domain "acme.com" \
  --employees 50 \
  --industry "TECHNOLOGY" \
  --type "STARTUP"

# Update company
uv run {baseDir}/scripts/twenty.py update-company <ID> \
  --team-seats 10 \
  --sso-required true

# Delete company
uv run {baseDir}/scripts/twenty.py delete-company <ID>
```

### Opportunities (Deals)

```bash
# List opportunities
uv run {baseDir}/scripts/twenty.py opportunities
uv run {baseDir}/scripts/twenty.py opportunities --stage "MEETING"

# Get opportunity details
uv run {baseDir}/scripts/twenty.py opportunity <ID>

# Create opportunity
uv run {baseDir}/scripts/twenty.py create-opportunity \
  --name "Acme Pro Upgrade" \
  --amount 1080 \
  --stage "SCREENING" \
  --company-id <ID> \
  --contact-id <ID> \
  --close-date 2026-03-15

# Update opportunity
uv run {baseDir}/scripts/twenty.py update-opportunity <ID> \
  --stage "PROPOSAL" \
  --plan-type "PRO_ANNUAL"

# Delete opportunity
uv run {baseDir}/scripts/twenty.py delete-opportunity <ID>
```

### Tasks

```bash
# List tasks
uv run {baseDir}/scripts/twenty.py tasks
uv run {baseDir}/scripts/twenty.py tasks --status "TODO"
uv run {baseDir}/scripts/twenty.py tasks --assignee <MEMBER_ID>

# Get task details
uv run {baseDir}/scripts/twenty.py task <ID>

# Create task
uv run {baseDir}/scripts/twenty.py create-task \
  --title "Follow up with John" \
  --body "Discuss enterprise features" \
  --due 2026-02-15 \
  --status "TODO" \
  --assignee <MEMBER_ID> \
  --person-id <ID>           # Link to person
  --company-id <ID>          # Link to company

# Update task
uv run {baseDir}/scripts/twenty.py update-task <ID> \
  --status "DONE"

# Delete task
uv run {baseDir}/scripts/twenty.py delete-task <ID>
```

### Notes

```bash
# List notes
uv run {baseDir}/scripts/twenty.py notes
uv run {baseDir}/scripts/twenty.py notes --person-id <ID>
uv run {baseDir}/scripts/twenty.py notes --company-id <ID>

# Get note details
uv run {baseDir}/scripts/twenty.py note <ID>

# Create note
uv run {baseDir}/scripts/twenty.py add-note \
  --body "Meeting notes: Discussed Q2 goals" \
  --person-id <ID>           # Attach to person
  --company-id <ID>          # Attach to company
  --opportunity-id <ID>      # Attach to opportunity

# Update note
uv run {baseDir}/scripts/twenty.py update-note <ID> --body "Updated notes"

# Delete note
uv run {baseDir}/scripts/twenty.py delete-note <ID>
```

### Calendar Events

```bash
# List calendar events
uv run {baseDir}/scripts/twenty.py events
uv run {baseDir}/scripts/twenty.py events --start 2026-02-01 --end 2026-02-28

# Get event details
uv run {baseDir}/scripts/twenty.py event <ID>

# Create event
uv run {baseDir}/scripts/twenty.py create-event \
  --title "Sales call with Acme" \
  --start "2026-02-15T14:00:00" \
  --end "2026-02-15T15:00:00" \
  --description "Discuss enterprise pricing" \
  --person-id <ID>
```

### Activities / Timeline

```bash
# Get timeline for a record
uv run {baseDir}/scripts/twenty.py timeline --person-id <ID>
uv run {baseDir}/scripts/twenty.py timeline --company-id <ID>
uv run {baseDir}/scripts/twenty.py timeline --opportunity-id <ID>
```

### Search

```bash
# Global search
uv run {baseDir}/scripts/twenty.py search "john"
uv run {baseDir}/scripts/twenty.py search "acme" --type company
uv run {baseDir}/scripts/twenty.py search "@gmail.com" --type person
```

### Custom Objects

```bash
# List custom object records
uv run {baseDir}/scripts/twenty.py custom <objectNamePlural>
uv run {baseDir}/scripts/twenty.py custom projects
uv run {baseDir}/scripts/twenty.py custom engagements --json

# Get custom object record
uv run {baseDir}/scripts/twenty.py custom-get <objectName> <ID>

# Create custom object record
uv run {baseDir}/scripts/twenty.py custom-create <objectName> \
  --field1 "value1" \
  --field2 "value2"
```

## Custom Fields

Custom fields are created via the Metadata API. Once created, use them in create/update commands:

```bash
# Person custom fields (SaveState example)
--lead-source "WEBSITE_FORM"      # SELECT: WEBSITE_FORM, GITHUB, PRODUCT_HUNT, etc.
--lead-status "QUALIFIED"          # SELECT: NEW, CONTACTED, QUALIFIED, FREE_USER, PRO_SUBSCRIBER, etc.
--platforms-used "CHATGPT,CLAUDE"  # MULTI_SELECT: CHATGPT, CLAUDE_WEB, CLAUDE_CODE, GEMINI, etc.
--use-case "CODING_AGENT"          # SELECT: PERSONAL_BACKUP, CODING_AGENT, BUSINESS_AGENTS, etc.
--current-plan "PRO"               # SELECT: NONE, FREE, PRO, TEAM
--github-username "johndoe"        # TEXT
--github-star true                 # BOOLEAN
--snapshot-count 42                # NUMBER
--stripe-customer-id "cus_xxx"     # TEXT

# Company custom fields
--company-type "STARTUP"           # SELECT: STARTUP, SMB, ENTERPRISE, AGENCY, INDIVIDUAL
--industry "TECHNOLOGY"            # SELECT: TECHNOLOGY, FINANCE, HEALTHCARE, etc.
--team-seats 10                    # NUMBER
--agent-count 5                    # NUMBER
--sso-required true                # BOOLEAN
--compliance-required true         # BOOLEAN

# Opportunity custom fields
--plan-type "PRO_ANNUAL"           # SELECT: PRO_MONTHLY, PRO_ANNUAL, TEAM_MONTHLY, TEAM_ANNUAL, ENTERPRISE
--deal-source "SELF_SERVE"         # SELECT: SELF_SERVE, OUTREACH, INBOUND, PARTNER
--required-features "SSO,AUDIT"    # MULTI_SELECT: AUTO_BACKUP, CLOUD_STORAGE, ALL_ADAPTERS, etc.
--stripe-subscription-id "sub_xxx" # TEXT
```

## REST API Direct Access

For operations not covered by the CLI, use curl:

```bash
# Base URL
API="https://api.mollified.app/rest"
TOKEN="$TWENTY_API_KEY"

# List with filters
curl "$API/people?filter=emails.primaryEmail[contains]=@gmail.com&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Create
curl -X POST "$API/people" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":{"firstName":"John","lastName":"Doe"},"emails":{"primaryEmail":"john@example.com"}}'

# Update
curl -X PATCH "$API/people/<ID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadStatus":"QUALIFIED"}'

# Delete
curl -X DELETE "$API/people/<ID>" \
  -H "Authorization: Bearer $TOKEN"

# Batch create
curl -X POST "$API/batch/people" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name":{"firstName":"A"}},{"name":{"firstName":"B"}}]'
```

## GraphQL API

For complex queries, use the GraphQL endpoint:

```bash
curl "https://api.mollified.app/graphql" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ people(first: 10) { edges { node { id name { firstName lastName } emails { primaryEmail } } } } }"}'
```

## Metadata API (Custom Fields)

Create and manage custom fields via the metadata endpoint:

```bash
# List objects
curl "https://api.mollified.app/metadata" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ objects(filter:{isSystem:{is:false}}) { edges { node { id nameSingular } } } }"}'

# Get fields for an object
curl "https://api.mollified.app/metadata" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ object(id:\"<OBJECT_ID>\") { fields { edges { node { name label type options } } } } }"}'

# Create custom field (SELECT example - note: options need id, label, value, color, position)
curl "https://api.mollified.app/metadata" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id name } }",
    "variables": {
      "input": {
        "field": {
          "objectMetadataId": "<OBJECT_ID>",
          "name": "fieldName",
          "label": "Field Label",
          "type": "SELECT",
          "isNullable": true,
          "options": [
            {"id": "<UUID>", "label": "Option A", "value": "OPTION_A", "color": "blue", "position": 0}
          ]
        }
      }
    }
  }'
```

## Webhooks

Configure webhooks in Twenty Settings → Developers → Webhooks:

| Event | Use Case |
|-------|----------|
| `person.created` | Sync new leads to email tools |
| `opportunity.updated` | Alert on deal stage changes |
| `task.created` | Slack notifications |

## Multi-Workspace Support

If managing multiple Twenty workspaces (e.g., MeshGuard, SaveState):

```bash
# Set workspace-specific env vars
MESHGUARD_TWENTY_API_KEY="..."
SAVESTATE_TWENTY_API_KEY="..."

# Use with explicit token
uv run {baseDir}/scripts/twenty.py people --token "$SAVESTATE_TWENTY_API_KEY"
```

## Best Practices

1. **Use notes liberally** — Attach context to every interaction
2. **Link records** — Connect people to companies, tasks to opportunities
3. **Custom fields for segmentation** — Use SELECT fields for filtering
4. **Timeline for audit** — All changes tracked in activity timeline
5. **Batch operations** — Use `/batch/` endpoints for bulk imports

## Related Docs

- [Twenty REST API](https://twenty.com/developers/rest-api)
- [Twenty GraphQL API](https://twenty.com/developers/graphql)
- [Twenty Metadata API](https://twenty.com/developers/metadata)
