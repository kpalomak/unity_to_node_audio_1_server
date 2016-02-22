

var fs = require('fs');

var recog_result = null;

var recog_conf = null;

var client = null;

var connected = false;

var endtag='\x0d\x0a';

var state = 'init';

var audio_queue = [];

var sending_data = false;


var events = require('events');
var eventEmitter = new events.EventEmitter();


function recogniser_client () {
    var dummy  = 1;
}


function init(conf, res, initcallback) {
    var net = require('net');

    var HOST = '127.0.0.1';
    var PORT = 7554;
    
    recog_conf = conf;


    client = new net.Socket();
    client.connect(PORT, HOST, function() {	
	// console.log('CONNECTED TO: ' + HOST + ':' + PORT);
	// Write a message to the socket as soon as the client is connected:
	connected = true;
	define_speaker('foo');

    });
    
    // Add a 'data' event handler for the client socket
    // data is what the server sent to this socket


    client.on('data', function(data) {
	//console.log("Got data! >>>"+data+"<<<");


	if (data.toString().substr(0,23) == '0000000000000000027 200') {

	    //console.log('recogniser says OK (my state is '+state+')');
	    
	    if (state == 'init') {
		console.log(' --> grammar_def');		
		state = 'grammar-def';
		define_grammar(recog_conf.grammar);
	    }
	    else if (state == 'grammar-def') {

		//state = 'word-def';
		//define_word("choose");

		console.log(' --> start_recog');
		state = 'start_recog';
		start_recog();
	    }
	    else if (state == 'word-def') {
		console.log(' --> let\s go segment!');
		state = 'segment';
		initcallback(res);
	    }
	    else if (state == 'start_recog') {
		console.log(' --> let\'s go recognise!');
		state = 'recognise';
		initcallback(res);
	    }
	}
	else if (data.toString().indexOf('RECOGNITION-COMPLETE') > -1) {
	    state = 'got_result';
	    arr =  data.toString().split("\n");
	    if (arr[1].substr(0,20) == 'Completion-Cause:000') {
		word = arr[4];
		console.log("### Recognised \""+word+"\" ###");
	    }
	    else {
		console.log("Something went wrong: \n"+data);
	    }
	    reset_recogniser();
	}
	else { console.log("Does not fit this: "+data);} 



	// Close the client socket completely
	//client.destroy();	
    });
    
    client.on('error', function (err) {
	console.log(err.stack);
    });

    // Add a 'close' event handler for the client socket
    client.on('close', function() {
	console.log('Connection closed');
    });
    
}




