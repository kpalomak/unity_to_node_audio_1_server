



var testnr = 0;

var fs = 16000;

var packets_per_second = 3;

var packetsize = 4* 6 * Math.floor(fs/packets_per_second/6);

var packetinterval = Math.floor(1000.0/packets_per_second);


var time_to_send_the_final_packet = 0;
var finalpacketsent = 0;

var reader = new FileReader();	

var server_ok = false;

var starttime = 0;

function upload_only() {

    logging = get_new_logdiv();

    //if (server_ok) {
	send_file(logging );
    //}
    //else {
    //	logging += "<br> Server not ready";
    //}

}


function connect_only() {
    connect_and_maybe_test(false);
}


function connect_and_test() {
    connect_and_maybe_test(true);
}

function reinit_and_test() {
    reinit_and_maybe_test(true, null)
}

function connect_and_maybe_test(test) {
    
    // Set up the request.

    logging = get_new_logdiv();

    var server = document.getElementById("server_address").value;
    var transcr = document.getElementById("transcription").value;

    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    var formData = new FormData();

    var sessionstart = new XMLHttpRequest();

    starttime = (new Date()).getTime();



    // Open the connection.
    sessionstart.open('POST', server, true);


    sessionstart.setRequestHeader("x-siak-user", username);
    sessionstart.setRequestHeader("x-siak-password", password);
    sessionstart.setRequestHeader("x-siak-packetnr", "-2");
    sessionstart.setRequestHeader("x-siak-currentword", transcr);
    
    // Set up a handler for when the request finishes.
    //sessionstart.onload = function () {

    sessionstart.onreadystatechange = function(e) {
        if ( 4 == this.readyState ) {
	
	    if (sessionstart.status === 200) {

		server_ok = true;

		logging.innerHTML += "<br>" + timestamp() + " Server started ok!";

		

		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
		    // Great success! All the File APIs are supported.
		} else {
		    alert('The File APIs are not fully supported in this browser.');
		}
		
		if (test) {
		    reinit_and_maybe_test(test, logging); //send_file(logging);
		}
		
	    } else if (sessionstart.status === 502) {
		server_ok=false;
		logging.innerHTML += "<br>-2 Problem: Server down!";

	    } else {
		logging.innerHTML += '<br>-2 Problem: Server responded '+sessionstart.status;
	    }
	}
	else {
	    console.log("sessionstart in state "+this.readyState);
	}
    };

    logging.innerHTML += "<br>" + timestamp() + " Asking the server to start...";    
    sessionstart.send(formData);

}

function reinit_and_maybe_test(test, logging) {
    
    // Set up the request.

    if (logging == null) {
	logging = get_new_logdiv();
    }


    var server = document.getElementById("server_address").value;
    var transcr = document.getElementById("transcription").value;

    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
   

    var formData = new FormData();

    var sessionstart = new XMLHttpRequest();

    starttime = (new Date()).getTime();



    // Open the connection.
    sessionstart.open('POST', server, true);

    sessionstart.setRequestHeader("x-siak-user", username);
    sessionstart.setRequestHeader("x-siak-password", password);
    sessionstart.setRequestHeader("x-siak-packetnr", "-1");
    sessionstart.setRequestHeader("x-siak-current-word", transcr);
    
    // Set up a handler for when the request finishes.
    //sessionstart.onload = function () {

    sessionstart.onreadystatechange = function(e) {
        if ( 4 == this.readyState ) {
	
	    if (sessionstart.status === 200) {

		server_ok = true;

		logging.innerHTML += "<br>" + timestamp() + " Server ready to receive!";		

		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
		    // Great success! All the File APIs are supported.
		} else {
		    alert('The File APIs are not fully supported in this browser.');
		}
		
		if (test) {
		    logging.innerHTML += "<br>" + timestamp() + " Starting file upload!";		
		    
		    send_file(logging);
		}
		
	    } else if (sessionstart.status === 502) {
		server_ok=false;
		logging.innerHTML += "<br>-1 Problem: Server down!";

	    } else {
		logging.innerHTML += '<br>-1 Problem: Server responded '+sessionstart.status;
	    }
	}
	else {
	    console.log("sessionstart in state "+this.readyState);
	}
    };

    logging.innerHTML += "<br>" + timestamp() + " Setting the word to "+transcr +"...";    
    sessionstart.send(formData);

}


