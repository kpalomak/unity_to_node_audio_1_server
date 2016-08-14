#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

"${TRAIN_SCRIPTDIR}/train.pl"
