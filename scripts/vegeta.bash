#!/usr/bin/env bash

: ${FOLDER:="$(pwd)/load-$(date +%s)"}
: ${VEGETA:="$(which vegeta)"}

: ${BUCKETS:='0,100ms,200ms,300ms,400ms,500ms,600ms,700ms,800ms,900ms,1s'}
: ${DURATION:='30s'} # of vegeta attack
: ${RATE:='300'} # requests per second

function load_test {
	sleep 15 # allow warm up
	echo "$1" | "$VEGETA" attack -duration="$DURATION" -rate="$RATE" | tee "$2" | "$VEGETA" report
	sleep 15 # allow cool down
	killall node
}

mkdir -p "$FOLDER" && for NPROC in {1,2,4,8,16,32}; do
	PORT="$((9000 + $NPROC))" LOG="$FOLDER/node.$NPROC.log" URL="http://localhost:$PORT/api/v0/favorites"
	LOG_LEVEL='info' NODE_ENV='load' NPROC=$NPROC PORT=$PORT SSL='false' npm run server &> "$LOG" &
	load_test "GET $URL" "$FOLDER/data.$NPROC.bin" > "$FOLDER/data.$NPROC.txt" # alternate report formats:
	"$VEGETA" report -inputs="$FOLDER/data.$NPROC.bin" -reporter="hist[$BUCKETS]" > "$FOLDER/hist.$NPROC.txt"
	"$VEGETA" report -inputs="$FOLDER/data.$NPROC.bin" -reporter='json' > "$FOLDER/data.$NPROC.json"
	"$VEGETA" report -inputs="$FOLDER/data.$NPROC.bin" -reporter='plot' > "$FOLDER/plot.$NPROC.html"
done
