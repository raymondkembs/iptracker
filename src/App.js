import './App.css';
import { use, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { database, ref, set, onValue } from './firebaseConfig';
import { get, remove } from 'firebase/database';
import { useMap } from 'react-leaflet';
import 'leaflet-routing-machine';
import ManualRoute from './ManualRoute';
import { v4 as uuidv4 } from 'uuid';
import { auth, signInAnonymously } from './firebaseConfig';
import ChatBox from './ChatBox';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
// ✅ RIGHT
import { firestore as db } from './firebaseConfig';



const createRoleIcon = (imageUrl, role = 'cleaner') => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="marker-pin ${role}"></div>
      <div class="icon-wrapper">
        <img src="${imageUrl}" class="icon-image" alt="${role}" />
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const userMarkerIcon = createRoleIcon(
  'https://img.icons8.com/ios-filled/50/000000/navigation.png', // or any custom image
  'you' // a special class in CSS (see next step)
);

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const targetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function RecenterMap({ coords, trigger }) {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.setView(coords, map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [trigger]);

  return null;
}

function App() {
  const [currentCoords, setCurrentCoords] = useState(null); 
  const [targetCoords, setTargetCoords] = useState(null);
  const [deviceId, setDeviceId] = useState(null); 
  const [sharing, setSharing] = useState(false);
  const [mode, setMode] = useState(null); 
  const [allLocations, setAllLocations] = useState({});
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userImage, setUserImage] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [chatWith, setChatWith] = useState(null);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});


  const handleSubmitUserInfo = () => {
  if (!userName || !userRole) {
    alert("Please enter your name and select a role.");
    return;
  }

  setSharing(true);        // Start sharing location
  setHasSubmitted(true);   // Hide form
};


const enforceDeviceLimitAndSave = async (deviceId, coords) => {
  const safeDeviceId = deviceId.replace(/\./g, '_'); // ✅ ADD THIS LINE
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

    // ✅ Store enhanced cleaner metadata
    await set(ref(database, `locations/${safeDeviceId}`), {
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now(),
      role: userRole || 'client', // default role fallback
      name: userName || 'Anonymous',
      uid: auth.currentUser?.uid || null, // Firebase Auth UID
    });

    console.log(`Saved location for ${safeDeviceId}`);
  } catch (err) {
    console.error("Error limiting device list:", err);
  }
};

const hardcodedCleaners = [
  {
    id: 'cleaner_1',
    lat: -1.290,
    lng: 36.820,
  },
  {
    id: 'cleaner_2',
    lat: -1.300,
    lng: 36.830,
  },
  {
    id: 'cleaner_3',
    lat: -1.310,
    lng: 36.840,
  },
];
// This one down here is the original useEffect for geolocation tracking
// useEffect(() => {
//   const watchId = navigator.geolocation.watchPosition(
//     (pos) => {
//       const coords = {
//         lat: pos.coords.latitude,
//         lng: pos.coords.longitude,
//       };
//       setCurrentCoords(coords);

//       // Always write to Firebase if sharing is enabled
//       if (sharing) {
//         const safeDeviceId = deviceId.replace(/\./g, '_');
//         set(ref(database, `locations/${safeDeviceId}`), coords);
//       }
//     },
//     (err) => {
//       console.error('Error getting location:', err);
//     },
//     { enableHighAccuracy: true }
//   );

//   return () => navigator.geolocation.clearWatch(watchId);
// }, [sharing, deviceId, userName, userRole, userImage]);

useEffect(() => {
  if (!sharing || userRole === 'viewer') return;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      let lat = pos.coords.latitude;
      let lng = pos.coords.longitude;

      // ✅ Apply 1km offset for customers
      if (deviceId?.startsWith('customer')) {
        lat += 0.009;
        lng += 0.009;
      }

      const coords = { lat, lng };
      setCurrentCoords(coords);
      console.log("📍 My location (currentCoords):", coords);

      enforceDeviceLimitAndSave(deviceId, coords);
    },
    (err) => {
      console.error('Error getting location:', err);
    },
    { enableHighAccuracy: true }
  );

  return () => navigator.geolocation.clearWatch(watchId);
}, [mode, deviceId]);


//   useEffect(() => {
//   // if (mode !== 'share') return;
//   if (!sharing || userRole === 'viewer') return;
  
//   const watchId = navigator.geolocation.watchPosition(
//     (pos) => {
//       const coords = {
//         lat: pos.coords.latitude,
//         lng: pos.coords.longitude,
//       };
//       setCurrentCoords(coords);
//       console.log("📍 My location (currentCoords):", coords);
//       enforceDeviceLimitAndSave(deviceId, coords);
//     },
//     (err) => {
//       console.error('Error getting location:', err);
//     },
//     { enableHighAccuracy: true }
//   );

