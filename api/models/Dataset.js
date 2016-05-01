/**
 * Dataset.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var profilers = require(sails.config.appPath + '/profilers/config.js');

module.exports = {

  autoPK: false,

  attributes: {
    id: {
      type: 'string',
      primaryKey: true,
    },
    name: {
      type: 'string'
    },
    count: {
      type: 'integer'
    },
    tuples: {
      collection: 'tuple',
      via: 'dataset'
    },
    project: {
      model: 'project'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.tuples;
      delete obj.createdAt;
      delete obj.updatedAt;
      return obj;
    }
  },

  afterDestroy: function(destroyedRecords, cb) {
    Tuple.destroy({dataset: _.pluck(destroyedRecords, 'id')}).exec(cb);
  },

  profile: function(datasets, projectId) {
    var profileSingle = function(dataset) {
      sails.hooks.amqp.publishProfilerTasks(dataset, projectId, profilers);
    }

    // initiate profiler workers
    if (_.isArray(datasets))
      _.forEach(datasets, profileSingle);
    else
      profileSingle(datasets);
  }

};

