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


$sptk/frame -l $frame_length_samples -p $frame_step_samples <&0 | \
$sptk/window -l $frame_length_samples -L $window_length_samples -w 1 |  \
$sptk/mfcc -l $window_length_samples -m $mceporder -f 0.001 -E
