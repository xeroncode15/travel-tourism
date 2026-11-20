import React, { useEffect, useRef, useState } from "react";
import destinations from "../../destinations.json";
import travelGuides from "../../travel-guides.json";

const weatherDescriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Light snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Heavy thunderstorm with hail"
};

async function fetchJson(url, signal, serviceName) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${serviceName} returned ${response.status}.`);
  }
  return response.json();
}

async function getWeather(place, signal) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "1",
    timezone: "auto"
  });
  const result = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`, signal, "Weather service");
  if (!result.current || !result.daily) {
    throw new Error("Current weather is not available for this location.");
  }
  return result;
}

async function getWikipediaOverview(place, signal) {
  const normalize = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const placeName = normalize(place.name);
  const commonParams = {
    action: "query",
    prop: "extracts|info",
    inprop: "url",
    exintro: "1",
    exchars: "1000",
    explaintext: "1",
    redirects: "1",
    format: "json",
    origin: "*"
  };
  const directParams = new URLSearchParams({ ...commonParams, titles: place.name });
  const directResult = await fetchJson(
    `https://en.wikipedia.org/w/api.php?${directParams}`,
    signal,
    "Wikipedia"
  );
  const directPage = Object.values(directResult.query?.pages ?? {})
    .find((page) => page.extract && normalize(page.title) === placeName);
  if (directPage && !/\bmay refer to\b|\bdisambiguation\b/i.test(directPage.extract)) {
    return {
      title: directPage.title,
      extract: directPage.extract.replace(/\s+/g, " ").trim(),
      url: directPage.fullurl ?? `https://en.wikipedia.org/?curid=${directPage.pageid}`
    };
  }

  const search = [`"${place.name}"`, place.admin1, place.country].filter(Boolean).join(" ");
  const searchParams = new URLSearchParams({
    ...commonParams,
    generator: "search",
    gsrsearch: search,
    gsrnamespace: "0",
    gsrlimit: "5"
  });
  const result = await fetchJson(`https://en.wikipedia.org/w/api.php?${searchParams}`, signal, "Wikipedia");
  const pages = Object.values(result.query?.pages ?? {})
    .filter((page) => page.extract && !/\bmay refer to\b|\bdisambiguation\b/i.test(page.extract))
    .sort((first, second) => (first.index ?? 0) - (second.index ?? 0));
  const page = pages.find((candidate) => normalize(candidate.title) === placeName)
    ?? pages.find((candidate) => normalize(candidate.extract).startsWith(`${placeName} `));
  if (!page) return null;

  return {
    title: page.title,
    extract: page.extract.replace(/\s+/g, " ").trim(),
    url: page.fullurl ?? `https://en.wikipedia.org/?curid=${page.pageid}`
  };
}

async function getCountryKnowledge(place, signal) {
  if (!place.country) return null;

  const searchParams = new URLSearchParams({
    action: "wbsearchentities",
    search: place.country,
    language: "en",
    format: "json",
    limit: "10",
    origin: "*"
  });
  const searchResult = await fetchJson(
    `https://www.wikidata.org/w/api.php?${searchParams}`,
    signal,
    "Wikidata"
  );
  const candidates = searchResult.search ?? [];
  const countryName = place.country.trim().toLocaleLowerCase();
  const countryItem = candidates.find(
    (item) => item.label?.trim().toLocaleLowerCase() === countryName
      && /country|sovereign state|republic|kingdom/i.test(item.description ?? "")
  ) ?? candidates.find((item) => item.label?.trim().toLocaleLowerCase() === countryName);

  if (!countryItem) return null;

  const entityParams = new URLSearchParams({
    action: "wbgetentities",
    ids: countryItem.id,
    props: "claims",
    format: "json",
    origin: "*"
  });
  const entityResult = await fetchJson(
    `https://www.wikidata.org/w/api.php?${entityParams}`,
    signal,
    "Wikidata"
  );
  const entity = entityResult.entities?.[countryItem.id];
  if (!entity) return null;

  const statementsFor = (property) => {
    const statements = entity.claims?.[property] ?? [];
    const currentStatements = statements.filter((statement) => !statement.qualifiers?.P582);
    return currentStatements.length ? currentStatements : statements;
  };
  const claimIds = ["P3075", "P37", "P36", "P38"].flatMap((property) => (
    statementsFor(property)
  ).map((claim) => claim.mainsnak?.datavalue?.value?.id).filter(Boolean));
  const uniqueClaimIds = [...new Set(claimIds)];
  if (!uniqueClaimIds.length) {
    return {
      countryItem,
      officialReligion: [],
      officialLanguages: [],
      capitals: [],
      currencies: []
    };
  }

  const labelParams = new URLSearchParams({
    action: "wbgetentities",
    ids: uniqueClaimIds.join("|"),
    props: "labels",
    languages: "en",
    format: "json",
    origin: "*"
  });
  const labelsResult = await fetchJson(
    `https://www.wikidata.org/w/api.php?${labelParams}`,
    signal,
    "Wikidata"
  );
  const labels = Object.fromEntries(
    Object.entries(labelsResult.entities ?? {}).map(([id, item]) => [id, item.labels?.en?.value ?? id])
  );
  const claimLabels = (property) => statementsFor(property)
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean)
    .map((id) => labels[id] ?? id);

  return {
    countryItem,
    officialReligion: claimLabels("P3075"),
    officialLanguages: claimLabels("P37"),
    capitals: claimLabels("P36"),
    currencies: claimLabels("P38")
  };
}

