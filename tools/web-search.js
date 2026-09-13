async function execute(){if(!process.env.WEB_SEARCH_ENDPOINT)return {available:false,reason:'WEB_SEARCH_NOT_CONFIGURED'};throw new Error('WEB_SEARCH_PROVIDER_ADAPTER_REQUIRED');}
module.exports={name:'webSearch',description:'Real web search only when a provider endpoint is configured.',execute};
