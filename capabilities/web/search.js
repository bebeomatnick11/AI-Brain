'use strict';

async function searchWeb(
  payload = {}
) {

  const query =
    String(
      payload.query || ''
    ).trim();


  if (!query) {

    return {
      success: false,
      error: 'Missing search query'
    };
  }


  /*
   * Public/no-key search backend.
   *
   * Đây là adapter.
   * Không khóa Astra vào một nhà cung cấp.
   */

  const url =
    `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(query)}`;


  try {

    const response =
      await fetch(
        url,
        {
          method: 'GET',

          headers: {
            'User-Agent':
              'Astra-Brain/1.0'
          },

          signal:
            AbortSignal.timeout(15000)
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Search HTTP ${response.status}`
      );
    }


    const text =
      await response.text();


    return {

      success: true,

      query,

      content:
        text.slice(
          0,
          20000
        ),

      backend:
        'public-search'
    };

  } catch (error) {

    return {

      success: false,

      query,

      error:
        error.message
    };
  }
}


module.exports =
  {
    searchWeb
  };
