
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


var fs = require('fs');

// Events needed for data processing:
//var events = require('events');
//var eventEmitter = require('./emitters.js');
//var eventEmitter = new events.EventEmitter();





var userdata = {};




var audioconf = {
    'fs'                     : 16000,
    'max_utterance_length_s' : 10,
    'max_packet_length_s'    : 1,
    'datatype_length'        : 4,
    'frame_step_samples'     : 128,
    'frame_length_samples'   : 400,
    'feature_dim'            : 30,
    'pitch_low'              : 60,
    'pitch_high'             : 240,
    'lsforder'               : 15,
    'lsflength'              : 16, // Should be order +1
    'mceporder'              : 12,
    'mceplength'             : 13,
    'debug_mfcc'             : false,
    'debug_f0'               : false,
    'debug_lsf'              : false
};

var recogconf = {
    'grammar' : 'words.conf',
    'packet_size' : 2048,
    'pause_between_packets' : 20
}




if (process.env.NODE_ENV !== 'production'){
    require('longjohn');
    var debug = true;
}

function debugout(msg) {
    if (debug==true) {
	console.log(msg);
    }
}



http.createServer(function (req, res) {

    debugout('Request received: ');
    //util.log(util.inspect(req)) // this line helps you inspect the request so 
                                  // you can see whether the data is in the url (GET) 
                                  // or the req body (POST)
    //util.log('Request recieved: \nmethod: ' + req.method + '\nurl: ' + req.url) // this line logs just the method and url

    user = req.headers['x-siak-user'];
    packetnr = req.headers['x-siak-packetnr'];

    if (user) {
	if (packetnr == -1) {
	    init_userdata(user);
	} 

	else {
	    if (packetnr == 0 ) {

		//userdata[user].currentword = req.headers['x-siak-current-word'];	
		//userdata[user].recogniser.define_word( userdata[user].currentword );
	    }
	    
	    finalpacket = req.headers['x-siak-final-packet'];
	    arraystart = parseInt(req.headers['x-siak-packet-arraystart']);
	    arrayend = parseInt(req.headers['x-siak-packet-arrayend']);
	    arraylength = parseInt(req.headers['x-siak-packet-arraylength']);
	    
	    //debugout("Packet nr "+packetnr + " finalpacket " +finalpacket+" arraystart " + arraystart+ " arrayend " + arrayend);
	    
	    userdata[user].thisstart=arraystart;
	    
	    if (finalpacket == "true") {
		lastpacket=packetnr;
		userdata[user].lastpacketnr=packetnr;
	    }
	    else {
		lastpacket = false;
	    }
	    
	    userdata[user].chunkeddata.fill(0);
	    
	    var startcounter=0;
	    var chunkct=0;
	    var postdata = '';
	}

	req.on('data', function (chunk, encoding) {
	    
	    postdata += chunk;

   	});
	
	req.on('end', function () {
	    if (packetnr == -1) {
		userdata[user].recogniser = require('./recogniser_client');
		userdata[user].recogniser.init(recogconf, user, res, function(res) {
		    res.end( JSON.stringify({msg: "<br>Recognition server initialised!"}) );
		});				
	    }
	    else {
		userdata[user].packetset[ packetnr ] = 1;
	    
		// For debug:
		if (debug) { fs.writeFile("upload_data/debug/"+user+"_packet_"+packetnr, postdata); }
	    	
		decodedchunks=new Buffer(postdata, 'base64');
		
		decodedchunks.copy( // src buffer
		    userdata[user].audiobinarydata, // targetbuffer
		    arraystart*audioconf.datatype_length, // targetstart
		    0, // sourcestart
		    decodedchunks.length); //source-length	 	    
		
		userdata[user].bufferend = Math.max( (arrayend)*audioconf.datatype_length, userdata[user].bufferend);		
		processDataChunks(user, res, packetnr);		
	    }
	});
    }
}).listen(process.env.PORT || 8001);


debugout('Server running on port '+ (process.env.PORT || 8001) );




