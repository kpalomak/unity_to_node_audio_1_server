#!/bin/bash -e

set -x

script_dir="$(dirname ${0})"
repository_dir="/home/siak/siak-server"
host="127.0.0.1"
port="5554"
corpus_dir="/home/siak/siak/"
#awk '{gsub(" +","_");print $0}'
wav_name="/home/siak/siak-server/process_audio/S10_chop/S10_pronunciation_1.wav"
path_speaker="../upload_data/from_game/foo/" 

#variable=`date | awk '{gsub(" +","_");print $0}' |awk '{gsub(":+","_");print $0}'`
variable="a"
echo $variable
export PYTHONPATH="${repository_dir}/pyfrontend/src"


#"${script_dir}/test-network-wordlist_katja_pseudo_align_rand.py" "${host}" "${port}" "${corpus_dir}" "log_${variable}.txt"


#"${script_dir}/test-network-wordlist_katja_too.py" "${host}" "${port}" "${corpus_dir}" "log_${variable}.txt"


#"${script_dir}/test-network-wordlist_rob_pseudo_align.py" "${host}" "${port}" "${corpus_dir}" "log_${variable}.txt"

#"${script_dir}/test-network-wordlist_katja_too_model_shrink.py" "${host}" "${port}" "${corpus_dir}" "log_${variable}.txt"

"${script_dir}/word_cross_likelihood_score.py" "too" "$wav_name" "$path_speaker" "log_${variable}.txt"
