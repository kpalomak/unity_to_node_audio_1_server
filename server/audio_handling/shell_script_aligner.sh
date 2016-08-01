#!/bin/bash



# $1 word_reference
# $2 lexicon
# $3  wavinput
# $4 labelinput
# $5 model
# $6 segmentoutput

#cp $3 "/l/data/siak-server-devel/server/upload_data/from_game/${1}_`date +"%Y-%m-%d-%H-%M-%S"`.wav"

echo $1 ", " $2 ", "  $3 ", " $4 ", " $5 ", " $6

printf "__\n" > $4
#egrep "^$1\(1.0\)" $2 | head -n 1 | cut -d " " -f 2- | tr '[ ]' '[\n]' | iconv -f utf-8 -t ISO-8859-15 >> $4
./audio_handling/get_model.py $1 $2 >> $4
printf "__\n" >> $4

#egrep "^owl\(1.0\)" /home/siak/models/clean-am/train_utf-8.lex | head -n 1 | cut -d " " -f 2- | tr '[ ]' '[\n]' > $4

model=$5 #"/home/backend/models-clean-am/siak_clean_a"

printf  $4

echo "audio=$3 transcript=$4 alignment=$6" | \
    align -i 2 --swins=100000 -b $model -c $model.cfg -r /dev/stdin


