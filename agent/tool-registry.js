const memoryTool=require('../tools/memory-tool'); const codeTool=require('../tools/code-tool'); const webSearch=require('../tools/web-search');
const tools={memory:memoryTool,code:codeTool,webSearch};
function get(name){return tools[name]||null;} function list(){return Object.keys(tools).map(name=>({name,description:tools[name].description||''}));}
async function execute(name,args,ctx){const tool=get(name);if(!tool||typeof tool.execute!=='function')throw new Error('TOOL_NOT_FOUND');return tool.execute(args||{},ctx||{});}
module.exports={get,list,execute};
