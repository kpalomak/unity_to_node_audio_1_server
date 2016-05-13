
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
var gamedatahandler = require('./game_data_handling/game_data_handler');


var userdata = {};

var RecogniserClient = require('./audio_handling/recogniser_client');

var SegmentationHandler  = new require('./score_handling/a_less_impressive_segmentation_handler.js');

var scorer =  require('./score_handling/fur_hat_scorer.js');

var audioconf = conf.audioconf;
var recogconf = conf.recogconf;


if (process.env.NODE_ENV !== 'production'){
    require('longjohn');
    var debug = true;

    var colorcodes =  {'event' : '\x1b[36m%s\x1b[0m' };
}


function debugout(format, msg) {
    if (debug==true) {
	if (msg)
	    console.log(format, msg);
	else
	    console.log( '\x1b[33m%s\x1b[0m', format);
    }
}


/*
 *
 *     USER CONTROL
 * 
 */


/*
 * Extremely lazy user control!
 * 
 * Keep in mind this is not a production system in any way!
 */


var user_credential_file = './users.json';

var passwords = JSON.parse(fs.readFileSync(user_credential_file, 'utf8'));

//var user_data_dir = './users/';

function authenticate(req, res, callback) {
    username = req.headers['x-siak-user'];
    password = req.headers['x-siak-password'];

    //debugout("Authenticating >"+username + "< >" + password +"<!");    

    if (!passwords.hasOwnProperty(username)) {
	debugout('users does not contain '+user);
	err= { error: 101,
		 msg: "unknown username"
	       }
    }
    else if (passwords[username] != password) {
	debugout('password for '+username +' is not '+ password + ' (should be '+passwords[username]+" )");
	err= { error: 102,
		 msg: "username and password do not match"
	       }	
    }
    else
	err = null;
    
    callback( err, username, req, res );

}





/*
 *
 *     SUPER-BASIC SERVER LOGIC
 * 
 */




