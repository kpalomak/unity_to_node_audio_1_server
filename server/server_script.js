
/*
 * A simple script that receives binary data through HTTP(S) POST in pieces and feeds it to
 * a momentarily non-existent processing script.
 *
 * Intended to do almost-real-time audio processing.
 *
 */

// From: http://stackoverflow.com/questions/13478464/how-to-send-data-from-jquery-ajax-request-to-node-js-server

var http = require('http');
var util = require('util');
var url = require('url');
var fs = require('fs');


var conf = require('./config');

var logging = require('./game_data_handling/logging');
var game_data_handler = require('./game_data_handling/game_data_handler');
var user_handler = require('./game_data_handling/user_handler.js');

var userdata = {};

//var recogniser_client = require('./audio_handling/recogniser_client');
var vad = require('./audio_handling/vad_stolen_from_sphinx');


var segmentation_handler  = new require('./score_handling/a_less_impressive_segmentation_handler.js');

var scorer =  require('./score_handling/fur_hat_scorer.js');

var audioconf = conf.audioconf;
var recogconf = conf.recogconf;


if (process.env.NODE_ENV !== 'production'){
    require('longjohn');
    var debug = true;

    var colorcodes =  {'event' : '\x1b[36mserver %s\x1b[0m' };
}


function debugout(format, msg) {
    if (debug==true) {
	if (msg)
	    console.log(format, logging.get_date_time().datetime + ' ' +msg);
	else
	    console.log( '\x1b[33mserver %s\x1b[0m', logging.get_date_time().datetime  +' '+ format);
    }
}





/*
 *
 *     SUPER-BASIC SERVER LOGIC
 * 
 */




http.createServer(function (req, res) {

    // JSON parsing is problematic on client, so let's leave this out:
    //res.setHeader('Content-Type', 'application/json');

    user_handler.authenticate(req, res,
		 function (err, username, req, res) {
		     if (err) {
			 debugout(username +": user "+username + " password NOT ok!");
			 res.statusCode = 401;
			 res.end( err.msg );			 
		     }
		     else {
			 debugout(username + ": user "+username + " password ok!");
			 if (req.url == "/asr") 
			 {
			     operate_recognition (req, res);
			 }
			 if (req.url == "/log-action")
			 {
			     log_action(req, res);
			 }
			 else if (req.url == "/login")
			 {
			     log_login(req, res);
			 }
			 else if (req.url == "/logout")
			 {
			     log_logout(req, res);
			 }
		     }
		 });

}).listen(process.env.PORT || 8001);

debugout('If you don\'t see errors above, you should have a server running on port '+ (process.env.PORT || 8001) );



/*
 
  Event-driven asynchronous behaviour:
  
  Trigger events are passed through the process event handler - A dedicated event
  handler would be necessary for communicating between processes, so now the user
  is locked into using a single instance for the duration of the game session.


  Nothing stops from having multiple instances of the server running, but players
  need to be assigned to a single server for each session. Some URL coding could be
  added to accomplish this if we start running multiple instances.

 */


/* 
 *   USER EVENTS
 */


