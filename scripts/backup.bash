#!/usr/bin/env bash

: ${BACKUP_FILE:="$(pwd)/$(date +%s).dump"}

: ${REDIS_CLI:="$(which redis-cli)"}

[[ -x "$REDIS_CLI" ]] || exit 1

for KEY in $("$REDIS_CLI" --raw KEYS 'wedding:albums:*' | sort)
do
	echo -n "$KEY " >> "$BACKUP_FILE"
	"$REDIS_CLI" --raw DUMP "$KEY" | base64 >> "$BACKUP_FILE"
done
