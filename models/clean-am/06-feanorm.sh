#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

mkdir -p "${TRAIN_DIR}/hmm"
feanorm -r "${TRAIN_RECIPE}" -c <(egrep -v '^  (mean|matrix|scale)' "${TRAIN_IM}.cfg") -M normalization -w "${TRAIN_DIR}/hmm/init.cfg"