process.on('user_event', function(user, wordid, eventname, eventdata) {

    debugout(colorcodes.event, user + ': EVENT: wordid '+wordid +" eventname "+eventname); 

    /*if (eventname == 'segmenter_loaded') {
    	userdata[user].segmenter_loaded = true;
    	userdata[user].currentword.reference = eventdata.word;
    	initialisation_reply(user);
    }
    else*/ if (eventname == 'segmenter_ready') 
    {
	userdata[user].segmenter_ready = true;
	userdata[user].currentword.reference = eventdata.word;	    
	word_select_reply(user);
	
    }
    else 
    {
	if (wordid != get_current_word_id(user)) {
	    debugout(colorcodes.event, user + ": this event is for a word that we are not processing at this time (which would be "+get_current_word_id(user)+")");
	}
	else
	{		    
	    if (eventname == 'last_packet_check' ) {
		check_last_packet(user);	    
	    }
	    else if (eventname ==  'send_audio_for_analysis' ) {
		asyncAudioAnalysis(user);	    
	    }
	    else if (eventname ==  'features_done') {
		userdata[user].currentword.featureprogress [eventdata.packetcode] = eventdata.maxpoint;
		userdata[user].currentword.featuresdone = userdata[user].currentword.featureprogress [0]

		for (var n = 1; n < userdata[user].currentword.featureprogress.length; n++) {
		    if (userdata[user].currentword.featuresdone !== 0 && userdata[user].currentword.featureprogress[n] > 0) {
			userdata[user].currentword.featuresdone = userdata[user].currentword.featureprogress[n]
		    }
		}
		//check_feature_progress(user);
	    }
	    else if (eventname == 'segmented' ) {
		segmentation = eventdata.segmentation;
		if (segmentation.length > 0) {
		    
		    userdata[user].currentword.segmentation = userdata[user].segmentation_handler.shell_segmentation_to_state_list(segmentation);
		    userdata[user].currentword.segmentation_complete = true;

		    userdata[user].segmentation_handler.get_classification( userdata[user].currentword.segmentation, userdata[user].featuredata  );
		    
		    //var likelihood = -100.0*Math.random();
		    scorer.fur_hat_scorer(user, userdata[user].currentword.reference, wordid, userdata[user].currentword.segmentation);
		}
		else 
		{
		    debugout(colorcodes.event, user + ": SEGMENTATION FAILED!");
		    userdata[user].currentword.segmentation = null;	
		    userdata[user].currentword.segmentation_complete = true;

		    // Segmentation failed, let's send a zero score to the client:
		    send_score_and_clear(user, "1", null);
		}
		    
		//check_feature_progress(user);

	    }
	    else if (eventname ==  'segmentation_error') {
		userdata[user].currentword.segmentation = null;
		userdata[user].currentword.segmentation_complete = true;
	
		debugout(colorcodes.event, user +": SEGMENTATION FAILED!");
		send_score_and_clear(user, "-2", null);
		
		//check_feature_progress(user);
	    }	
	    else if (eventname == 'classification_done') {
		userdata[user].currentword.phoneme_classes = eventdata.classification

		debugout(colorcodes.event, user +": CLASSIFICATION DONE AND THERE IS NO WAY FORWARD!");
		// While debugging with Aleks we don't want to rely on the ASR component
		// calc_score_and_send_reply(user);				
		
	    }
	    else if (eventname == 'scoring_done') {
		send_score_and_clear(user, eventdata.total_score, eventdata.phoneme_scores);
	    }
	    else  {
		debugout(colorcodes.event, user + ": Don't know what to do with this event!");
	    }
	}
    }
});




/*
 *
 *   HTTP REPLY FUNCTIONS
 * 
 */


// Reply to initialisation call:
function initialisation_reply(user) {    
    userdata[user].initreply.end( "ok" );
}

// Reply to word selection call:
function word_select_reply(user) {
    debugout("Replying: "+ userdata[user].currentword.reference);
    userdata[user].readyreply.end( userdata[user].currentword.reference );
}


// Reply to an audio packet call:
function audio_packet_reply(user,res, packetnr, usevad) {
    /* Acknowledge client with message:
       
       0:  ok, continue
       -1: ok, that's enought, stop recording
       
       We'd like to get the stop command from a VAD module (that checks there has been
       enough speech before new silence segments) but as we don't have that yet, let's
       just use some arbitrary limits set in conf file (rather than hard coding! 
       Surprisingly good style, isn't it?)
    */
    if ( (userdata[user].currentword.vad.speechend > 0 ) ||
 	 (packetnr == conf.audioconf.packets_per_second * conf.temp_devel_stuff.good_utterance_length_s ) ) {
	res.end( "-1" );
    }
    else if (packetnr > -1) {
	res.end( "0" );
    } 
}

// Reply to the last packer call:
function send_score_and_clear(user, total_score, phoneme_scores) {

    userdata[user].lastPacketRes.end( total_score.toString() );
    
    logging.log_scoring({user: user,
			 packetcount: userdata[user].currentword.lastpacketnr,
			 word_id : userdata[user].currentword.id,
			 score: total_score, 
			 reference : userdata[user].currentword.reference,
			 phoneme_scores : phoneme_scores,
			 segmentation: userdata[user].currentword.segmentation, 
			 //classification: userdata[user].currentword.phoneme_classes 
			});
    
    clearUpload(user)
    
}




/*
 *
 *     A BIT MORE COMPLEX SERVER LOGIC: RECEIVING AUDIO
 * 
 */