function send_file(logging) {
    starttime = (new Date()).getTime();
    var files = document.getElementById("test_file").files;		   
    var f = files[0];
    logging.innerHTML += '<br>' +timestamp() + ' Starting upload of '+f.size+' bytes in chunks of ' +packetsize;
    send_file_in_parts(f, 0, logging);
}


function send_file_in_parts(f, n, logging) {

    var server = document.getElementById("server_address").value;

    var transcr = document.getElementById("transcription").value;

    startbyte= (n)*packetsize;


    endbyte = Math.min( ((n+1) * packetsize)-1, f.size);
   
    logging.innerHTML += "<br>" + timestamp() + "  Sending packet "+n+", bytes "+startbyte+"-"+endbyte;

    var lastpacket = false;
    if (endbyte == f.size || time_to_send_the_final_packet ) {
	lastpacket = true;
	logging.innerHTML += "<br>" + timestamp() + " It's the last packet!";
	finalpacketsent = true;
    }

    
    var blob = f.slice(startbyte, endbyte);
    
    //logging.innerHTML += "<br>" + timestamp() + "  Blob size: "+blob.size;    

    reader.readAsDataURL(blob);     
    //reader.readAsBinaryString(blob);
    //reader.readAsArrayBuffer(blob);
    reader.onloadend = function() {

        //var base64data = reader.result;                
	//remove "data:application/octet-stream;base64," from the beginning:
	//base64data = base64data.substr(37,base64data.length);
	//console.log(base64data.substr(0,200));

	// Encode the String
	//base64data = Base64.encode(reader.result);

	base64data = reader.result;
	//base64data = btoa(reader.result);

	//console.log("Start of this packet before and after removing stuff:");
	//console.log(base64data.substr(0,60));

	base64data = base64data.replace(/^data:application\/octet-stream;base64,/, "");

	//console.log(base64data.substr(0,10)+ " ... " + base64data.substr(base64data.length-10, base64data.length));

	//logging.innerHTML += "<br> base64 string length: "+base64data.length;

	//var formData = new FormData();
	//formData.append('photos[]', base64data);
	

	var username = document.getElementById("username").value;
	var password = document.getElementById("password").value;



	// Set up the request.
	var xhr = new XMLHttpRequest();	
	

	// Open the connection.
	xhr.open('POST', server, true);
	
	xhr.setRequestHeader("x-siak-user", username);
	xhr.setRequestHeader("x-siak-password", password);
	xhr.setRequestHeader("x-siak-packetnr", n);
	xhr.setRequestHeader("x-siak-current-word", transcr);

	xhr.setRequestHeader("x-siak-packet-arraystart", startbyte/4);
	xhr.setRequestHeader("x-siak-packet-arrayend", endbyte/4);
	xhr.setRequestHeader("x-siak-packet-arraylength", (endbyte-startbyte));
	
	xhr.setRequestHeader("x-siak-final-packet", lastpacket);
	
	
	// Set up a handler for when the request finishes.
	xhr.onload = function (reply) {
	    if (xhr.status === 200) {
		logging.innerHTML += "<br>" + timestamp() + " Server says ok!";	
		if (lastpacket) {
		    logging.innerHTML += "<br> server returns <b>" + xhr.responseText +"</b>";
		    time_to_send_the_final_packet = false;
		    finalpacketsent=false;
		}
		else {
		    if (xhr.responseText === "-1") {
			time_to_send_the_final_packet = true;
		    }
		    logging.innerHTML += "<br> server returns <b>" + xhr.responseText +"</b>";

		    if ((!finalpacketsent) && ( (n+1) * packetsize < f.size) )  {
			var myVar = setTimeout( function() {
			    send_file_in_parts(f, ++n, logging)
			}, packetinterval );
		    }
		}
		// File(s) uploaded.
	    } else if (xhr.status === 502) {
		server_ok=false;
		logging.innerHTML += "<br>" + timestamp() + " Problem: Server down!";

	    } else {
		logging.innerHTML += "<br>" + timestamp() + " Problem: Server responded "+ xhr.status;
	    }
	};
	
	// Send the Data.
	xhr.send(base64data);
    }
}


function get_new_logdiv() {
    var parentNode = document.getElementById("logging");
    
    var refChild = document.getElementById("log"+(testnr++));
    
    var logging = document.createElement("div");
    logging.className = 'logpart'
    
    logging.id="log" + testnr;
    
    logging.innerHTML=(new Date()).toString(); 

    parentNode.insertBefore(logging, refChild)

    return logging;
}


function timestamp() {
    return ( (new Date()).getTime() - starttime );
}
