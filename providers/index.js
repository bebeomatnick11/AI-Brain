'use strict';

const NoKeyProvider =
  require('./noKeyProvider');

const LocalProvider =
  require('./localProvider');

const ProviderRouter =
  require('../core/providerRouter');


function createProviderRouter() {

  const noKey =
    new NoKeyProvider();

  const local =
    new LocalProvider();


  return new ProviderRouter([
    noKey,
    local
  ]);
}


module.exports =
  {
    createProviderRouter
  };
