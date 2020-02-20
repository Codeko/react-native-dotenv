var dotEnv = require('dotenv');
var fs = require('fs');
var sysPath = require('path');
var process = require('process');

module.exports = function (data) {
  var t = data.types;

  return {
    visitor: {
      ImportDeclaration: function(path, state) {
        var options = state.opts;

        if (options.replacedModuleName === undefined)
          return;

        var configDir = options.configDir ? options.configDir : './';
        var configFile = options.filename ? options.filename : '.env';

        if (path.node.source.value === options.replacedModuleName) {
          var config = dotEnv.config({ path: sysPath.join(configDir, configFile), silent: true }) || {};
          config = dotEnv.config({ path: sysPath.join(configDir, configFile+".local"), silent: true }) || {};
          var platformPath = (process.env.BABEL_ENV === 'development' || process.env.BABEL_ENV === undefined)
            ? configFile + '.development'
            : configFile + '.production';
          config = Object.assign(config, dotEnv.config({path: sysPath.join(configDir, platformPath), silent: true}));
          config = Object.assign(config, dotEnv.config({
            path: sysPath.join(configDir, platformPath + ".local"),
            silent: true
          }));

          path.node.specifiers.forEach(function(specifier, idx){
            var localId = specifier.local.name;
            var binding = path.scope.getBinding(localId);
            if (specifier.type === "ImportDefaultSpecifier") {
              binding.referencePaths.forEach(function(refPath){
                refPath.replaceWith(t.valueToNode(config))
              });
            }else{
              var importedId = specifier.imported.name
              binding.referencePaths.forEach(function(refPath){
                refPath.replaceWith(t.valueToNode(config[importedId]))
              });
            }
          })

          path.remove();
        }
      }
    }
  }
};
