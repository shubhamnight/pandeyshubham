function parseMediaItems(source) {
  return JSON.parse(source.slice(source.indexOf('['), source.lastIndexOf(']') + 1));
}

function serializeMediaLibrary(state) {
  const json = JSON.stringify(state, null, 2);
  return {
    json: json + '\n',
    module: '// Updated by the local image manager.\nexport const mediaLibrary = ' + json + ';\n',
  };
}

module.exports = { parseMediaItems, serializeMediaLibrary };
