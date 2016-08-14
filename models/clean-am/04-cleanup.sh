#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

[ -n "${TRAIN_NAME}" ] || { echo "TRAIN_NAME configuration variable not set."; exit 1; }

rm -rf "${WORK_DIR}/${TRAIN_NAME}"
mkdir -p "${WORK_DIR}/${TRAIN_NAME}/align"