var operate_recognition = function (req,res) {
    user = req.headers['x-siak-user'];
    packetnr = req.headers['x-siak-packetnr'];

    finalpacket = req.headers['x-siak-final-packet'];

    debugout( '\x1b[33m\x1b[1mserver %s\x1b[0m', user + ": Received packet for ASR! user: "+user + " packetnr: "+packetnr +" lastpacket? "+finalpacket);

    debugout("Should I init userdata?");
    // If recovering from a server crash or otherwise lost:
    if (!userdata.hasOwnProperty(user)) {	
	debugout("Init userdata!");
	init_userdata(user);
    }

    // TODO: Implement user authentication and logging!!!

    /* Packet nr -2 is used to initialise the recogniser */
    if (packetnr == -2) {
	logging.log_event({user: user, event: "initialise"});

	//debugout("Time for init reply");
	//initialisation_reply(user);
    } 

    /* Packet nr -1 is used to set the word: */
    else if (packetnr == -1) {

	userdata[user].currentword.reference = req.headers['x-siak-current-word'];	
	logging.log_event({user: user, event: "set_word", word: userdata[user].currentword.reference});

    }	

    /* Packets from 0 onward carry chunked audio data. Last packet has 'x-siak-final-packet' header set to true. */
    else {
	/* With first packet write the beginning to a log */
	if (packetnr == 0 ) {
	    logging.log_event({user: user, event: "start_audio", wordid: userdata[user].currentword.id, word: userdata[user].currentword.reference});		
	} 

	finalpacket = req.headers['x-siak-final-packet'];

	if (finalpacket == "true") {
	    userdata[user].currentword.lastpacketnr=packetnr;
	}	    
	
	/* As the audio buffer from the game is transferred in chunks, the following
	   headers tell where to place the data in our buffer (as there is a chance that
	   the HTTP packets arrive in a mixed-up order. Length is redundant as start and
           end are defined. */

	arraystart = parseInt(req.headers['x-siak-packet-arraystart']);
	arrayend = parseInt(req.headers['x-siak-packet-arrayend']);
	arraylength = parseInt(req.headers['x-siak-packet-arraylength']);
	
	var postdata = ''; // collect the datachunks here and on 'end' copy the data to a reusable buffer
    }

    req.on('data', function (chunk, encoding) {
	/* HTTP data transfer happens in chunks; Node makes sure the data arrives in a proper
	   order so we can just simply append to the end: */
	postdata += chunk;

    });
    
    req.on('end', function () {
	/* As the HTTP call ends (no more data chunks) it would be time to reply.
	   But as some of the things we want to do take time, we'll store the reply objects 
	   in out great central userdata object for later processing: */
	debugout("Req end! "+packetnr);
	if (packetnr == -2) {
	    debugout("Time for init reply");
	    userdata[user].initreply = res;
	    initialisation_reply(user);
	}
	else if (packetnr == -1) {		
	    userdata[user].readyreply = res;
	    set_word_and_init_recogniser(user, userdata[user].currentword.reference,userdata[user].currentword.id );	

	}	    
	else {
	    if (array_contains(userdata[user].currentword.analysedpackets, packetnr))
	    {
		/* Sometimes we fail to reply, and some nosy clients try to resend their call.
		   That would mess up our careful data processing system, so let's ignore those
		   recalls. */
		debugout(user + ": Packet "+packetnr +" already processed - The client tried resending?");		
	    }
	    else 
	    {
		/* Process the audio data: Decode, copy to our user buffer and send for
		   processing, together with the reply object */
		
		// For debug let's write the received data in the debug dir:
		if (debug) { fs.writeFile("upload_data/debug/"+user+"_packet_"+packetnr, postdata); }
	    	

		// Decode the received data (base64 encoded binary)
		decodedchunks=new Buffer(postdata, 'base64');
		
		// Announce our honorable intentions to do a copy from buffer to buffer:
		debugout( user + ":Copying from index " + 0 + "-"+  decodedchunks.length +
			  " in source to "+ (arraystart*audioconf.datatype_length) + "-"+   + 
			  ( (arraystart*audioconf.datatype_length) + decodedchunks.length ) +
			  " in target buffer (length "+decodedchunks.length+")" );
		
		decodedchunks.copy( // src buffer
		    userdata[user].audiobinarydata, // targetbuffer
		    arraystart*audioconf.datatype_length, // targetstart
		    0, // sourcestart
		    decodedchunks.length); //source-length	 	    
		

		// What was my idea here?
		debugout(user + ": userdata[user].bufferend = Math.max( "+
			 (arrayend)*audioconf.datatype_length+","+
			 userdata[user].currentword.bufferend+")");


		userdata[user].currentword.bufferend = Math.max( (arrayend)*audioconf.datatype_length, 
								 userdata[user].currentword.bufferend);		

		
		processDataChunks(user, userdata[user].currentword.id, res, packetnr);		
	    }
	}
    });    
}