//   return () => navigator.geolocation.clearWatch(watchId);

// }, [mode, deviceId]);


 
const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setUserRole(role);
    setShowRoleModal(false);
    
    if (role !== 'viewer') {
        const rawId = uuidv4();
        const rolePrefix = role.toLowerCase(); // e.g., 'cleaner' or 'customer'
        const fullId = `${rolePrefix}_${rawId}`;
        localStorage.setItem('deviceId', fullId);
        setDeviceId(fullId);
        setSharing(true); // Start sharing location for cleaner/customer
        setMode('share');
      } else {
        // Viewer doesn’t need deviceId
        setDeviceId(null);
        setSharing(false);
        setMode('track');
      }
      console.log("✅ Role selected:", role);
      console.log("🧭 Mode set to:", role === 'viewer' ? 'track' : 'share');


  };

  useEffect(() => {
    const newId = uuidv4();
    setDeviceId(newId);
  }, []);

  useEffect(() => {
  // Only run if deviceId not already set
    if (deviceId) return;

    const storedId = localStorage.getItem('deviceId');
    if (storedId) {
      setDeviceId(storedId);
    }
  }, []);

useEffect(() => {
  if (mode !== 'track') return;

  console.log("📡 Subscribing to Firebase locations...");
  const locationsRef = ref(database, 'locations');
  const unsubscribe = onValue(locationsRef, (snapshot) => {
    const data = snapshot.val();
    console.log("📥 Fetched data from Firebase:", data); 
    if (data) {
      setAllLocations(data);
    } else {
      setAllLocations({});
    }
  });

  return () => unsubscribe();
}, [mode]);


useEffect(() => {
  // Anonymous sign-in on app load
  signInAnonymously(auth)
    .then(() => {
      console.log("✅ Signed in anonymously to Firebase");
    })
    .catch((err) => {
      console.error("❌ Firebase anonymous sign-in error:", err);
    });
}, []);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser);
      console.log("✅ User signed in:", firebaseUser.uid);
    } else {
      // Try signing in anonymously
      signInAnonymously(auth)
        .then((userCred) => {
          setUser(userCred.user);
          console.log("✅ Signed in anonymously:", userCred.user.uid);
        })
        .catch((error) => {
          console.error("❌ Anonymous sign-in failed:", error);
        });
    }
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  if (!user?.uid) return;

  const q = query(
    collectionGroup(db, "messages"),
    where("recipientId", "==", user.uid),
    orderBy("timestamp", "desc")
  );

  const unsub = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const latest = snapshot.docs[0].data();

      const senderId = latest.senderId;
      const conversationId = [latest.senderId, user.uid].sort().join('_');

      if (senderId !== user.uid && senderId !== chatWith) {
        // 👇 Mark sender as having an unread message
        setUnreadMessages(prev => ({
          ...prev,
          [senderId]: true
        }));

        setIncomingMessage({
          text: latest.text,
          senderId,
          conversationId
        });

        // Optional auto-dismiss notification popup
        setTimeout(() => setIncomingMessage(null), 5000);
      }
    }
  });

  return () => unsub();
}, [user?.uid, chatWith]);


// useEffect(() => {
//   if (!user?.uid) return;

//   const q = query(
//     collectionGroup(db, "messages"), // 👈 grabs all messages from any conversation
//     where("recipientId", "==", user.uid),
//     orderBy("timestamp", "desc")
//   );

//   const unsub = onSnapshot(q, (snapshot) => {
//     if (!snapshot.empty) {
//       const latest = snapshot.docs[0].data();

//       // ✅ Optional: check if chatWith !== senderId to avoid double notification
//       if (latest.senderId !== user.uid && latest.senderId !== chatWith) {
//         // ✅ Show modal with message
//         setIncomingMessage({
//           text: latest.text,
//           senderId: latest.senderId,
//           conversationId: [latest.senderId, user.uid].sort().join('_')
//         });

//         // Auto-hide after 5 seconds (optional)
//         setTimeout(() => setIncomingMessage(null), 5000);
//       }
//     }
//   });

//   return () => unsub();
// }, [user?.uid, chatWith]);

// useEffect(() => {
//   if (!user?.uid || !chatWith) return;

//   const messagesQuery = query(
//     collection(db, "messages"),
//     where("participants", "array-contains", user.uid),
//     orderBy("timestamp", "asc")
//   );

//   const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
//     setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
//   });

//   return () => unsubscribe();
// }, [user?.uid, chatWith]);

// useEffect(() => {
//   console.log("🟢 Chat with:", chatWith);
//   console.log("🟢 Chat render check:", chatWith, auth.currentUser?.uid);

