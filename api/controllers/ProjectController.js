/**
 * ProjectController
 *
 * @description :: Server-side logic for managing projects
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	subscribe: function(req, res) {
    if (!req.isSocket) return res.badRequest("Request must be in a websocket");
    var projectId = req.params.id;
    if (!projectId) return res.badRequest("Missing trailing /:projectId ");
    sails.sockets.join(req, projectId);
    res.ok();
  },
  unsubscribe: function(req, res) {
    if (!req.isSocket) return res.badRequest("Request must be in a websocket");
    var projectId = req.params.id;
    if (!projectId) return res.badRequest("Missing trailing /:projectId ");
    sails.sockets.leave(req, projectId);
    res.ok();
  },
  find: function(req, res) {
    Project.find({deleted: false}).sort("createdAt").exec(function(err, projects){
      return res.json(projects)
    });
  },
  destroy: function(req, res) {
    var projectId = req.params.id;
    Project.update({id: projectId},{deleted: true}).exec(function(err, updatedProject){
      return res.json(updatedProject);
    });
  }
};

