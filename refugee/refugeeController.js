var Refugee = require('./refugeeSchema');
var Match = require('./../match/matchSchema');
var Education = require('./../education/educationSchema');
var Experience = require('./../experience/experienceSchema');
var Certificate = require('./../certificate/certificateSchema');

var async = require('async');
var _ = require('lodash');
var moment = require('moment');

// Create endpoint /api/refugee/:refugee_id for GET
module.exports.getRefugee = function(req, res) {
    // Use the Refugee model to find a specific refugee
    Refugee.findById(req.params.refugee_id, function(err, refugee) {
        if (err) {
            res.status(500).send(err)
            return;
        };

        res.json(refugee);
    });
};

// Create endpoint /api/refugee/:refugee_id for PUT
module.exports.putRefugee = function(req, res) {
    // Use the Refugee model to find a specific refugee and update it
    Refugee.findByIdAndUpdate(
        req.params.refugee_id,
        req.body,
        {
            //pass the new object to cb function
            new: true,
            //run validations
            runValidators: true
        }, function (err, refugee) {
        if (err) {
            res.status(500).send(refugee_id);
            return;
        }
        res.json(refugee);
    });
};

module.exports.findRefugees = function (req, res) {
  if(!req.query.job) {
    var jobNotFound = new Error('Job field is missing');
    res.status(400).send(jobNotFound);
    return;
  }
  async.seq(
    function(cb) {
      var refugeeQuery = {};

      if (req.query.location) {
        refugeeQuery.city = req.query.location;
      }

      if (req.query.skill) {
        refugeeQuery['skills.name'] = req.query.skill;
      }

      if (req.query.gender) {
        refugeeQuery.gender = req.query.gender;
      }

      if (req.query.age) {
        var ages = _.split(req.query.age, '-');
        var endAge = Number.parseInt(ages[0]);
        var startAge = Number.parseInt(ages[1]);
        var startDate = moment().subtract(startAge, 'years');
        var endDate = moment().subtract(endAge, 'years');
        refugeeQuery.$and = [
          {
            dateOfBirth: {
              $lte: endDate.toDate()
            }
          },
          {
            dateOfBirth: {
              $gte: startDate.toDate()
            }
          }
        ];
      }
      Refugee
        .find(refugeeQuery)
        .populate('city skills.name')
        .exec(function (err, refugees) {
          if (err) {
            cb(err);
            return;
          }
          cb(null,refugees);
        });
    },
    function(refugees, cb) {
      if (_.isEmpty(refugees)) {
        cb(null, []);
        return;
      }
      var filteredRefugees = [];
      var matchQuery = {
        company: req.query.user,
        job: req.query.job,
        isAddedByCompany: true
      };

      Match
        .find(matchQuery)
        .exec(function (err, matches) {
          if (err) {
            cb(err);
            return;
          }
          if (!_.isEmpty(matches)) {
            _.each(matches, function(match) {
              _.each(refugees, function(refugee) {
                if (refugee._id !== match.refugee) {
                  filteredRefugees.push(refugee);
                }
              });
            });
          } else {
            filteredRefugees = refugees;
          }
          cb(null, filteredRefugees);
        });
    }
  )(function(err, refugees) {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.status(200).json(refugees);
  });
};

module.exports.updateResume = function (req, res) {
	var myresume = req.body.params.refugee;
  var refugee_id = req.body.params.refugee._id;
	var myquery = { _id: req.body.params.refugee._id };
	delete myresume._id;

	// create educations if available
	var retainEducation = [];
	myresume.education = [];
	for (var i=0; i<req.body.params.education.length; i++) {
		var myeducation = req.body.params.education[i];
		// check if there is _id then just change isDeleted to false it, if no then means new one
		if (myeducation.hasOwnProperty("_id")) {
			retainEducation.push(myeducation._id);
			myresume.education.push(myeducation._id);
		} else {
			var newEducation = new Education(myeducation);
			newEducation.save(function(saveError,createdEdu) {
				if (saveError) {
				  res.status(500).send(saveError);
				  return;
				}
				myresume.education.push(createdEdu._id);
			});
		}
	}

	// delete educations if available and not in retain
	var eduQuery = { refugee : refugee_id, _id: { $nin: retainEducation } };
	var eduData = { $set : { "isDeleted" : true } };
	Education.update(eduQuery, eduData, { multi: true }, function(errEd, resEd) {
		if (errEd) {
          res.status(500).send(errEd);
          return;
        }
	});
	// create experiences if available
	var retainExperience = [];
	myresume.experience = [];
	for (var i=0; i<req.body.params.experience.length; i++) {
		var myexperience = req.body.params.experience[i];
		// check if there is _id then just change isDeleted to false it, if no then means new one
		if (myexperience.hasOwnProperty("_id")) {
			retainExperience.push(myexperience._id);
			myresume.experience.push(myexperience._id);
		} else {
			var newExperience = new Experience(myexperience);
			newExperience.save(function(saveError,createdExp) {
				if (saveError) {
				  res.status(500).send(saveError);
				  return;
				}
				myresume.experience.push(createdExp._id);
			});
		}
	}
	// delete experiences if available and not in retain
	var expQuery = { refugee : refugee_id, _id: { $nin: retainExperience } };
	var expData = { $set : { "isDeleted" : true } };
	Experience.update(expQuery, expData, { multi: true }, function(errEx, resEx) {
		if (errEx) {
          res.status(500).send(errEx);
          return;
        }
	});
	// create certificates if available
	var retainCertificate = [];
	myresume.certificate = [];
	for (var i=0; i<req.body.params.certificate.length; i++) {
		var mycertificate = req.body.params.certificate[i];
		// check if there is _id then just change isDeleted to false it, if no then means new one
		if (mycertificate.hasOwnProperty("_id")) {
			retainCertificate.push(mycertificate._id);
			myresume.certificate.push(mycertificate._id);
		} else {
			var newCertificate = new Certificate(mycertificate);
			newCertificate.save(function(saveError,createdCert) {
				if (saveError) {
				  res.status(500).send(saveError);
				  return;
				}
				myresume.certificate.push(createdCert._id);
			});
		}
	}

	// delete certificates if available and not in retain
	var certQuery = { refugee : refugee_id, _id: { $nin: retainCertificate } };
	var certData = { $set : { "isDeleted" : true } };
	Certificate.update(certQuery, certData, { multi: true }, function(errCer, resCer) {
		if (errCer) {
          res.status(500).send(errCer);
          return;
        }
	});
	Refugee.updateOne(myquery, myresume, function(err, result) {
		if (err) {
          res.status(500).send(err);
          return;
        }
        res.status(200).send({'status' : 'successful'});
	});

};

// Create endpoint /api/refugee/refugees for POST
module.exports.getRefugees = function(req, res) {

    // Use the Refugee model to find refugees in array
	var myquery = { _id: { $in: req.body.params.refugee_ids } };
    Refugee.find(myquery, function(err, refugees) {
        if (err) {
            res.status(500).send(err)
            return;
        };

        res.json(refugees);
    });
};
