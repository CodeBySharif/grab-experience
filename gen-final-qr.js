import QRCode from 'qrcode';
import fs from 'fs';

const url = 'https://grab-experience-passenger.netlify.app/';
QRCode.toFile('qr-grabexperience-final.png', url, {
  color: {
    dark: '#00b14f',  // Grab Green
    light: '#ffffff'
  },
  width: 512
}, function (err) {
  if (err) throw err;
  console.log('Final QR code generated!');
});
