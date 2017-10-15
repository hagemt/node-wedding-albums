#!/usr/bin/env bash

function thumbnail {
	convert -thumbnail "$3x$4" "$1" "$2" && file "$2"
}

DIRECTORY="$(dirname $0)/2017-08-20"
for PADDED in $(seq --format="%04g" 1 1170); do
	thumbnail "$DIRECTORY/fullsize/$PADDED.jpg" "$DIRECTORY/thumbnail/$PADDED.png" 300
done
