
var conf = require ('../config');

var fs = require('fs');

/*

Stored user and game data:
==========================

username :         String
password :         String

stars :            int
keys :             int

word_stars :       { String : int }
completed_levels : [ int ]

created :          String (ISO date)
last_modified :    String (ISO date)


*/


// constructor:
//function Logging () {    

var getGameData = function(user) {

    try { 
	fs.accessSync(path, fs.F_OK);	
	return gamedata = JSON.parse(fs.readFileSync(getDataFilename(user), 'utf8'));
    } 
    catch(e) {
	return createDatafile(user);
    }
}


var saveGameData = function(user, gamedata) {

    gamedata['last_modified'] = new Date().toISOString();
    var gamedatafile = getDataFilename(user);
    
    fs.writeFile(gamedatafile,
		 JSON.stringify({ gamedata }, null, 4),
		 function(err) {
		     if(err) {
			 process.emit('user_event', user, wordid, 'error', {'error_source':'saving_game_event',
									    'file_to_write': gamedatafile,
									    'error': err });
		     }
		 });
}


var getWordStars = function(user, word) {

    gamedata = getGameData(user);
    if (word in gamedata.word_stars) {
	return gamedata.word_stars[word];
    }
    else return 0
}


var setWordStars = function(user, word, stars) {

    gamedata = getGameData(user);
    if (!(word in gamedata.word_stars) || gamedata.word_stars[word] < stars) {
	gamedata.word_stars[word] = stars;
	saveGameData(user, gamedata);
    }
}



var getCompletedLevels = function(user) {

    gamedata = getGameData(user);
    return gamedata.completed_levels;
}


var setCompletedLevel = function(user, level) {

    gamedata = getGameData(user);
    if (!level in gamedata.completed_levels) {
	gamedata.completed_levels.push(level);
	saveGameData(user, gamedata);
    }
}

	
var getDataFilename = function(user) {
    return conf.gamedatadir+user;
}

var createDatafile = function(user) {
    var now = new Date().toISOString();
    gamedata = { 'username': user,
		 'password' : password,
		 'stars' : 0,
		 'keys' : 0,
		 'word_stars' : {},
		 'completed_levels' : [],
	         'created' : now,
	         'last_modified' : now  }

    fs.writeFile(gamedatafile,
		 JSON.stringify({ gamedata }, null, 4),
		 function(err) {
		     if(err) {
			 process.emit('user_event', user, wordid, 'error', {'error_source':'saving_game_event',
									    'file_to_write': gamedatafile,
									    'error': err });
		     }
		 });
    
    return gamedata;
}




module.exports = { getData: getGameData,
		   getGameData: getGameData,
		   setWordStars : setWordStars,
		   getWordStars : getWordStars,
		   setCompletedLevel : setCompletedLevel,
		   getCompletedLevels : getCompletedLevels,		   
		 };
