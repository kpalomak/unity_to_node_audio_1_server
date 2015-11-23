

// From: http://stackoverflow.com/questions/13478464/how-to-send-data-from-jquery-ajax-request-to-node-js-server

var http = require('http');
var util = require('util')

var events = require('events');

var fs = require('fs');

// Events needed for data processing:
var eventEmitter = new events.EventEmitter();
var userdata = {};

var audioconf = {
    'fs'                     : 16000,
    'max_utterance_length_s' : 10,
    'max_packet_length_s'    : 1,
    'datatype_length'        : 4
}


function debugout(msg) {
    if (process.env.DEBUG || false) {
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

	    userdata[user].bufferend=0;

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

	req.on('data', function (chunk, encoding) {
            debugout( 'GOT DATA! packet '+packetnr + ' chunk '+ chunkct +' length: '+chunk.length + " encoding: "+encoding);
	    chunk.copy(userdata[user].chunkeddata, startcounter, 0, chunk.length);
	    startcounter+=chunk.length;	
   	});
	
	req.on('end', function () {
	    userdata[user].packetset[ packetnr ] = 1;
	    
	    
	    var beginningbits=0;
	    var newlines = 0;
	    var checksumlen =0;
	    
	    // Remove the non-essential stuff from the beginning and end of 
	    // the data transmission, ie.
	    // 
	    
	    // --lArtHDOLHqiHcR4Z0FcLyxhKik4fCjzT25xHZgSS
	    // Content-Type: application/octet-stream
	    // Content-disposition: form-data; name="X-siak-game-data"; filename="X-siak-game-data.dat"
	    // [data payload]
	    // --lArtHDOLHqiHcR4Z0FcLyxhKik4fCjzT25xHZgSS--
	    
	    while (beginningbits < userdata[user].chunkeddata.length) {
		charread=userdata[user].chunkeddata.readUIntLE(beginningbits);
		//"beginningbit: "+beginningbits+ " value: "+ charread+ " / " + String.fromCharCode(charread));
		if (userdata[user].chunkeddata.readUIntLE(beginningbits) == 10) {
		    newlines++;
		    if (newlines == 1) {
			debugout( "checksumlength: "+(beginningbits+1));
			checksumlen = beginningbits;
		    }
		    else if (newlines == 5) {
			debugout( "the whole header: "+(beginningbits+1));
			beginningbits += 1;
			break;
		    }
		}
		beginningbits+=1;
	    }
	    
	    for (n=beginningbits-12; n<beginningbits+20; n+=4) {
		debugout(userdata[user].chunkeddata.readFloatLE(n));
	    }

	    debugout('...');

	    for (n=(beginningbits+(arraylength*audioconf.datatype_length)-12); 
		 n<(beginningbits+(arraylength*audioconf.datatype_length)+20); n+=4) {
		debugout(userdata[user].chunkeddata.readFloatLE(n));		
	    }

	    userdata[user].bufferend = Math.max( (arrayend)*audioconf.datatype_length, userdata[user].bufferend);	   
	    
	    debugout( "Writing to buffer from " + 
		      (arraystart*audioconf.datatype_length) + 
		      " to "+ 
		      (arraystart*audioconf.datatype_length +userdata[user].chunkeddata.length-beginningbits-checksumlen)+ 
		      //"/"+userdata[user].bufferend +
		      "/"+(arraystart +arraylength)*audioconf.datatype_length);
	    
	    //beginningbits *=4;
	    //endbits=checksumlen*=4;
            //                    src buffer       targetbuffer            targetstart    sourcestart    source-length
	    userdata[user].chunkeddata.copy( // src buffer
		userdata[user].audiobinarydata, // targetbuffer
		arraystart*audioconf.datatype_length, // targetstart
		beginningbits, // sourcestart
		((arraylength+beginningbits)*audioconf.datatype_length) //source-length
	    );
	    
	    processDataChunks(user, res, packetnr);		
	});
    }
}).listen(process.env.PORT || 8000);

debugout('Server running on port '+ (process.env.PORT || 8000) );


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

function checkLastPacket(user) {
    
    var chunkcount = -1;    
    userdata[user].packetset.forEach( function(element, index, array) {
	chunkcount++;
    });
    
    if (chunkcount == userdata[user].lastpacketnr ) {	

	syncAudioAnalysis(user);
	    
	debugout('Upload complete, should be finishing processing, but instead just saving the data and clearing');
	
	fs.writeFile("upload_data/test", userdata[user].audiobinarydata.slice(0,userdata[user].bufferend), function(err) {
	    if(err) {
		debugout(err);
		return;
	    }	    
	    debugout( "The file was saved!");
	    clearUpload(user);	    
	}); 
	
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
    
    userdata[user].audiobinarydata.fill(-1);

    userdata[user].bufferend=0;
}





eventEmitter.on('sendAudioForAnalysis', // sendDataToAcousticAnalysis);

function sendDataToAcousticAnalysis(user) {
    syncAudioAnalysis(user);
});

function syncAudioAnalysis(user) {

    // Available packets:
    // userdata[user].packetset

    debugout("sendDataToAcousticAnalysis: user "+user);

    for (var i = parseInt(userdata[user].analysedpackets); 
	 //typeof(userdata[user].audiopackets[i]) !== 'undefined'; 
	 typeof(userdata[user].packetset[i]) !== 'undefined'; 
	 i++) 
    {
	debugout( "Should be sending packet "+ i +" for analysis but instead saving it to a file:");
	
	//fileBuffer = new Buffer(userdata[user].audiopackets[i], "base64");
	//fs.writeFileSync('./upload_data/'+i, fileBuffer);
	
	userdata[user].analysedpackets=i;	
    }
   
}




















