---
name: himalaya
description: "CLI to manage emails via IMAP/SMTP. Run `himalaya --help` to get started and discover available commands and their correct flags."
homepage: https://github.com/pimalaya/himalaya
metadata:
  {
    "openclaw":
      {
        "emoji": "📧",
        "requires": { "bins": ["himalaya"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "himalaya",
              "bins": ["himalaya"],
              "label": "Install Himalaya (brew)",
            },
          ],
      },
  }
---

# Himalaya Email CLI

Himalaya is a CLI email client that lets you manage emails from the terminal using IMAP, SMTP, Notmuch, or Sendmail backends.

## References

- `references/configuration.md` (config file setup + IMAP/SMTP authentication)
- `references/message-composition.md` (MML syntax for composing emails)

## Prerequisites

1. Himalaya CLI installed (`himalaya --version` to verify)
2. A configuration file at `~/.config/himalaya/config.toml`
3. IMAP/SMTP credentials configured (password stored securely)

## Configuration Setup

Run the interactive wizard to set up an account:

```bash
himalaya account configure
```

Or create `~/.config/himalaya/config.toml` manually:

```toml
[accounts.personal]
email = "you@example.com"
display-name = "Your Name"
default = true

backend.type = "imap"
backend.host = "imap.example.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "you@example.com"
backend.auth.type = "password"
backend.auth.cmd = "pass show email/imap"  # or use keyring

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.example.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "you@example.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.cmd = "pass show email/smtp"
```

## Common Operations

### List Folders

```bash
himalaya folder list
```

### List Emails

List emails in INBOX (default):

```bash
himalaya envelope list
```

List emails in a specific folder:

```bash
himalaya envelope list --folder "Sent"
```

List with pagination:

```bash
himalaya envelope list --page 1 --page-size 20
```

### Search Emails

Basic search:

```bash
himalaya envelope list from john@example.com subject meeting
```

**Search Query Syntax:**

| Query                 | Description                          |
| --------------------- | ------------------------------------ |
| `subject <pattern>`   | Search by subject                    |
| `from <pattern>`      | Search by sender                     |
| `to <pattern>`        | Search by recipient                  |
| `body <pattern>`      | Search in message body               |
| `flag <flag>`         | Filter by flag (seen, flagged, etc.) |
| `before <yyyy-mm-dd>` | Messages before date                 |
| `after <yyyy-mm-dd>`  | Messages after date                  |

**Operators:** `and`, `or`, `not`

Examples:

```bash
# Find unread emails from a specific sender
himalaya envelope list from boss@company.com not flag seen

# Find emails about "project" in the last week
himalaya envelope list subject project after 2025-01-27
```

### Read an Email

Read email by ID (shows plain text):

```bash
himalaya message read 42
```

Export raw MIME:

```bash
himalaya message export 42 --full
```

### Reply to an Email

Interactive reply (opens $EDITOR):

```bash
himalaya message reply 42
```

Reply-all:

```bash
himalaya message reply 42 --all
```

### Forward an Email

```bash
himalaya message forward 42
```

### Write a New Email

Interactive compose (opens $EDITOR):

```bash
himalaya message write
```

**For non-interactive/programmatic sending, use `template send`:**

```bash
himalaya template send <<EOF
From: you@example.com
To: recipient@example.com
Subject: Test Message

Hello from Himalaya!
EOF
```

> ⚠️ **Note:** `himalaya message write` always opens an interactive editor. Use `himalaya template send` with a heredoc or piped input for automated/scripted email sending.

### Move/Copy Emails

Move to folder:

```bash
himalaya message move 42 "Archive"
```

Copy to folder:

```bash
himalaya message copy 42 "Important"
```

### Delete an Email

```bash
himalaya message delete 42
```

### Manage Flags

Add flag (flags are positional arguments, not options):

```bash
himalaya flag add 42 seen
himalaya flag add 42 flagged
```

Remove flag:

```bash
himalaya flag remove 42 seen
himalaya flag remove 42 flagged
```

Common flags: `seen`, `answered`, `flagged`, `deleted`, `draft`

## Multiple Accounts

List accounts:

```bash
himalaya account list
```

Use a specific account:

```bash
himalaya --account work envelope list
```

## Attachments

Save attachments from a message (downloads to system downloads directory):

```bash
himalaya attachment download 42
```

## Output Formats

Most commands support `--output` for structured output:

```bash
himalaya envelope list --output json
himalaya envelope list --output plain
```

## Debugging

Enable debug logging:

```bash
RUST_LOG=debug himalaya envelope list
```

Full trace with backtrace:

```bash
RUST_LOG=trace RUST_BACKTRACE=1 himalaya envelope list
```

## Common Short Flags

| Short | Long          | Description                 |
| ----- | ------------- | --------------------------- |
| `-s`  | `--page-size` | Number of results per page  |
| `-p`  | `--page`      | Page number                 |
| `-f`  | `--folder`    | Target folder               |
| `-a`  | `--account`   | Account to use              |
| `-o`  | `--output`    | Output format (json, plain) |

Example using short flags:

```bash
himalaya envelope list -f Sent -s 10 -o json
```

## ⚠️ Common Mistakes (DO NOT USE)

These flags/options do NOT exist:

| ❌ Wrong                    | ✅ Correct                                        |
| --------------------------- | ------------------------------------------------- |
| `--limit 10`                | `--page-size 10` or `-s 10`                       |
| `--flag seen`               | `seen` (positional argument)                      |
| `attachment download --dir` | `attachment download` (no dir option)             |
| `message write "body"`      | `template send <<EOF...EOF` (for non-interactive) |

## Tips

- Use `himalaya --help` or `himalaya <command> --help` for detailed usage.
- Message IDs are relative to the current folder; re-list after folder changes.
- For composing rich emails with attachments, use MML syntax (see `references/message-composition.md`).
- Store passwords securely using `pass`, system keyring, or a command that outputs the password.
- **For scripted/automated email sending, always use `template send` with heredoc input, not `message write`.**