function getLocalSearchMatch(searchTerm) {
  const normalize = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const query = normalize(searchTerm);
  const destination = destinations.find((item) => {
    const names = [item.name, item.location.city];
    if (item.location.city === "Varanasi") names.push("Banaras", "Benares", "Kashi");
    return names.some((name) => normalize(name) === query);
  });
  if (!destination) return null;

  return {
    id: `bharat-yatra-${destination.id}`,
    name: destination.location.city,
    admin1: destination.state,
    country: "India",
    country_code: "IN",
    latitude: destination.location.latitude,
    longitude: destination.location.longitude,
    timezone: "Asia/Kolkata"
  };
}

function findLocalGuide(place) {
  const placeName = place.name.trim().toLocaleLowerCase();
  const destination = destinations.find((item) => (
    item.name.toLocaleLowerCase() === placeName
    || item.location.city.toLocaleLowerCase() === placeName
  ));
  return destination ? { destination, guide: travelGuides[destination.id] } : null;
}

function getReligionSentence(article) {
  if (!article) return "";
  const religionTerms = /\b(Hinduism|Hindu|Buddhism|Buddhist|Jainism|Jain|Sikhism|Sikh|Islam|Muslim|Christianity|Christian|Judaism|Jewish|religious|religion|pilgrimage|temple|mosque|church|monastery|gurdwara|synagogue)\b/i;
  return article.extract.match(/[^.!?]+[.!?]?/g)?.find((sentence) => religionTerms.test(sentence))?.trim() ?? "";
}

function getOverviewText(text, maxLength = 420) {
  const cleanText = text?.replace(/\s+/g, " ").trim() ?? "";
  if (cleanText.length <= maxLength) return cleanText;
  const sentenceEnd = cleanText.lastIndexOf(". ", maxLength);
  const cutAt = sentenceEnd > maxLength * 0.6 ? sentenceEnd + 1 : cleanText.lastIndexOf(" ", maxLength);
  return `${cleanText.slice(0, cutAt > 0 ? cutAt : maxLength).trim()}…`;
}

