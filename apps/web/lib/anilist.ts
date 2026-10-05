export interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    medium: string | null;
    color: string | null;
  } | null;
  bannerImage: string | null;
  format: string | null;
  episodes: number | null;
  status: string | null;
  genres: string[];
  studios: {
    nodes: { name: string }[];
  } | null;
  seasonYear: number | null;
  description: string | null;
  averageScore: number | null;
}

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        hasNextPage
      }
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          medium
          color
        }
        bannerImage
        format
        episodes
        status
        genres
        studios(isMain: true) {
          nodes {
            name
          }
        }
        seasonYear
        description(asHtml: false)
        averageScore
      }
    }
  }
`;

const GET_BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      format
      episodes
      status
      genres
      studios(isMain: true) {
        nodes {
          name
        }
      }
      seasonYear
      description(asHtml: false)
      averageScore
    }
  }
`;

export async function searchAniList(search: string, page = 1, perPage = 10): Promise<AniListMedia[]> {
  if (!search || !search.trim()) return [];

  const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { search: search.trim(), page, perPage },
    }),
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json?.data?.Page?.media || [];
}

export async function getAniListById(id: number): Promise<AniListMedia | null> {
  if (!id) return null;

  const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: GET_BY_ID_QUERY,
      variables: { id },
    }),
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json?.data?.Media || null;
}
