/**
 * Dataset.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

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
    tuples: {
      collection: 'tuple',
      via: 'dataset'
    },
    project: {
      model: 'project'
    }
  },

  afterDestroy: function(destroyedRecords, cb) {
    Tuple.destroy({dataset: _.pluck(destroyedRecords, 'id')}).exec(cb);
  }

};