// }, [chatWith]);

  const visibleMarkers = Object.entries(allLocations)
  .filter(([id, loc]) => {
    if (!loc?.lat || !loc?.lng || !loc?.uid || !loc?.role) return false;

    if (userRole === 'viewer') {
      return loc.role === 'cleaner' || loc.role === 'customer';
    }

    // Cleaners see customers
    if (userRole === 'cleaner') {
      return loc.role === 'customer';
    }

    // Customers see cleaners
    if (userRole === 'customer') {
      return loc.role === 'cleaner';
    }

    return false;
  });



  const renderPopupContent = (loc) => {
    const isSelf = loc.uid === user?.uid;
    const clientCanTrack = true; // simulate permission system for now

    if (userRole === 'customer' && loc.role === 'cleaner' && clientCanTrack) {
      return (
        <button onClick={() => setTargetCoords(loc)}>Track Cleaner</button>
      );
    }

    // Don't show popup buttons for yourself
    if (isSelf) {
      return <strong>You (This Device)</strong>;
    }

    // Viewer: Only show name
    if (userRole === 'viewer') {
      return (
        <div>
          <strong>{loc.name || 'Unknown'}</strong>
          <br />
          <em>({loc.role})</em>
        </div>
      );
    }

    // Cleaner: Can see customers only, but no chat or track
    if (userRole === 'cleaner') {
      return (
        <div>
          <strong>{loc.name || 'Customer'}</strong>
          <br />
          <em>(Customer)</em>
        </div>
      );
    }

  // Customer: Can see cleaners, and can chat + track
  if (userRole === 'customer' && loc.role === 'cleaner') {
    return (
      <div>
        <strong>{loc.name || 'Cleaner'}</strong>
        <br />
        <button onClick={() => {
          setTargetCoords(loc);
          setRecenterTrigger(prev => prev + 1);
        }}>
          Track Cleaner
        </button>
        <br />
        <button onClick={() => handleOpenChat(loc.uid)}>Show Chat</button>
        {/* <button onClick={() => setChatWith(loc.uid)}>Chat</button> */}
      </div>
    );
  }

  return <div><strong>{loc.name}</strong></div>;
};

