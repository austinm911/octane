export const SEARCH_URL = `https://api.mapbox.com/search/searchbox/v1`;

export const ENDPOINT_SUGGEST = 'suggest';
export const ENDPOINT_RETRIEVE = 'retrieve';
export const ENDPOINT_CATEGORY = 'category';
export const ENDPOINT_REVERSE = 'reverse';

export const SUGGEST_URL = `${SEARCH_URL}/${ENDPOINT_SUGGEST}`;
export const RETRIEVE_URL = `${SEARCH_URL}/${ENDPOINT_RETRIEVE}`;
export const CATEGORY_URL = `${SEARCH_URL}/${ENDPOINT_CATEGORY}`;
export const REVERSE_URL = `${SEARCH_URL}/${ENDPOINT_REVERSE}`;
