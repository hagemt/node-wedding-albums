#!/usr/bin/env bash

for PADDED in $(seq --format="%04g" 1 1170); do
	echo "converting Image #$PADDED ($(pwd)) to thumbnail"
	convert -thumbnail 200x200 "fullsize/$PADDED.jpg" "thumbnail/$PADDED.png"
done
