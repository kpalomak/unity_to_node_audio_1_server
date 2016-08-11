#!/usr/bin/python
import numpy

name_audio_s10='audio_scores_for_reima/S10_pronunciation_score_mat_rounds_5.npy'
name_word_s10='word_scores_for_reima/S10_score_mat_rounds_5.npy'

data_audio_s10=numpy.sum(numpy.load(name_audio_s10),0)
data_word_s10=numpy.sum(numpy.load(name_word_s10),0)

print numpy.size(data_audio_s10), numpy.size(data_word_s10)

print numpy.corrcoef(data_audio_s10, data_word_s10)
