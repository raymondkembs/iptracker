import React, { useEffect, useState } from 'react';
import { firestore, auth } from './firebaseConfig';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

function ChatBox({ conversationId, recipientId, onClose }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  

  const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');

  useEffect(() => {
  if (!conversationId) return;

  const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  const unsub = onSnapshot(q, (snapshot) => {
    setMessages(snapshot.docs.map(doc => doc.data()));
  });

  return () => unsub();
}, [conversationId]);



  // useEffect(() => {
  //   const q = query(messagesRef, orderBy('timestamp', 'asc'));
  //   const unsub = onSnapshot(q, (snapshot) => {
  //     setMessages(snapshot.docs.map(doc => doc.data()));
  //   });

  //   return () => unsub();
  // }, [conversationId]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const senderId = auth.currentUser?.uid;

    await addDoc(messagesRef, {
      text: message,
      senderId,
      recipientId,
      participants: [senderId, recipientId],
      timestamp: serverTimestamp(),
    });

    setMessage('');
  };

  return (
    <div style={{
      position: 'absolute', 
      borderRadius: '5px', 
      zIndex: 1000, 
      padding: 20, 
      border: '1px solid #ccc', 
      marginTop: 20, 
      background: 'rgba(168, 89, 37, 1)' 
      }}>
      {/* ✅ Close Button */}
        <div style={{ textAlign: 'right' }}>
          <button onClick={onClose} style={{
            position: 'absolute',
            top: 5,
            right: 15,
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: 'white'
          }}>
            ✖
          </button>
        </div>
      
      <h4 style={{ 
        marginTop: -10,
        color: 'white',
        paddingRight: 15,
        borderRadius: 5,
        width: 'fit-content',
        background: 'rgba(0, 0, 0, 0.2)',
        }}>💬 Chat</h4>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            textAlign: msg.senderId === auth.currentUser.uid ? 'right' : 'left',
            margin: '5px 0'
          }}>
            <span><strong>{msg.senderId === auth.currentUser.uid ? 'You' : 'Them'}:</strong> {msg.text}</span>
            <div style={{ fontSize: '0.8em', color: '#aaa' }}>
              {msg.timestamp?.toDate().toLocaleTimeString()}
            </div>

          </div>
        ))}
      </div>
      <div>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ width: '80%' }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatBox;




// // ChatBox.js
// import React, { useEffect, useState } from 'react';
// import { firestore, auth } from './firebaseConfig';
// import {
//   collection,
//   addDoc,
//   query,
//   orderBy,
//   onSnapshot,
//   serverTimestamp,
// } from 'firebase/firestore';

// function ChatBox({ conversationId }) {
//   const [message, setMessage] = useState('');
//   const [messages, setMessages] = useState([]);

//   const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');

//   useEffect(() => {
//     const q = query(messagesRef, orderBy('timestamp', 'asc'));
//     const unsub = onSnapshot(q, (snapshot) => {
//       setMessages(snapshot.docs.map(doc => doc.data()));
//     });

//     return () => unsub();
//   }, [conversationId]);

//   const sendMessage = async () => {
//   if (!message.trim()) return;

//   const senderId = auth.currentUser?.uid;
//   const recipientId = conversationId.replace(senderId, '').replace('-', '');

//   await addDoc(messagesRef, {
//     text: message,
//     senderId,
//     recipientId,
//     participants: [senderId, recipientId],
//     timestamp: serverTimestamp(),
//   });

//   setMessage('');
// };

//   return (
//     <div style={{ padding: 10, border: '1px solid #ccc', marginTop: 20 }}>
//       <h4>💬 Chat</h4>
//       <div style={{ maxHeight: 200, overflowY: 'auto' }}>
//         {messages.map((msg, i) => (
//           <div key={i} style={{
//             textAlign: msg.senderId === auth.currentUser.uid ? 'right' : 'left',
//             margin: '5px 0'
//           }}>
//             <span>{msg.text}</span>
//           </div>
//         ))}
//       </div>
//       <div>
//         <input
//           value={message}
//           onChange={e => setMessage(e.target.value)}
//           placeholder="Type a message..."
//           style={{ width: '80%' }}
//         />
//         <button onClick={sendMessage}>Send</button>
//       </div>
//     </div>
//   );
// }

// export default ChatBox;