/*
 *
 *  SOME GAME CONTINUITY FUNCTIONS
 * 
 */



function get_game_data(user) {
    return game_data_handler.getData(user);
}


function set_game_data(user, new_data) {
    return game_data_handler.setData(user,new_data);
}




/*
 *
 *  SOME REAL FUNCTIONALITY:
 *
 *  1: Init user data structure on first call
 *     (and reinit when necessary) 
 */


function init_userdata(user) {
    if (typeof userdata[user] == 'undefined') {
	userdata[user] = {};

	// Initialise all the buffers with zeros:

	userdata[user].chunkeddata = new Buffer( audioconf.max_packet_length_s * 
						 audioconf.fs * 
						 audioconf.datatype_length ,0);

	userdata[user].audiobinarydata = new Buffer( 
	    audioconf.max_utterance_length_s * audioconf.fs * audioconf.datatype_length ,0);

	userdata[user].featuredata = new Buffer( 
	    Math.ceil(audioconf.max_utterance_length_s * 
		      audioconf.fs / 
		      audioconf.frame_step_samples * 
		      audioconf.feature_dim ) ,0);	

	userdata[user].segmenter_ready = false;

	// Let's remove this for a while: Init a new recogniser for each word!
	// init segmenter / recogniser:
	//userdata[user].segmenter = new recogniser_client(recogconf, user, "init_segmenter");		
	
	// init segmentation handler / classifier:

	userdata[user].segmentation_handler = new segmentation_handler(user);

    }
    clearUpload(user);
}


function clearUpload(user) {
    
    userdata[user].chunkeddata.fill(0);	   
    userdata[user].audiobinarydata.fill(0);
    userdata[user].featuredata.fill(0);

    word = {};

    word.id = get_next_word_id(user);

    word.reference = null;
    word.recresult = false;

    word.packetset=[];
    word.lastpacketnr=-2;
    word.analysedpackets=[];

    word.speechstart=-1;
    word.speechend=-1;

    word.bufferend=0;
    word.sent_to_analysis=0;
    word.sent_to_recogniser = 0;
    
    word.featuresdone= 0;
    word.featureprogress = [];
    word.analysed = 0;
    
    word.segmentation_complete = false;
    word.state_statistics = null;
    word.finishing_segmenter = false;

    var vad = {};
    vad.level = 0;
    vad.background = 20;
    vad.speechstart = -1;
    vad.speechend = -1;
    vad.numsil = 0;
    vad.numspeech = 0;

    word.vad = vad;

    userdata[user].currentword = word;



}



/*
 *
 *  2: Set reference word for segmentation:
 *    
 */


function set_word_and_init_recogniser(user, word, word_id) {


    debugout(user + ": set_word_and_init_recogniser("+word+")!");	
    // init segmenter / recogniser:

    //userdata[user].segmenter = new recogniser_client(recogconf, user, word, word_id, "init_segmenter");	
    
    // //userdata[user].segmenter.init_segmenter(word, word_id);

    userdata[user].segmentation_handler.init_classification(word, word_id);

    // Kludging to continue; it really isn't necessary to do use events here but
    // I want to experiment quickly
    process.emit('user_event', user, word_id, 'segmenter_ready',{word:word});

}


/*
 *
 *  3-(n) Take in audio packets and process audio:
 * 
 */



