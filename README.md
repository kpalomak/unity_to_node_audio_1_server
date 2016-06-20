# Unity to Node audio transfer 1: server
## Branch _"aligning_with_align"_

Receives speech audio chunks from a [Unity c#-client srcipt]
(https://github.com/rkarhila/unity_to_node_audio_2_client), 
passes them to a recogiser backend.

## What does it do?

* Receive HTTP packets in port $PORT (or 8001 if $PORT not set).

   (Maybe you want to set nginx to remove prefix from HTTPS calls 
   and forward them to this port?)

* Pass audio packets to a speech recogniser backend (not included 
in this repo)

* Read output from recogniser, perform some evaluation tricks and
return a guess on the quality of pronunciation of the speech
segment.

* Also, some game information is saved and loaded. The game will 
make billions of dollars and lift Finland out of economic depression,
but it is a top secret research project, so tell nobody what you just
read.


## Running the server

The server uses very few node add-ons. Install them and run 
`cd server; npm install; node server_script.js`. Of course you need to have 
nodejs installed, for which compiling latest version from sources is 
recommended.

Setting this server up as a system service is left for later.

Some hard-coded stuff in the files for now. We'll get rid of them
"real soon."


### Some technicalities:

#### Testing the server

Simple HTML page + some javascript is provided to test the server
without access to the unmentionable game.

This you can find the files under `static_testing/`. Copy to your
public html or set nginx to serve them directly. To avoid 
cross-domain posting hassle, they should be served from the same
host that runs the server.


#### Files (what is happening and where)

`server/`
* `server_script.js` _The main server logic_
* `config.js` _the necessary local settings__
* `audio_handling/`
  * `audio_analyser.js` _pipes the audio data and result buffer to audio_analyser_all.sh_
  * `audio_analyser_all.js` _runs the feature extraction script and writes the features to a given buffer_
  * `audio_analyser_all.sh` _uses SPTK to create 30dim features from audio data (not required yet!)_
  * ~~`recogniser_client.js` _runs the recogniser backend instance(s)_~~ Deprecated and will be removed.
  * `shell_script_aligner.js` _runs the speech recognition aligner using a shell script_
  * `shell_script_aligner.sh` _this is the shell script that runs the Aalto-ASR aligner_
  * `vad_stolen_from_sphinx.js`_a simple VAD from CMU Sphinx project (have to update license to give credit to this one!)_
  * `test_vad_with_wav.js` _an terminal utility for getting the speech frames for a wav file. Included just for testing__
* `game_data_handling/`
  * `logging.js` _writes log files of player activity_
  * `game_data_handler.js` _saves and loads player progress_
  * `user_handler.js`_Handles authentication **Left out of version control**_
* `scoring_handling/`
  * ~~`segmentation_handler.js` _takes the segmentation and tries to do some classification with it (in the future)_~~ Deprecated and will be removed.
  * `a_less_impressive_segmentation_handler.js` _supposed to run the segment classification in the near future_
  * `fur_hat_scorer.js` _This is a skeleton for a simple scoring module_
* `log/` _game logs will be written here_
* `upload_data/` _user speech data and features will be written here_
  * `debug/` _used to write weird stuff for debugging_
* `package.json` _node package information_
* `users.json` _sample users to use for testing while I'm building real user managemenr_

`static_testing/`
* `testing.html` _for testing the server without the game client_
* `test_the_siak_server.js`


_The following will be removed soon:_
`client/`
`theano_socket/`

#### Calls and returns:

`/asr` takes some comlplicated calls with loads of information in headers and returns either an ack (0), a _stop recording command_ (-1) or, for the last packet, a score for the speech segment (1-5).

`/level-complete` will add $level to the list of unlocked levels

`/log-action` will log the game action (moving, interacting with board otherwise)

`/login` starts the session, fires up the recogniser backend and returns a list of unlocked levels (in what format?)

`/logout` _NOT IMPLEMENTED_

#### Headers:

Authentication carried in all packets (no session control on server!):
```
x-siak-user
x-siak-password
```

Metadata for speech segments:
```
x-siak-current-word
x-siak-final-packet
x-siak-packet-arraystart
x-siak-packet-arrayend
x-siak-packet-arraylength
```



#### Stored user and game data:

```
username :         String
password :         String

stars :            int
keys :             int

word_stars :       { String : int }
completed_levels : [ int ]

created :          String (ISO date)
last_modified :    String (ISO date)
```