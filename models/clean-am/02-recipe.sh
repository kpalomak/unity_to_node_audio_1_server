#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

align_dir="${WORK_DIR}/${TRAIN_NAME}/align"

sed -r 's!^(.*)/([^/]*)\.(wav|FI0)$!audio=\1/\2.\3 transcript='"${align_dir}"'/\2.phn alignment='"${align_dir}"'/\2.phn hmmnet='"${align_dir}"'/\2.hmmnet utterance=\2!' \
"${TRAIN_WAVS}" \
>"${TRAIN_RECIPE}"
