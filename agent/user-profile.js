const path=require('path'); const config=require('./config'); const store=require('./storage');
const FILE=path.join(config.dataDir,'profiles.json');
function get(userId){return store.read(FILE,{})[String(userId)]||{userId:String(userId),createdAt:new Date().toISOString()};}
function update(userId,changes){const data=store.read(FILE,{}); const id=String(userId); data[id]={...get(id),...(changes||{}),userId:id,updatedAt:new Date().toISOString()}; store.write(FILE,data); return data[id];}
module.exports={get,update};
