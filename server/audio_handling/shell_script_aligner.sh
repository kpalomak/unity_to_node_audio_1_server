#!/bin/bash



# $1 word_reference
# $2 lexicon
# $3  wavinput
# $4 labelinput
# $5 recipeinput
# $6 segmentoutput

cp $3 "/l/data/siak-server-devel/server/upload_data/from_game/${1}_`date +"%Y-%m-%d-%H-%M-%S"`.wav"

egrep "^$1\(1.0\)" $2 | head -n 1 | cut -d " " -f 2- | tr '[ ]' '[\n]' > $4

model="/home/backend/models-clean-am/siak_clean_a"


echo "audio=$3 transcript=$4 alignment=$6" | \
    align -i 2 --swins=100000 -b $model -c $model.cfg -r /dev/stdin