http.createServer(function (req, res) {

    // JSON parsing is problematic on client, so let's leave this out:
    //res.setHeader('Content-Type', 'application/json');

    authenticate(req, res,
		 function (err, username, req, res) {
		     if (err) {
			 debugout("user "+username + " password NOT ok!");
			 res.statusCode = 401;
			 res.end( err.msg );			 
		     }
		     else {
			 debugout("user "+username + " password ok!");
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

    debugout(colorcodes.event, 'EVENT: user '+user+' wordid '+wordid +" eventname "+eventname); 

    if (eventname == 'segmenter_loaded') {
	userdata[user].segmenter_loaded = true;
	userdata[user].currentword.reference = eventdata.word;
	initialisation_reply(user);
    }
    else if (eventname == 'segmenter_ready') 
    {
	userdata[user].segmenter_ready = true;
	userdata[user].currentword.reference = eventdata.word;	    
	word_select_reply(user);
	
    }
    else 
    {
	if (wordid != get_current_word_id(user)) {
	    debugout(colorcodes.event, "this event is for a word that we are not processing at this time (which would be "+get_current_word_id(user)+")");
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
		check_feature_progress(user);
	    }
	    else if (eventname == 'segmented' ) {
		if (segmentation.length > 0) {
		    
		    userdata[user].currentword.segmentation = userdata[user].segmentation_handler.segmentation_to_state_list(segmentation);
		    userdata[user].currentword.segmentation_complete = true;

		    var likelihood = -100.0*Math.random();
		    scorer.fur_hat_scorer(user, userdata[user].currentword.reference, wordid, userdata[user].currentword.segmentation, likelihood);
		}
		else 
		{
		    debugout(colorcodes.event, "SEGMENTATION FAILED!");
		    userdata[user].currentword.segmentation = null;	
		    userdata[user].currentword.segmentation_complete = true;

		    // Segmentation failed, let's send a zero score to the client:
		    send_score_and_clear(user, "0", null);
		}
		    
		check_feature_progress(user);

	    }
	    else if (eventname ==  'segmentation_error') {
		userdata[user].currentword.segmentation = null;
		userdata[user].currentword.segmentation_complete = true;
		
		check_feature_progress(user);
	    }	
	    else if (eventname == 'classification_done') {
		userdata[user].currentword.phoneme_classes = eventdata.classification
				
		// While debugging with Aleks we don't want to rely on the ASR component
		// calc_score_and_send_reply(user);				
		
	    }
	    else if (eventname == 'scoring_done') {
		send_score_and_clear(user, eventdata.total_score, eventdata.phoneme_scores);
	    }
	    else  {
		debugout(colorcodes.event, "Don't know what to do with this event!");
	    }
	}
    }
});







/*
 *
 *     A BIT MORE COMPLEX SERVER LOGIC: RECEIVING AUDIO
 * 
 */


var operate_recognition = function (req,res) {
    user = req.headers['x-siak-user'];
    packetnr = req.headers['x-siak-packetnr'];

    finalpacket = req.headers['x-siak-final-packet'];

    debugout( '\x1b[33m\x1b[1m%s\x1b[0m', "Received packet for ASR! user: "+user + " packetnr: "+packetnr +" lastpacket? "+finalpacket);


    // TODO: Implement user authentication and logging!!!

    /* Packet nr -2 is used to initialise the recogniser */
    if (packetnr == -2) {
	init_userdata(user);
	logging.log_event({user: user, event: "initialise"});
    } 

    /* Packet nr -1 is used to set the word: */
    else if (packetnr == -1) {

	userdata[user].currentword.reference = req.headers['x-siak-current-word'];	
	set_word_and_init_recogniser(user, userdata[user].currentword.reference,userdata[user].currentword.id );	
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
	if (packetnr == -2) {
	    userdata[user].initreply = res;
	}
	else if (packetnr == -1) {		
	    userdata[user].readyreply = res;
	}	    
	else {
	    if (array_contains(userdata[user].currentword.analysedpackets, packetnr))
	    {
		/* Sometimes we fail to reply, and some nosy clients try to resend their call.
		   That would mess up our careful data processing system, so let's ignore those
		   recalls. */
		debugout("Packet "+packetnr +" already processed - The client tried resending?");		
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
		debugout( "Copying from index " + 0 + "-"+  decodedchunks.length +
			  " in source to "+ (arraystart*audioconf.datatype_length) + "-"+   + 
			  ( (arraystart*audioconf.datatype_length) + decodedchunks.length ) +
			  " in target buffer (length "+decodedchunks.length+")" );
		
		decodedchunks.copy( // src buffer
		    userdata[user].audiobinarydata, // targetbuffer
		    arraystart*audioconf.datatype_length, // targetstart
		    0, // sourcestart
		    decodedchunks.length); //source-length	 	    
		

		// What was my idea here?
		debugout("userdata[user].bufferend = Math.max( "+
			 (arrayend)*audioconf.datatype_length+","+
			 userdata[user].currentword.bufferend+")");


		userdata[user].currentword.bufferend = Math.max( (arrayend)*audioconf.datatype_length, 
								 userdata[user].currentword.bufferend);		

		
		processDataChunks(user, userdata[user].currentword.id, res, packetnr);		
	    }
	}
    });    
}
debugout('If you don\'t see errors above, you should have a server running on port '+ (process.env.PORT || 8001) );



function initialisation_reply(user) {    
    userdata[user].initreply.end( "ok" );
}


function word_select_reply(user) {
    userdata[user].readyreply.end( userdata[user].currentword.reference )
}


function get_game_data(user) {
    return gamedatahandler.getData(user);
}


function set_game_data(user, new_data) {
    return gamedatahandler.setData(user,new_data);
}


function init_userdata(user) {
    if (typeof userdata[user] == 'undefined') {
	userdata[user] = {};

	userdata[user].chunkeddata = new Buffer( audioconf.max_packet_length_s * 
						 audioconf.fs * 
						 audioconf.datatype_length );

	userdata[user].audiobinarydata = new Buffer( 
	    audioconf.max_utterance_length_s * audioconf.fs * audioconf.datatype_length );

	userdata[user].featuredata = new Buffer( 
	    Math.ceil(audioconf.max_utterance_length_s * 
		      audioconf.fs / 
		      audioconf.frame_step_samples * 
		      audioconf.feature_dim ) );	

	//userdata[user].recogniser_ready = false;
	userdata[user].segmenter_ready = false;

	// init recogiser and segmenter:
	//userdata[user].recogniser = new RecogniserClient(recogconf, user, null);

	userdata[user].segmenter = new RecogniserClient(recogconf, user, "init_segmenter");		
	
	userdata[user].segmentation_handler = new SegmentationHandler(user);
	
	debugout("Initialising classifier:");

    }
    clearUpload(user);
}


function set_word_and_init_recogniser(user, word, word_id) {


    debugout("set_word_and_init_recogniser("+word+")!");	
    userdata[user].segmenter.init_segmenter(word, word_id);
    userdata[user].segmentation_handler.init_classification(word, word_id);

    
}



function clearUpload(user) {
    debugout('Clearing upload data');

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

    word.bufferend=0;
    word.sent_to_analysis=0;
    word.sent_to_recogniser = 0;
    
    word.featuresdone= 0;
    word.featureprogress = [];
    word.analysed = 0;
    
    word.segmentation_complete = false;
    word.state_statistics = null;

    userdata[user].currentword = word;


}



function processDataChunks(user, wordid, res, packetnr) {

    if (wordid != userdata[user].currentword.id) {
	debugout("A very troubling occasion, word ids don't match ("+wordid+"!="+userdata[user].currentword.id);
    }
    else 
    {
	if (array_contains(userdata[user].currentword.analysedpackets, packetnr))
	{
	    debugout("Packet "+packetnr +" already processed - Where did the request come from?");
	    return;
	}

	// Add the current packetnr to the list of processed packets:
	userdata[user].currentword.analysedpackets.push(packetnr);
	debugout('Processing packet '+packetnr);

	// Call the asyncAudioAnalysis function (asynchronous processing of new audio data)
	process.emit('user_event', user, wordid,'send_audio_for_analysis', null);
	

	/* // One of these is redundant. Let's go through the event processing queue to make things more clear.
	   // The below code can be removed as soon as things work (again)
	   asyncAudioAnalysis(user)
	  
	if (packetnr > -1) {
	    // Do stuff with packet of audio data: 
	    process.emit('user_event', user, wordid,'send_audio_for_analysis', null);
	}*/

	if (userdata[user].currentword.lastpacketnr < 0) {

	    // We do not know yet what is the last packet.
	    /* Acknowledge client with message:

	       0:  ok, continue
	       -1: ok, that's enought, stop recording

	       We'd like to get the stop command from a VAD module (that checks there has been
	       enough speech before new silence segments) but as we don't have that yet, let's
	       just use some arbitrary limits set in conf file (rather than hard coding! 
	       Surprisingly good style, isn't it?)
	    */
	    if (packetnr == conf.audioconf.packets_per_second * conf.temp_devel_stuff.good_utterance_length_s ) {
		res.end( "-1" );
	    }
	    else if (packetnr > -1) {
		res.end( "0" );
		    //JSON.stringify(		    
		    //{
		    //	msg: "<br>Processing packet "+packetnr+" ---"
		    //} ));
	    }
	}
	else {
	    // We know what the last packet is;
	    // If it's not this one, we might have received it earlier and
	    // it's waiting to for the data to be complete:

	    if (packetnr != userdata[user].currentword.lastpacketnr) {
		// We know this is not the last packet, so reply to it quickly:
		res.end("0");
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

    // Check if we have all the packets in already:    
    var chunkcount = -1;    
    userdata[user].currentword.analysedpackets.forEach( function(element, index, array) {
	chunkcount++;
    });
    
    if (chunkcount == userdata[user].currentword.lastpacketnr ) {		
	// Send a null packet to recogniser as sign of finishing:
	debugout("check_last_packet all good: Calling Finish_audio");
	userdata[user].segmenter.finish_audio();
    }
    else {
	debugout("check_last_packet something missing: chunkcount "+ chunkcount +" !=  userdata[user].currentword.lastpacketnr "+  userdata[user].currentword.lastpacketnr);
    }
}







/*
 *
 *     EVEN MORE COMPLEX SERVER LOGIC: AUDIO ANALYSIS
 * 
 */


function asyncAudioAnalysis(user) {

    // Which part of the buffer can be already analysed?
    // Let's suppose for now that the packets arrive in order and so
    // I can send data in in an orderly manner:

    var already_sent_to_analysis = userdata[user].currentword.sent_to_analysis;    
    var already_sent_to_recogniser = userdata[user].currentword.sent_to_recogniser;    

    var analysis_range_start=already_sent_to_analysis;
    var recog_range_start =already_sent_to_recogniser;


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
    
    var analysis_range_end= (userdata[user].currentword.bufferend - (userdata[user].currentword.bufferend % audioconf.frame_step_samples));
    var recog_range_end= userdata[user].currentword.bufferend;

    // Immediately update the range ends so things don't get called twice!

    userdata[user].currentword.sent_to_analysis=analysis_range_end;
    userdata[user].currentword.sent_to_recogniser = recog_range_end;


    var analysis_range_length = analysis_range_end - analysis_range_start;

    var analysis_start_frame =  (analysis_range_start/ audioconf.frame_step_samples);
    var analysis_end_frame = (analysis_range_end/ audioconf.frame_step_samples);
    var analysis_frame_length = (analysis_range_length / audioconf.frame_step_samples);
    
    var result_range_length = analysis_range_length - Math.floor(audioconf.frame_length_samples/
								 audioconf.frame_step_samples) * audioconf.frame_step_samples;
    
    var overlap_frames = Math.ceil((audioconf.frame_length_samples - audioconf.frame_step_samples)/ audioconf.frame_step_samples );
    
    userdata[user].currentword.featureend = analysis_end_frame;
    /*
    debugout("******** Sending to audio analysis: " + already_sent_to_analysis +"-"+userdata[user].currentword.bufferend +
	     " --> framed to " + analysis_range_start + 
	     " - " + analysis_range_end +
	     " (frames " +
	     (analysis_range_start/ audioconf.frame_step_samples) + "-" +
	     (analysis_range_end/ audioconf.frame_step_samples) + ")");
    
    debugout("******** Waiting in return: " + 
	     " --> framed to " + analysis_start_frame * audioconf.dimensions +
	     " - " + (analysis_end_frame-overlap_frames) * audioconf.dimensions +
	     " (frames " +
	     (analysis_start_frame) + "-" +
	     ((analysis_end_frame-overlap_frames) ) + ")");
    */

    if (analysis_range_length > 0) {


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
	debugout("Audio analysis of length 0 requested ("+analysis_range_start+"-"+analysis_range_end+")... This is bad manners.");

    }
    if (recog_range_end-recog_range_start > 0) {
	// Send data to the recogniser processes:
	send_to_recogniser(user, already_sent_to_recogniser, recog_range_end  );
    }
    else
    {
	debugout("Sending to recogniser data of length 0 requested ("+recog_range_start+"-"+recog_range_end+")... This is bad manners.");
    }




    
}





function send_to_recogniser(user, datastart, dataend) {

    //debugout("************ Sending to recogniser "+(dataend - datastart)+" floats of data!");
    // Write the floats into a 16-bit signed integer buffer:

    pcmdata = new Buffer( (dataend-datastart) /2);

    var okcount=0;
    var notokcount = 0;

    pcmindex=0;

    for (var i = datastart; i < datastart+(pcmdata.length*2); i+=4) {
	try {
	    pcmdata.writeInt16LE( (userdata[user].audiobinarydata.readFloatLE(i) * 32767), pcmindex );
	    pcmindex+=2;
	    okcount++;
	}
	catch (err) {	    
	    pcmindex+=2;
	    //debugout(err.toString());
	    notokcount++;
	}
    }
    if (notokcount > 0) {
	debugout("ERRRRROOOOORRRRRSSSS!!!!!!!!  Bad floats in "+notokcount+" of "+(okcount+notokcount)+" values");

    }

    // Send the 16-bit buffer to recogniser and segmenter processses:

    userdata[user].segmenter.send_audio(pcmdata);
    //userdata[user].recogniser.send_audio(pcmdata);
  
}




function check_feature_progress(user) {



    // Check if it was the last packet:
    if (userdata[user].currentword.lastpacketnr > -1) {

	// Check if we have all the classification features up to the buffer end:    
	if ( userdata[user].currentword.featuresdone  < userdata[user].currentword.sent_to_analysis )
	{
	    // if not, wait...
	    debugout("*** Waiting for more features: ("+ userdata[user].currentword.featuresdone.toString() +" / "+  
		     userdata[user].featureprogress   +
		     " segment: "+userdata[user].segmentation_complete + 
		     " recog: "+ userdata[user].recognition_complete +" ) ")
	}
	else {
	    
	    debugout("*** Data processed up to the bufferend, was it the last packet already? lastpacketnr: "+ userdata[user].currentword.lastpacketnr);
	    
	    if (userdata[user].currentword.segmentation_complete)  {
		
		if (userdata[user].currentword.state_statistics == null) {

		    if (debug) { 
			fs.writeFile("upload_data/debug/"+user+"_waveform_input_float", userdata[user].audiobinarydata.slice(0, userdata[user].currentword.bufferend )); 
			fs.writeFile("upload_data/debug/"+user+"_features_output_float", userdata[user].featuredata.slice(0, userdata[user].currentword.featurebufferend )); 
		    }
		    
		    userdata[user].currentword.state_statistics = "Working...";
		    
		    // We have last packet analysed and a segmentation ready, so let's
		    // calculate statistics and get classification results!
		    
		    userdata[user].segmentation_handler.calculate_statistics(
			userdata[user].currentword.reference,
			userdata[user].currentword.id,
			userdata[user].currentword.segmentation, 
			userdata[user].featuredata.slice(0, userdata[user].currentword.featurebufferend), 
			audioconf);
		}
	    }	   
	}	
    }    
}


function send_score_and_clear(user, total_score, phoneme_scores) {

    debugout("HEAR HEAR; Let's return the results finally!");

    // Send a random number back, as we don't know of any better.
    //wordscore =  Math.round(5.0*Math.random());
    
    
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



