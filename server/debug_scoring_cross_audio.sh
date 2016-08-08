#!/bin/bash

./audio_handling/audio_cross_likelihood_background.py pig upload_data/from_game/foo upload_data/from_game/foo/S 0 /home/siak/models/clean-am/words.lex

./audio_handling/audio_cross_likelihood_score.py pig upload_data/from_game/foo/foo_1_pig_20160807-214043-808.wav upload_data/from_game/foo upload_data/from_game/foo/S 0 /home/siak/models/clean-am/words.lex
