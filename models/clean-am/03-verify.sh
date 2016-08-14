#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

verify-train-files.py "${TRAIN_RECIPE}" "${TRAIN_TRN}" "${TRAIN_LEX}" "${TRAIN_IM}.ph"