function mrcp_message(command, headers, data) {
    
    var msg=' ' + command + endtag;

    headers.forEach( function (item) {
	msg += item.name +":"+item.value+endtag;
    });
    msg += endtag;
    
    if (data) {
	msglength=msg.length+data.length+10;
    } 
    else {
	msglength=msg.length+10;
    }
    
    msgpad=0;
    for (var n =9-(msglength.toString().length); n > 0; n--){
	msgpad += '0';
    }
    
    
    msg=msgpad+(msglength) + msg;
    //console.log("========== msg to recogniser ==========");
    //console.log(msg);
    //console.log("==========/msg to recogniser ==========");
    //console.log("msg to recog: >"+msg+"<");

    
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
    console.log("===================================> Trying to define current word as "+word);
    if (connected) {
	client.write( 
	    mrcp_message (
		'SEGMENT',
		[{'name': 'Reference-Transcript',
		  'value' : word }],
		null ), 
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

function define_speaker(speaker) {
    console.log("===================================> Trying to define current speaker as "+speaker);
    if (connected) {
	client.write( 
	    mrcp_message (
		'SET-PARAMS',
		[{'name': 'Voice-Name',
		  'value' : speaker }],
		null ), 
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

function start_recog() {
    if (connected) {
	client.write( 
	    mrcp_message (
		'RECOGNIZE',
		[{'name': 'Confidence-Threshold',
		  'value' : '0.0' }],
		null ), 
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


function finish_audio() {
    //console.log("###################### FINISHING AUDIO!!!! ###########################");
    send_audio(new Buffer(0));
    
/*      if (connected) {
      client.write(
      mrcp_message (
      'AUDIO',
      [],
      null ), 
      function (err) {
      if (err) {
      console.log(err.stack);
      }			    
      });	
      }
      else {
      console.log("Recogniser not connected yet!");
      }*/
}



function send_audio(data) {
    //console.log("??????????????? Pushing to audio queue! ");
    audio_queue.push(data);
    //console.log("??????????????? Audio queue: ");
    //var ct=0;
    //audio_queue.forEach( function(item) {
    //    console.log("["+(ct++)+ "] Buffer length "+ item.length);
    //});
    process_audio_queue();
}


eventEmitter.on('audio_packages_sent', function () { 
    process_audio_queue();
});


function process_audio_queue() {
    if (connected) {
	if (sending_data == false) {
	    //console.log("???????????? Data sending free to use!");
	    if (audio_queue.length > 0) {
		//console.log("???????????? Packets in queue, let's send");
		sending_data=true;
		data_package = audio_queue.splice(0,1)
		send_audio_packets(data_package[0], 0, 0);
	    }
	}
	//else {
	//    console.log("???????????? Data sending in progress, let's wait");
	//}
    }
    else {
	console.log("Recogniser not connected yet!");
    }
}




function send_audio_packets (data, i, queue_index) {

    //console.log((data.length-i));
    //console.log(recog_conf.packet_size);
    //console.log(Math.min( (data.length-i), recog_conf.packet_size));  

    this_packet_size = Math.min( (data.length-i), recog_conf.packet_size);    
    
    //if (this_packet_size == 0) {
    //	console.log("###################### SIZE 0 PACKET SENT!!!! ###########################");
    //}


    client.write(
	mrcp_message (
	    'AUDIO',
	    [{ 'name' : 'Content-Length',
	       'value' : this_packet_size }],
	    data.slice(i, i+this_packet_size ) ),
	function (err) {
	    //console.log("??????????????? wrote to msg queue, now what?");
	    if (err) {
		//console.log("??????????????? we have error 1: "+err);
		console.log(err.stack);
	    } 
	    else 
	    {
		//console.log("????? Writing to recogniser "+i+"-"+(i+this_packet_size));
		//console.log("data.slice("+i+", "+(i+this_packet_size)+")" );
		//console.log(data.slice(i, i+this_packet_size));
		if (this_packet_size > 0) {
		     client.write( data.slice(i, i+this_packet_size), function (err) {
			 //console.log("??????????????? wrote to msg queue, now what?");

			 if (err) {		
			     //console.log("??????????????? we have error 2: "+err);
			     console.log(err.stack);
			 } else {
			     if (i+this_packet_size < data.length)
			     {
				 i+=recog_conf.packet_size;
				 //console.log("??????????????? calling myself at "+i);
				 setTimeout (function() {
				     send_audio_packets(data,i, queue_index);
				 }, recog_conf.pause_between_packets);
			     }
			     else {
				 //console.log("??????????????? !"+(i+this_packet_size)+" < "+data.length);
				 sending_data = false;
				 eventEmitter.emit('audio_packages_sent');
			     }
			 }
		     });
		}
		else {
		    // Done! This was the last packet.
		    sending_data = false;		    
		}
	    }
	});	 
}



function reset_recogniser() {
    state = 'start_recog';
    start_recog();
}


module.exports = { 
    recogniser_client : recogniser_client,
    init : init,  
    define_grammar: define_grammar,
    define_word : define_word,
    define_speaker : define_speaker,
    start_recog : start_recog,
    send_audio : send_audio,
    finish_audio : finish_audio,
    reset_recogniser: reset_recogniser
    //get_result : get_result
};
