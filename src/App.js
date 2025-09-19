import './App.css';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { database, ref, set, onValue } from './firebaseConfig';
import { get, remove } from 'firebase/database';
import { useMap } from 'react-leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function RecenterMap({ coords }) {
  const map = useMap();
  map.setView(coords);
  return null;
}

function App() {
  const [currentCoords, setCurrentCoords] = useState(null); 
  const [targetCoords, setTargetCoords] = useState(null);
  const [deviceId, setDeviceId] = useState('device123'); 
  const [sharing, setSharing] = useState(false);
  const [mode, setMode] = useState(null); 
  const [allLocations, setAllLocations] = useState({});



  const enforceDeviceLimitAndSave = async (deviceId, coords) => {
  const locationsRef = ref(database, 'locations');

  try {
    const snapshot = await get(locationsRef);
    const data = snapshot.val();

    if (data) {
      const deviceIds = Object.keys(data);

      if (deviceIds.length >= 100) {
        const oldestDeviceId = deviceIds[0]; 
        await remove(ref(database, `locations/${oldestDeviceId}`));
        console.log(`Removed oldest device: ${oldestDeviceId}`);
      }
    }

    await set(ref(database, `locations/${deviceId}`), {
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now(), 
    });

    console.log(`Saved location for ${deviceId}`);

  } catch (err) {
    console.error("Error limiting device list:", err);
  }
};


  useEffect(() => {
    if (!sharing) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentCoords(coords);
        const safeDeviceId = deviceId.replace(/\./g, '_');
        set(ref(database, `locations/${safeDeviceId}`), coords);
      },
      (err) => {
        console.error('Error getting location:', err);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharing, deviceId]);



  useEffect(() => {
  if (mode !== 'share') return;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setCurrentCoords(coords);
      enforceDeviceLimitAndSave(deviceId, coords);
    },
    (err) => {
      console.error('Error getting location:', err);
    },
    { enableHighAccuracy: true }
  );
// -----------------------------------------------------------------DOWN*
//   useEffect(() => {
//   const targetRef = ref(database, `locations/${deviceId}`);
//   const unsubscribe = onValue(targetRef, (snapshot) => {
//     const data = snapshot.val();
//     if (data) {
//       setTargetCoords(data);
//     }
//   });

//   return () => unsubscribe();
// }, [deviceId]);

// ------------------------------------------------------------------UP
  return () => navigator.geolocation.clearWatch(watchId);
}, [mode, deviceId]);
// -----------------------------------------------------------------DOWN*
  // useEffect(() => {
  //   const targetRef = ref(database, `locations/${deviceId}`);
  //   const unsubscribe = onValue(targetRef, (snapshot) => {
  //     const data = snapshot.val();
  //     if (data) {
  //       setTargetCoords(data);
  //     }
  //   });

  //   return () => unsubscribe();
  // }, [deviceId]);
// -----------------------------------------------------------------UP
// ------------------Replaced----------------------------------
// useEffect(() => {
//   if (mode !== 'track') return;

//   // Sanitize deviceId to remove invalid Firebase path characters
//   const safeDeviceId = deviceId.replace(/\./g, '_');

//   const targetRef = ref(database, `locations/${safeDeviceId}`);
//   const unsubscribe = onValue(targetRef, (snapshot) => {
//     const data = snapshot.val();
//     if (data) {
//       setTargetCoords(data);
//     } else {
//       setTargetCoords(null);
//     }
//   });

//   return () => unsubscribe();
// }, [mode, deviceId]);
// -------------------Replaced------------------------------------

useEffect(() => {
  if (mode !== 'track') return;

  const locationsRef = ref(database, 'locations');
  const unsubscribe = onValue(locationsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      setAllLocations(data);
    } else {
      setAllLocations({});
    }
  });

  return () => unsubscribe();
}, [mode]);



  return (
    <div className="App">
      <div className="box1">
            {/* <div className="other-content"> */}
              <h1>Device Tracker</h1>

              <div className="search-form">
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Enter device ID to track"
                />
                <button onClick={() => setSharing(!sharing)}>
                  {sharing ? 'Stop Sharing' : 'Start Sharing'}
                </button>
              </div>
              
              <div className="mode-buttons">
                <button onClick={() => setMode('share')} disabled={mode === 'share'}>
                  Share My Location
                </button>
                <button onClick={() => setMode('track')} disabled={mode === 'track'}>
                  Track Only
                </button>
              </div>

              <div className="info-section">
                {currentCoords && (
                  <p>
                    <strong>Your location:</strong> {currentCoords.lat}, {currentCoords.lng}
                  </p>
                )}
                {targetCoords && (
                  <p>
                    <strong>Tracking device:</strong> {targetCoords.lat}, {targetCoords.lng}
                  </p>
                )}
          {/* </div> */}
      </div>

      <div className="box2">
        
        <MapContainer center={[0, 0]} zoom={2} className="map">
          
          {(targetCoords || currentCoords) && (
            <RecenterMap coords={targetCoords || currentCoords} />
          )}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* {currentCoords && (
            console.log('All Locations:', allLocations),

            <Marker position={currentCoords}>
              <Popup>You (This device)</Popup>
            </Marker>
          )} */}
         
            {Object.entries(allLocations)
              .filter(([_, loc]) => loc?.lat && loc?.lng)
              .map(([id, loc]) => (
                console.log('All Locations:', allLocations),
                <Marker position={[loc.lat, loc.lng]} key={id}>
                  <Popup>{id}</Popup>
                </Marker>
            ))}

          {targetCoords && (
            <Marker position={targetCoords}>
              <Popup>Target Device ({deviceId})</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      </div>
    </div>
  );
}