const handleOpenChat = (uid) => {
  setChatWith(uid);
  setUnreadMessages(prev => {
    const updated = { ...prev };
    delete updated[uid]; // Mark message as read
    return updated;
  });
};


  return (
    <div className="App">
      <div className="box1">
          {showRoleModal && (
            <div className="modal-backdrop">
              <div className="modal-content">
                <h2>Welcome!</h2>
                <p>Who are you?</p>
                <button onClick={() => handleRoleSelect('viewer')}>Viewer</button>
                <button onClick={() => handleRoleSelect('cleaner')}>Cleaner</button>
                <button onClick={() => handleRoleSelect('customer')}>Customer</button>
              </div>
            </div>
          )}

            {/* <div className="other-content"> */}
              <h1>Find a nearby cleaner</h1>

              <div className="search-form">
               
                <button onClick={() => setSharing(!sharing)}>
                  {sharing ? 'Stop Sharing' : 'Start Sharing'}
                </button>
              </div>


              <div className="mode-buttons">
                <label>
                  <input
                    type="checkbox"
                    checked={sharing}
                    onChange={() => setSharing(!sharing)}
                  />
                  Share My Location
                </label>
              </div>

              <div className="info-section">
                {selectedRole === 'viewer' && (
                  <p>You are viewing the map as a guest. No location access needed.</p>
                )}

                {selectedRole && selectedRole !== 'viewer' && currentCoords && (
                  <p><strong>Your location:</strong> {currentCoords.lat}, {currentCoords.lng}</p>
                )}

      </div>

      <div className="box2">
        
        <MapContainer center={[0, 0]} zoom={2} className="map">
          {(targetCoords || currentCoords) && (
            <RecenterMap coords={targetCoords || currentCoords} trigger={recenterTrigger} />
          )}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* ✅ Show route if a cleaner is selected */}
          {currentCoords && targetCoords && (
            <ManualRoute from={currentCoords} to={targetCoords} />
          )}

          {/* ✅ Show marker for current device */}
          {currentCoords && (
            <Marker 
              position={currentCoords} 
              // icon={userIcon}
              icon={userMarkerIcon}
            >
              <Popup>You (This Device)</Popup>
            </Marker>
          )}

          {hardcodedCleaners.map((cleaner) => (
            <Marker
              key={cleaner.id}
              position={[cleaner.lat, cleaner.lng]}
              // icon={targetIcon}
              icon={createRoleIcon('https://img.icons8.com/ios-filled/50/000000/broom.png', 'cleaner')}
            >
              <Popup>
                <strong>Demo Cleaner:</strong> {cleaner.id}
                <br />
                <em>This is a dummy location for testing</em>
                <br />
                <button
                  onClick={() => {
                    setTargetCoords({ lat: cleaner.lat, lng: cleaner.lng });
                    setRecenterTrigger((prev) => prev + 1); // triggers map recenter
                  }}
                >
                  Track This Cleaner
                </button>

              </Popup>
            </Marker>
          ))}

          {/* ✅ Show markers for all cleaners and let user pick one */}
            {/* {Object.entries(allLocations)
              .filter(([_, loc]) => loc?.lat && loc?.lng && loc?.uid)
              .map(([id, loc]) => (
                <Marker 
                  position={[loc.lat, loc.lng]} 
                  key={id} 
                  // icon={targetIcon}
                  icon={createRoleIcon(
                      loc.role === 'cleaner'
                        ? 'https://img.icons8.com/ios-filled/50/000000/broom.png'
                        : loc.role === 'customer'
                        ? 'https://img.icons8.com/ios-filled/50/000000/user.png'
                        : 'https://img.icons8.com/ios-filled/50/000000/eye.png',
                      loc.role
                    )}
                  >
                  <Popup>
                    <strong>{loc.role?.toUpperCase() || 'UNKNOWN'}:</strong> {loc.name || id}
                    <br />
                    <button onClick={() => {
                      setTargetCoords(loc);
                      setRecenterTrigger(prev => prev + 1); // optional: recenter map
                    }}>
                      Track Location
                    </button>
                    <br />
                    <button onClick={() => {
                      setChatWith(loc.uid);
                    }}>
                      Show Chat
                    </button>
                  </Popup>

                </Marker>
            ))} */}
            {visibleMarkers.map(([id, loc]) => {
              const isUnread = unreadMessages[loc.uid]; // ✅ OK here
              const isSelf = loc.uid === user?.uid;

              return (
                <Marker
                  key={id}
                  position={[loc.lat, loc.lng]}
                  icon={createRoleIcon(
                    loc.role === 'cleaner'
                      ? 'https://img.icons8.com/ios-filled/50/000000/broom.png'
                      : 'https://img.icons8.com/ios-filled/50/000000/user.png',
                    loc.role
                  )}
                >
                  <Popup>
                    {renderPopupContent(loc)} {/* ✅ OK */}
                  </Popup>

                  {/* ✅ Show unread bubble if needed */}
                  {isUnread && !isSelf && (
                    <div className="message-bubble" style={{
                      position: 'absolute',
                      transform: 'translate(-50%, -100%)',
                      top: '-25px',
                      left: '50%',
                      zIndex: 1000,
                    }}>
                      <img
                        src="https://img.icons8.com/emoji/48/new-button-emoji.png"
                        alt="New message"
                        style={{ width: 24, height: 24 }}
                      />
                    </div>
                  )}
                </Marker>
              );
            })}

              {/* <strong>{loc.role?.toUpperCase() || 'UNKNOWN'}:</strong> {loc.name || id}
              <br />
              <button onClick={() => {
                setTargetCoords(loc);
                setRecenterTrigger(prev => prev + 1); // optional: recenter map
              }}>
                Track Location
              </button>
              <br />
              <button onClick={() => {
                setChatWith(loc.uid);
              }}>
                Show Chat
              </button> */}
        

        </MapContainer>
       
      </div>
      </div>
      {incomingMessage && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'white',
          border: '1px solid #ccc',
          padding: '1rem',
          zIndex: 1000,
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <strong>📨 New message</strong>
          <p>{incomingMessage.text}</p>
          <button
            onClick={() => {
              setChatWith(incomingMessage.senderId);
              setIncomingMessage(null);
            }}
          >
            Open Chat
          </button>
        </div>
      )}

      {chatWith && user?.uid && (
        <div style={{ background: 'white', padding: '1rem', position: 'absolute', bottom: 10, right: 10, zIndex: 999 }}>
          Chat with: {chatWith}
        </div>
      )}
      {chatWith && user?.uid && (
        <ChatBox
          conversationId={[auth.currentUser.uid, chatWith].sort().join('_')}
          recipientId={chatWith}
          onClose={() => setChatWith(null)} // ✅ Add close handler
        />
      )}


      {/* {chatWith && user?.uid &&(
        
        <ChatBox conversationId={
          [auth.currentUser.uid, chatWith].sort().join('_')
        }
        recipientId={chatWith} 
        />
      )} */}
    </div>
  );
}

export default App;

// START HERE WITH CHATGPT: Totally fair question — it sounds like a lot of work at first, but in reality:

// ✅ Drawing a route in Leaflet using a Polyline is actually very simple — especially if you’re using an external routing API like OpenRouteService, Mapbox, or OSRM.

// You're essentially doing 3 steps:


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