function processDataChunks(user, wordid, res, packetnr) {

    if (wordid != userdata[user].currentword.id) {
	debugout(user +": A very troubling occasion, word ids don't match ("+wordid+"!="+userdata[user].currentword.id);
    }
    else 
    {
	if (array_contains(userdata[user].currentword.analysedpackets, packetnr))
	{
	    debugout(user + ": Packet "+packetnr +" already processed - Where did the request come from?");
	    return;
	}

	// Add the current packetnr to the list of processed packets:
	userdata[user].currentword.analysedpackets.push(packetnr);
	debugout(user + ': Processing packet '+packetnr);

	// Call the asyncAudioAnalysis function (asynchronous processing of new audio data)
	process.emit('user_event', user, wordid,'send_audio_for_analysis', null);

	if (userdata[user].currentword.lastpacketnr < 0) {
	    // We do not know yet what is the last packet.
	    audio_packet_reply(user,res,packetnr, true);
	}
	else {
	    // We know what the last packet is;
	    // If it's not this one, we might have received it earlier and
	    // it's waiting to for the data to be complete:

	    if (packetnr != userdata[user].currentword.lastpacketnr) {
		// We know this is not the last packet, so reply to it quickly:
		audio_packet_reply(user,res,packetnr, false);
	    }
	    else {
		// We're dealing with the last packet; Store the reply object in a safe place
		userdata[user].lastPacketRes=res;
	    }
	    // Let's see if we have received all packets:
	    // Send an event to count packets and proceed

	    process.emit('user_event', user, wordid,'last_packet_check', null);
	}
    }
}



// A somewhat overcomplicated method for checking if all data has been received:
// (But what can you do? We're in a hurry to process the data and there is no 
//  guarantee of the packets arriving in right order.)

function check_last_packet(user) {

    if (!userdata[user].currentword.finishing_segmenter) {

	// Check if we have all the packets in already:    
	var chunkcount = -1;    
	userdata[user].currentword.analysedpackets.forEach( function(element, index, array) {
	    chunkcount++;
	});
	
	// Also, if the VAD has a speech end value, finish audio processing:
	if ((chunkcount == userdata[user].currentword.lastpacketnr)|| (userdata[user].currentword.vad.speechend > -1)) {		
	    // Send a null packet to recogniser as sign of finishing:

	    if (userdata[user].currentword.vad.speechend > -1)
		debugout(user + ": check_last_packet all good - VAD says we're done : Calling Finish_audio");
	    if (chunkcount == userdata[user].currentword.lastpacketnr)
		debugout(user + ": check_last_packet all good - All chunks in : Calling Finish_audio");

	    userdata[user].currentword.finishing_segmenter = true;


	    //userdata[user].segmenter.finish_audio();
	    // Let's send the speech segmnents to the aligner:

	    var sh_aligner = require('./audio_handling/shell_script_aligner');
	    sh_aligner.align_with_shell_script(conf, 
					       userdata[user].audiobinarydata.slice(userdata[user].currentword.vad.speechstart,  
										    userdata[user].currentword.vad.speechend),
					       userdata[user].currentword.reference, 
					       user, 
					       userdata[user].currentword.id); 

	    // For debug let's write the received data in the debug dir:
	    if (debug) { fs.writeFile("upload_data/debug/"+user+"_floatdata", 
				      userdata[user].audiobinarydata.slice(userdata[user].currentword.vad.speechstart,  
									   userdata[user].currentword.vad.speechend) ); 
			 fs.writeFile("upload_data/debug/"+user+"_complete_floatbuffer", 
				      userdata[user].audiobinarydata); 			 
		   }
	    
	    var sh_feat_ext = require('./audio_handling/audio_analyser');

	    sh_feat_ext.compute_features( audioconf,
					  userdata[user].audiobinarydata.slice(userdata[user].currentword.vad.speechstart,  
									       userdata[user].currentword.vad.speechend   ),
					  userdata[user].featuredata,
					  user, 
					  userdata[user].currentword.id,
					  packetnr,
					  userdata[user].currentword.vad.speechend);
	    
	}
	else {
	    debugout(user + ": check_last_packet something missing: chunkcount "+ chunkcount +" !=  userdata[user].currentword.lastpacketnr "+  userdata[user].currentword.lastpacketnr);
	}
    }
}



