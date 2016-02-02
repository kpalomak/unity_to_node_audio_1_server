#!/bin/bash

sptk="/usr/local/bin";

fs=16000;
max_utterance_length_s=10;
max_packet_length_s=1;
datatype_length=4;
frame_step_samples=128;
frame_length_samples=400;
feature_dim=30;
pitch_low=60;
pitch_high=240;
lsforder=15;
lsflength=16;
mceporder=12;
mceplength=13;
window_length_samples=512;


$sptk/pitch -a 0 -s 16 -p $frame_step_samples -L $pitch_low -H $pitch_high | \
$sptk/x2x +fa | awk '{if ($1>0) {print log($1)} else {print "-1.0E10"}}' | \
$sptk/x2x +af
