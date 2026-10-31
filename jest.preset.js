const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Paquets livrés seulement en modules ES (Transloco, ses utilitaires, libphonenumber, intl-messageformat et @formatjs) : transformés comme les .mjs.
  // Commun à tous les projets : un jest.config qui redéfinit cette option remplace ce motif au lieu de le compléter.
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@jsverse/|libphonenumber-js/|intl-messageformat/|@formatjs/))'],
};
