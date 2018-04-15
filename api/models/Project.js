/**
 * Project.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    name: {
      type: 'text',
      unique: true,
      required: true
    },
    deleted:{
      type: 'boolean',
      required: true,
      defaultsTo: false
    },
    datasets: {
      collection: 'dataset',
      via: 'project'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.datasets;
      delete obj.createdAt;
      delete obj.updatedAt;
      return obj;
    }
  },

  afterDestroy: function(destroyedRecords, cb) {
    Dataset.destroy({project: _.pluck(destroyedRecords, 'id')}).exec(cb);
  }
};

