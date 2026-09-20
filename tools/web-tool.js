'use strict';

class WebTool {

  constructor(
    search
  ) {

    this.search =
      search;
  }


  async execute(
    payload
  ) {

    return await this.search(
      payload
    );
  }
}


module.exports =
  WebTool;
