#!/usr/bin/env bash

: ${FOLDER:="$(pwd)/load-$(date +%s)"}
: ${VEGETA:="$(which vegeta)"}

function load_test {
	sleep 1
	echo "$1" | \
		"$VEGETA" attack -duration=20s -rate=5000 | tee "$2" | \
		"$VEGETA" report -reporter="hist[0,100ms,300ms,700ms,1.5s]"
		#"$VEGETA" report
	killall node
}

mkdir -p "$FOLDER" && for NPROC in {1,2,3,4,5,6,7,8,9}; do
	NODE_ENV='load' NPROC=$NPROC PORT=900$NPROC npm run server &> "$FOLDER/node.$NPROC.log" &
	load_test "GET http://localhost:900$NPROC" "$FOLDER/data.$NPROC.bin" &> "$FOLDER/data.$NPROC.txt"
done