function asyncAudioAnalysis(user) {

    // Which part of the buffer can be already analysed?

    // Let's suppose for now that the packets arrive in order and so
    // I can send data in in an orderly manner:

    var already_sent_to_analysis = userdata[user].currentword.sent_to_analysis;    
    var already_sent_to_recogniser = userdata[user].currentword.sent_to_recogniser;    

    var analysis_range_start=already_sent_to_analysis;
    var recog_range_start =already_sent_to_recogniser;

    if ( (userdata[user].currentword.vad.speechend > 0)  && ( analysis_range_start > userdata[user].currentword.vad.speechend) ) {
	debugout(user +": Whole package after VAD says we're finished!");	
    }
    else {

	// Are we in speech segments?
	
	/*
	 * OPERATING VOICE ACTIVITY DETECTION
	 */

	// Too many lines here; Move to another file whenever there's time for such luxuries!

	var vadp = { level: userdata[user].currentword.vad.level, 
		     background: userdata[user].currentword.vad.background  };

	for (i=already_sent_to_analysis; i < userdata[user].currentword.bufferend+conf.vad.window; i+= conf.vad.window ) {
	    vadp = vad.classify_frame( userdata[user].audiobinarydata.slice(i, i+conf.vad.window), vadp);
	    
	    if (vadp.is_speech) { 
		userdata[user].currentword.vad.numsil = 0;  
		userdata[user].currentword.vad.numsp += 1;  
	    }
	    else {
		userdata[user].currentword.vad.numsil += 1;  
		userdata[user].currentword.vad.numsp   = 0;  		
	    }

	    if ((userdata[user].currentword.vad.speechstart < 0 ) && 
		(userdata[user].currentword.vad.numsp >= conf.vad.speech_frame_thr)) 
	    {
		userdata[user].currentword.vad.speechstart = Math.max(0, i - (conf.vad.speech_frame_thr * conf.vad.window));		
		debugout(user +": Starting speech at bit "+ userdata[user].currentword.vad.speechstart);
	    }
	    else if ((userdata[user].currentword.vad.speechstart > -1 ) && 
		     ( userdata[user].currentword.vad.speechend < 0 ) && 
		     (userdata[user].currentword.vad.numsil >= conf.vad.sil_frame_thr)) 
	    {
		userdata[user].currentword.vad.speechend = i - (conf.vad.sil_frame_thr * conf.vad.window) ;
		debugout(user +": Ending speech at bit "+ userdata[user].currentword.vad.speechend);
	    }
	}
	userdata[user].currentword.vad.level = vadp.level;	
	userdata[user].currentword.vad.background = vadp.background;	


	// There's overlap in the frames; Windows are by default 
	// 400 samples with a step of 128
	// so for this hypothetical audio data:
	// -------------------------------------------------...
	// |--frame1----|  |--frame5----|  |--frame9----|   ... 
	//     |--frame2----|  |--frame6----|  |--frame10   ...
	//         |--frame3----|  |--frame7----|  |--frame1...
	//             |--frame4----|  |--frame8----|  |--fr...

	// And thus for an arbitrary piece of audio data, we need to 
	// find the previous frame start point (essentially flooring to
	// the closest multiple of framestep (default 128) and

	

	if (analysis_range_start > audioconf.frame_length_samples - audioconf.frame_step_samples) 
	{
	    // if we are not dealing with the first bits of the file, 
	    // take into account the frame overlap (ie. include a bit 
	    // from previous package):
	    
	    analysis_range_start -= 
		Math.floor( audioconf.frame_length_samples / 
			    audioconf.frame_step_samples ) * audioconf.frame_step_samples; 
	}

	// and floor the end to the closesti multiple of framestep:
	// Except if we are dealing with the last packet, we should instead extend the
	// buffer so the last bits of audio signal will be analysed and 
	// fill the buffer with tiny noise for that; Well, we don't seem to be doing it here now.
	
	if (userdata[user].currentword.vad.speechend > -1) {
	    var analysis_range_end = Math.max(userdata[user].currentword.vad.speechend, userdata[user].currentword.bufferend);
	    var recog_range_end= Math.max(userdata[user].currentword.vad.speechend, userdata[user].currentword.bufferend);
	}
	else {
	    var analysis_range_end= (userdata[user].currentword.bufferend);
	    var recog_range_end= userdata[user].currentword.bufferend;
	}
	
	analysis_range_end -= (userdata[user].currentword.bufferend % audioconf.frame_step_samples);	

	// Immediately update the range ends so things don't get called twice!
	
	userdata[user].currentword.sent_to_analysis=analysis_range_end;
	userdata[user].currentword.sent_to_recogniser = recog_range_end;

	if ( (userdata[user].currentword.vad.speechstart > -1) && (analysis_range_end > userdata[user].currentword.vad.speechstart )) {

	    analysis_range_start = Math.max( analysis_range_start, (userdata[user].currentword.vad.speechstart));
	    recog_range_start =  Math.max( recog_range_start, (userdata[user].currentword.vad.speechstart));

	    var analysis_range_length = analysis_range_end - analysis_range_start;

	    var analysis_start_frame =  (analysis_range_start/ audioconf.frame_step_samples);
	    var analysis_end_frame = (analysis_range_end/ audioconf.frame_step_samples);
	    var analysis_frame_length = (analysis_range_length / audioconf.frame_step_samples);
	    
	    var result_range_length = analysis_range_length - Math.floor(audioconf.frame_length_samples/
									 audioconf.frame_step_samples) * audioconf.frame_step_samples;
	    
	    var overlap_frames = Math.ceil((audioconf.frame_length_samples - audioconf.frame_step_samples)/ audioconf.frame_step_samples );
	    
	    userdata[user].currentword.featureend = analysis_end_frame;

	    /*
	    if ( analysis_range_length > 0) {


		var packetnr = userdata[user].currentword.featureprogress.length;
		userdata[user].currentword.featureprogress.push(0);

		// Send data to the DNN feature extractor:
		var audio_analyser = require('./audio_handling/audio_analyser');
		
		audio_analyser.compute_features( audioconf,
						 userdata[user].audiobinarydata.slice(analysis_range_start,analysis_range_end), 
						 userdata[user].featuredata.slice( analysis_start_frame * audioconf.dimensions, 
										   (analysis_end_frame-overlap_frames) * audioconf.dimensions ),
						 user, 
						 userdata[user].currentword.id,
						 packetnr,
						 analysis_range_end);
	    }
	    else 
	    {
		debugout(user +": Audio analysis of length 0 requested ("+analysis_range_start+"-"+analysis_range_end+")... This is bad manners.");

	    }
	    */

	    /*
	    if (recog_range_end-recog_range_start > 0) {
		// Send data to the recogniser processes:
		send_to_recogniser(user, already_sent_to_recogniser, recog_range_end  );
	    }
	    else
	    {
		debugout(user + ": Sending to recogniser data of length 0 requested ("+recog_range_start+"-"+recog_range_end+")... This is bad manners.");
	    }    
	    */


	    /* If the VAD just informed us that the end is near, finish the recognition: */
	    if (userdata[user].currentword.vad.speechend > -1) {
		debugout(user + ": Finishing recognition as VAD says signal ends at "+userdata[user].currentword.vad.speechend);
		process.emit('user_event', user, userdata[user].currentword.id,'last_packet_check', null);
	    }

	}
	else {
	    debugout(user +": VAD says audio has not started yet!");
	}
    }
}





