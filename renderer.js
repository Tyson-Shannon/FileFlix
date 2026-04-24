const filePicker = document.getElementById('filePicker');
const player = document.getElementById('player');

filePicker.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    player.src = URL.createObjectURL(file);
  }
});