export default App;

// *****************************************************


{/* <MapContainer center={[0, 0]} zoom={2} className="map">
  {(Object.keys(allLocations).length > 0 || currentCoords) && (
    <RecenterMap coords={currentCoords || Object.values(allLocations)[0]} />
  )}
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
  />


  {currentCoords && (
    <Marker position={[currentCoords.lat, currentCoords.lng]}>
      <Popup>You (This device)</Popup>
    </Marker>
  )}

  {Object.entries(allLocations)
    .filter(([_, loc]) => loc?.lat && loc?.lng)
    .map(([id, loc]) => (
      <Marker position={[loc.lat, loc.lng]} key={id}>
        <Popup>{id}</Popup>
      </Marker>
    ))}
</MapContainer> */}



// ********************************************************


// import './App.css';
// import { useEffect, useState } from 'react';
// import axios from 'axios';
// import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import L from 'leaflet';
// import { useMap } from 'react-leaflet';

// // Fix for missing marker icons in Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

// function App() {
//   const [ipInput, setIpInput] = useState('');
//   const [data, setData] = useState(null);
//   const [coords, setCoords] = useState([37.7749, -122.4194]); 
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const API_KEY = 'at_EDYpf03rGcLW1cDQRS18PDvs7p3Yi';

//   const handleSearch = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     try {
//       const response = await axios.get(
//         `https://geo.ipify.org/api/v2/country,city?apiKey=${API_KEY}&ipAddress=${ipInput}`
//       );
//       const result = response.data;
//       setData(result);
//       setCoords([result.location.lat, result.location.lng]);
//       console.log(result);
//     } catch (err) {
//       setError('Failed to fetch IP data. Please check the IP address.');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   function RecenterMap({ coords }) {
//     const map = useMap();
//     map.setView(coords);
//     return null;
//   }

//   return (
//     <div className="App">
//       <div className="box1">
//         <img src={`${process.env.PUBLIC_URL}/images/pattern-bg-desktop.png`} alt="logo" className="logo" />
//         <div className="box11">
//         <h1 className="ip-geology">IP Geolocation Lookup</h1>

//         <form onSubmit={handleSearch} className="search-form">
//           <input
//             className="search-input"
//             type="text"
//             value={ipInput}
//             onChange={(e) => setIpInput(e.target.value)}
//             placeholder="Search for any IP address or domain"
//           />
//           <button type="submit" disabled={loading}>
//             {loading ? 'Searching...' : 'Search'}
//           </button>
          
//         </form>
     
//         {data && (
//           <>
//             <div className='detailed-info'>
//               <div className="bb-bx1">
//                 <span>
//                   IP ADDRESS
//                 </span>
//                 <h2 className='ip-details'>
//                   {data.ip}
//                 </h2>
//               </div>

//               <div className="bb-bx2">
//                 <span>
//                   LOCATION
//                 </span>
//                 <h2 className='ip-details'>
//                   {data.location.city}
//                 </h2>
//               </div>

//               <div className="bb-bx3">
//                 <span>
//                   TIMEZONE
//                 </span>
//                 <h2 className='ip-details'>
//                   {data.location.timezone}
//                 </h2>
//               </div>

//               <div className="bb-bx4">
//                 <span>
//                   ISP
//                 </span>
//                 <h2 className='ip-details'>
//                   {data.isp}
//                 </h2>
//               </div>
//             </div>
//           </>
//         )}
//         </div>
//       </div>
//       {/* map content */}

//        <div className="box2">
//          {error && <p className="error">{error}</p>}

//           {data && (
//             <>
//               <MapContainer 
//                 center={coords} 
//                 zoom={5} 
//                 className="map"
//                 zoomControl={false}>
//                 <RecenterMap coords={coords} /> 
//                 <TileLayer
//                   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                   attribution="&copy; OpenStreetMap contributors"
//                 />
//                 <Marker position={coords}>
//                   <Popup>
//                     <strong>IP:</strong> {data.ip}<br />
//                     <strong>ISP:</strong> {data.isp}<br />
//                     <strong>City:</strong> {data.location.city}<br />
//                     <strong>Region:</strong> {data.location.region}<br />
//                     <strong>Country:</strong> {data.location.country}<br />
//                     <strong>Timezone:</strong> UTC {data.location.timezone}
//                   </Popup>
//                 </Marker>
//                 <ZoomControl position="bottomright" />
//               </MapContainer>
//             </>
//           )}
//       </div>
//     </div>
//   );
// }

// export default App;
