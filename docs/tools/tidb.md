---
summary: "TiDB tool (mysql CLI) for durable structured storage and analysis"
read_when:
  - You want to store/query large structured data in TiDB
  - You use TiDB Cloud and have a Connect panel .env snippet
---

# TiDB tool

Clawdbot ships a `tidb` tool that talks to **TiDB over the MySQL protocol** by invoking the local `mysql` CLI.

Use it when you want results to be **durable and queryable** (analysis, reporting, large tables), not for small ephemeral notes.

## Quick setup with TiDB Cloud (recommended)

In TiDB Cloud, open your cluster **Connect** panel:

1) Set **Connect With** → **.env**
2) Copy the block like:

```bash
DB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USERNAME='your.cluster.id.root'
DB_PASSWORD='<PASSWORD>'
DB_DATABASE='test'
```

3) Paste it into the **gateway host** env file:

```bash
cat >> ~/.clawdbot/.env <<'EOF'
DB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USERNAME='your.cluster.id.root'
DB_PASSWORD='<PASSWORD>'
DB_DATABASE='test'
EOF
```

4) Enable the tool in `~/.clawdbot/clawdbot.json`:

```json5
{
  tools: {
    tidb: { enabled: true }
  }
}
```

That is it. Clawdbot will read `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE` automatically.

Notes:
- For `*.tidbcloud.com` hosts, Clawdbot defaults to `mysql --ssl-mode=VERIFY_IDENTITY`.
- Credentials in env vars are visible to the gateway process; use a dedicated database user with minimal privileges.

## Alternative: Connection string (copy, do not build by hand)

If TiDB Cloud shows a **General** connection string like:

```text
mysql://your.cluster.id.root:<PASSWORD>@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test
```

Put it directly into `~/.clawdbot/.env` as `TIDB_URL`:

```bash
cat >> ~/.clawdbot/.env <<'EOF'
TIDB_URL=mysql://your.cluster.id.root:<PASSWORD>@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test
EOF
```

## Using the tool

Call the `tidb` tool with:
- `sql` (required)
- `database` (optional override)
- `format`: `rows` (default, parses first result set) or `raw`
- `timeoutSeconds` (optional)

Example:

```sql
SELECT VERSION();
```

See also: [Env vars](/help/faq#env-vars-and-env-loading).