function send_to_recogniser(user, datastart, dataend) {

    // Write the floats into a 16-bit signed integer buffer:
    if (debug) {
	var okcount=0;
	var notokcount = 0;
    }

    pcmdata = new Buffer( (dataend-datastart) /2);
    pcmindex=0;

    for (var i = datastart; i < datastart+(pcmdata.length*2); i+=4) {
	try {
	    pcmdata.writeInt16LE( (userdata[user].audiobinarydata.readFloatLE(i) * 32767), pcmindex );
	    pcmindex+=2;
	    if (debug) okcount++;
	}
	catch (err) {	    
	    pcmindex+=2;
	    //debugout(err.toString());
	    if (debug) notokcount++;
	}
    }
    if (debug && notokcount > 0) {
	debugout(user + ": ERRRRROOOOORRRRRSSSS!!!!!!!!  Bad floats in "+notokcount+" of "+(okcount+notokcount)+" values");
    }

    // Send the 16-bit buffer to recogniser and segmenter processses:
    userdata[user].segmenter.send_audio(pcmdata);  
}






/*
 *
 * A FEW HELPER FUNCTIONS
 *
 */

// From http://stackoverflow.com/questions/237104/how-do-i-check-if-an-array-includes-an-object-in-javascript

function array_contains(array, obj) {
    var i = array.length;
    while (i--) {
       if (array[i] === obj) {
           return true;
       }
    }
    return false;
}

function get_next_word_id(user) {
    if (userdata[user].currentword == null) {
	return 1;
    }
    else {
	return userdata[user].currentword.id +1;
    }
}

function get_current_word_id(user) {
    return userdata[user].currentword.id;
}



