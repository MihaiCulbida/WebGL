    const video = document.getElementById('camera');

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        video.srcObject = stream;
      })
      .catch(err => {
        alert('Eroare la accesarea camerei: ' + err.message);
      });