function init_userdata(user) {
    if (typeof userdata[user] == 'undefined') {
	
	userdata[user] = {};
	
	//userdata[user].audiopackets=[];
	userdata[user].packetset=[];
	
	userdata[user].lastpacketnr=-2;
	userdata[user].analysedpackets=0;
	
	userdata[user].features=[];
	userdata[user].audiobinarydata = new Buffer( audioconf.max_utterance_length_s * audioconf.fs * audioconf.datatype_length );
	userdata[user].audiobinarydata.fill(0);
	
	userdata[user].featuredata = new Buffer( Math.ceil(audioconf.max_utterance_length_s * audioconf.fs / audioconf.frame_step_samples * audioconf.feature_dim) );
	userdata[user].featuredata.fill(0);
	
	userdata[user].bufferend=0;
	userdata[user].sent_to_analysis = 0;
	
	userdata[user].chunkeddata = new Buffer( audioconf.max_packet_length_s * audioconf.fs * audioconf.datatype_length );
	userdata[user].featuresdone = [0,0,0];
	userdata[user].analysed = 0;
	
	userdata[user].currentword=null;
	userdata[user].recognised_word=false;
    }
};



function processDataChunks(user, res, packetnr) {
    debugout('Processing chunks');

    if (!userdata[user].lastpacketnr) {
	// We do not know yet what is the last packet.
	// Do stuff with packet and acknowledge with message:

	if (packetnr > -1) {
	    res.end( JSON.stringify({msg: "<br>Processing packet "+packetnr+" ---"}) );
	    process.emit('sendAudioForAnalysis', user);
	}
    }
    else {
	// We know what the last packet is;
	// If it's not this one, we might have received it earlier and
	// it's waiting to for the data to be complete:

	if (packetnr != userdata[user].lastpacketnr) {
	    
	    // We know this is not the last packet, so reply to it quickly:
	    res.end( JSON.stringify({msg: "<br>Processing packet "+packetnr+" --- Last packet is "+userdata[user].lastpacketnr }) );
	    

	    // Emit an event to the listener holding back the reply to the last packet
	    // (This is just for the odd possibility that packages would arrive
	    // in a strange order.)
	    process.emit('lastPacketCheck', user);


	}
	else {
	    // We're dealing with the last packet; Let's see if we have received all packets:
	    // Count packets, see if it matches our nubmer:

	    userdata[user].lastPacketRes=res;
	    process.emit('lastPacketCheck', user);
	}
    }
}


process.on('lastPacketCheck', //checkLastPacket);
	   function(user) 
	   {
	       checkLastPacket(user);
	   });


function checkLastPacket(user) {
    
    var chunkcount = -1;    
    userdata[user].packetset.forEach( function(element, index, array) {
	chunkcount++;
    });
    

    // Check if we have all the packets in already:
    if (chunkcount == userdata[user].lastpacketnr ) {	
	
	syncAudioAnalysis(user);
	
	// Send a null packet to recogniser as sign of finishing:
	console.log('==((===))=== Finishing audio:');
	userdata[user].recogniser.finish_audio();
	
	debugout('Upload complete, should be finishing processing, but instead just saving the data and clearing');
	
	if (debug) {
	    fs.writeFile("upload_data/debug/"+user+"_floatdata", userdata[user].audiobinarydata.slice(0,userdata[user].bufferend), function(err) {
		if(err) {
		    debugout(err);
		    return;
		}	    
		debugout( "The file was saved!");
		//clearUpload(user);	    
	    }); 
	}	
    }
    else {
	debugout( "Checking for last: "+chunkcount+" == "+userdata[user].lastpacketnr );
	process.emit('sendAudioForAnalysis', user);
    }
}


function clearUpload(user) {
    debugout('Clearing upload data');

    //userdata[user].audiopackets=[];
    userdata[user].packetset=[];

    userdata[user].lastpacketnr=-2;

    userdata[user].analysedpackets=0;
    
    //userdata[user].audiobinarydata.fill(-1);
    //userdata[user].featuredata.fill(-1);

    userdata[user].bufferend=0;
    userdata[user].sent_to_analysis=0;

    userdata[user].featuresdone= [0,0,0];

    userdata[user].analysed = 0;
    userdata[user].currentword=null;
    userdata[user].recognised_word = false;
}





process.on('sendAudioForAnalysis', // sendDataToAcousticAnalysis);	   
	   function (user) {
	       syncAudioAnalysis(user);
	   });

