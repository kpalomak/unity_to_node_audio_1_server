/*
 *
 *     USER CONTROL
 * 
 */

var fs=require('fs');


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
	debugout('users does not contain >'+user+'<');
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





module.exports = { authenticate: authenticate }

