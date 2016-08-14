#!/bin/bash -e

script_dir=$(readlink -f "$(dirname $0)")
source "${script_dir}/params.sh"

module purge
module load speech-scripts

cat "${GROUP_DIR}/c/pf-star/train.wav-list" >"${TRAIN_WAVS}"
cat "${GROUP_DIR}/c/pf-star/test.wav-list" >>"${TRAIN_WAVS}"
grep '/c0' "${GROUP_DIR}/c/wsjcam0/train-desk.wav-list" >>"${TRAIN_WAVS}"
grep '/c1' "${GROUP_DIR}/c/wsjcam0/train-head.wav-list" >>"${TRAIN_WAVS}"

cat "${GROUP_DIR}/c/pf-star/train.trn" >"${TRAIN_TRN}"
cat "${GROUP_DIR}/c/pf-star/test.trn" >>"${TRAIN_TRN}"
grep '(c0' "${GROUP_DIR}/c/wsjcam0/train-desk.trn" >>"${TRAIN_TRN}"
grep '(c1' "${GROUP_DIR}/c/wsjcam0/train-head.trn" >>"${TRAIN_TRN}"

replace-oov-words.py --unk '[oov]' \
  <(iconv -f ISO-8859-15 -t UTF-8 "${TRAIN_LEX}") \
  "${TRAIN_TRN}" \
  >"${TRAIN_TRN}".tmp
mv -f "${TRAIN_TRN}".tmp "${TRAIN_TRN}"