function syncAudioAnalysis(user) {

    // Available packets:
    // userdata[user].packetset

    //debugout("sendDataToAcousticAnalysis: user "+user);


    // Which part of the buffer can be already analysed?
   

    // Let's suppose for now that the packets arrive in order and so
    range_start=userdata[user].sent_to_analysis;    

    if (range_start > audioconf.frame_length_samples - audioconf.frame_step_samples) 
    {
	// Take into account the frame overlap:
	range_start -= Math.floor( audioconf.frame_length_samples / audioconf.frame_step_samples) * audioconf.frame_step_samples; 

    }

    range_end= (userdata[user].bufferend - (userdata[user].bufferend % audioconf.frame_step_samples));

    range_length = range_end-range_start;

    result_range_length = range_length - Math.floor(audioconf.frame_length_samples/audioconf.frame_step_samples)*audioconf.frame_step_samples;


    //console.log("Sending to analysis: "+ range_start +"..."+range_end +" and receiving "+ range_start + "..." + (range_start+result_range_length) );
    //console.log(' inputbuffer length: ' + userdata[user].audiobinarydata.slice(range_start,range_length).length);
    //console.log('outputbuffer length: ' + userdata[user].featuredata.slice( range_start, result_range_length ).length);


    // Send data to the DNN feature extractor:

    var audio_analyser = require('./audio_analyser');

    audio_analyser.compute_features( audioconf,
				     userdata[user].audiobinarydata.slice(range_start,range_length), 
				     userdata[user].featuredata.slice( range_start, result_range_length ),
				     user,
				     range_end);


    // Send data to the recogniser process:

    send_to_recogniser(user, userdata[user].audiobinarydata.slice(
	    userdata[user].sent_to_analysis,
	    range_end ) );
    
    userdata[user].sent_to_analysis=range_end;


    if (debug) {
	fs.writeFileSync('upload_data/debug/test_feature_'+user, userdata[user].featuredata);
    }
}



function send_to_recogniser(user, floatdata) {

    console.log("************ Sending to recogniser "+floatdata.length+" floats of data!");

    //userdata[user].recogniser.send_audio(floatdata);

    pcmdata = new Buffer(floatdata.length/2);

    for (var i = 0; i < pcmdata.length; i+=2) {
	pcmdata.writeInt16LE( (floatdata.readFloatLE(i*2) * 32767), i );
    }
    userdata[user].recogniser.send_audio(pcmdata);
  

//    // This was for debug purposes:  
//    if (Buffer.isBuffer(userdata[user].pcm)) {
//	userdata[user].pcm = Buffer.concat([userdata[user].pcm, pcmdata]);
//    } else {
//	userdata[user].pcm = pcmdata;
//    }

}




process.on('mfccDone', function (user, packetcode) { 
    //console.log( '   // Received event: // mfcc '+packetcode+' done for '+user); 
    userdata[user].featuresdone[0] = Math.max( userdata[user].featuresdone[0], packetcode );    
    check_feature_progress(user);
});

process.on('lsfDone', function (user, packetcode) { 
    //console.log( '   // Received event: // lsf '+packetcode+' done for '+user); 
    userdata[user].featuresdone[1] = Math.max( userdata[user].featuresdone[1], packetcode );    
    check_feature_progress(user);
});

process.on('logF0Done', function (user, packetcode) { 
    //console.log( '   // Received event: // logF0 batch '+packetcode+' done for '+user); 
    userdata[user].featuresdone[2] = Math.max( userdata[user].featuresdone[2], packetcode );    
    check_feature_progress(user);
});


process.on('recognised', function(user, word) {
    console.log('   // Received event: // word recognised: "'+word+'" for '+user); 
    userdata[user].recognised_word = word;
    check_feature_progress(user);
});


function check_feature_progress(user) {
    if ( (Math.min.apply (Math,userdata[user].featuresdone) > userdata[user].analysed ) && (userdata[user].recognised_word) ) {

	// Analyse up to the new max point.
	var maxpoint =  Math.min.apply (Math, userdata[user].featuresdone);
	//debugout("*** Got data up to "+ maxpoint + ", lastpacket="+userdata[user].lastpacketnr);
	
	userdata[user].analysed = maxpoint;
	
	if (maxpoint => userdata[user].bufferend) {
	    
	    if (userdata[user].lastpacketnr > 0) {
		debugout("*** Last packet, here goes!" );
		
		if (debug) { 
		    if (Buffer.isBuffer(userdata[user].pcm)) {
			fs.writeFileSync('upload_data/debug/pcm_'+user, userdata[user].pcm);
			
		    }
		}
		    
		
		// Send a random number back, as we don't know of any better.
		userdata[user].lastPacketRes.end( JSON.stringify(
		    {score: 5.0*Math.random(), 
		     recognised_word: userdata[user].recognised_word,
		     msg: "<br>All " + userdata[user].lastpacketnr +" packets received!"}) );
		
		clearUpload(user)
	    }
	}
	
	//userdata[user].featuresdone = [false,false,false];
    }
    else {
	debugout("*** Waiting for more features ("+ userdata[user].featuresdone.toString() +" / "+  Math.min.apply (Math, userdata[user].featuresdone)   +")")
    }
    
}

