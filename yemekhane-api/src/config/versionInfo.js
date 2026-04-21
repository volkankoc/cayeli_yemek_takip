const fs = require('fs');
const path = require('path');

const pkg = require('../../package.json');

const NOTES_MAX = 2000;

function readDeployNotes() {
  const notesPath = path.join(__dirname, '../../deploy-notes.txt');
  try {
    const raw = fs.readFileSync(notesPath, 'utf8').trim();
    return raw.length > NOTES_MAX ? `${raw.slice(0, NOTES_MAX)}…` : raw;
  } catch {
    return '';
  }
}

function getPublicVersion() {
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description || '',
    releaseNotes: readDeployNotes(),
  };
}

module.exports = { getPublicVersion };
