import { io } from 'socket.io-client';

const SOCKET_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

let socket = null;

export function connectSocket(accessToken) {
  if (socket) {
    socket.disconnect();
  }
  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
