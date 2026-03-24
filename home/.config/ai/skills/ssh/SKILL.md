---
name: ssh
description: Execute commands on a remote server via SSH using the bash tool.
---

1. Connect

```bash
sshpass -p $SSH_PASSWORD ssh $SSH_USER@$SSH_HOST 'uname -a'
```

> Note: Env vars exposed. Assume exist.

2. Reuse that session to run subsequent commands:

```
bash: command="cd /var/www/app && git pull\n", sessionId="3"
bash: command="npm run build\n", sessionId="3"
bash: command="pm2 restart app\n", sessionId="3"
```

When you use `sessionId` it reuses same shell. No sshpass needed after first-time.
