var bcrypt = require('bcryptjs'),
    Q = require('q');

// MongoDB connection information
var mongodbUrl = 'mongodb://hussein:123456@ds143221.mlab.com:43221/heroku_pvgc3m6k';
var MongoClient = require('mongodb').MongoClient


//
// exports.findOrCreate = function (profile, cb) {
//   MongoClient.connect(mongodbUrl, function (err, db) {
//     var collection = db.collection('users');
//
//     collection.find({'provider' : profile.provider, 'id' : profile.id}).toArray(function(err, result) {
//         if (!result[0]) {
//
//             var user = {
//               "provider" : profile.provider,
//               "id" : profile.id,
//               "displayName": profile.displayName,
//               "avatar": profile.photos[0].value
//             }
//
//             console.log("CREATING USER:", profile.displayName);
//
//             collection.insert(user, function () {
//                 db.close();
//                 return cb(null, profile);
//
//           });
//         }
//         else{
//             db.close();
//             return cb(null, profile);
//         }
//
//     })
//
//       });
//
// }



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
            //   "_id" : profile.id,
              "displayName": profile.displayName
            }
            user[profile.provider+"Id"] = profile.id;

            if(profile.photos){
                user["avatar"] = profile.photos[0].value;
            } else {
                user["avatar"] = "http://placepuppy.it/images/homepage/Beagle_puppy_6_weeks.JPG";
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
