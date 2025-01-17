import React, { useState, useEffect, useRef } from "react";
import loadGoogleMaps from "../loadGoogleMaps";
import "../Map.css";
import { ADDRESSES } from "../data/addresses.js";

const FIX_START = "4 N 2nd St Suite 150, San Jose, CA 95113";

function Map() {
  const [locations, setLocations] = useState(["", ""]);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [geocoder, setGeocoder] = useState(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [routerName, setRouterName] = useState("");

  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const [activeButtonIds, setActiveButtonIds] = useState([]);



  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    loadGoogleMaps(apiKey)
      .then(() => {
        initMap();
      })
      .catch((err) => {
        console.error("Failed to load Google Maps API:", err);
      });
  }, []);

  const initMap = () => {
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: 37.3375381, lng: -121.8897467 },
      zoom: 15,
      mapTypeId: "roadmap",
    });
    setMap(mapInstance);
    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer();
    directionsRenderer.current.setMap(mapInstance);
    setGeocoder(new window.google.maps.Geocoder());
  };

  const handleLocationInput = (index, event) => {
    const newLocations = [...locations];
    newLocations[index] = event.target.value;
    setLocations(newLocations);
  };

  const addInput = () => {
    setLocations([...locations, ""]);
  };

  const removeInput = (index) => {
    if (locations.length > 2) {
      const newLocations = locations.filter((_, i) => i !== index);
      setLocations(newLocations);
    }
  };

  // Button Location Selection
  const handleLocationSelect = (id) => {
    const newLocations = [...locations];
    const activeIndex = activeButtonIds.length;
    newLocations[activeIndex] = ADDRESSES[id].address;  
    
    setLocations(newLocations);
  };


  const handleAdressButtonClick = (id) => {
    setActiveButtonIds((prevIds) => {
      if (!prevIds.includes(id)) {
        return [...prevIds, id];
      }
      return prevIds;
    });
  
    handleLocationSelect(id);
  };


  const fetchTSPRouteGreedy = async () => {
    if (locations.length < 2) {
      alert("Please enter at least two locations.");
      return;
    }

    setRouterName("Greedy TSP"); 
    setTotalDistance(0); 
    setTotalDuration(0); 

    try {
      const response = await fetch("http://localhost:5001/greedy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch TSP route from API");
      }

      const data = await response.json();
      if (data.success) {
        const { orderedLocations, totalDistance, totalDuration } = data;
        calculateTSPRoutes(orderedLocations, totalDistance, totalDuration);
      } else {
        alert("TSP calculation failed: " + data.message);
      }
    } catch (error) {
      console.error("Error fetching TSP route:", error);
      alert("Error fetching TSP route. Please try again.");
    }
  };

  const fetchKruskalRoute = async () => {
    if (locations.length < 2) {
      alert("Please enter at least two locations.");
      return;
    }

    setRouterName("Kruskal TSP"); 
    setTotalDistance(0); 
    setTotalDuration(0); 

    try {
      const response = await fetch("http://localhost:5001/kruskal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch Kruskal route from API");
      }

      const data = await response.json();
      if (data.success) {
        const { orderedLocations, totalDistance, totalDuration } = data;
        calculateTSPRoutes(orderedLocations, totalDistance, totalDuration);
      } else {
        alert("Kruskal calculation failed: " + data.message);
      }
    } catch (error) {
      console.error("Error fetching Kruskal route:", error);
      alert("Error fetching Kruskal route. Please try again.");
    }
  };

  const fetchPrimRoute = async () => {
  if (locations.length < 2) {
    alert("Please enter at least two locations.");
    return;
  }

  setRouterName("Prim's TSP");
  setTotalDistance(0);
  setTotalDuration(0);

  try {
    const response = await fetch("http://localhost:5001/prim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locations }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Prim's route from API");
    }

    const data = await response.json();
    if (data.success) {
      const { orderedLocations, totalDistance, totalDuration } = data;
      calculateTSPRoutes(orderedLocations, totalDistance, totalDuration);
    } else {
      alert("Prim's calculation failed: " + data.message);
    }
  } catch (error) {
    console.error("Error fetching Prim's route:", error);
    alert("Error fetching Prim's route. Please try again.");
  }
};

  const calculateTSPRoutes = (orderedLocations, totalDistance, totalDuration) => {
    if (orderedLocations.length < 2) {
      alert("Please enter at least two locations.");
      return;
    }

    setTotalDistance(totalDistance);  
    setTotalDuration(totalDuration); 

    const waypoints = orderedLocations.slice(1, -1).map(location => ({ location, stopover: true }));
    const origin = orderedLocations[0];
    const destination = orderedLocations[orderedLocations.length - 1];

    if (directionsService.current && directionsRenderer.current) {
      directionsService.current.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === 'OK') {
            directionsRenderer.current.setDirections(response);
            const legs = response.routes[0].legs;
            const order = legs.map((leg, index) => ({
              step: index + 1,
              start: leg.start_address,
              end: leg.end_address,
            }));
            setRouteOrder(order);
          } else {
            window.alert('Directions request failed due to ' + status);
          }
        }
      );
    }
  };

  
  return (
      <div className="map-container">
        <h2>Route Planner</h2>
        <div>
          <h3>You will start from: {FIX_START}</h3>
        </div>
        <h3>Enter other Locations</h3>
        {locations.map((location, index) => (
            <div key={index} className="input-group">
              <input
                  type="text"
                  placeholder="Enter full address"
                  value={location}
                  onChange={(e) => handleLocationInput(index, e)}
                  className="location-input"
              />
              {index > 1 && (
                  <button onClick={() => removeInput(index)} className="remove-btn">
                    -
                  </button>
              )}
              {index === locations.length - 1 && (
                  <button onClick={addInput} className="add-btn">
                    +
                  </button>
              )}
            </div>
        ))}

        <div>
          {ADDRESSES.map((address) => (
            <button
              key={address.id}
              onClick={() => handleAdressButtonClick(address.id)}
              className={activeButtonIds.includes(address.id) ? "active-button" : ""}
            >
              {address.name}
            </button>
          ))}
        </div>

        {/*<button onClick={submitLocations}>Mark Locations on Map</button>*/}
        {/* <br/> */}
        {/*<button onClick={calculateRoutes}>Calculate Routes</button>*/}

        <div className="button-container">
          <button onClick={fetchTSPRouteGreedy}>Greedy TSP</button>
          <button onClick={fetchKruskalRoute}>Kruskal TSP</button>
          <button onClick={fetchPrimRoute}>Prim's TSP</button>
        </div>

        <div id="map" ref={mapRef} style={{height: "500px", width: "100%"}}></div>

        {routeOrder.length > 0 && (
            <div className="route-order">
              <h3>{routerName ? `Route Order: (${routerName})` : "Route Order:"}</h3>
                {routeOrder.map(({step, start, end}) => (
                    <li key={step}>
                      <strong>Step {step}:</strong> {start} → {end}
                    </li>
                ))}
            </div>
        )}
        <div>
          <h3>Total Distance: {(totalDistance / 1000).toFixed(2)} km</h3>
          <h3>Total Duration: {(totalDuration / 60).toFixed(2)} mins</h3>
      </div>
      </div>
  );
}

export default Map;