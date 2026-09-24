fetch('https://script.google.com/a/macros/vivela.lat/s/AKfycbyGmi9ppgI2uw01LVcU1sl_o23PPMFg0MGoaopFrpLqbcXgiiCdr1dpKd5P6wRCJ1yH/exec', {
  method: 'POST',
  body: JSON.stringify({ usuario, password })
})
.then(r => r.json())
.then(data => console.log(data));