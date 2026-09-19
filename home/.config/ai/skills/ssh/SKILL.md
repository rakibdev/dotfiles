---
name: ssh
description: Execute commands on a remote server via SSH using the bash tool.
---

1. Persistent Connection

```bash
sshpass -p $SSH_PASSWORD ssh -M -S /tmp/ssh -o ControlPersist=30m $SSH_USER@$SSH_HOST 'uname -a'
```
- User sets envs in {PROJECT_DIR}/.env file. Auto-picked

2. Reuse that for subsequent commands, no password needed:

```bash
ssh -S /tmp/ssh $SSH_USER@$SSH_HOST 'cd /var/www/app && git pull'
ssh -S /tmp/ssh $SSH_USER@$SSH_HOST 'npm run build'
ssh -S /tmp/ssh $SSH_USER@$SSH_HOST 'pm2 restart app'
```

- If command asks for password again, socket died; redo step 1
