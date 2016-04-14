

var conf = require ('./config');
var fs = require('fs');







// constructor:
//function Logging () {    


var log_event = function( worthy_stuff) {

    var table = 'events';
    insert_to_db( worthy_stuff, table);
} 
    
var log_scoring = function( worthy_stuff ) {

    var table = 'scorings';
    insert_to_db( worthy_stuff, table);

}



var insert_to_db = function( data, table ) {

    var logfile = 'log/'+table+'.txt';

    var thismoment = get_date_time();

    var logdata = "timestamp: \""+thismoment.timestamp+"\"";
   
    logdata += " datetime: \""+thismoment.datetime+"\", ";
    
    Object.keys(data).forEach(function(key){
	logdata += key+": \""+data[key]+"\", ";
    });
    logdata += '\n';
    fs.appendFile(logfile, logdata, function (err) {
	if (err) {
	    console.log('could not write log to file '+logfile);
	}
    });


    data.timestamp = thismoment.timestamp;
    data.timedate = thismoment.datetime;

    var DEBUG="monk:*";

    var db = require ('monk')(conf.database.address);    
    var collection = db.get(table);	

    console.log("Trying to log:");
    console.log(data);
    var promise = collection.find({});
    
    collection.find({}, {}, function (data) {
	console.log("found data from db");
	console.log(data);
    });
    
    collection.insert({name: "foo", data:data}, function(err,doc){
	if (err)  
	{
	    console.log("LOGGING ERROR! (this one in logging.js function log_scoring adding to table "+table+")");
	    console.log(err);
	}
	else {
	    console.log("Logged into "+table );
	    console.log(doc);
	}
	//db.close();

    });


}







function get_date_time() {
    var date = new Date();
    
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    
    var millisec = date.getMilliseconds();

    var year = date.getFullYear();
    
    var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
    
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    
    return { datetime: year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec+":"+millisec, 
	     timestamp: date.toString() };
}


module.exports = { log_event : log_event, log_scoring: log_scoring };
