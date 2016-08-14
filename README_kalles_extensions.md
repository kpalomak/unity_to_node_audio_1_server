Kalle Palomäki SIAK 14.8.2016

I have done a couple of things with node server

1. Faster aligner based on one word models that have been produced from larger models by selecting 
  the HMMs corresponding the target word. The script is this:
	"server/audio_handling/shell_script_aligner_quick.sh"

  One word models are produced by shrink_aku_model.py found elsewhere in Kalle's git additions. 
  In the node server, "server/server_script.js" and "server/audio_handling/shell_script_aligner.js"
  have been modified to use the faster aligner. The aligner uses models that are named based on the target
  word like "too.mc, too.gcl, too.gk, etc.". The configuration and lexicon are however the old ones.

2. Adaptation, which uses the script "server/audio_handling/adaptation_dbg.js". I have also modified 
  "server/server_script.js" and "server/audio_handling/shell_script_aligner.js" to make an example of the
  use of adaptation. Whether the adaptation is on or of is set in the "server/config.js". Adaptation works 
  so that after each word is recorded and aligned the adaptation is started in a separate process in order
  to take advantage of multicore processing. Unfortunately any modifications in "server_script.js" and 
  "shell_script_aligner.js" were done pretty quickly and not nicely due to lack of time, therefore you
  may need to do a bit work on that to make it nice.


3. Scoring by comparing the target word likelihood to likelihoods of background word models using the 
   same target word audio but a set of randomly selected words. This works so that first likelihood
   of the target word is derived using the AaltoASR "align"-method. Then the background model likelihoods
   are computed by using the same audio scored against a number of selected wrong words taken from
   the SIAK-word-lists. If the target word is well pronounced the difference to the background model 
   should be large and positive. The differences are converted to five stars by first making a decision that
   any player will get score 3 or larger if the target word likelihood is larger than the background model
   likelihood. The second the likelihood differences are put in equally spaced percentiles so that the largerst
   positive likelihood differences of a given user get score five and the largest negative differences give
   score zero, and so on. The main tool for this is the python script:

   "server/audio_handling/word_cross_likelihood_score.py"

   I have made an example implementation of this method in the "server/server_script.js" and have also made
   a test script 
   "server/run_scoring_test_cross_word.py"
    
   that runs the method over Katja's recordings and stores scores to python numpy matrices. Presently it is set 
   to run the test five times, each doing different random selection background model words (anchors). You can 
   set it to run also with or without adaptation.

   Regarding the required computation, this method needs to run the aligner over target word and the anchor words 
   the background model each time the player has spoken a word in the game. The latter audio based measure can be 
   done faster as it can do similar processing off-line, or at background.

3. Scoring by comparing the target word likelihood to likelihoods of background audio models using the 
   same target word but a set of randomly different audio files from the same speaker. This works so that 
   first likelihood of the target word is derived using the AaltoASR "align"-method. Then the background model
   likelihoods are computed by using the target word scored against a number of selected wrong audio files taken
   from the same speaker. If the target word is well pronounced the difference to the background model 
   should be large and positive. The differences are converted to five stars by first making a decision that
   any player will get score 3 or larger if the target word likelihood is larger than the background model
   likelihood. The second the likelihood differences are put in equally spaced percentiles so that the largerst
   positive likelihood differences of a given user get score five and the largest negative differences give
   score zero, and so on. The main tool for this is the python script:

   "server/audio_handling/audio_cross_likelihood_score.py"

   and the script running the background model.

   "server/audio_handling/audio_cross_likelihood_background.py

   I have made an example implementation of this method in the "server/server_script.js" and have also made
   a test script 
   "server/run_scoring_test_cross_audio.py"
    
   that runs the method over Katja's recordings and stores scores to python numpy matrices. Presently it is set 
   to run the test five times, each doing different random selection background model words (anchors). You can 
   set it to run also with or without adaptation.
  
   Regarding the required computation this method needs to run only the aligner over the target word each time
   a player speaks a word in the game. The background model could in principle be computed as a background as it
   needs previous audiofiles and the target words. Unfortunately my implementation in the server_script.js is not
   presently well tested and tidy. If you are going to use this, you may need to work on this more.

