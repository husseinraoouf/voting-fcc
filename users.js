var bcrypt = require('bcryptjs'),
    Q = require('q'),
    MongoClient = require('mongodb').MongoClient;


var config = require('./config.js');

// MongoDB connection information
var mongodbUrl = config.mongodbUri;


exports.findOrCreate = function (profile, cb) {
  // var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection('users');
    var obj = {'provider': profile.provider};
    obj[profile.provider+"Id"] = profile.id; //prints {key: "value"}

    //check if username is already assigned in our database
    collection.findOne(obj)
      .then(function (result) {
        if (!result) {
            var user = {
              "provider" : profile.provider,
              "username" : profile.displayName,
              "displayName": profile.displayName
            }
            user[profile.provider+"Id"] = profile.id;

            if(profile.photos){
                user["avatar"] = profile.photos[0].value;
            } else {
                user["avatar"] = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
            }

            console.log("CREATING USER:", profile.displayName);

            collection.insert(user, function () {
                // console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n"+JSON.stringify(data)+"\n\n\n\n\n\n\n\n\n\n\n\n\n");
                db.close();
                // deferred.resolve(false); // username exists
                return cb(null, user);
            });
        }
        else  {
            db.close();
            // deferred.resolve(false);
            return cb(null, result);
        }
      });
  });

  // return deferred.promise;
};