function getMapEmbedUrl(place) {
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  const latitudeDelta = 0.055;
  const longitudeDelta = Math.min(0.24, latitudeDelta / Math.max(Math.cos(latitude * Math.PI / 180), 0.2));
  const params = new URLSearchParams({
    bbox: [
      longitude - longitudeDelta,
      latitude - latitudeDelta,
      longitude + longitudeDelta,
      latitude + latitudeDelta
    ].join(","),
    layer: "mapnik",
    marker: `${latitude},${longitude}`
  });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

function formatPopulation(value) {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : "";
}

function formatTemperature(value) {
  return Number.isFinite(value) ? `${Math.round(value)}°` : "—";
}

function PlaceExplorer() {
  const [query, setQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [details, setDetails] = useState(null);
  const [detailsRefresh, setDetailsRefresh] = useState(0);
  const searchController = useRef(null);

  async function searchPlaces(event) {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) {
      setSearchError("Type a city, town, village or landmark to search.");
      return;
    }

    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setIsSearching(true);
    setSearchError("");
    setPlaceResults([]);
    setSelectedPlace(null);
    setDetails(null);

    try {
      const params = new URLSearchParams({
        name: searchTerm,
        count: "6",
        language: "en",
        format: "json"
      });
      const result = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?${params}`,
        controller.signal,
        "Place search"
      );
      const results = (result.results ?? []).filter(
        (place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
      );

      if (controller.signal.aborted) return;
      const localMatch = getLocalSearchMatch(searchTerm);
      if (localMatch) {
        const otherResults = results.filter((place) => (
          place.latitude !== localMatch.latitude || place.longitude !== localMatch.longitude
        ));
        setPlaceResults([localMatch, ...otherResults]);
        setSelectedPlace(localMatch);
        return;
      }
      if (!results.length) {
        setSearchError(`No places found for “${searchTerm}”. Try a nearby city, region or country name.`);
        return;
      }

      setPlaceResults(results);
      setSelectedPlace(results[0]);
    } catch (error) {
      if (error.name !== "AbortError") {
        setSearchError(`Place search could not be completed. ${error.message} Please try again.`);
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!selectedPlace) return undefined;
    const controller = new AbortController();
    const serviceNames = ["Weather", "Wikipedia", "Wikidata"];
    setDetails({ loading: true, weather: null, article: null, knowledge: null, errors: {} });

    Promise.allSettled([
      getWeather(selectedPlace, controller.signal),
      getWikipediaOverview(selectedPlace, controller.signal),
      getCountryKnowledge(selectedPlace, controller.signal)
    ]).then((results) => {
      if (controller.signal.aborted) return;
      const values = results.map((result) => (result.status === "fulfilled" ? result.value : null));
      const errors = Object.fromEntries(results.flatMap((result, index) => (
        result.status === "rejected" && result.reason?.name !== "AbortError"
          ? [[serviceNames[index], result.reason?.message ?? "The service is temporarily unavailable."]]
          : []
      )));
      setDetails({
        loading: false,
        weather: values[0],
        article: values[1],
        knowledge: values[2],
        errors
      });
    });

    return () => controller.abort();
  }, [selectedPlace, detailsRefresh]);

  useEffect(() => () => searchController.current?.abort(), []);

  const localContext = selectedPlace ? findLocalGuide(selectedPlace) : null;
  const articleReligion = getReligionSentence(details?.article);
  const localReligion = localContext?.guide?.culture.match(
    /\b(Hindu|Hinduism|Buddh|Jain|Sikh|Islam|Muslim|Christian|church|religious|pilgrimage|temple|monastery)\b/i
  ) ? localContext.guide.culture : "";
  const officialReligion = details?.knowledge?.officialReligion ?? [];
  const localLanguages = localContext?.guide?.languages ?? [];
  const wikidataLanguages = details?.knowledge?.officialLanguages ?? [];
  const languages = localLanguages.length ? localLanguages : wikidataLanguages;
  const capitals = details?.knowledge?.capitals ?? [];
  const currencyNames = details?.knowledge?.currencies ?? [];
  const religionText = officialReligion.length
    ? `Officially listed for ${selectedPlace?.country}: ${officialReligion.join(", ")}.`
    : articleReligion || localReligion;
  const religionUnavailable = !religionText;
  const cultureDescription = getOverviewText(details?.article?.extract)
    || localContext?.guide?.culture
    || "A sourced overview is not currently available for this place.";
  const weather = details?.weather;
  const weatherNow = weather?.current;
  const weatherCode = weatherNow?.weather_code;
  const weatherLabel = weatherCode !== undefined
    ? (weatherDescriptions[weatherCode] ?? "Conditions unavailable")
    : "";
  const mapUrl = selectedPlace ? getMapEmbedUrl(selectedPlace) : "";

  return (
    <section className="place-explorer-section section-wrap" id="place-explorer" aria-labelledby="place-explorer-title">
      <div className="place-explorer-heading">
        <div>
          <p className="eyebrow">SEARCH A PLACE · DISCOVER ITS STORY</p>
          <h2 id="place-explorer-title">Explore any place.</h2>
        </div>
        <p>Find a location on an interactive map, then explore its local context, languages, religious heritage and weather.</p>
      </div>

      <div className="place-explorer-layout">
        <div className="place-map-card">
          {selectedPlace ? (
            <iframe
              className="place-map-frame"
              title={`Interactive map of ${selectedPlace.name}`}
              src={mapUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="place-map-empty">
              <span className="place-map-empty-mark" aria-hidden="true">⌖</span>
              <strong>Your map starts with a search</strong>
              <span>Search for a place anywhere in the world.</span>
            </div>
          )}
          {selectedPlace && (
            <div className="place-map-attribution">
              <span>Map data © OpenStreetMap contributors</span>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Map attribution</a>
            </div>
          )}
        </div>

        <div className="place-search-card">
          <div className="place-search-card-heading">
            <span className="place-search-icon" aria-hidden="true">⌕</span>
            <div>
              <strong>Where do you want to go?</strong>
              <span>City, town, village or landmark</span>
            </div>
          </div>
          <form className="place-search-form" onSubmit={searchPlaces}>
            <label htmlFor="place-search-input">Search worldwide</label>
            <div className="place-search-controls">
              <input
                id="place-search-input"
                autoComplete="off"
                maxLength={100}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Banaras, Goa, Tokyo"
                value={query}
              />
              <button type="submit" disabled={isSearching}>
                {isSearching ? "Searching…" : "Search"}
              </button>
            </div>
            <p className="place-search-helper">Try any place name; choose a match if several places are found.</p>
          </form>

          {searchError && <p className="place-search-error" role="alert">{searchError}</p>}
          {isSearching && <p className="place-search-loading" role="status">Finding places around the world…</p>}
          {placeResults.length > 1 && (
            <div className="place-result-list" role="group" aria-label="Search results">
              <span className="place-result-heading">SELECT A MATCH</span>
              {placeResults.map((place) => {
                const isSelected = selectedPlace?.id === place.id
                  && selectedPlace?.latitude === place.latitude
                  && selectedPlace?.longitude === place.longitude;
                return (
                  <button
                    className={`place-result${isSelected ? " is-selected" : ""}`}
                    key={`${place.id}-${place.latitude}-${place.longitude}`}
                    onClick={() => setSelectedPlace(place)}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <span>{place.name}</span>
                    <small>{[place.admin1, place.country].filter(Boolean).join(", ")}</small>
                  </button>
                );
              })}
            </div>
          )}

          {selectedPlace && (
            <div className="place-selected-summary" aria-live="polite">
              <div>
                <span className="place-selected-label">CURRENT PLACE</span>
                <strong>{selectedPlace.name}</strong>
                <span>{[selectedPlace.admin1, selectedPlace.country].filter(Boolean).join(", ")}</span>
                {selectedPlace.population && (
                  <small>Population {formatPopulation(selectedPlace.population)} · {selectedPlace.timezone ?? "Time zone unavailable"}</small>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPlace && (
        <div className="place-facts">
          <article className="place-fact-card">
            <div className="place-fact-heading"><span aria-hidden="true">✦</span><h3>Religion &amp; belief</h3></div>
            {details?.loading ? <p>Checking verified place and country references…</p> : (
              <>
                <p>
                  {religionText || `No place-specific religious context was found for ${selectedPlace.name} in the available sources. Local beliefs and practices can vary.`}
                </p>
                {officialReligion.length > 0 && (
                  <small>Country-level official information; it does not represent local demographics.</small>
                )}
                {officialReligion.length > 0 && details?.knowledge?.countryItem?.concepturi && (
                  <a className="place-source-link" href={details.knowledge.countryItem.concepturi} target="_blank" rel="noreferrer">
                    Source: Wikidata ↗
                  </a>
                )}
                {!officialReligion.length && articleReligion && details?.article?.url && (
                  <a className="place-source-link" href={details.article.url} target="_blank" rel="noreferrer">
                    Source: Wikipedia overview ↗
                  </a>
                )}
                {religionUnavailable && details?.errors?.Wikidata && (
                  <small className="place-data-error">Wikidata: {details.errors.Wikidata}</small>
                )}
              </>
            )}
          </article>

          <article className="place-fact-card">
            <div className="place-fact-heading"><span aria-hidden="true">文</span><h3>Languages</h3></div>
            {details?.loading ? <p>Loading language information…</p> : (
              <>
                <p>{languages.length ? languages.join(", ") : "Language information is not listed for this location."}</p>
                <small>{localLanguages.length ? "Common local languages from the Bharat Yatra guide." : "Official country languages; local languages may vary."}</small>
                {details?.knowledge?.countryItem?.concepturi && (
                  <a className="place-source-link" href={details.knowledge.countryItem.concepturi} target="_blank" rel="noreferrer">
                    Source: Wikidata ↗
                  </a>
                )}
                {details?.errors?.Wikidata && !localLanguages.length && (
                  <small className="place-data-error">Language data: {details.errors.Wikidata}</small>
                )}
              </>
            )}
          </article>

          <article className="place-fact-card place-fact-culture">
            <div className="place-fact-heading"><span aria-hidden="true">⌂</span><h3>Culture &amp; local context</h3></div>
            {details?.loading ? <p>Loading the place overview…</p> : (
              <>
                <p>{cultureDescription}</p>
                {details?.article?.url && (
                  <a className="place-source-link" href={details.article.url} target="_blank" rel="noreferrer">
                    Read {details.article.title} on Wikipedia ↗
                  </a>
                )}
                {!details?.article && details?.errors?.Wikipedia && (
                  <small className="place-data-error">Wikipedia: {details.errors.Wikipedia}</small>
                )}
              </>
            )}
          </article>

          <article className="place-fact-card place-fact-weather">
            <div className="place-fact-heading"><span aria-hidden="true">☼</span><h3>Weather now</h3></div>
            {details?.loading ? <p>Loading current conditions…</p> : weatherNow ? (
              <>
                <p className="place-weather-main">
                  <strong>{formatTemperature(weatherNow.temperature_2m)}</strong>
                  <span>{weatherLabel}</span>
                </p>
                <div className="place-weather-details">
                  <span>Feels like <strong>{formatTemperature(weatherNow.apparent_temperature)}</strong></span>
                  <span>Humidity <strong>{Number.isFinite(weatherNow.relative_humidity_2m) ? `${weatherNow.relative_humidity_2m}%` : "—"}</strong></span>
                  <span>Today <strong>{formatTemperature(weather.daily.temperature_2m_min?.[0])}–{formatTemperature(weather.daily.temperature_2m_max?.[0])}</strong></span>
                  <span>Rain chance <strong>{Number.isFinite(weather.daily.precipitation_probability_max?.[0]) ? `${weather.daily.precipitation_probability_max[0]}%` : "—"}</strong></span>
                </div>
              </>
            ) : (
              <p>{details?.errors?.Weather ? `Weather could not be loaded. ${details.errors.Weather}` : "Current weather is unavailable for this place."}</p>
            )}
          </article>

          <article className="place-fact-card">
            <div className="place-fact-heading"><span aria-hidden="true">↗</span><h3>Local travel notes</h3></div>
            {localContext?.guide ? (
              <>
                <p>{localContext.guide.travelModes.join(" · ")}</p>
                <small>{localContext.guide.rules[0]}</small>
              </>
            ) : (
              <>
                <p>{capitals.length ? `Capital: ${capitals.join(", ")}.` : "Country capital is not listed."} {selectedPlace.admin1 ? `Region: ${selectedPlace.admin1}.` : ""}</p>
                <small>{currencyNames.length ? `Currency: ${currencyNames.join(", ")}.` : "Currency information is not listed."} Check local transport and site rules before travelling.</small>
              </>
            )}
          </article>

          <article className="place-fact-card place-fact-location">
            <div className="place-fact-heading"><span aria-hidden="true">◎</span><h3>Location details</h3></div>
            <p>{[selectedPlace.name, selectedPlace.admin1, selectedPlace.country].filter(Boolean).join(", ")}</p>
            <small>
              {selectedPlace.latitude.toFixed(4)}° {selectedPlace.latitude >= 0 ? "N" : "S"} · {Math.abs(selectedPlace.longitude).toFixed(4)}° {selectedPlace.longitude >= 0 ? "E" : "W"}
              {selectedPlace.population ? ` · Population ${formatPopulation(selectedPlace.population)}` : ""}
            </small>
          </article>
        </div>
      )}

      <div className="place-explorer-footer">
        <span>
          Sources: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
          {" · "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
          {" · "}
          <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer">Wikidata</a>
          {" · Wikipedia links appear with their summaries."}
        </span>
        {selectedPlace && !details?.loading && (
          <button type="button" onClick={() => setDetailsRefresh((value) => value + 1)}>
            Refresh place information
          </button>
        )}
      </div>
    </section>
  );
}

export default PlaceExplorer;
