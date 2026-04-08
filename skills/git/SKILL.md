---
name: git
description: Run git commands on the Odoo modules repo via /home/ubuntu/openclaw-plugins/hooks/odoo-git.sh wrapper.
user-invocable: true
---

# Git Operations

Run git commands on the Odoo custom modules repository.

## How to execute

When the user sends `/git <args>`, run this command using the exec tool:

```
/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh <args>
```

Pass ALL user arguments directly to the script. Do NOT run bare `git` — always use the full wrapper path.

## Repo switching

The wrapper defaults to `/home/ubuntu/odoo_dev/user`. To switch repo, the user prefixes `--repo`:

- `/git --repo openclaw status` → `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh --repo openclaw status`
- `/git --repo plugins pull` → `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh --repo plugins pull`

## Safety

Ask confirmation before: `push --force`, `reset --hard`, `clean -fd`, or push to main/master.

## Examples

| User input | Command to execute |
|---|---|
| `/git status` | `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh status` |
| `/git pull` | `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh pull` |
| `/git log --oneline -5` | `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh log --oneline -5` |
| `/git checkout -b feat/x` | `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh checkout -b feat/x` |
| `/git --repo openclaw status` | `/home/ubuntu/openclaw-plugins/hooks/odoo-git.sh --repo openclaw status` |
