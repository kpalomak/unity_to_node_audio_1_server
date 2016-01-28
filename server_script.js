
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

var events = require('events');

var fs = require('fs');

// Events needed for data processing:
var eventEmitter = new events.EventEmitter();
var userdata = {};

var audio_analyser = require('./audio_analyser');

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
    'mceplength'             : 13 
};


var debug = true;


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

    if (user) {
	
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
	}
	
	
	packetnr = req.headers['x-siak-packetnr'];
	finalpacket = req.headers['x-siak-final-packet'];
	arraystart = parseInt(req.headers['x-siak-packet-arraystart']);
	arrayend = parseInt(req.headers['x-siak-packet-arrayend']);
	arraylength = parseInt(req.headers['x-siak-packet-arraylength']);
	
	debugout("Packet nr "+packetnr + " finalpacket " +finalpacket+" arraystart " + arraystart+ " arrayend " + arrayend);

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

	req.on('data', function (chunk, encoding) {
	    
	    postdata += chunk;

   	});
	
	req.on('end', function () {
	    userdata[user].packetset[ packetnr ] = 1;
	    
	    // For debug:
	    if (debug) {
		fs.writeFile("upload_data/debug/"+user+"_packet_"+packetnr, postdata);
	    }
	    	
	    decodedchunks=new Buffer(postdata, 'base64');

	    for (n=0; n< decodedchunks.length; n+=4) {
		if (decodedchunks.readFloatLE(n) == 0) {
		    decodedchunks.writeFloatLE( Math.random()/1000.0, n)
		}
	    }	    

	    decodedchunks.copy( // src buffer
		userdata[user].audiobinarydata, // targetbuffer
		arraystart*audioconf.datatype_length, // targetstart
		0, // sourcestart
		decodedchunks.length); //source-length	 	    

	    userdata[user].bufferend = Math.max( (arrayend)*audioconf.datatype_length, userdata[user].bufferend);

	    processDataChunks(user, res, packetnr);		
	});
    }
}).listen(process.env.PORT || 8001);

debugout('Server running on port '+ (process.env.PORT || 8001) );


function processDataChunks(user, res, packetnr) {
    debugout('Processing chunks');

    if (!userdata[user].lastpacketnr) {
	// We do not know yet what is the last packet.
	// Do stuff with packet and acknowledge with message:

	res.end( JSON.stringify({msg: "<br>Processing packet "+packetnr+" ---"}) );
	eventEmitter.emit('sendAudioForAnalysis', user);
    }
    else {
	// We know what the last packet is;
	// If it's not this one, we might have received it earlier and
	// it's waiting to for the data to be complete:
	if (packetnr != userdata[user].lastpacketnr) {
	    // Emit an event to the listener holding back the reply to the last packet:

	    res.end( JSON.stringify({msg: "<br>Processing packet "+packetnr+" --- Last packet is "+userdata[user].lastpacketnr }) );
	    eventEmitter.emit('lastPacketCheck', user);
	}
	else {
	    // We're dealing with the last packet; Let's see if we have received all packets:
	    // Count packets, see if it matches our nubmer:

	    userdata[user].lastPacketRes=res;
	    eventEmitter.emit('lastPacketCheck', user);
	}
    }
}


eventEmitter.on('lastPacketCheck', //checkLastPacket);

function (user) {
    
    var chunkcount = -1;    
    userdata[user].packetset.forEach( function(element, index, array) {
	chunkcount++;
    });
    
    if (chunkcount == userdata[user].lastpacketnr ) {	

	syncAudioAnalysis(user);
	    
	debugout('Upload complete, should be finishing processing, but instead just saving the data and clearing');
	
	if (debug) {
	    fs.writeFile("upload_data/debug/"+user+"_floatdata", userdata[user].audiobinarydata.slice(0,userdata[user].bufferend), function(err) {
		if(err) {
		    debugout(err);
		    return;
		}	    
		debugout( "The file was saved!");
		clearUpload(user);	    
	    }); 
	}	
	userdata[user].lastPacketRes.end( JSON.stringify({score: 5.0*Math.random(), msg: "<br>All "+ chunkcount +" packets received!"}) );
    }
    else {
	debugout( "Checking for last: "+chunkcount+" == "+userdata[user].lastpacketnr );
	eventEmitter.emit('sendAudioForAnalysis', user);
    }
});

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

}





eventEmitter.on('sendAudioForAnalysis', // sendDataToAcousticAnalysis);

function (user) {
    syncAudioAnalysis(user);
});

function syncAudioAnalysis(user) {

    // Available packets:
    // userdata[user].packetset

    debugout("sendDataToAcousticAnalysis: user "+user);

    // Which part of the buffer can be already analysed?
    
    // Let's suppose for now that the packets arrive in order and so
    range_start=userdata[user].sent_to_analysis;    

    if (range_start > audioconf.frame_length_samples - audioconf.frame_step_samples) 
    {
	// Take into account the frame overlap:
	range_start -= Math.floor(audioconf.frame_length_samples/audioconf.frame_step_samples)*audioconf.frame_step_samples; 
    }

    range_end= (userdata[user].bufferend - (userdata[user].bufferend % audioconf.frame_step_samples));

    range_length = range_end-range_start;

    result_range_length = range_length - Math.floor(audioconf.frame_length_samples/audioconf.frame_step_samples)*audioconf.frame_step_samples;


    console.log("Sending to analysis: "+ range_start +"..."+range_end +" and receiving "+ range_start + "..." + (range_start+result_range_length) );

    console.log(' inputbuffer length: ' + userdata[user].audiobinarydata.slice(range_start,range_length).length);
    console.log('outputbuffer length: ' + userdata[user].featuredata.slice( range_start, result_range_length ).length);

    audio_analyser.compute_features( audioconf,userdata[user].audiobinarydata.slice(range_start,range_length), userdata[user].featuredata.slice( range_start, result_range_length ));
    
    userdata[user].sent_to_analysis=range_end;

    //fileBuffer = new Buffer(userdata[user].audiopackets[i], "base64");
    //fs.writeFileSync('./upload_data/'+i, fileBuffer);
    
    if (debug) {
	fs.writeFileSync('upload_data/debug/test_feature_'+user, userdata[user].featuredata);
    }
}




















