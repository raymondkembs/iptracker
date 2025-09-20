// ManualRoute.js
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

function ManualRoute({ from, to }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImY5ODMzM2YwNjA1ZTRmYTlhODE3NDBmMDg5YTVjODc2IiwiaCI6Im11cm11cjY0In0='; // Replace with your OpenRouteService API key

    const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

    const body = {
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat]
      ]
    };

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      const coords = data.features[0].geometry.coordinates;
      const latLngs = coords.map(([lng, lat]) => [lat, lng]);

      const polyline = L.polyline(latLngs, {
        color: 'blue',
        weight: 4
      }).addTo(map);

      map.fitBounds(polyline.getBounds());

      return () => {
        map.removeLayer(polyline);
      };
    })
    .catch(err => {
      console.error('Error fetching route:', err);
    });

  }, [from, to, map]);

  return null;
}

export default ManualRoute;
