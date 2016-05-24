/**
 * Tuple.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const ORDER_COLUMN = '__order';

module.exports = {

  // No defined attributes, tuples are schemaless and are arbitrary, per dataset
  attributes: {
    dataset: {
      model: 'dataset'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.dataset;
      delete obj.createdAt;
      delete obj.updatedAt;
      delete obj.id;
      delete obj[ORDER_COLUMN];
      return obj;
    }
  },

  ORDER_COLUMN: ORDER_COLUMN

};

