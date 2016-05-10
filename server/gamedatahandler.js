
var conf = require ('./config');

var fs = require('fs');



// constructor:
//function Logging () {    

var getData = function(user) {

    try { 
	fs.accessSync(path, fs.F_OK);	
	return gamedata = JSON.parse(fs.readFileSync(getDataFilename(user), 'utf8'));
    } 
    catch(e) {
	return createDatafile(user):	
    }
}


var updateData = function(user, word_id, new_data) {
    gamedata = getData(user);

    // Loop through keys of the new_data object
    // and replace old data with new

    var change = false;

    Object.keys(new_data).forEach(function(key) {
	if (gamedata[key] !== new_data[key]) {
	    gamedata[key] = new_data[key];
	    change = true;
	}
    });
    
    
    // Write back to the file:
    if (change) {

	gamedata['last_modified'] = new Date().toISOString();

	var gamedatafile = getDataFilename(user);

	fs.writeFile(gamedatafile,
		     JSON.stringify({ gamedata }, null, 4),
		     function(err) {
			 if(err) {
			     process.emit('user_event', user, wordid, 'error', {'error_source':'saving_game_event',
										'file_to_write': gamedatafile,
										'error': err }););
			 }
		     });
    }
}
		
var getDataFilename = function(user) {
    return conf.gamedatadir+user;
}

var createDatafile(user) = function(user) {
    gamedata = { 'username': user,
	         'created' : new Date().toISOString() }

}




module.exports = { getData: getData
		   updateData: updateData };
