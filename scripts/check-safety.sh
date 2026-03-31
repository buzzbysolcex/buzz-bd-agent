#!/bin/bash
# Buzz Production Safety Guard — blocks destructive commands
CMD="$1"
BLOCKED=(
  "rm -rf /"
  "rm -rf /*"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE"
  "docker rm"
  "docker stop buzz"
  "docker kill"
  "systemctl stop"
  "systemctl disable"
  "ufw disable"
  "iptables -F"
  "iptables -X"
  "passwd"
  "userdel"
  "deluser"
  "shutdown"
  "reboot"
  "mkfs"
  "dd if="
  "> /dev/sda"
  "chmod 777"
  "chown root"
  "solana-deployer"
  "SOL_DEPLOY_KEYPAIR"
  "SOL_PRIVATE"
)
for pattern in "${BLOCKED[@]}"; do
  if echo "$CMD" | grep -qi "$pattern"; then
    echo "BLOCKED by check-safety.sh: matches '$pattern'"
    echo "Command: $CMD"
    exit 1
  fi
done
exit 0
