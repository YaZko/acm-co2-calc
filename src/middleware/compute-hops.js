var pending = 0;

module.exports = (app) => {
  return {
    create(data, params) {
      // load in raw json, traverse in order, not efficent and should be refactored.
      // traversing in order is orders of magnitude faster than doing thousands
      // of service calls thru feathers. a trie would be better here but
      // this works fast enough for <3 hops
      const routes = app.routesRaw;
      var graphTraversal = function(src, dest, level = 0, maxLevel = 1, curHistory, results, curDist) {
        if (curHistory.length == 0) {
          curHistory.push(src);
        }
        if (level >= maxLevel) {
          // if this last airport has an edge to our destination, add it to the results list
          for (var i =0; i < routes.length; i++) {
            if ((routes[i].src === src) && (routes[i].dest === dest)) {
              curHistory.push(dest)
              results.push({path: curHistory, dist: curDist+routes[i].dist});
              return;
            }
          }
        } else {
          for (var i = 0; i < routes.length; i+=1) {
            // next follows an edge. it's probably going to be easier to really inefficently
            // enumerate all possible routes
            // we should not yet be at the destination, and we should not make a loop
            if (routes[i].src == src && routes[i].dest !== dest && !curHistory.includes(routes[i].dest)) {
              // curHistory is the current path we're following. when done, append it to results
              const curHistoryCopy = curHistory.slice();
              curHistoryCopy.push(routes[i].dest);
              graphTraversal(routes[i].dest, dest, level+1, maxLevel, curHistoryCopy, results, curDist+routes[i].dist)
            }
          }
        }
      };

      // we're sent {src: 'SYD', dest: 'BWI', hops: 2}
      if (!data || !data.src || !data.dest || !data.hops) {
        return Promise.reject("No data provided");
      }
      if (! data.src instanceof String || !data.dest instanceof String || !data.hops instanceof Number) {
        return Promise.reject("Invalid IATAS, cannot parse");
      }

      if (data.hops > 3 || data.hops < 1) {
        return Promise.reject("Invalid number of hops (must be between 1 and 3)")
      }

      const numHops = parseInt(data.hops);

      return new Promise((fulfill, reject) => {
        var results = [];

        // given SYD, start results at ['SYD'], 0
        graphTraversal(data.src.toUpperCase(), data.dest.toUpperCase(), 0, numHops, [], results, 0);

        results.sort(function(a, b) {
          return a.dist - b.dist;
        });

        const ret = Array.from(new Set(results.slice(0, 100)));
        fulfill(ret);
      })
    }
  };
}
