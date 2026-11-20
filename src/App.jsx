import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import destinations from "../destinations.json";

const IndiaGlobe = lazy(() => import("./components/IndiaGlobe.jsx"));

const plannerStorageKey = "discover-bihar-trip";
const featuredIds = new Set([2, 4, 6]);
const mapCoordinates = {
  1: { left: 61, top: 43 },
  2: { left: 65, top: 37 },
  3: { left: 64, top: 44 },
  4: { left: 58, top: 34 },
  5: { left: 61, top: 38 },
  6: { left: 70, top: 42 },
  7: { left: 80, top: 43 },
  8: { left: 48, top: 25 },
  9: { left: 52, top: 31 },
  10: { left: 42, top: 19 }
};

function readSavedTrip() {
  const savedTrip = localStorage.getItem(plannerStorageKey);
  if (!savedTrip) return [];

  const parsedTrip = JSON.parse(savedTrip);
  if (!Array.isArray(parsedTrip)) return [];

  const validIds = new Set(destinations.map((destination) => destination.id));
  return parsedTrip.filter((id) => validIds.has(id));
}

function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All destinations");
  const [tripIds, setTripIds] = useState(readSavedTrip);
  const [notice, setNotice] = useState("");
  const [travelerCount, setTravelerCount] = useState(2);

  const categories = useMemo(
    () => ["All destinations", ...new Set(destinations.map((destination) => destination.category))],
    []
  );
  const plannedDestinations = useMemo(
    () => tripIds.map((id) => destinations.find((destination) => destination.id === id)).filter(Boolean),
    [tripIds]
  );
  const totalHours = plannedDestinations.reduce(
    (total, destination) => total + destination.durationHours,
    0
  );
  const filteredDestinations = destinations.filter((destination) => {
    const matchesName = destination.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory =
      category === "All destinations" || destination.category === category;
    return matchesName && matchesCategory;
  });
  const featuredDestinations = destinations.filter((destination) => featuredIds.has(destination.id));
  const estimatedPerTraveler = plannedDestinations.reduce(
    (total, destination) =>
      total + (destination.estimatedBudget?.perTraveler ?? (destination.budgetLevel === "low" ? 850 : 1800)),
    0
  );

  useEffect(() => {
    localStorage.setItem(plannerStorageKey, JSON.stringify(tripIds));
  }, [tripIds]);

  function addToTrip(destination) {
    if (tripIds.includes(destination.id)) {
      setNotice(`${destination.name} is already in your trip.`);
      return;
    }

    setTripIds((currentIds) => [...currentIds, destination.id]);
    setNotice(`${destination.name} added to your trip.`);
  }

  function removeFromTrip(destination) {
    setTripIds((currentIds) => currentIds.filter((id) => id !== destination.id));
    setNotice(`${destination.name} removed from your trip.`);
  }

  return (
    <>
      <header className="topbar">
        <a className="brand-lockup" href="#home" aria-label="Bharat Yatra AI home">
          <span className="logo-frame">
            <img src={`${import.meta.env.BASE_URL}images/amity-logo.png`} alt="Amity University Patna logo" />
          </span>
          <span className="brand-copy">
            <strong className="institution-name">AMITY UNIVERSITY PATNA</strong>
            <span className="innovation-label">STUDENT INNOVATION PROJECT</span>
            <span className="project-name">BHARAT YATRA <b>AI</b></span>
          </span>
        </a>

        <nav className="primary-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#experiences">Experiences</a>
          <a href="#destinations">Destinations</a>
        </nav>

        <a className="planner-link" href="#trip-planner">
          <span>My journey</span>
          <span className="planner-count">{plannedDestinations.length}</span>
        </a>
      </header>

      <main>
        <section className="hero" id="home" aria-labelledby="page-title">
          <div
            className="hero-backdrop"
            style={{ "--hero-panorama": `url("${import.meta.env.BASE_URL}images/india-panorama.svg")` }}
            aria-hidden="true"
          />
          <div className="hero-atmosphere" aria-hidden="true" />
          <svg className="hero-monument" viewBox="0 0 420 240" aria-hidden="true">
            <path d="M0 204 58 157l41 28 62-76 53 60 59-92 52 72 45-52 50 55v88H0z" fill="#72818c" fillOpacity=".42" />
            <path d="M85 220v-18h250v18H85Zm20-18V96h18v106h-18Zm212 0V96h18v106h-18ZM141 202v-66h29v66h-29Zm108 0v-66h29v66h-29Zm-77-66c5-26 22-42 45-53 11-5 19-9 24-19 5 10 13 14 24 19 23 11 40 27 45 53h-28c-4-16-18-28-41-37-23 9-37 21-41 37h-28Zm46-72c2-20 11-33 23-45 12 12 21 25 23 45h-46Zm-8-45h62v12h-62z" fill="#f3d9b8" />
            <path d="M192 202v-39c0-20 12-33 35-33s35 13 35 33v39h-70Z" fill="#0b1c2f" />
            <path d="M64 220h294v8H64z" fill="#e7b874" fillOpacity=".8" />
          </svg>
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="hero-eyebrow"><span /> DISCOVER • EXPLORE • EXPERIENCE</p>
              <h1 id="page-title">
                Explore India
                <span>Beyond Boundaries.</span>
              </h1>
              <p className="hero-subtitle">Your AI-powered companion for smarter journeys.</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#trip-planner">
                  START YOUR JOURNEY <span aria-hidden="true">↗</span>
                </a>
                <a className="button button-quiet" href="#destinations">
                  EXPLORE DESTINATIONS <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className="hero-caption">
                <span className="caption-line" />
                <span>Ancient wonders. New perspectives.</span>
              </div>
            </div>

            <div className="hero-globe">
              <Suspense fallback={<div className="globe-loading" role="img" aria-label="Loading the India globe" />}>
                <IndiaGlobe />
              </Suspense>
              <div className="globe-caption">
                <span className="live-dot" />
                <span><strong>INDIA</strong><small>85°E · 25°N</small></span>
              </div>
            </div>
          </div>
          <a className="scroll-cue" href="#experiences">
            <span className="scroll-cue-line" />
            SCROLL TO DISCOVER
          </a>
          <span className="hero-index">BHARAT YATRA AI <i>—</i> 01 / {String(destinations.length).padStart(2, "0")}</span>
        </section>

        <section className="trip-planner section-wrap" id="trip-planner" aria-labelledby="planner-title">
          <div className="planner-heading">
            <div>
              <p className="eyebrow">YOUR SAVED ITINERARY</p>
              <h2 id="planner-title">AI Smart Trip Planner</h2>
              <p className="section-intro">Bring your chosen stops together in one place.</p>
            </div>
            <div className="planner-total" aria-label={`${totalHours} suggested hours total`}>
              <strong>{totalHours}</strong>
              <span>suggested hours</span>
            </div>
          </div>
          <p className="notice" role="status">{notice}</p>

          {plannedDestinations.length === 0 ? (
            <div className="planner-empty">
              <span className="planner-empty-mark" aria-hidden="true">✦</span>
              <p>Your next great journey starts with a stop.</p>
              <span>Explore a destination or add one from the India map.</span>
            </div>
          ) : (
            <ol className="planned-list">
              {plannedDestinations.map((destination) => (
                <li className="planned-item" key={destination.id}>
                  <div>
                    <span className="planned-category">{destination.category}</span>
                    <h3>{destination.name}</h3>
                  </div>
                  <span className="planned-duration">{destination.durationHours} hrs</span>
                  <button
                    className="remove-button"
                    type="button"
                    onClick={() => removeFromTrip(destination)}
                    aria-label={`Remove ${destination.name} from trip`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="experience-section section-wrap" id="experiences">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR JOURNEY, INTELLIGENTLY DESIGNED</p>
              <h2>More than a map.<br /><span>A new way to travel.</span></h2>
            </div>
            <p className="section-intro">
              Thoughtful tools for finding your way, planning your spend and travelling with
              confidence.
            </p>
          </div>

          <div className="experience-grid">
            <article className="experience-card hidden-card">
              <div className="card-kicker"><span>01</span> GO BEYOND THE GUIDEBOOK</div>
              <h3>Explore Hidden India</h3>
              <p>Discover stories etched into India's ancient universities and quiet heritage sites.</p>
              <div className="hidden-stops">
                {featuredDestinations.map((destination) => (
                  <div className="hidden-stop" key={destination.id}>
                    <span className="stop-index">{String(destination.id).padStart(2, "0")}</span>
                    <span className="stop-name">{destination.name}<small>{destination.category}</small></span>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => addToTrip(destination)}
                      aria-label={`Add ${destination.name} to your journey`}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <article className="experience-card budget-card">
              <div className="card-kicker"><span>02</span> PLAN WITH CLARITY</div>
              <h3>Smart Budget<br />Calculator</h3>
              <p>A useful starting estimate based on the destinations in your journey.</p>
              <label className="traveler-control">
                <span>Travellers</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={travelerCount}
                  onChange={(event) => {
                    const count = Number(event.target.value);
                    setTravelerCount(Math.min(20, Math.max(1, count || 1)));
                  }}
                />
              </label>
              <div className="budget-total">
                <span>INDICATIVE ON-GROUND ESTIMATE</span>
                <strong>₹{(estimatedPerTraveler * travelerCount).toLocaleString("en-IN")}</strong>
                <small>for {travelerCount} {travelerCount === 1 ? "traveller" : "travellers"}</small>
              </div>
              <p className="budget-disclaimer">Planning guide only; transport, stays and ticket prices vary.</p>
            </article>

            <article className="experience-card safety-card">
              <div className="card-kicker"><span>03</span> TRAVEL WITH CONFIDENCE</div>
              <h3>Tourist Safety<br />Assistant</h3>
              <p>Keep a few essentials close while you explore.</p>
              <div className="emergency-callout">
                <span>INDIA EMERGENCY RESPONSE</span>
                <a href="tel:112"><strong>112</strong><small>Call for emergency assistance ↗</small></a>
              </div>
              <details className="safety-tip">
                <summary>Before you head out <span aria-hidden="true">+</span></summary>
                <p>Share your itinerary with someone you trust and keep local transport details handy.</p>
              </details>
              <details className="safety-tip">
                <summary>At heritage sites <span aria-hidden="true">+</span></summary>
                <p>Follow posted guidance, respect restricted areas and check site hours before travelling.</p>
              </details>
            </article>
          </div>
        </section>

        <section className="map-section section-wrap" aria-labelledby="map-title">
          <div className="map-panel">
            <div className="map-copy">
              <p className="eyebrow">FIND YOUR PLACE ON THE MAP</p>
              <h2 id="map-title">India is calling.</h2>
              <p>
                Select a glowing marker to add a destination anywhere in India to your journey.
              </p>
              <div className="map-legend"><span /> DESTINATIONS IN YOUR DATASET</div>
              <a className="text-link" href="#destinations">Browse all destinations <span>↗</span></a>
            </div>

            <div className="india-map-wrap">
              <svg className="india-map" viewBox="0 0 420 500" role="img" aria-label="Illustrated map of India, with Bihar, Delhi, Agra, Punjab and Kolkata marked">
                <defs>
                  <linearGradient id="india-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#183a5b" />
                    <stop offset="1" stopColor="#0d2038" />
                  </linearGradient>
                  <linearGradient id="bihar-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f8c46f" />
                    <stop offset="1" stopColor="#d77b32" />
                  </linearGradient>
                </defs>
                <path
                  className="india-outline"
                  d="M92 25 145 38 178 62 202 68 223 87 251 91 267 110 295 118 308 137 329 145 343 166 364 176 378 199 391 212 380 234 399 250 383 270 369 275 359 294 345 305 337 325 325 336 320 359 303 373 296 396 280 406 270 432 251 449 241 472 223 492 210 469 200 445 183 431 176 405 155 390 146 366 128 352 132 335 115 320 106 301 119 281 127 261 140 244 145 224 155 208 160 185 173 166 169 143 179 122 173 99 180 81 164 62 141 56 119 40Z"
                />
                <path
                  className="bihar-highlight"
                  d="M256 178 273 173 291 177 298 187 291 197 273 200 258 194Z"
                />
                <path className="map-river" d="M116 324c29-16 40-5 62-19s29-8 47-24 34-4 53-20 39-12 57-26" />
              </svg>
              {destinations.map((destination) => {
                const position = mapCoordinates[destination.id];
                if (!position) return null;
                const isPlanned = tripIds.includes(destination.id);
                return (
                  <button
                    className={`map-pin${isPlanned ? " is-planned" : ""}`}
                    key={destination.id}
                    style={{ left: `${position.left}%`, top: `${position.top}%` }}
                    type="button"
                    onClick={() => addToTrip(destination)}
                    aria-label={`Add ${destination.name} to your journey from the map`}
                    title={destination.name}
                  >
                    <span />
                    <span className="map-tooltip">{destination.name}</span>
                  </button>
                );
              })}
              <span className="map-region-label">BIHAR</span>
              <span className="map-region-label map-delhi-label">DELHI</span>
              <span className="map-region-label map-punjab-label">PUNJAB</span>
              <span className="map-region-label map-kolkata-label">WEST BENGAL</span>
              <span className="map-country-label">INDIA</span>
            </div>
          </div>
        </section>

        <section className="destination-section section-wrap" id="destinations" aria-labelledby="destinations-title">
          <div className="section-heading destination-heading">
            <div>
              <p className="eyebrow">THE FIRST CHAPTER</p>
              <h2 id="destinations-title">Discover India.</h2>
              <p className="section-intro">{destinations.length} remarkable places. Countless ways to see them.</p>
            </div>
            <span className="result-count" aria-live="polite">
              {filteredDestinations.length} {filteredDestinations.length === 1 ? "place" : "places"}
            </span>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <span className="visually-hidden">Search by destination name</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.2 4.2" />
              </svg>
              <input
                type="search"
                placeholder="Search destinations"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="category-select">
              <span className="visually-hidden">Filter by category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="destination-grid">
            {filteredDestinations.length > 0 ? (
              filteredDestinations.map((destination, index) => {
                const isPlanned = tripIds.includes(destination.id);
                return (
                  <article className={`destination-card card-tone-${index % 5}`} key={destination.id}>
                    <div className={`card-art${destination.image ? " has-image" : ""}`}>
                      {destination.image && (
                        <img
                          className="destination-photo"
                          src={`${import.meta.env.BASE_URL}${destination.image.src.replace(/^\/+/, "")}`}
                          alt={destination.image.alt}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <span className="art-number" aria-hidden="true">{String(destination.id).padStart(2, "0")}</span>
                      <span className="art-ring" aria-hidden="true" />
                      {destination.image && (
                        <span className="photo-credit">
                          Photo: <a href={destination.image.sourceUrl} target="_blank" rel="noreferrer">{destination.image.credit}</a> (cropped)
                          {" · "}
                          <a href={destination.image.licenseUrl} target="_blank" rel="noreferrer">{destination.image.license}</a>
                        </span>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="card-meta">
                        <span className="category-label">{destination.category}</span>
                        <span className="budget-label">{destination.budgetLevel} budget</span>
                      </div>
                      <h3>{destination.name}</h3>
                      <p className="state-label">{destination.location?.city ? `${destination.location.city}, ${destination.state}` : destination.state}</p>
                      <p className="description">{destination.description}</p>
                      <div className="card-details">
                        <span><strong>{destination.durationHours} hrs</strong> suggested</span>
                        <span className="interest-labels">{destination.interests.slice(0, 2).join(" · ")}</span>
                      </div>
                      <button
                        className={`explore-button${isPlanned ? " is-added" : ""}`}
                        type="button"
                        onClick={() => addToTrip(destination)}
                        aria-label={isPlanned ? `${destination.name} is in your trip` : `Explore ${destination.name} and add it to your trip`}
                      >
                        {isPlanned ? "Added to trip" : "Explore"}
                        <span aria-hidden="true">{isPlanned ? "✓" : "↗"}</span>
                      </button>
                      {destination.attractions && (
                        <details className="destination-guide">
                          <summary>Attractions &amp; travel guide <span aria-hidden="true">+</span></summary>
                          <div className="guide-content">
                            <h4>Explore {destination.name}</h4>
                            <ul className="attraction-list">
                              {destination.attractions.map((attraction) => (
                                <li key={attraction.name}>
                                  <strong>{attraction.name}</strong>
                                  <span>{attraction.description}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="guide-location">
                              <strong>Location</strong>
                              <p>{destination.location.areas.join(" · ")}</p>
                              <small>
                                {destination.location.latitude.toFixed(4)}°N, {destination.location.longitude.toFixed(4)}°E
                              </small>
                            </div>
                            <div className="guide-budget">
                              <span>INDICATIVE BUDGET</span>
                              <strong>₹{destination.estimatedBudget.perTraveler.toLocaleString("en-IN")}</strong>
                              <small>per traveler · per {destination.estimatedBudget.period}</small>
                              <p>
                                Includes {destination.estimatedBudget.includes.join(", ").toLowerCase()}. Excludes{" "}
                                {destination.estimatedBudget.excludes.join(" and ").toLowerCase()}.
                              </p>
                            </div>
                            <h4>Best time to visit</h4>
                            <p className="guide-copy">{destination.bestTimeToVisit}</p>
                            <h4>Travel tips</h4>
                            <ul className="travel-tips">
                              {destination.travelTips.map((tip) => <li key={tip}>{tip}</li>)}
                            </ul>
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="empty-state">No destinations match. Try another name or category.</p>
            )}
          </div>
        </section>

      </main>

      <footer className="site-footer">
        <span className="footer-brand">BHARAT YATRA AI</span>
        <span>AMITY UNIVERSITY PATNA · STUDENT INNOVATION PROJECT</span>
        <a href="#home">BACK TO TOP ↑</a>
      </footer>
    </>
  );
}

export default App;
