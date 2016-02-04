

var fs = require('fs');

var recog_result = null;

var recog_conf = null;

var client = null;

var connected = false;

function recogniser_client () {
    var dummy  = 1;
}


function init(conf) {
    var net = require('net');

    var HOST = '127.0.0.1';
    var PORT = 7554;
    
    recog_conf = conf;

    client = new net.Socket();
    client.connect(PORT, HOST, function() {	
	// console.log('CONNECTED TO: ' + HOST + ':' + PORT);
	// Write a message to the socket as soon as the client is connected:
	connected = true;

	define_grammar(client, recog_conf.grammar);

    });
    
    // Add a 'data' event handler for the client socket
    // data is what the server sent to this socket
    client.on('data', function(data) {
	if (data.toString().substr(0,25) == 'INFO: Server was started.') {
	    console.log('¤¤¤¤ Recogniser server happily started:');
	}
	else if (data.toString().substr(0,14) == 'DEFINE-GRAMMAR') {
	    console.log('¤¤¤¤ Reply from grammar:');
	    console.log(data.toString());
	    console.log('¤¤¤¤/reply from grammar:');
	}
	else if (data.toString().substr(0,21) == 'SEGMENTATION-COMPLETE') {
	    console.log('¤¤¤¤ Reply from segmentation:');
	    console.log(data.toString());
	    console.log('¤¤¤¤/reply from segmentation:');	    
	}
	else {
	    console.log("¤¤¤¤ RESPONSE: "+data.toString());
	    console.log("¤¤¤¤/RESPONSE");
	}
	// Close the client socket completely
	//client.destroy();	
    });
    
    // Add a 'close' event handler for the client socket
    client.on('close', function() {
	console.log('Connection closed');
    });
    
}


var endtag='\x0d\x0a';

function mrcp_message(command, headers, data) {

    var msg=' ' + command + endtag;

    headers.forEach( function (item) {
	msg += item.name +":"+item.value+endtag;
    });
    msg += endtag;

    msg += data;
    
    msgpad='';
    for (var n =(''+(msg.length+10)).length; n > 0; n--){
	msgpad += '0';
    }

    msg=msgpad+(msg.length+10)+msg;
    console.log("========== msg to recogniser ==========");
    console.log(msg.substr(0, Math.min(msg.length, 50)));
    console.log("==========/msg to recogniser ==========");

    return msg;
}

function define_grammar(grammar) {

    client.write(
	mrcp_message( 
	    'DEFINE-GRAMMAR',
	    [{'name':'Content-Location',
	      'value': 'words.conf'}],
	    null ),	    
	function(err) {
	    if (err) {
		console.log(err.stack);
	    }
	    else {
		dummy = 1;

	    }
	});	
}


function define_word(word) {
    if (connected) {
	client.write( 
	    mrcp_message (
		'SEGMENT',
		[{'name': 'Reference-Transcript',
		  'value' : word }],
		audio ), 
	    function (err) {
		if (err) {
		    console.log(err.stack);
		}			    
	    });	
    }
    else {
	console.log("Recogniser not connected yet!");
    }
}



function send_audio( audio) {
    if (connected) {
	client.write( 
	    mrcp_message (
		'AUDIO',
		[],
		audio ), 
	    function (err) {
		if (err) {
		    console.log(err.stack);
		}			    
	    });	
    }
    else {
	console.log("Recogniser not connected yet!");
    }
}








function get_result() {
    return recog_result;
}



module.exports = { 
    recogniser_client : recogniser_client,
    init : init,  
    define_grammar: define_grammar,
    define_word : define_word,
    send_audio : send_audio,
    get_result : get_result
};
