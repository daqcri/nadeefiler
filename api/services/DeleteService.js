var deleteProjects = function (callback) {
  Project.destroy({deleted: true})
         .exec(function(err, result){
            console.log("Deleting " + result.length + " projects");
          });

  callback();
};
var deleteDatasets = function (callback) {
  Dataset.destroy({deleted: true})
          .exec(function(err, result){
            console.log("Deleting " + result.length + " datasets");
          });

  callback();
};

module.exports =  {
  deleteProjects: deleteProjects,
  deleteDatasets: deleteDatasets
}
