// the format of this module is array of profilers
// a profiler can be a string where it will be loaded as a node module
// or an object with the module name as in "module": <module_name>
// and dependencies (cascades) in "cascade": [<dep1, dep2, ...>]
// recursively, dep1, dep2, ... can be strings or objects
// the idea is to cascade profilers as in a dependency tree
// it is perfectly valid that cascaded profilers look for results stored by previous profilers
// note this is a cascading tree, not a graph, there should be no cycles

module.exports = [
  // "messytables",
  // "fdminer",
  {
    module: "messystreams",
    cascade: [
      "semantic"
    ]
  },
  "outliers"
];
