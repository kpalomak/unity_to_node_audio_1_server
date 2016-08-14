#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

module purge
module load AaltoASR
module load mitfst

"${TRAIN_SCRIPTDIR}/align.pl"
