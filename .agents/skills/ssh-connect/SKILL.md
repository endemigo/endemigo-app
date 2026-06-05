---
name: ssh-connect
description: >
  SSH connection and remote deployment guide. Provides structured rules and commands
  for securely connecting to remote servers, transferring files, and executing commands.
  Trigger: "ssh", "ssh ile baglan", "ssh connection", "deploy to remote", "remote command", "scp", "rsync".
---

This skill guides the agent on how to establish SSH connections, run remote commands, and transfer files to staging/production servers securely and efficiently.

## Core Rules

1. **Security & Key Management:**
   - **Never** print private keys to standard output or log files.
   - Ensure the SSH key file has the correct permissions: `chmod 600 path/to/key`.
   - Prefer SSH keys over password authentication. If password auth is required, prompt the user for input dynamically; do not hardcode.
   - Use `-o StrictHostKeyChecking=accept-new` or `-o StrictHostKeyChecking=no` (for automated/non-interactive scripts) only if the host is trusted.

2. **Non-Interactive Execution:**
   - Always run commands non-interactively. Avoid spawning persistent SSH sessions that expect terminal UI interaction unless absolutely necessary.
   - Pass commands directly: `ssh -i <key> <user>@<host> "command1 && command2"`

3. **Port and Options:**
   - If a custom SSH port is used, specify it with `-p <port>` (e.g., `ssh -p 2202`).

## Commands & Workflows

### 1. Verification of Connection
Before deploying or running complex scripts, test the connection:
```bash
ssh -i <key_path> -o ConnectTimeout=5 <user>@<host> "echo 'Connection OK'"
```

### 2. File Transfer (SCP / Rsync)
Use `rsync` for code updates to save bandwidth and handle syncing efficiently:
```bash
# Using Rsync
rsync -avz --exclude="node_modules" --exclude=".git" -e "ssh -i <key_path>" ./src/ <user>@<host>:/path/to/app/src/

# Using SCP (Single file)
scp -i <key_path> ./config.json <user>@<host>:/path/to/app/
```

### 3. Remote Service Management
To restart services or view logs:
```bash
# Restarting docker-compose service
ssh -i <key_path> <user>@<host> "cd /path/to/app && docker-compose restart"

# Viewing systemd logs
ssh -i <key_path> <user>@<host> "journalctl -u app-name -n 50 --no-pager"
```

## Troubleshooting SSH Issues

- **Permission Denied (publickey):**
  Check if the key is authorized on the remote host (present in `~/.ssh/authorized_keys`) and ensure permissions on host's `~/.ssh` (700) and `~/.ssh/authorized_keys` (600) are correct.
- **Connection Timeout:**
  Verify if the host IP/domain is correct and if the security group/firewall allows access on the SSH port.
- **Host Key Verification Failed:**
  If the remote host's IP/signature changed, use `ssh-keygen -R <host>` to clear the old key.
